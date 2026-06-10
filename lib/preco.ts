// lib/preco.ts
// Motor de precificação em cascata (margem = % sobre o CUSTO do produto):
//   1. Override do produto na tabela (preço manual fixo)
//   2. Margem por FAMÍLIA na tabela
//   3. Margem por CATEGORIA na tabela
//   4. Margem por SEGMENTO na tabela
//   5. Margem GERAL da tabela
//   6. Fallback: preço base (legado) ou custo

export interface ProdutoPreco {
  id: string
  custo: number | null
  preco: number | null
  segmento: string | null
  categoria_id?: string | null
  familia_id?: string | null
}
export interface TabelaInfo   { id: string; margem: number | null }
export interface SegMargem    { tabela_id: string; segmento: string; margem: number | null }
export interface Override     { tabela_id: string; produto_id: string; preco: number | null }
export interface ClassifMargem { tabela_id: string; tipo: 'categoria' | 'familia'; ref_id: string; margem: number | null }

function round2(n: number) { return Math.round(n * 100) / 100 }

/** Aplica margem (%) sobre o custo. */
export function aplicarMargem(custo: number, margemPct: number): number {
  return round2(custo * (1 + margemPct / 100))
}

/** Resolve o preço de um produto numa tabela seguindo a cascata. */
export function precoNaTabela(
  produto:   ProdutoPreco,
  tabelaId:  string,
  tabelas:   TabelaInfo[],
  segMargens:SegMargem[],
  overrides: Override[],
  classifMargens: ClassifMargem[] = [],
): number {
  // 1. Override específico (preço manual)
  const ov = overrides.find(o => o.tabela_id === tabelaId && o.produto_id === produto.id)
  if (ov?.preco != null) return ov.preco

  if (produto.custo != null && produto.custo > 0) {
    // 2. Margem por família (mais específica)
    if (produto.familia_id) {
      const f = classifMargens.find(c => c.tabela_id === tabelaId && c.tipo === 'familia' && c.ref_id === produto.familia_id)
      if (f?.margem != null) return aplicarMargem(produto.custo, f.margem)
    }
    // 3. Margem por categoria
    if (produto.categoria_id) {
      const cat = classifMargens.find(c => c.tabela_id === tabelaId && c.tipo === 'categoria' && c.ref_id === produto.categoria_id)
      if (cat?.margem != null) return aplicarMargem(produto.custo, cat.margem)
    }
    // 4. Margem por segmento
    const seg = segMargens.find(s => s.tabela_id === tabelaId && s.segmento === produto.segmento)
    if (seg?.margem != null) return aplicarMargem(produto.custo, seg.margem)
    // 5. Margem geral da tabela
    const tab = tabelas.find(t => t.id === tabelaId)
    if (tab?.margem != null) return aplicarMargem(produto.custo, tab.margem)
  }

  // 6. Fallback: preço base legado, senão o custo
  return produto.preco ?? produto.custo ?? 0
}
