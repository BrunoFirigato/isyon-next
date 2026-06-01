import { createClient } from '@/lib/supabase/server'
import TabelasPrecoView from './_components/TabelasPrecoView'

export default async function TabelasPrecoPage() {
  const supabase = await createClient()

  const [{ data: tabelas }, { data: produtos }, { data: itens }] = await Promise.all([
    supabase.from('tabelas_preco').select('id, nome, ativo, criado_em').order('nome'),
    supabase.from('produtos').select('id, nome, codigo, preco, tipo').eq('ativo', true).order('nome'),
    supabase.from('tabela_preco_itens').select('id, tabela_id, produto_id, preco'),
  ])

  return (
    <TabelasPrecoView
      tabelas={tabelas ?? []}
      produtos={produtos ?? []}
      itens={itens ?? []}
    />
  )
}
