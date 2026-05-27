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

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function formatDate(str: string | null) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('pt-BR')
}
