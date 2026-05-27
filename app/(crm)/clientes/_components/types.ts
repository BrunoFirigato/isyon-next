export interface Cliente {
  id: string
  nome: string
  empresa: string | null
  email: string | null
  telefone: string | null
  cpf_cnpj: string | null
  cep: string | null
  rua: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  tipo: string | null
  segmento: string | null
  status: string | null
  valor_total: number | null
  criado_em: string
  atualizado_em: string
}

export const TIPOS = [
  { value: 'todos', label: 'Todos' },
  { value: 'prospect', label: 'Prospect', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  { value: 'cliente', label: 'Cliente', bg: 'bg-green-100', text: 'text-green-700' },
  { value: 'ex-cliente', label: 'Ex-cliente', bg: 'bg-gray-100', text: 'text-gray-600' },
] as const

export const STATUS_CLIENTE = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
]

export const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO',
  'MA','MT','MS','MG','PA','PB','PR','PE','PI',
  'RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

export function tipoStyle(tipo: string | null) {
  const found = TIPOS.find((t) => t.value === tipo)
  return found && found.value !== 'todos' ? `${found.bg} ${found.text}` : 'bg-gray-100 text-gray-600'
}

export function tipoLabel(tipo: string | null) {
  return TIPOS.find((t) => t.value === tipo)?.label ?? tipo ?? '—'
}

// segmentoLabel movido para SegmentosContext — use useSegmentos() nos componentes

export function brl(value: number | null) {
  if (value == null || value === 0) return null
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
