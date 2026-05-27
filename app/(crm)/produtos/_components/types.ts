export interface Produto {
  id: string
  tenant_id: string
  codigo: string | null
  nome: string
  tipo: string        // 'produto' | 'servico'
  unidade: string | null
  preco: number | null
  custo: number | null
  descricao: string | null
  ncm: string | null
  cod_servico: string | null
  cest: string | null
  origem: number | null
  ativo: boolean
  criado_em: string
  atualizado_em: string | null
}

export const TIPOS = [
  { value: 'todos',   label: 'Todos' },
  { value: 'produto', label: 'Produto' },
  { value: 'servico', label: 'Serviço' },
]

export const UNIDADES = [
  'un', 'pc', 'cx', 'pr', 'kg', 'g', 't',
  'l', 'ml', 'mt', 'm²', 'm³', 'h', 'sc',
]

export const ORIGENS = [
  { value: 0, label: '0 – Nacional' },
  { value: 1, label: '1 – Estrangeira (importação direta)' },
  { value: 2, label: '2 – Estrangeira (mercado interno)' },
  { value: 3, label: '3 – Nacional, Cont. Importação 40%–70%' },
  { value: 4, label: '4 – Nacional (processos produtivos básicos)' },
  { value: 5, label: '5 – Nacional, Cont. Importação ≤ 40%' },
  { value: 6, label: '6 – Estrangeira direta, sem similar nacional' },
  { value: 7, label: '7 – Estrangeira mercado interno, sem similar' },
  { value: 8, label: '8 – Nacional, Cont. Importação > 70%' },
]

export function origemLabel(origem: number | null) {
  if (origem == null) return '—'
  return ORIGENS.find((o) => o.value === origem)?.label ?? String(origem)
}

export function tipoStyle(tipo: string) {
  return tipo === 'servico'
    ? 'bg-indigo-50 text-indigo-700'
    : 'bg-blue-50 text-blue-700'
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
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}
