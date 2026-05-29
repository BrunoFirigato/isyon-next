import { createClient } from '@/lib/supabase/server'
import PedidosView from './_components/PedidosView'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function PedidosPage({ searchParams }: Props) {
  const { status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('pedidos')
    .select('id, numero, status, valor, obs, cliente_id, vendedor_id, proposta_id, empresa_id, segmento, itens, criado_em, atualizado_em')
    .order('criado_em', { ascending: false })

  if (status && status !== 'todos') {
    query = query.eq('status', status)
  }

  const [{ data: pedidos }, { data: clientes }] = await Promise.all([
    query,
    supabase.from('clientes').select('id, nome, empresa').order('nome'),
  ])

  return (
    <PedidosView
      pedidos={pedidos ?? []}
      clientes={clientes ?? []}
      currentStatus={status ?? 'todos'}
    />
  )
}
