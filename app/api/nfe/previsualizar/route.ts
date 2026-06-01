import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildBrasilNFePayload } from '@/lib/nfe/buildPayload'
import { previsualizarNFe } from '@/lib/nfe/brasilnfe'
import type { ItemFiscal } from '@/lib/nfe/types'

interface Body {
  pedidoId:        string
  numero:          string
  serie:           string
  data:            string
  naturezaOp:      string
  dadosAdicionais: string
  itens:           ItemFiscal[]
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios').select('tenant_id').eq('auth_id', user.id).maybeSingle()
  if (!usuario?.tenant_id) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 403 })

  const body = await req.json() as Body
  if (!body.pedidoId) return NextResponse.json({ error: 'pedidoId é obrigatório' }, { status: 400 })
  if (!body.itens?.length) return NextResponse.json({ error: 'Nenhum item para emitir' }, { status: 400 })

  const admin = createAdminClient()

  // Token BrasilNFe do tenant
  const { data: tenant } = await admin
    .from('tenants').select('token_brasilnfe').eq('id', usuario.tenant_id).maybeSingle()
  if (!tenant?.token_brasilnfe)
    return NextResponse.json({ error: 'Token BrasilNFe não configurado. Configure em Integrações.' }, { status: 400 })

  // Pedido (com filial e cliente)
  const { data: pedido } = await admin
    .from('pedidos')
    .select('id, empresa_id, cliente_id')
    .eq('id', body.pedidoId)
    .eq('tenant_id', usuario.tenant_id)
    .maybeSingle()
  if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  if (!pedido.empresa_id) return NextResponse.json({ error: 'Pedido sem filial emissora. Edite o pedido e selecione a filial.' }, { status: 400 })
  if (!pedido.cliente_id) return NextResponse.json({ error: 'Pedido sem cliente vinculado.' }, { status: 400 })

  // Filial (dados fiscais)
  const { data: filial } = await admin
    .from('empresas')
    .select('cnpj, razao_social, nome, inscricao_estadual, inscricao_municipal, regime_tributario, crt, estado, cidade, ambiente_nfe, aliq_pis, aliq_cofins')
    .eq('id', pedido.empresa_id)
    .maybeSingle()
  if (!filial) return NextResponse.json({ error: 'Filial não encontrada' }, { status: 404 })
  if (!filial.cnpj) return NextResponse.json({ error: 'Filial sem CNPJ cadastrado.' }, { status: 400 })

  // Cliente (endereço)
  const { data: cliente } = await admin
    .from('clientes')
    .select('nome, cpf_cnpj, email, telefone, cep, rua, numero, complemento, bairro, cidade, estado')
    .eq('id', pedido.cliente_id)
    .maybeSingle()
  if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  // Rede de segurança: cliente precisa de CNPJ/CPF + endereço completo para a NF-e
  if (!cliente.cpf_cnpj?.trim())
    return NextResponse.json({ error: 'Cliente sem CPF/CNPJ. Complete o cadastro do cliente antes de emitir.' }, { status: 400 })
  const faltaEndereco = !cliente.cep?.trim() || !cliente.rua?.trim() || !cliente.cidade?.trim() || !cliente.estado?.trim()
  if (faltaEndereco)
    return NextResponse.json({ error: 'Endereço do cliente incompleto. Preencha CEP, logradouro, cidade e UF no cadastro do cliente.' }, { status: 400 })

  const payload = buildBrasilNFePayload(filial, cliente, body.itens, {
    numero:          body.numero,
    serie:           body.serie,
    data:            body.data,
    naturezaOp:      body.naturezaOp,
    dadosAdicionais: body.dadosAdicionais,
  })

  const resultado = await previsualizarNFe(tenant.token_brasilnfe, payload)

  if (!resultado.ok)
    return NextResponse.json({ ok: false, error: resultado.error ?? 'Falha na pré-visualização', avisos: resultado.avisos })

  return NextResponse.json({
    ok:          true,
    danfeBase64: resultado.danfeBase64,
    avisos:      resultado.avisos,
  })
}
