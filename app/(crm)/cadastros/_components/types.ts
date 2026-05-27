// ─── NCM ─────────────────────────────────────────────────────────────────────
export interface Ncm {
  id: string
  tenant_id: string
  codigo: string
  descricao: string
  aliq_ipi: number | null
  unid_trib: string | null
  created_at: string
}

// ─── Natureza de Operação ─────────────────────────────────────────────────────
export interface NaturezaOperacao {
  id: string
  tenant_id: string
  codigo: string
  descricao: string
  cfop: string | null
  tipo: string | null     // 'entrada' | 'saida'
  obs: string | null
  chave: string | null
  created_at: string
}

// ─── CFOP ─────────────────────────────────────────────────────────────────────
export interface Cfop {
  id: string
  tenant_id: string
  codigo: string
  descricao: string
  tipo: string | null           // 'entrada' | 'saida'
  ativo: boolean
  obs_fiscal: string | null
  csosn: string | null
  cst_icms: string | null
  cst_ipi: string | null
  cst_pis: string | null
  cst_pis_sn: string | null
  cst_cofins: string | null
  cst_cofins_sn: string | null
  created_at: string
}

// ─── Transportadora ───────────────────────────────────────────────────────────
export interface Transportadora {
  id: string
  tenant_id: string
  nome: string
  cnpj: string | null
  contato: string | null
  telefone: string | null
  email: string | null
  obs: string | null
  created_at: string
}

// ─── Condição de Pagamento ────────────────────────────────────────────────────
export interface CondPagamento {
  id: string
  tenant_id: string
  nome: string
  forma: string | null        // 'pix' | 'boleto' | 'cartao' | 'dinheiro' | 'transferencia'
  parcelas: number
  intervalo: number           // dias entre parcelas
  entrada: number | null      // valor de entrada (R$)
  obs: string | null
  ativo: boolean
  desconto: number | null     // % de desconto
  criado_em: string
  atualizado_em: string | null
}

export const FORMAS_PAGAMENTO = [
  { value: 'pix',           label: 'Pix' },
  { value: 'boleto',        label: 'Boleto' },
  { value: 'cartao',        label: 'Cartão' },
  { value: 'dinheiro',      label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cheque',        label: 'Cheque' },
]

export function formaLabel(forma: string | null) {
  return FORMAS_PAGAMENTO.find((f) => f.value === forma)?.label ?? forma ?? '—'
}

export function formaStyle(forma: string | null) {
  switch (forma) {
    case 'pix':           return 'bg-green-50 text-green-700'
    case 'boleto':        return 'bg-blue-50 text-blue-700'
    case 'cartao':        return 'bg-purple-50 text-purple-700'
    case 'dinheiro':      return 'bg-amber-50 text-amber-700'
    case 'transferencia': return 'bg-indigo-50 text-indigo-700'
    case 'cheque':        return 'bg-gray-100 text-gray-600'
    default:              return 'bg-gray-100 text-gray-500'
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function formatDate(str: string | null) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('pt-BR')
}
