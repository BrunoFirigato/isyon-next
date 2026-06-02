import { createClient } from '@/lib/supabase/server'
import { getCarteiraScope } from '@/lib/carteira'
import ClientesView from './_components/ClientesView'
import { CLIENTE_COLS, CLIENTES_PAGE_SIZE } from './_components/types'

interface Props {
  searchParams: Promise<{ status?: string; q?: string; vendedor?: string; parceiro?: string }>
}

export default async function ClientesPage({ searchParams }: Props) {
  const { status, q, vendedor, parceiro } = await searchParams
  const supabase = await createClient()
  const { restrict, vendedorId } = await getCarteiraScope(supabase)

  const [{ data: vendedores }, { data: parceiros }] = await Promise.all([
    supabase.from('vendedores').select('id, nome').eq('status', 'ativo').order('nome'),
    supabase.from('parceiros').select('id, nome').eq('status', 'ativo').order('nome'),
  ])

  let query = supabase
    .from('clientes')
    .select(CLIENTE_COLS, { count: 'exact' })
    .order('nome', { ascending: true })

  if (status && status !== 'todos') {
    query = query.eq('status', status)
  }

  if (q?.trim()) {
    const termo = q.trim()
    query = query.or(
      `nome.ilike.%${termo}%,empresa.ilike.%${termo}%,email.ilike.%${termo}%,cpf_cnpj.ilike.%${termo}%,telefone.ilike.%${termo}%`
    )
  }

  if (vendedor) {
    query = query.or(`vendedor_maq_id.eq.${vendedor},vendedor_pec_id.eq.${vendedor}`)
  }

  // Restrição de carteira — vendedor só vê os próprios clientes
  if (restrict && vendedorId) {
    query = query.or(`vendedor_maq_id.eq.${vendedorId},vendedor_pec_id.eq.${vendedorId}`)
  }

  if (parceiro) {
    query = query.eq('parceiro_id', parceiro)
  }

  // Só a primeira página; o total vem do count para montar a paginação
  const { data: clientes, count } = await query.range(0, CLIENTES_PAGE_SIZE - 1)

  return (
    <ClientesView
      // Remonta (reseta paginação) sempre que filtro/busca muda
      key={`${status ?? 'todos'}-${q ?? ''}-${vendedor ?? ''}-${parceiro ?? ''}`}
      clientes={clientes ?? []}
      total={count ?? 0}
      restrict={restrict}
      scopedVendedorId={restrict ? vendedorId : null}
      currentStatus={status ?? 'todos'}
      currentQ={q ?? ''}
      currentVendedor={vendedor ?? ''}
      currentParceiro={parceiro ?? ''}
      vendedores={vendedores ?? []}
      parceiros={parceiros ?? []}
    />
  )
}
