export interface Compromisso {
  id: string
  titulo: string
  tipo: string
  data_hora: string
  duracao_min: number | null
  descricao: string | null
  cliente_id: string | null
  lead_id: string | null
  op_id: string | null
  status: string
  criado_em: string
  cliente?: { id: string; nome: string; empresa: string | null } | null
  lead?: { id: string; nome: string } | null
  op?: { id: string; titulo: string; numero: string | null } | null
}

export const TIPOS_COMPROMISSO = [
  { value: 'reuniao',   label: 'Reunião',   dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700'     },
  { value: 'ligacao',   label: 'Ligação',   dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700'   },
  { value: 'visita',    label: 'Visita',    dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700' },
  { value: 'follow_up', label: 'Follow-up', dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700' },
  { value: 'tarefa',    label: 'Tarefa',    dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600'    },
] as const

export const STATUS_COMPROMISSO = [
  { value: 'pendente',  label: 'Pendente'  },
  { value: 'realizado', label: 'Realizado' },
  { value: 'cancelado', label: 'Cancelado' },
] as const

export function tipoInfo(tipo: string) {
  return TIPOS_COMPROMISSO.find(t => t.value === tipo)
    ?? { value: tipo, label: tipo, dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600' }
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateGroup(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
}

export function getDateGroup(iso: string): string {
  const d    = new Date(iso)
  const now  = new Date()
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow  = new Date(today.getTime() + 86_400_000)
  const nextWeek  = new Date(today.getTime() + 7 * 86_400_000)
  const itemDay   = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (itemDay < today)                                  return '__atrasadas'
  if (itemDay.getTime() === today.getTime())            return '__hoje'
  if (itemDay.getTime() === tomorrow.getTime())         return '__amanha'
  if (itemDay < nextWeek)                               return itemDay.toISOString().slice(0, 10)
  return '__proximas_' + itemDay.toISOString().slice(0, 10)
}

export function groupLabel(key: string, iso: string) {
  if (key === '__atrasadas')               return '⚠️ Atrasadas'
  if (key === '__hoje')                    return 'Hoje'
  if (key === '__amanha')                  return 'Amanhã'
  if (key.startsWith('__proximas_'))      return formatDateGroup(iso)
  return formatDateGroup(iso)
}
