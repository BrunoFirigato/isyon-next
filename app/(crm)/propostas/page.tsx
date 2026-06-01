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
    .select('id, titulo, status, valor, numero, obs, cliente_id, vendedor_id, empresa_id, cond_pagamento_id, tabela_preco_id, oportunidade_id, validade, itens, segmento, criado_em')
    .order('criado_em', { ascending: false })

  if (status && status !== 'todos') {
    query = query.eq('status', status)
  }

  if (restrict && vendedorId) query = query.eq('vendedor_id', vendedorId)

  const [{ data: propostas }, { data: clientes }] = await Promise.all([
    query,
    supabase.from('clientes').select('id, nome, empresa, email').order('nome'),
  ])

  return (
    <PropostasView
      propostas={propostas ?? []}
      clientes={clientes ?? []}
      currentStatus={status ?? 'todos'}
    />
  )
}
