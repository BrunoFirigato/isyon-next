export interface Campanha {
  id: string
  titulo: string
  tipo: string
  status: string
  publico_tipo: string
  publico_segmento: string | null
  publico_status: string | null
  assunto: string | null
  mensagem: string
  total_destinatarios: number
  total_enviados: number
  total_erros: number
  enviado_em: string | null
  criado_em: string
}

export const TIPOS_CAMPANHA = [
  { value: 'email',    label: 'E-mail',   icon: '✉️' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
] as const

export const STATUS_CAMPANHA = [
  { value: 'rascunho',  label: 'Rascunho',  color: 'bg-gray-100 text-gray-600'      },
  { value: 'agendada',  label: 'Agendada',  color: 'bg-blue-50 text-blue-700'        },
  { value: 'enviando',  label: 'Enviando',  color: 'bg-amber-50 text-amber-700'      },
  { value: 'enviada',   label: 'Enviada',   color: 'bg-green-50 text-green-700'      },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-red-50 text-red-600'          },
] as const

export const PUBLICO_TIPOS = [
  { value: 'clientes', label: 'Clientes'  },
  { value: 'leads',    label: 'Leads'     },
  { value: 'ambos',    label: 'Clientes + Leads' },
] as const

export function statusInfo(status: string) {
  return STATUS_CAMPANHA.find(s => s.value === status)
    ?? { value: status, label: status, color: 'bg-gray-100 text-gray-600' }
}

export function tipoInfo(tipo: string) {
  return TIPOS_CAMPANHA.find(t => t.value === tipo)
    ?? { value: tipo, label: tipo, icon: '📣' }
}

export function formatEnviado(c: Campanha): string {
  if (!c.enviado_em) return '—'
  return new Date(c.enviado_em).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
