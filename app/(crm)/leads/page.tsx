import { createClient } from '@/lib/supabase/server'
import LeadsView from './_components/LeadsView'
import { LEAD_COLS, LEADS_PAGE_SIZE } from './_components/types'

interface Props {
  searchParams: Promise<{ status?: string; q?: string; score?: string; origem?: string }>
}

export default async function LeadsPage({ searchParams }: Props) {
  const { status, q, score, origem } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('leads')
    .select(LEAD_COLS, { count: 'exact' })
    .order('criado_em', { ascending: false })

  if (status && status !== 'todos') {
    query = query.eq('status', status)
  }
  if (score)  query = query.eq('score', score)
  if (origem) query = query.eq('origem', origem)

  if (q?.trim()) {
    const termo = q.trim()
    query = query.or(
      `nome.ilike.%${termo}%,empresa.ilike.%${termo}%,email.ilike.%${termo}%,telefone.ilike.%${termo}%`
    )
  }

  // Só a primeira página; o total vem do count para montar a paginação
  const { data: leads, count } = await query.range(0, LEADS_PAGE_SIZE - 1)

  return (
    <LeadsView
      // Remonta (reseta paginação) sempre que o filtro/busca muda
      key={`${status ?? 'todos'}-${q ?? ''}-${score ?? ''}-${origem ?? ''}`}
      leads={leads ?? []}
      total={count ?? 0}
      currentStatus={status ?? 'todos'}
      currentQ={q ?? ''}
      currentScore={score ?? ''}
      currentOrigem={origem ?? ''}
    />
  )
}
