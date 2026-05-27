import { createClient } from '@/lib/supabase/server'
import VendedoresView from './_components/VendedoresView'

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>
}

export default async function VendedoresPage({ searchParams }: Props) {
  const { status, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('vendedores')
    .select('id, tenant_id, empresa_id, nome, email, telefone, cargo, ramal, segmentos, status, perc_comissao, criado_em')
    .order('nome')

  if (status && status !== 'todos') query = query.eq('status', status)
  if (q?.trim()) query = query.ilike('nome', `%${q.trim()}%`)

  const { data: vendedores } = await query

  return (
    <VendedoresView
      vendedores={vendedores ?? []}
      currentStatus={status ?? 'todos'}
      currentQ={q ?? ''}
    />
  )
}
