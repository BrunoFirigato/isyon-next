import { createClient } from '@/lib/supabase/server'
import PropostasView from './_components/PropostasView'

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function PropostasPage({ searchParams }: Props) {
  const { status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('propostas')
    .select('id, titulo, status, valor, numero, obs, cliente_id, vendedor_id, empresa_id, validade, itens, segmento, criado_em')
    .order('criado_em', { ascending: false })

  if (status && status !== 'todos') {
    query = query.eq('status', status)
  }

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
