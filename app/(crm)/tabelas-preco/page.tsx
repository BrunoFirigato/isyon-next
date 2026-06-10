import { createClient } from '@/lib/supabase/server'
import TabelasPrecoView from './_components/TabelasPrecoView'

export default async function TabelasPrecoPage() {
  const supabase = await createClient()

  const [
    { data: tabelas }, { data: produtos }, { data: segMargens },
    { data: categorias }, { data: familias }, { data: classifMargens },
  ] = await Promise.all([
    supabase.from('tabelas_preco').select('id, nome, ativo, margem, desconto_maximo, criado_em').order('nome'),
    supabase.from('produtos').select('id, nome, codigo, custo, preco, segmento, categoria_id, familia_id, tipo').not('ativo', 'is', false).order('nome'),
    supabase.from('tabela_margem_segmento').select('id, tabela_id, segmento, margem'),
    supabase.from('categorias').select('id, nome').order('nome'),
    supabase.from('familias').select('id, nome').order('nome'),
    supabase.from('tabela_margem_classif').select('id, tabela_id, tipo, ref_id, margem, desconto_maximo'),
  ])

  return (
    <TabelasPrecoView
      tabelas={tabelas ?? []}
      produtos={produtos ?? []}
      segMargens={segMargens ?? []}
      categorias={categorias ?? []}
      familias={familias ?? []}
      classifMargens={classifMargens ?? []}
    />
  )
}
