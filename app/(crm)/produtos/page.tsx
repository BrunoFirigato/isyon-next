import { createClient } from '@/lib/supabase/server'
import ProdutosView from './_components/ProdutosView'

interface Props {
  searchParams: Promise<{ tipo?: string; ativo?: string; q?: string }>
}

export default async function ProdutosPage({ searchParams }: Props) {
  const { tipo, ativo, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('produtos')
    .select('id, tenant_id, codigo, nome, tipo, unidade, preco, custo, descricao, ncm, cod_servico, cest, origem, ativo, criado_em, atualizado_em')
    .order('nome')

  if (tipo && tipo !== 'todos') query = query.eq('tipo', tipo)
  if (ativo === 'ativo')   query = query.eq('ativo', true)
  if (ativo === 'inativo') query = query.eq('ativo', false)
  if (q?.trim())           query = query.or(`nome.ilike.%${q.trim()}%,codigo.ilike.%${q.trim()}%,ncm.ilike.%${q.trim()}%`)

  const { data: produtos } = await query

  return (
    <ProdutosView
      produtos={produtos ?? []}
      currentTipo={tipo ?? 'todos'}
      currentAtivo={ativo ?? 'todos'}
      currentQ={q ?? ''}
    />
  )
}
