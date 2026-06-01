'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, Search, Tag, Save, X, Percent } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
import { useSegmentos } from '@/app/(crm)/_components/SegmentosContext'
import {
  type TabelaPreco, type TabelaPrecoItem, type TabelaMargemSegmento, type ProdutoRef, brl,
} from './types'

interface Props {
  tabelas:    TabelaPreco[]
  produtos:   ProdutoRef[]
  itens:      TabelaPrecoItem[]
  segMargens: TabelaMargemSegmento[]
}

function parseNum(v: string): number | null {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? null : n
}

export default function TabelasPrecoView({ tabelas, produtos, itens, segMargens }: Props) {
  const router    = useRouter()
  const toast     = useToast()
  const tenantId  = useTenantId()
  const segmentos = useSegmentos()

  const [selectedId, setSelectedId] = useState<string>(tabelas[0]?.id ?? '')
  const [busca,      setBusca]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [novaOpen,   setNovaOpen]   = useState(false)
  const [novoNome,   setNovoNome]   = useState('')
  const [deletando,  setDeletando]  = useState<TabelaPreco | null>(null)

  // Estado editável da tabela selecionada
  const tabelaSel = tabelas.find(t => t.id === selectedId)
  const [margemGeral, setMargemGeral] = useState<string>(tabelaSel?.margem != null ? String(tabelaSel.margem) : '')
  const [segs,     setSegs]     = useState<Record<string, string>>(() => buildSegs(selectedId))
  const [overrides, setOverrides] = useState<Record<string, string>>(() => buildOverrides(selectedId))

  function buildSegs(tid: string): Record<string, string> {
    const m: Record<string, string> = {}
    segMargens.filter(s => s.tabela_id === tid).forEach(s => { if (s.margem != null) m[s.segmento] = String(s.margem) })
    return m
  }
  function buildOverrides(tid: string): Record<string, string> {
    const m: Record<string, string> = {}
    itens.filter(i => i.tabela_id === tid).forEach(i => { if (i.preco != null) m[i.produto_id] = String(i.preco) })
    return m
  }

  function selecionar(id: string) {
    setSelectedId(id)
    const t = tabelas.find(x => x.id === id)
    setMargemGeral(t?.margem != null ? String(t.margem) : '')
    setSegs(buildSegs(id))
    setOverrides(buildOverrides(id))
    setBusca('')
  }

  // Preço calculado (live) seguindo a cascata, usando o estado editável
  function precoCalc(p: ProdutoRef): { valor: number; fonte: string } {
    const ov = overrides[p.id]?.trim()
    if (ov) { const n = parseNum(ov); if (n != null) return { valor: n, fonte: 'override' } }
    if (p.custo != null && p.custo > 0) {
      const segM = parseNum(segs[p.segmento ?? ''] ?? '')
      if (segM != null) return { valor: Math.round(p.custo * (1 + segM / 100) * 100) / 100, fonte: 'segmento' }
      const gm = parseNum(margemGeral)
      if (gm != null) return { valor: Math.round(p.custo * (1 + gm / 100) * 100) / 100, fonte: 'geral' }
    }
    return { valor: p.preco ?? 0, fonte: 'base' }
  }

  const produtosFiltrados = produtos.filter(p =>
    !busca.trim() || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.codigo?.toLowerCase().includes(busca.toLowerCase())
  )

  // ─── Criar / excluir tabela ──────────────────────────────────────────────
  async function criarTabela() {
    if (!novoNome.trim()) return
    const supabase = createClient()
    const { data, error } = await supabase.from('tabelas_preco')
      .insert({ tenant_id: tenantId, nome: novoNome.trim(), ativo: true }).select('id').single()
    if (error) { toast('Erro ao criar tabela', 'error'); return }
    toast('Tabela criada!'); setNovaOpen(false); setNovoNome('')
    if (data) setSelectedId(data.id)
    router.refresh()
  }
  async function excluirTabela() {
    if (!deletando) return
    const supabase = createClient()
    const { error } = await supabase.from('tabelas_preco').delete().eq('id', deletando.id)
    setDeletando(null)
    if (error) { toast('Erro ao excluir', 'error'); return }
    toast('Tabela excluída', 'info'); router.refresh()
  }

  // ─── Salvar (margem geral + por segmento + overrides) ────────────────────
  async function salvar() {
    if (!selectedId) return
    setSaving(true)
    const supabase = createClient()

    // 1. Margem geral da tabela
    await supabase.from('tabelas_preco').update({ margem: parseNum(margemGeral) }).eq('id', selectedId)

    // 2. Margens por segmento (upsert não-vazias, deleta vazias existentes)
    const segUpsert = Object.entries(segs)
      .filter(([, v]) => v.trim() !== '')
      .map(([segmento, v]) => ({ tenant_id: tenantId, tabela_id: selectedId, segmento, margem: parseNum(v) }))
    if (segUpsert.length)
      await supabase.from('tabela_margem_segmento').upsert(segUpsert, { onConflict: 'tabela_id,segmento' })
    const segDelete = segMargens.filter(s => s.tabela_id === selectedId && !segs[s.segmento]?.trim()).map(s => s.id)
    if (segDelete.length) await supabase.from('tabela_margem_segmento').delete().in('id', segDelete)

    // 3. Overrides por produto
    const ovUpsert = Object.entries(overrides)
      .filter(([, v]) => v.trim() !== '')
      .map(([produto_id, v]) => ({ tenant_id: tenantId, tabela_id: selectedId, produto_id, preco: parseNum(v) }))
    if (ovUpsert.length)
      await supabase.from('tabela_preco_itens').upsert(ovUpsert, { onConflict: 'tabela_id,produto_id' })
    const ovDelete = itens.filter(i => i.tabela_id === selectedId && !overrides[i.produto_id]?.trim()).map(i => i.id)
    if (ovDelete.length) await supabase.from('tabela_preco_itens').delete().in('id', ovDelete)

    setSaving(false)
    toast('Tabela salva!')
    router.refresh()
  }

  const numInput = 'w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm text-right dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Tabelas de preço</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {tabelas.length} tabela{tabelas.length !== 1 ? 's' : ''} · {produtos.length} produtos
          </p>
        </div>
        <button onClick={() => setNovaOpen(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
          <Plus size={16} /> <span className="hidden sm:inline">Nova tabela</span><span className="sm:hidden">Nova</span>
        </button>
      </div>

      {tabelas.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm py-16 text-center">
          <Tag size={32} className="mx-auto text-gray-200 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma tabela de preço cadastrada.</p>
          <button onClick={() => setNovaOpen(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">+ Criar primeira tabela</button>
        </div>
      ) : (
        <>
          {/* Chips de tabelas */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
            {tabelas.map(t => (
              <button key={t.id} onClick={() => selecionar(t.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedId === t.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                {t.nome}
                {selectedId === t.id && (
                  <span onClick={(e) => { e.stopPropagation(); setDeletando(t) }} className="ml-1 -mr-1 p-0.5 rounded hover:bg-white/20"><Trash2 size={12} /></span>
                )}
              </button>
            ))}
          </div>

          {/* Margens (geral + por segmento) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Percent size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Margens da tabela</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Margem geral (%)</label>
                <input type="number" value={margemGeral} onChange={(e) => setMargemGeral(e.target.value)}
                  placeholder="ex: 50" className={`${numInput} w-full text-left`} />
              </div>
              {segmentos.map(seg => (
                <div key={seg.value}>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Margem {seg.label} (%)</label>
                  <input type="number" value={segs[seg.value] ?? ''} onChange={(e) => setSegs(p => ({ ...p, [seg.value]: e.target.value }))}
                    placeholder="herda geral" className={`${numInput} w-full text-left`} />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
              Preço = custo × (1 + margem). Segmento sem margem herda a geral; produtos sem custo usam o preço base.
            </p>
          </div>

          {/* Busca */}
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto para ajuste manual..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100" />
          </div>

          {/* Produtos: preço calculado + override */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_110px_110px] gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Produto</span>
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Custo</span>
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Preço calc.</span>
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Override</span>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-[55vh] overflow-y-auto">
              {produtosFiltrados.slice(0, 200).map(p => {
                const calc = precoCalc(p)
                return (
                  <div key={p.id} className="grid grid-cols-[1fr_100px_110px_110px] gap-2 items-center px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{p.nome}</p>
                      {p.segmento && <p className="text-[11px] text-gray-400">{segmentos.find(s => s.value === p.segmento)?.label ?? p.segmento}</p>}
                    </div>
                    <span className="text-sm text-gray-400 dark:text-gray-500 text-right">{brl(p.custo)}</span>
                    <span className={`text-sm text-right font-medium ${calc.fonte === 'override' ? 'text-amber-600' : 'text-gray-900 dark:text-gray-100'}`}>
                      {brl(calc.valor)}
                    </span>
                    <div className="flex justify-end">
                      <input type="number" min="0" step="0.01" value={overrides[p.id] ?? ''}
                        onChange={(e) => setOverrides(prev => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="—" className={numInput} />
                    </div>
                  </div>
                )
              })}
              {produtos.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Tag size={28} className="mx-auto text-gray-200 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Nenhum produto cadastrado.</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Cadastre ou importe produtos em{' '}
                    <Link href="/produtos" className="text-blue-600 hover:underline font-medium">Produtos</Link>
                    {' '}— eles aparecem aqui automaticamente para definir os preços.
                  </p>
                </div>
              ) : produtosFiltrados.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhum produto encontrado para a busca.</p>
              ) : null}
              {produtosFiltrados.length > 200 && (
                <p className="text-[11px] text-gray-400 text-center py-3">Mostrando 200 de {produtosFiltrados.length}. Refine a busca para ajustes específicos.</p>
              )}
            </div>
            <div className="flex justify-end px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
              <button onClick={salvar} disabled={saving}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <Save size={14} /> {saving ? 'Salvando...' : 'Salvar tabela'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal nova tabela */}
      {novaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNovaOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Nova tabela de preço</h3>
              <button onClick={() => setNovaOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={18} /></button>
            </div>
            <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') criarTabela() }}
              placeholder="Ex: Revenda, Atacado, Black Friday..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm mb-4 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-3">
              <button onClick={() => setNovaOpen(false)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={criarTabela} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm">Criar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal excluir */}
      {deletando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletando(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir tabela?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">A tabela <strong>{deletando.nome}</strong> e suas margens/preços serão removidos.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletando(null)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={excluirTabela} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
