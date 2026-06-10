// lib/preco.ts
// Motor de precificação em cascata (margem = % sobre o CUSTO do produto):
//   1. Override do produto na tabela (preço manual fixo)
//   2. Margem por segmento na tabela
//   3. Margem geral da tabela
//   4. Fallback: preço base (legado) ou custo

export interface ProdutoPreco { id: string; custo: number | null; preco: number | null; segmento: string | null }
export interface TabelaInfo   { id: string; margem: number | null }
export interface SegMargem    { tabela_id: string; segmento: string; margem: number | null }
export interface Override     { tabela_id: string; produto_id: string; preco: number | null }

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
): number {
  // 1. Override específico (preço manual)
  const ov = overrides.find(o => o.tabela_id === tabelaId && o.produto_id === produto.id)
  if (ov?.preco != null) return ov.preco

  // 2 e 3: margem (% sobre o custo)
  if (produto.custo != null && produto.custo > 0) {
    const seg = segMargens.find(s => s.tabela_id === tabelaId && s.segmento === produto.segmento)
    if (seg?.margem != null) return aplicarMargem(produto.custo, seg.margem)

    const tab = tabelas.find(t => t.id === tabelaId)
    if (tab?.margem != null) return aplicarMargem(produto.custo, tab.margem)
  }

  // 4. Fallback: preço base legado, senão o custo
  return produto.preco ?? produto.custo ?? 0
}
