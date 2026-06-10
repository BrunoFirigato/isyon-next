import { createClient } from '@/lib/supabase/server'
import { getCarteiraScope } from '@/lib/carteira'
import PropostasView from './_components/PropostasView'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function PropostasPage({ searchParams }: Props) {
  const { status } = await searchParams
  const supabase = await createClient()
  const { restrict, vendedorId } = await getCarteiraScope(supabase)

  let query = supabase
    .from('propostas')
    .select('id, titulo, status, valor, numero, obs, cliente_id, vendedor_id, empresa_id, cond_pagamento_id, tabela_preco_id, oportunidade_id, validade, itens, segmento, criado_em, share_token, aceite_em, aceite_por')
    .order('criado_em', { ascending: false })

  if (status && status !== 'todos') {
    query = query.eq('status', status)
  }

  if (restrict && vendedorId) query = query.eq('vendedor_id', vendedorId)

  const [
    { data: propostas },
    { data: clientes },
    { data: vendedores },
    { data: empresas },
    { data: pedidoLinks },
    { data: oportunidades },
  ] = await Promise.all([
    query,
    supabase.from('clientes').select('id, nome, empresa, email, telefone').order('nome'),
    supabase.from('vendedores').select('id, nome'),
    supabase.from('empresas').select('id, nome, sigla'),
    supabase.from('pedidos').select('numero, proposta_id').not('proposta_id', 'is', null),
    supabase.from('oportunidades').select('id, numero, titulo'),
  ])

  return (
    <PropostasView
      propostas={propostas ?? []}
      clientes={clientes ?? []}
      vendedores={vendedores ?? []}
      empresas={empresas ?? []}
      pedidoLinks={pedidoLinks ?? []}
      oportunidades={oportunidades ?? []}
      currentStatus={status ?? 'todos'}
    />
  )
}
