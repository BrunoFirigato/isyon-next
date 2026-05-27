export interface Vendedor {
  id: string
  nome: string
}

export interface Parceiro {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  cnpj: string | null
  cidade: string | null
  estado: string | null
  status: string | null
  vendedor_maq_id: string | null
  vendedor_pec_id: string | null
  criado_em: string
}

export const STATUS_PARCEIRO = [
  { value: 'todos', label: 'Todos' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
] as const

export const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
]

export function statusStyle(status: string | null) {
  if (status === 'ativo') return 'bg-green-100 text-green-700'
  if (status === 'inativo') return 'bg-gray-100 text-gray-500'
  return 'bg-gray-100 text-gray-500'
}

export function statusLabel(status: string | null) {
  return STATUS_PARCEIRO.find((s) => s.value === status)?.label ?? (status ?? '—')
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
