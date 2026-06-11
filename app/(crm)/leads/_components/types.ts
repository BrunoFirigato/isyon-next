export interface Lead {
  id: string
  nome: string
  empresa: string | null
  email: string | null
  telefone: string | null
  status: string
  origem: string | null
  obs: string | null
  // Qualificação
  vendedor_id: string | null
  cargo: string | null
  cidade: string | null
  estado: string | null
  faturamento: string | null
  funcionarios: string | null
  score: string | null
  criado_em: string
  atualizado_em: string
}

// ── Opções de qualificação ────────────────────────────────────────────────────
export const CARGOS = [
  'Comprador(a)', 'Diretor(a)', 'Gerente', 'Supervisor(a)',
  'Coordenador(a)', 'Analista', 'Sócio(a) / Proprietário(a)', 'Outro',
]

export const FATURAMENTO_FAIXAS = [
  'Até R$ 360 mil (ME)',
  'R$ 360 mil – 4,8 mi (EPP)',
  'R$ 4,8 mi – 20 mi',
  'R$ 20 mi – 100 mi',
  'Acima de R$ 100 mi',
]

export const FUNCIONARIOS_FAIXAS = ['1 a 9', '10 a 49', '50 a 99', '100 a 499', '500+']

export const SCORE_OPTIONS = [
  { value: 'quente', label: 'Quente', emoji: '🔥', bg: 'bg-red-100 dark:bg-red-900/30',   text: 'text-red-700 dark:text-red-300' },
  { value: 'morno',  label: 'Morno',  emoji: '🌤️', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  { value: 'frio',   label: 'Frio',   emoji: '❄️', bg: 'bg-sky-100 dark:bg-sky-900/30',    text: 'text-sky-700 dark:text-sky-300' },
] as const

export function scoreInfo(score: string | null | undefined) {
  return SCORE_OPTIONS.find((s) => s.value === score) ?? null
}

export const ORIGEM_OPTIONS = [
  'Site', 'Indicação', 'LinkedIn', 'WhatsApp',
  'Evento', 'Prospecção', 'Parceiro', 'Outro',
] as const

export const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

// ── Paginação ─────────────────────────────────────────────────────────────────
export const LEADS_PAGE_SIZE = 30
// Colunas carregadas em toda listagem de lead (servidor e "carregar mais" no cliente)
export const LEAD_COLS = 'id, nome, empresa, email, telefone, status, origem, obs, vendedor_id, cargo, cidade, estado, faturamento, funcionarios, score, criado_em, atualizado_em'

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
