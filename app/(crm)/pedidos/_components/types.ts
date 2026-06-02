export interface ItemPedido {
  id: string
  descricao: string
  quantidade: number
  valorUnitario: number
  produto_id?: string | null
  ncm?: string | null
  unidade?: string | null
}

export interface Pedido {
  id: string
  numero: string | null
  status: string
  aprovado: boolean
  valor: number | null
  obs: string | null
  cliente_id: string | null
  vendedor_id: string | null
  proposta_id: string | null
  empresa_id: string | null
  segmento: string | null
  itens: ItemPedido[] | null
  criado_em: string
  atualizado_em: string | null
}

export interface ClienteRef {
  id: string
  nome: string
  empresa: string | null
}

export const STATUS_PEDIDO = [
  { value: 'todos', label: 'Todos' },
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'em_producao', label: 'Em produção' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
] as const

export function statusStyle(status: string) {
  switch (status) {
    case 'aguardando':  return 'bg-yellow-100 text-yellow-700'
    case 'em_producao': return 'bg-blue-100 text-blue-700'
    case 'entregue':    return 'bg-green-100 text-green-700'
    case 'cancelado':   return 'bg-red-100 text-red-600'
    default:            return 'bg-gray-100 text-gray-600'
  }
}

export function statusLabel(status: string) {
  return STATUS_PEDIDO.find((s) => s.value === status)?.label ?? status
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

export function calcTotal(itens: ItemPedido[]): number {
  return itens.reduce((s, it) => s + it.quantidade * it.valorUnitario, 0)
}

export function novoItem(): ItemPedido {
  return {
    id: crypto.randomUUID(),
    descricao: '',
    quantidade: 1,
    valorUnitario: 0,
  }
}
