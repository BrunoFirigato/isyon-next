export interface Lancamento {
  id: string
  tipo: string
  descricao: string
  valor: number
  data: string
  categoria: string | null
  criado_em: string
}

export interface Fatura {
  id: string
  numero: string | null
  status: string
  valor: number | null
  cliente_id: string | null
  pedido_id: string | null
  obs: string | null
  criado_em: string
}

export interface Comissao {
  id: string
  vendedor_id: string | null
  pedido_id: string | null
  status: string
  valor_pedido: number | null
  valor_comissao: number | null
  criado_em: string
}

export interface ClienteRef {
  id: string
  nome: string
  empresa: string | null
}

export interface VendedorRef {
  id: string
  nome: string
}

export const CATEGORIAS_RECEITA = [
  'Venda de equipamentos',
  'Venda de peças',
  'Serviços',
  'Comissão',
  'Outros',
]

export const CATEGORIAS_DESPESA = [
  'Fornecedores',
  'Salários',
  'Aluguel',
  'Marketing',
  'Operacional',
  'Impostos',
  'Outros',
]

export const STATUS_FATURA = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'cancelado', label: 'Cancelado' },
]

export const STATUS_COMISSAO = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'aprovada', label: 'Aprovada' },
  { value: 'pago', label: 'Pago' },
]

export function faturaStatusStyle(status: string) {
  switch (status) {
    case 'pendente':  return 'bg-yellow-100 text-yellow-700'
    case 'pago':      return 'bg-green-100 text-green-700'
    case 'cancelado': return 'bg-red-100 text-red-600'
    default:          return 'bg-gray-100 text-gray-600'
  }
}

export function comissaoStatusStyle(status: string) {
  switch (status) {
    case 'pendente':  return 'bg-yellow-100 text-yellow-700'
    case 'aprovada':  return 'bg-blue-100 text-blue-700'
    case 'pago':      return 'bg-green-100 text-green-700'
    default:          return 'bg-gray-100 text-gray-600'
  }
}

export function statusLabel<T extends { value: string; label: string }>(
  list: T[], value: string
) {
  return list.find((s) => s.value === value)?.label ?? value
}

export function brl(value: number | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
