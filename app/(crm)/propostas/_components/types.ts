export interface ItemProposta {
  id: string
  descricao: string
  quantidade: number
  valorUnitario: number
}

export interface Proposta {
  id: string
  titulo: string
  numero: string | null
  status: string
  valor: number | null
  obs: string | null
  cliente_id: string | null
  vendedor_id: string | null
  validade: string | null
  segmento: string | null
  itens: ItemProposta[] | null
  criado_em: string
}

export interface ClienteRef {
  id: string
  nome: string
  empresa: string | null
  email?: string | null
}

export const STATUS_PROPOSTA = [
  { value: 'todos', label: 'Todas' },
  { value: 'rascunho', label: 'Rascunho', bg: 'bg-gray-100', text: 'text-gray-600' },
  { value: 'enviada', label: 'Enviada', bg: 'bg-blue-100', text: 'text-blue-700' },
  { value: 'aprovada', label: 'Aprovada', bg: 'bg-green-100', text: 'text-green-700' },
  { value: 'recusada', label: 'Recusada', bg: 'bg-red-100', text: 'text-red-700' },
] as const

export function statusStyle(status: string) {
  const s = STATUS_PROPOSTA.find((x) => x.value === status)
  return s && s.value !== 'todos' ? `${s.bg} ${s.text}` : 'bg-gray-100 text-gray-600'
}

export function statusLabel(status: string) {
  return STATUS_PROPOSTA.find((x) => x.value === status)?.label ?? status
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

export function calcTotal(itens: ItemProposta[]): number {
  return itens.reduce((s, it) => s + it.quantidade * it.valorUnitario, 0)
}

export function novoItem(): ItemProposta {
  return {
    id: crypto.randomUUID(),
    descricao: '',
    quantidade: 1,
    valorUnitario: 0,
  }
}
