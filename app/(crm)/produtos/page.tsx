import { createClient } from '@/lib/supabase/server'
import ProdutosScreen from './_components/ProdutosScreen'
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
  const [{ data: produtos, count }, { data: categorias }, { data: familias }] = await Promise.all([
    query.range(0, PRODUTOS_PAGE_SIZE - 1),
    supabase.from('categorias').select('id, nome').order('nome'),
    supabase.from('familias').select('id, nome').order('nome'),
  ])

  return (
    <ProdutosScreen
      produtos={produtos ?? []}
      total={count ?? 0}
      currentTipo={tipo ?? 'todos'}
      currentAtivo={ativo ?? 'todos'}
      currentQ={q ?? ''}
      // Remonta (reseta paginação) sempre que filtro/busca muda
      produtosKey={`${tipo ?? 'todos'}-${ativo ?? 'todos'}-${q ?? ''}`}
      categorias={categorias ?? []}
      familias={familias ?? []}
    />
  )
}
