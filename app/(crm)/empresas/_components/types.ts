export interface Empresa {
  id: string
  nome: string
  sigla: string
  cnpj: string | null
  telefone: string | null
  email: string | null
  cep: string | null
  rua: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  inscricao_estadual: string | null
  cor: string | null
  criado_em: string
}
