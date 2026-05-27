export interface Vendedor {
  id: string
  tenant_id: string
  empresa_id: string | null
  nome: string
  email: string | null
  telefone: string | null
  cargo: string | null
  ramal: string | null
  segmentos: string[]
  status: string
  perc_comissao: number | null
  criado_em: string
}

export const STATUS_VENDEDOR = [
  { value: 'todos', label: 'Todos' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
]

export function statusStyle(status: string) {
  return status === 'ativo'
    ? 'bg-green-100 text-green-700'
    : 'bg-gray-100 text-gray-500'
}

// segmentosLabel movido para SegmentosContext — use useSegmentos() nos componentes

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
