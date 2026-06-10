import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { obterIntegracao, logIntegracao } from '@/lib/integracoes/service'
import {
  acharClienteOmiePorDoc, incluirClienteOmie, incluirPedidoOmie, calcularParcelasOmie,
  type ItemParaOmie, type ParcelaOmie,
} from '@/lib/integracoes/omie'

/** Usuário autenticado do tenant (qualquer perfil pode faturar). */
async function assertTenantUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: usuario } = await supabase
    .from('usuarios').select('id, tenant_id, perfil').eq('auth_id', user.id).maybeSingle()
  if (!usuario || !usuario.tenant_id) return null
  return { userId: usuario.id as string, tenantId: usuario.tenant_id as string }
}

interface PedidoItem {
  descricao?: string; quantidade?: number; valorUnitario?: number; produto_id?: string | null
}

/** Envia um pedido do Isyon ao Omie como Pedido de Venda. */
export async function POST(req: NextRequest) {
  const caller = await assertTenantUser()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const pedidoId = String(body.pedido_id ?? '').trim()
  if (!pedidoId) return NextResponse.json({ error: 'Pedido não informado.' }, { status: 400 })

  const admin = createAdminClient()

  // 1. Credenciais do Omie
  const integ = await obterIntegracao(admin, caller.tenantId, 'omie')
  if (!integ?.credenciais?.app_key || integ.status !== 'conectado') {
    return NextResponse.json({ error: 'O Omie não está conectado em Integrações.' }, { status: 400 })
  }
  const { app_key, app_secret } = integ.credenciais

  // 2. Pedido (do próprio tenant)
  const { data: pedido } = await admin
    .from('pedidos')
    .select('id, numero, cliente_id, cond_pagamento_id, itens, aprovado, omie_pedido_id, omie_numero')
    .eq('id', pedidoId).eq('tenant_id', caller.tenantId).maybeSingle()
  if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
  if (pedido.omie_pedido_id) {
    return NextResponse.json({ ok: true, jaEnviado: true, numero: pedido.omie_numero ?? null })
  }
  if (!pedido.aprovado) {
    return NextResponse.json({ error: 'Aprove o pedido antes de enviar ao Omie.' }, { status: 400 })
  }
  if (!pedido.cliente_id) {
    return NextResponse.json({ error: 'O pedido não tem cliente vinculado.' }, { status: 400 })
  }

  // 3. Itens → resolve o código (SKU) de cada produto
  const itensRaw = (pedido.itens as PedidoItem[] | null) ?? []
  if (itensRaw.length === 0) {
    return NextResponse.json({ error: 'O pedido não tem itens.' }, { status: 400 })
  }
  const produtoIds = [...new Set(itensRaw.map(i => i.produto_id).filter(Boolean) as string[])]
  const { data: prods } = produtoIds.length
    ? await admin.from('produtos').select('id, codigo').in('id', produtoIds).eq('tenant_id', caller.tenantId)
    : { data: [] as Array<{ id: string; codigo: string | null }> }
  const codigoPorId = new Map((prods ?? []).map(p => [p.id, p.codigo]))

  const itens: ItemParaOmie[] = []
  const semCodigo: string[] = []
  for (const it of itensRaw) {
    const codigo = it.produto_id ? codigoPorId.get(it.produto_id) : null
    if (!codigo) { semCodigo.push(it.descricao || 'item sem descrição'); continue }
    itens.push({
      codigo: String(codigo),
      descricao: it.descricao || '',
      quantidade: Number(it.quantidade ?? 0),
      valor_unitario: Number(it.valorUnitario ?? 0),
    })
  }
  if (semCodigo.length) {
    return NextResponse.json({
      error: `Itens sem produto cadastrado no Omie (código/SKU): ${semCodigo.join(', ')}. `
        + 'Vincule a um produto importado do Omie antes de enviar.',
    }, { status: 400 })
  }

  // 4. Cliente do pedido
  const { data: cliente } = await admin
    .from('clientes')
    .select('id, nome, empresa, cpf_cnpj, email, tipo_pessoa, cep, rua, numero, complemento, bairro, cidade, estado, telefone')
    .eq('id', pedido.cliente_id).eq('tenant_id', caller.tenantId).maybeSingle()
  if (!cliente) return NextResponse.json({ error: 'Cliente do pedido não encontrado.' }, { status: 404 })

  // 5. Resolve o cliente no Omie (acha por CNPJ/CPF; se não existir, cria)
  let codigoCliente = await acharClienteOmiePorDoc(app_key, app_secret, cliente.cpf_cnpj ?? '')
  if (!codigoCliente) {
    const telDigits = String(cliente.telefone ?? '').replace(/\D/g, '')
    const r = await incluirClienteOmie(app_key, app_secret, {
      id: cliente.id,
      nome: cliente.nome,
      empresa: cliente.empresa,
      cpf_cnpj: cliente.cpf_cnpj,
      email: cliente.email,
      pessoa_fisica: cliente.tipo_pessoa === 'fisica',
      cep: cliente.cep, rua: cliente.rua, numero: cliente.numero, complemento: cliente.complemento,
      bairro: cliente.bairro, cidade: cliente.cidade, estado: cliente.estado,
      ddd: telDigits.length >= 10 ? telDigits.slice(0, 2) : null,
      fone: telDigits.length >= 10 ? telDigits.slice(2) : null,
    })
    if (r.error || !r.codigo) {
      return NextResponse.json({ error: `Falha ao criar o cliente no Omie: ${r.error ?? 'sem código'}` }, { status: 400 })
    }
    codigoCliente = r.codigo
  }

  // 6. Condição de pagamento → parcelas do Omie (null = à vista)
  let parcelas: ParcelaOmie[] | null = null
  if (pedido.cond_pagamento_id) {
    const total = itens.reduce((s, it) => s + it.quantidade * it.valor_unitario, 0)
    const { data: cond } = await admin
      .from('cond_pagamentos')
      .select('parcelas, intervalo, entrada')
      .eq('id', pedido.cond_pagamento_id).eq('tenant_id', caller.tenantId).maybeSingle()
    parcelas = calcularParcelasOmie(total, cond ?? null)
  }

  // 7. Cria o Pedido de Venda no Omie
  const ped = await incluirPedidoOmie(app_key, app_secret, {
    codigoCliente,
    codigoIntegracao: pedido.id,
    itens,
    parcelas,
  })
  if (ped.error) {
    await logIntegracao(admin, { tenantId: caller.tenantId, integracaoId: integ.id, evento: 'enviar_pedido', mensagem: `ERRO pedido ${pedido.numero ?? pedido.id}: ${ped.error}` })
    return NextResponse.json({ error: `Omie recusou o pedido: ${ped.error}` }, { status: 400 })
  }

  // 7. Marca como enviado
  const ref = ped.codigoOmie ?? ped.numero ?? 'enviado'
  await admin.from('pedidos').update({
    omie_pedido_id: ref,
    omie_numero: ped.numero ?? null,
    omie_enviado_em: new Date().toISOString(),
  }).eq('id', pedido.id)
  await logIntegracao(admin, { tenantId: caller.tenantId, integracaoId: integ.id, evento: 'enviar_pedido', mensagem: `Pedido ${pedido.numero ?? pedido.id} → Omie #${ped.numero ?? ref}` })

  return NextResponse.json({ ok: true, numero: ped.numero ?? null })
}
