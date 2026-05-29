import { createClient } from '@/lib/supabase/server'
import EmpresasView from './_components/EmpresasView'

export default async function EmpresasPage() {
  const supabase = await createClient()

  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nome, sigla, cnpj, telefone, email, cep, rua, numero, complemento, bairro, cidade, estado, inscricao_estadual, cor, criado_em')
    .order('nome')

  return <EmpresasView empresas={empresas ?? []} />
}
