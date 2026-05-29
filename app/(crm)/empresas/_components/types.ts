export interface Empresa {
  id: string
  nome: string
  sigla: string
  cnpj: string | null
  razao_social: string | null
  // Contato
  telefone: string | null
  email: string | null
  // Endereço
  cep: string | null
  rua: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  // Fiscal
  inscricao_estadual: string | null
  inscricao_municipal: string | null
  regime_tributario: string | null
  crt: string | null
  cnae: string | null
  // NF-e
  token_brasilnfe: string | null
  ambiente_nfe: string | null
  aliq_pis: number | null
  aliq_cofins: number | null
  // Visual
  cor: string | null
  criado_em: string
}
