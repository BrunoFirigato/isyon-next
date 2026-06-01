export interface Cliente {
  id: string
  nome: string
  empresa: string | null
  email: string | null
  telefone: string | null
  tipo_pessoa: string | null     // 'fisica' | 'juridica'
  cpf_cnpj: string | null
  inscricao_estadual: string | null
  indicador_ie: string | null   // '1' contribuinte | '2' isento | '9' não contribuinte
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
  origem: string | null
  lead_id: string | null
  vendedor_maq_id: string | null
  vendedor_pec_id: string | null
  parceiro_id: string | null
  criado_em: string
  atualizado_em: string
}

export interface VendedorRef {
  id: string
  nome: string
}

export interface ParceiroRef {
  id: string
  nome: string
}

// tipo = canal comercial (não muda no tempo)
export const TIPOS = [
  { value: 'todos',   label: 'Todos' },
  { value: 'direto',  label: 'Direto',  bg: 'bg-blue-100',   text: 'text-blue-700'   },
  { value: 'revenda', label: 'Revenda', bg: 'bg-indigo-100', text: 'text-indigo-700' },
] as const

// status = fase no fluxo comercial (evolui no tempo)
export const STATUS_CLIENTE = [
  { value: 'todos',    label: 'Todos' },
  { value: 'prospect', label: 'Prospect', dot: 'bg-blue-500',   text: 'text-blue-700',  bg: 'bg-blue-50'  },
  { value: 'ativo',    label: 'Ativo',    dot: 'bg-green-500',  text: 'text-green-700', bg: 'bg-green-50' },
  { value: 'inativo',  label: 'Inativo',  dot: 'bg-gray-400',   text: 'text-gray-500',  bg: 'bg-gray-50'  },
] as const

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

export function statusStyle(status: string | null) {
  const found = STATUS_CLIENTE.find((s) => s.value === status)
  return found && found.value !== 'todos'
    ? { dot: found.dot, text: found.text, bg: found.bg }
    : { dot: 'bg-gray-400', text: 'text-gray-500', bg: 'bg-gray-50' }
}

export function statusLabel(status: string | null) {
  return STATUS_CLIENTE.find((s) => s.value === status)?.label ?? status ?? '—'
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
