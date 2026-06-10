import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCarteiraScope } from '@/lib/carteira'
import PedidosView from './_components/PedidosView'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function PedidosPage({ searchParams }: Props) {
  const { status } = await searchParams
  const supabase = await createClient()
  const { restrict, vendedorId } = await getCarteiraScope(supabase)

  let query = supabase
    .from('pedidos')
    .select('id, numero, status, aprovado, valor, obs, cliente_id, vendedor_id, cond_pagamento_id, tabela_preco_id, valor_frete, modalidade_frete, transportadora_id, proposta_id, empresa_id, segmento, itens, criado_em, atualizado_em, omie_pedido_id, omie_numero, omie_enviado_em')
    .order('criado_em', { ascending: false })

  if (status && status !== 'todos') {
    query = query.eq('status', status)
  }

  if (restrict && vendedorId) query = query.eq('vendedor_id', vendedorId)

  const [
    { data: pedidos },
    { data: clientes },
    { data: vendedores },
    { data: empresas },
    { data: propostaLinks },
  ] = await Promise.all([
    query,
    supabase.from('clientes').select('id, nome, empresa').order('nome'),
    supabase.from('vendedores').select('id, nome'),
    supabase.from('empresas').select('id, nome, sigla'),
    supabase.from('propostas').select('id, numero'),
  ])

  // Omie conectado? (server-side, vale p/ qualquer perfil) — habilita "Enviar ao Omie"
  let omieConectado = false
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: usuario } = await supabase
      .from('usuarios').select('tenant_id').eq('auth_id', user.id).maybeSingle()
    if (usuario?.tenant_id) {
      const admin = createAdminClient()
      const { data: integ } = await admin
        .from('integracoes').select('status')
        .eq('tenant_id', usuario.tenant_id).eq('provider', 'omie').maybeSingle()
      omieConectado = integ?.status === 'conectado'
    }
  }

  return (
    <PedidosView
      pedidos={pedidos ?? []}
      clientes={clientes ?? []}
      vendedores={vendedores ?? []}
      empresas={empresas ?? []}
      propostaLinks={propostaLinks ?? []}
      currentStatus={status ?? 'todos'}
      omieConectado={omieConectado}
    />
  )
}
