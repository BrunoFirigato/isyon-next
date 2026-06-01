import { createClient } from '@/lib/supabase/server'
import TabelasPrecoView from './_components/TabelasPrecoView'

export default async function TabelasPrecoPage() {
  const supabase = await createClient()

  const [{ data: tabelas }, { data: produtos }, { data: itens }, { data: segMargens }] = await Promise.all([
    supabase.from('tabelas_preco').select('id, nome, ativo, margem, criado_em').order('nome'),
    supabase.from('produtos').select('id, nome, codigo, custo, preco, segmento, tipo').eq('ativo', true).order('nome'),
    supabase.from('tabela_preco_itens').select('id, tabela_id, produto_id, preco'),
    supabase.from('tabela_margem_segmento').select('id, tabela_id, segmento, margem'),
  ])

  return (
    <TabelasPrecoView
      tabelas={tabelas ?? []}
      produtos={produtos ?? []}
      itens={itens ?? []}
      segMargens={segMargens ?? []}
    />
  )
}
