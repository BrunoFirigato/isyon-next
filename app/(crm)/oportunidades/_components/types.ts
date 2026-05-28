export interface Oportunidade {
  id: string
  titulo: string
  status: string
  valor: number | null
  etapa: string | null
  numero: string | null
  segmento: string | null
  lead_id: string | null
  cliente_id: string | null
  vendedor_id: string | null
  empresa_id: string | null
  prazo_fechamento: string | null
  motivo_perda: string | null
  criado_em: string
  atualizado_em: string
}

export const ETAPAS = ['Prospecção', 'Qualificação', 'Proposta', 'Negociação'] as const
export type Etapa = (typeof ETAPAS)[number]

export function brl(value: number | null) {
  if (value == null) return '—'
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

export function etapaCanonica(etapa: string | null): string {
  if (!etapa) return 'Prospecção'
  const found = ETAPAS.find((e) => e.toLowerCase() === etapa.toLowerCase())
  return found ?? etapa
}

export function proximaEtapa(etapa: string | null): Etapa | null {
  const atual = etapaCanonica(etapa)
  const idx = ETAPAS.indexOf(atual as Etapa)
  return idx >= 0 && idx < ETAPAS.length - 1 ? ETAPAS[idx + 1] : null
}
