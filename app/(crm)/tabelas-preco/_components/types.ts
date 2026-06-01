export interface TabelaPreco {
  id: string
  nome: string
  ativo: boolean
  criado_em: string
}

export interface TabelaPrecoItem {
  id: string
  tabela_id: string
  produto_id: string
  preco: number | null
}

export interface ProdutoRef {
  id: string
  nome: string
  codigo: string | null
  preco: number | null
  tipo: string | null
}

export function brl(value: number | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value)
}
