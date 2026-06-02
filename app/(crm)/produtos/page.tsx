import { createClient } from '@/lib/supabase/server'
import ProdutosView from './_components/ProdutosView'
import { PRODUTO_COLS, PRODUTOS_PAGE_SIZE } from './_components/types'

interface Props {
  searchParams: Promise<{ tipo?: string; ativo?: string; q?: string }>
}

export default async function ProdutosPage({ searchParams }: Props) {
  const { tipo, ativo, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('produtos')
    .select(PRODUTO_COLS, { count: 'exact' })
    .order('nome')

  if (tipo && tipo !== 'todos') query = query.eq('tipo', tipo)
  if (ativo === 'ativo')   query = query.eq('ativo', true)
  if (ativo === 'inativo') query = query.eq('ativo', false)
  if (q?.trim())           query = query.or(`nome.ilike.%${q.trim()}%,codigo.ilike.%${q.trim()}%,ncm.ilike.%${q.trim()}%`)

  // Só a primeira página; o total vem do count para montar a paginação
  const { data: produtos, count } = await query.range(0, PRODUTOS_PAGE_SIZE - 1)

  return (
    <ProdutosView
      // Remonta (reseta paginação) sempre que filtro/busca muda
      key={`${tipo ?? 'todos'}-${ativo ?? 'todos'}-${q ?? ''}`}
      produtos={produtos ?? []}
      total={count ?? 0}
      currentTipo={tipo ?? 'todos'}
      currentAtivo={ativo ?? 'todos'}
      currentQ={q ?? ''}
    />
  )
}
