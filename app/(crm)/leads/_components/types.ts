export interface Lead {
  id: string
  nome: string
  empresa: string | null
  email: string | null
  telefone: string | null
  status: string
  origem: string | null
  obs: string | null
  criado_em: string
  atualizado_em: string
}

export const STATUS_LEADS = [
  { value: 'todos', label: 'Todos' },
  { value: 'novo', label: 'Novo', bg: 'bg-blue-100', text: 'text-blue-700' },
  { value: 'contato', label: 'Em contato', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  { value: 'qualificado', label: 'Qualificado', bg: 'bg-purple-100', text: 'text-purple-700' },
  { value: 'convertido', label: 'Convertido', bg: 'bg-green-100', text: 'text-green-700' },
  { value: 'perdido', label: 'Perdido', bg: 'bg-red-100', text: 'text-red-700' },
] as const

export function statusStyle(status: string) {
  const found = STATUS_LEADS.find((s) => s.value === status)
  return found && found.value !== 'todos'
    ? `${found.bg} ${found.text}`
    : 'bg-gray-100 text-gray-600'
}

export function statusLabel(status: string) {
  return STATUS_LEADS.find((s) => s.value === status)?.label ?? status
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
