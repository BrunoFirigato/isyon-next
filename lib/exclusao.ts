// lib/exclusao.ts
// Travas de exclusão: antes de apagar um registro, conta vínculos em outras
// tabelas e devolve uma lista legível para bloquear com mensagem clara.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Vinculo { sing: string; plur: string; total: number }

// Definição de referência: tabela, coluna FK, rótulo singular, rótulo plural
type Def = [tabela: string, coluna: string, sing: string, plur: string]

async function contarDefs(supabase: SupabaseClient, defs: Def[], id: string): Promise<Vinculo[]> {
  const res = await Promise.all(defs.map(async ([tabela, coluna, sing, plur]) => {
    const { count } = await supabase.from(tabela).select('id', { count: 'exact', head: true }).eq(coluna, id)
    return { sing, plur, total: count ?? 0 }
  }))
  return res.filter(v => v.total > 0)
}

// ── Cliente ────────────────────────────────────────────────────────────────
export function vinculosCliente(supabase: SupabaseClient, id: string) {
  return contarDefs(supabase, [
    ['pedidos',       'cliente_id', 'pedido',      'pedidos'],
    ['propostas',     'cliente_id', 'proposta',    'propostas'],
    ['oportunidades', 'cliente_id', 'oportunidade','oportunidades'],
    ['faturas',       'cliente_id', 'fatura',      'faturas'],
    ['notas_fiscais', 'cliente_id', 'nota fiscal', 'notas fiscais'],
    ['parcelas',      'cliente_id', 'parcela',     'parcelas'],
    ['comissoes',     'cliente_id', 'comissão',    'comissões'],
    ['tickets',       'cliente_id', 'ticket',      'tickets'],
    ['agenda',        'cliente_id', 'item de agenda', 'itens de agenda'],
    ['documentos',    'cliente_id', 'documento',   'documentos'],
  ], id)
}

// ── Lead ───────────────────────────────────────────────────────────────────
export function vinculosLead(supabase: SupabaseClient, id: string) {
  return contarDefs(supabase, [
    ['clientes',      'lead_id', 'cliente',      'clientes'],
    ['oportunidades', 'lead_id', 'oportunidade', 'oportunidades'],
    ['agenda',        'lead_id', 'item de agenda', 'itens de agenda'],
    ['compromissos',  'lead_id', 'compromisso',  'compromissos'],
    ['historico',     'lead_id', 'interação',    'interações'],
  ], id)
}

// ── Oportunidade ─────────────────────────────────────────────────────────────
export function vinculosOportunidade(supabase: SupabaseClient, id: string) {
  return contarDefs(supabase, [
    ['propostas', 'oportunidade_id', 'proposta',       'propostas'],
    ['agenda',    'op_id',           'item de agenda', 'itens de agenda'],
  ], id)
}

// ── Proposta ─────────────────────────────────────────────────────────────────
export function vinculosProposta(supabase: SupabaseClient, id: string) {
  return contarDefs(supabase, [
    ['pedidos', 'proposta_id', 'pedido', 'pedidos'],
  ], id)
}

// ── Pedido ───────────────────────────────────────────────────────────────────
export function vinculosPedido(supabase: SupabaseClient, id: string) {
  return contarDefs(supabase, [
    ['faturas',    'pedido_id', 'fatura',    'faturas'],
    ['parcelas',   'pedido_id', 'parcela',   'parcelas'],
    ['comissoes',  'pedido_id', 'comissão',  'comissões'],
    ['expedicoes', 'pedido_id', 'expedição', 'expedições'],
  ], id)
}

// ── Produto ──────────────────────────────────────────────────────────────────
// Produtos não têm FK em pedidos/propostas — ficam no JSONB `itens`.
// Usamos contains (@>) para detectar o produto dentro dos itens.
export async function vinculosProduto(supabase: SupabaseClient, id: string): Promise<Vinculo[]> {
  const [ped, prop] = await Promise.all([
    supabase.from('pedidos').select('id', { count: 'exact', head: true }).contains('itens', [{ produto_id: id }]),
    supabase.from('propostas').select('id', { count: 'exact', head: true }).contains('itens', [{ produto_id: id }]),
  ])
  const out: Vinculo[] = []
  if ((ped.count ?? 0) > 0)  out.push({ sing: 'pedido',   plur: 'pedidos',   total: ped.count!  })
  if ((prop.count ?? 0) > 0) out.push({ sing: 'proposta', plur: 'propostas', total: prop.count! })
  return out
}

// ── Mensagem ─────────────────────────────────────────────────────────────────
/** "3 pedidos e 1 proposta" */
export function descreverVinculos(vinculos: Vinculo[]): string {
  const partes = vinculos.map(v => `${v.total} ${v.total === 1 ? v.sing : v.plur}`)
  if (partes.length <= 1) return partes[0] ?? ''
  return partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1]
}

/** Mensagem completa pronta para o toast. */
export function mensagemBloqueio(vinculos: Vinculo[]): string {
  return `Não é possível excluir: vinculado a ${descreverVinculos(vinculos)}. Remova ou desvincule esses registros antes.`
}
