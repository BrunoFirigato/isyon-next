import { createClient } from '@/lib/supabase/server'
import ParceirosView from './_components/ParceirosView'

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>
}

export default async function ParceirosPage({ searchParams }: Props) {
  const { status, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('parceiros')
    .select('id, nome, email, telefone, cnpj, cidade, estado, status, vendedor_maq_id, vendedor_pec_id, criado_em')
    .order('nome', { ascending: true })

  if (status && status !== 'todos') {
    query = query.eq('status', status)
  }

  if (q?.trim()) {
    const termo = q.trim()
    query = query.or(
      `nome.ilike.%${termo}%,email.ilike.%${termo}%,cnpj.ilike.%${termo}%`
    )
  }

  const [{ data: parceiros }, { data: vendedores }] = await Promise.all([
    query,
    supabase.from('vendedores').select('id, nome').order('nome'),
  ])

  return (
    <ParceirosView
      parceiros={parceiros ?? []}
      vendedores={vendedores ?? []}
      currentStatus={status ?? 'todos'}
      currentQ={q ?? ''}
    />
  )
}
