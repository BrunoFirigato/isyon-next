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

// ── Vendedor ─────────────────────────────────────────────────────────────────
// clientes/parceiros referenciam o vendedor por duas colunas (maq e pec) → OR.
export async function vinculosVendedor(supabase: SupabaseClient, id: string): Promise<Vinculo[]> {
  const orVend = `vendedor_maq_id.eq.${id},vendedor_pec_id.eq.${id}`
  const [cli, par, leads, ops, props, peds, com, metas, ag] = await Promise.all([
    supabase.from('clientes').select('id',  { count: 'exact', head: true }).or(orVend),
    supabase.from('parceiros').select('id', { count: 'exact', head: true }).or(orVend),
    supabase.from('leads').select('id',         { count: 'exact', head: true }).eq('vendedor_id', id),
    supabase.from('oportunidades').select('id', { count: 'exact', head: true }).eq('vendedor_id', id),
    supabase.from('propostas').select('id',     { count: 'exact', head: true }).eq('vendedor_id', id),
    supabase.from('pedidos').select('id',       { count: 'exact', head: true }).eq('vendedor_id', id),
    supabase.from('comissoes').select('id',     { count: 'exact', head: true }).eq('vendedor_id', id),
    supabase.from('metas').select('id',         { count: 'exact', head: true }).eq('vendedor_id', id),
    supabase.from('agenda').select('id',        { count: 'exact', head: true }).eq('vendedor_id', id),
  ])
  const out: Vinculo[] = []
  const add = (r: { count: number | null }, sing: string, plur: string) => {
    const total = r.count ?? 0
    if (total > 0) out.push({ sing, plur, total })
  }
  add(cli, 'cliente', 'clientes'); add(par, 'parceiro', 'parceiros'); add(leads, 'lead', 'leads')
  add(ops, 'oportunidade', 'oportunidades'); add(props, 'proposta', 'propostas'); add(peds, 'pedido', 'pedidos')
  add(com, 'comissão', 'comissões'); add(metas, 'meta', 'metas'); add(ag, 'item de agenda', 'itens de agenda')
  return out
}

// ── Parceiro comercial ───────────────────────────────────────────────────────
export function vinculosParceiro(supabase: SupabaseClient, id: string) {
  return contarDefs(supabase, [
    ['clientes',          'parceiro_id', 'cliente', 'clientes'],
    ['visitas_parceiros', 'parceiro_id', 'visita',  'visitas'],
  ], id)
}

// ── Empresa ──────────────────────────────────────────────────────────────────
export function vinculosEmpresa(supabase: SupabaseClient, id: string) {
  return contarDefs(supabase, [
    ['clientes',      'empresa_id', 'cliente',      'clientes'],
    ['oportunidades', 'empresa_id', 'oportunidade', 'oportunidades'],
    ['propostas',     'empresa_id', 'proposta',     'propostas'],
    ['pedidos',       'empresa_id', 'pedido',       'pedidos'],
    ['faturas',       'empresa_id', 'fatura',       'faturas'],
    ['parcelas',      'empresa_id', 'parcela',      'parcelas'],
    ['comissoes',     'empresa_id', 'comissão',     'comissões'],
    ['vendedores',    'empresa_id', 'vendedor',     'vendedores'],
    ['parceiros',     'empresa_id', 'parceiro',     'parceiros'],
    ['lancamentos',   'empresa_id', 'lançamento',   'lançamentos'],
  ], id)
}

// ── Condição de pagamento ─────────────────────────────────────────────────────
export function vinculosCondPagamento(supabase: SupabaseClient, id: string) {
  return contarDefs(supabase, [
    ['pedidos',   'cond_pagamento_id', 'pedido',   'pedidos'],
    ['propostas', 'cond_pagamento_id', 'proposta', 'propostas'],
  ], id)
}

// ── Usuário ──────────────────────────────────────────────────────────────────
export function vinculosUsuario(supabase: SupabaseClient, id: string) {
  return contarDefs(supabase, [
    ['rotas_parceiros',   'usuario_id',     'rota de parceiro',          'rotas de parceiro'],
    ['visitas_parceiros', 'usuario_id',     'visita de parceiro',        'visitas de parceiro'],
    ['leads',             'responsavel_id', 'lead sob responsabilidade', 'leads sob responsabilidade'],
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

// ── Inativação (soft delete) ─────────────────────────────────────────────────
// Mapa de como "inativar" cada dado-mãe (campo + valor que representa inativo).
const INATIVACAO: Record<string, { campo: string; valor: unknown }> = {
  clientes:        { campo: 'status', valor: 'inativo' },
  vendedores:      { campo: 'status', valor: 'inativo' },
  parceiros:       { campo: 'status', valor: 'inativo' },
  produtos:        { campo: 'ativo',  valor: false },
  empresas:        { campo: 'ativo',  valor: false },
  transportadoras: { campo: 'ativo',  valor: false },
  cond_pagamentos: { campo: 'ativo',  valor: false },
  usuarios:        { campo: 'ativo',  valor: false },
}

/** A tabela suporta inativação (tem campo ativo/status)? */
export function podeInativar(tabela: string): boolean {
  return tabela in INATIVACAO
}

/** Inativa um registro (soft delete). */
export async function inativarRegistro(supabase: SupabaseClient, tabela: string, id: string) {
  const cfg = INATIVACAO[tabela]
  if (!cfg) return { error: new Error('Inativação não suportada para ' + tabela) }
  return supabase.from(tabela).update({ [cfg.campo]: cfg.valor }).eq('id', id)
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
