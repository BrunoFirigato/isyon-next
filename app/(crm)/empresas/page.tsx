import { createClient } from '@/lib/supabase/server'
import EmpresasView from './_components/EmpresasView'

export default async function EmpresasPage() {
  const supabase = await createClient()

  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, nome, sigla, cnpj, razao_social, telefone, email, cep, rua, numero, complemento, bairro, cidade, estado, inscricao_estadual, inscricao_municipal, regime_tributario, crt, cnae, token_brasilnfe, ambiente_nfe, aliq_pis, aliq_cofins, cor, criado_em')
    .order('nome')

  return <EmpresasView empresas={empresas ?? []} />
}
