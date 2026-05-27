import { createClient } from '@/lib/supabase/server'
import LeadsView from './_components/LeadsView'

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>
}

export default async function LeadsPage({ searchParams }: Props) {
  const { status, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('leads')
    .select('id, nome, empresa, email, telefone, status, origem, obs, criado_em, atualizado_em')
    .order('criado_em', { ascending: false })

  if (status && status !== 'todos') {
    query = query.eq('status', status)
  }

  if (q?.trim()) {
    const termo = q.trim()
    query = query.or(
      `nome.ilike.%${termo}%,empresa.ilike.%${termo}%,email.ilike.%${termo}%,telefone.ilike.%${termo}%`
    )
  }

  const { data: leads } = await query

  return (
    <LeadsView
      leads={leads ?? []}
      currentStatus={status ?? 'todos'}
      currentQ={q ?? ''}
    />
  )
}
