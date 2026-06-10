'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, Search, Tag, Save, X, Percent, Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
import { useSegmentos } from '@/app/(crm)/_components/SegmentosContext'
import {
  type TabelaPreco, type TabelaMargemSegmento, type TabelaMargemClassif,
  type ProdutoRef, type Classificacao, brl,
} from './types'

interface Props {
  tabelas:        TabelaPreco[]
  produtos:       ProdutoRef[]
  segMargens:     TabelaMargemSegmento[]
  categorias:     Classificacao[]
  familias:       Classificacao[]
  classifMargens: TabelaMargemClassif[]
}

function parseNum(v: string): number | null {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? null : n
}

type Regra = { margem: string; desconto: string }

export default function TabelasPrecoView({ tabelas, produtos, segMargens, categorias, familias, classifMargens }: Props) {
  const router    = useRouter()
  const toast     = useToast()
  const tenantId  = useTenantId()
  const segmentos = useSegmentos()

  const catNome = Object.fromEntries(categorias.map(c => [c.id, c.nome]))
  const famNome = Object.fromEntries(familias.map(f => [f.id, f.nome]))

  const [selectedId, setSelectedId] = useState<string>(tabelas[0]?.id ?? '')
  const [busca,      setBusca]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [novaOpen,   setNovaOpen]   = useState(false)
  const [novoNome,   setNovoNome]   = useState('')
  const [deletando,  setDeletando]  = useState<TabelaPreco | null>(null)

  // Seletores de escopo (regra por categoria/família)
  const [catSel, setCatSel] = useState('')
  const [famSel, setFamSel] = useState('')

  // Estado editável da tabela selecionada
  const tabelaSel = tabelas.find(t => t.id === selectedId)
  const [margemGeral,   setMargemGeral]   = useState<string>(tabelaSel?.margem != null ? String(tabelaSel.margem) : '')
  const [descontoGeral, setDescontoGeral] = useState<string>(tabelaSel?.desconto_maximo != null ? String(tabelaSel.desconto_maximo) : '')
  const [segs,    setSegs]    = useState<Record<string, string>>(() => buildSegs(selectedId))
  const [classif, setClassif] = useState<Record<string, Regra>>(() => buildClassif(selectedId))

  function buildSegs(tid: string): Record<string, string> {
    const m: Record<string, string> = {}
    segMargens.filter(s => s.tabela_id === tid).forEach(s => { if (s.margem != null) m[s.segmento] = String(s.margem) })
    return m
  }
  function buildClassif(tid: string): Record<string, Regra> {
    const m: Record<string, Regra> = {}
    classifMargens.filter(c => c.tabela_id === tid).forEach(c => {
      m[`${c.tipo}:${c.ref_id}`] = {
        margem:   c.margem != null ? String(c.margem) : '',
        desconto: c.desconto_maximo != null ? String(c.desconto_maximo) : '',
      }
    })
    return m
  }

  function selecionar(id: string) {
    setSelectedId(id)
    const t = tabelas.find(x => x.id === id)
    setMargemGeral(t?.margem != null ? String(t.margem) : '')
    setDescontoGeral(t?.desconto_maximo != null ? String(t.desconto_maximo) : '')
    setSegs(buildSegs(id))
    setClassif(buildClassif(id))
    setCatSel(''); setFamSel(''); setBusca('')
  }

  // Escopo ativo p/ os campos da regra específica
  const scopeKey = famSel ? `fam:${famSel}` : catSel ? `cat:${catSel}` : ''
  const scopeNome = famSel ? (famNome[famSel] ?? 'família') : catSel ? (catNome[catSel] ?? 'categoria') : ''
  const regraAtual = scopeKey ? (classif[scopeKey] ?? { margem: '', desconto: '' }) : { margem: '', desconto: '' }
  function setRegra(campo: keyof Regra, v: string) {
    if (!scopeKey) return
    setClassif(prev => ({ ...prev, [scopeKey]: { ...(prev[scopeKey] ?? { margem: '', desconto: '' }), [campo]: v } }))
  }

  // ── Cálculo do preço (cascata: família › categoria › segmento › geral) ──
  function precoCalc(p: ProdutoRef): number {
    if (p.custo != null && p.custo > 0) {
      const fm = p.familia_id ? parseNum(classif[`fam:${p.familia_id}`]?.margem ?? '') : null
      if (fm != null) return Math.round(p.custo * (1 + fm / 100) * 100) / 100
      const cm = p.categoria_id ? parseNum(classif[`cat:${p.categoria_id}`]?.margem ?? '') : null
      if (cm != null) return Math.round(p.custo * (1 + cm / 100) * 100) / 100
      const sm = parseNum(segs[p.segmento ?? ''] ?? '')
      if (sm != null) return Math.round(p.custo * (1 + sm / 100) * 100) / 100
      const gm = parseNum(margemGeral)
      if (gm != null) return Math.round(p.custo * (1 + gm / 100) * 100) / 100
    }
    return p.preco ?? p.custo ?? 0
  }
  // Desconto máximo efetivo (cascata: família › categoria › geral)
  function descCalc(p: ProdutoRef): string {
    const fd = p.familia_id ? classif[`fam:${p.familia_id}`]?.desconto?.trim() : ''
    if (fd) return fd
    const cd = p.categoria_id ? classif[`cat:${p.categoria_id}`]?.desconto?.trim() : ''
    if (cd) return cd
    return descontoGeral.trim()
  }

  const produtosFiltrados = produtos.filter(p => {
    if (famSel && p.familia_id !== famSel) return false
    if (catSel && p.categoria_id !== catSel) return false
    if (busca.trim()) {
      const q = busca.toLowerCase()
      return p.nome.toLowerCase().includes(q) || (p.codigo?.toLowerCase().includes(q) ?? false)
    }
    return true
  })

  // Regras configuradas (chips)
  const regrasConfiguradas = Object.entries(classif)
    .filter(([, v]) => v.margem.trim() !== '' || v.desconto.trim() !== '')
    .map(([key, v]) => {
      const [tipo, ref] = key.split(':')
      const nome = tipo === 'fam' ? (famNome[ref] ?? '—') : (catNome[ref] ?? '—')
      return { key, tipo, nome, ...v }
    })

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

  // ─── Salvar (geral + segmento + categoria/família) ────────────────────────
  async function salvar() {
    if (!selectedId) return
    setSaving(true)
    const supabase = createClient()

    await supabase.from('tabelas_preco')
      .update({ margem: parseNum(margemGeral), desconto_maximo: parseNum(descontoGeral) }).eq('id', selectedId)

    const segUpsert = Object.entries(segs).filter(([, v]) => v.trim() !== '')
      .map(([segmento, v]) => ({ tenant_id: tenantId, tabela_id: selectedId, segmento, margem: parseNum(v) }))
    if (segUpsert.length) await supabase.from('tabela_margem_segmento').upsert(segUpsert, { onConflict: 'tabela_id,segmento' })
    const segDelete = segMargens.filter(s => s.tabela_id === selectedId && !segs[s.segmento]?.trim()).map(s => s.id)
    if (segDelete.length) await supabase.from('tabela_margem_segmento').delete().in('id', segDelete)

    // Regras por categoria/família
    const classifUpsert = Object.entries(classif).flatMap(([key, v]) => {
      const margem = parseNum(v.margem), desc = parseNum(v.desconto)
      if (margem == null && desc == null) return []
      const [tipo, ref_id] = key.split(':')
      return [{ tenant_id: tenantId, tabela_id: selectedId, tipo: tipo === 'fam' ? 'familia' : 'categoria', ref_id, margem, desconto_maximo: desc }]
    })
    if (classifUpsert.length) await supabase.from('tabela_margem_classif').upsert(classifUpsert, { onConflict: 'tabela_id,tipo,ref_id' })
    const classifDelete = classifMargens.filter(c => {
      if (c.tabela_id !== selectedId) return false
      const v = classif[`${c.tipo === 'familia' ? 'fam' : 'cat'}:${c.ref_id}`]
      return !v || (parseNum(v.margem) == null && parseNum(v.desconto) == null)
    }).map(c => c.id)
    if (classifDelete.length) await supabase.from('tabela_margem_classif').delete().in('id', classifDelete)

    setSaving(false)
    toast('Tabela salva!')
    router.refresh()
  }

  const numInput = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const selInput = numInput

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

          {/* Margens gerais */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Percent size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Margens da tabela</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Margem geral (%)</label>
                <input type="number" value={margemGeral} onChange={(e) => setMargemGeral(e.target.value)} placeholder="ex: 50" className={numInput} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Desconto máximo (%)</label>
                <input type="number" value={descontoGeral} onChange={(e) => setDescontoGeral(e.target.value)} placeholder="ex: 10" className={numInput} />
              </div>
              {segmentos.map(seg => (
                <div key={seg.value}>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Margem {seg.label} (%)</label>
                  <input type="number" value={segs[seg.value] ?? ''} onChange={(e) => setSegs(p => ({ ...p, [seg.value]: e.target.value }))} placeholder="herda geral" className={numInput} />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
              Preço de venda = custo × (1 + margem). A regra mais específica vence: família › categoria › segmento › geral.
            </p>
          </div>

          {/* Regra por categoria / família */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Margem por categoria / família</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Categoria</label>
                <select value={catSel} onChange={(e) => { setCatSel(e.target.value); setFamSel('') }} className={selInput}>
                  <option value="">Todas</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Família</label>
                <select value={famSel} onChange={(e) => { setFamSel(e.target.value); setCatSel('') }} className={selInput}>
                  <option value="">Todas</option>
                  {familias.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Margem {scopeNome ? `(${scopeNome})` : ''} (%)
                </label>
                <input type="number" value={regraAtual.margem} onChange={(e) => setRegra('margem', e.target.value)}
                  disabled={!scopeKey} placeholder={scopeKey ? 'herda geral' : 'selecione acima'} className={`${numInput} disabled:opacity-50`} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Desconto máx. (%)</label>
                <input type="number" value={regraAtual.desconto} onChange={(e) => setRegra('desconto', e.target.value)}
                  disabled={!scopeKey} placeholder={scopeKey ? 'herda geral' : 'selecione acima'} className={`${numInput} disabled:opacity-50`} />
              </div>
            </div>
            {regrasConfiguradas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {regrasConfiguradas.map(r => (
                  <span key={r.key} className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    <span className="font-medium">{r.nome}</span>
                    {r.margem.trim() && <span>· {r.margem}%</span>}
                    {r.desconto.trim() && <span>· desc {r.desconto}%</span>}
                    <button onClick={() => setClassif(prev => { const n = { ...prev }; delete n[r.key]; return n })}
                      className="ml-0.5 hover:text-red-500"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
              Escolha uma categoria ou família para definir margem/desconto só dela. O grid abaixo filtra para você conferir.
            </p>
          </div>

          {/* Busca */}
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100" />
          </div>

          {/* Produtos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[760px] max-h-[55vh] overflow-y-auto">
                <div className="grid grid-cols-[1fr_120px_120px_90px_70px_110px_80px] gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Produto</span>
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Categoria</span>
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Família</span>
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Custo</span>
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Margem</span>
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Preço venda</span>
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Desc. máx.</span>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {produtosFiltrados.slice(0, 200).map(p => {
                    const valor = precoCalc(p)
                    const desc = descCalc(p)
                    return (
                      <div key={p.id} className="grid grid-cols-[1fr_120px_120px_90px_70px_110px_80px] gap-2 items-center px-4 py-2.5">
                        <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{p.nome}</p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.categoria_id ? (catNome[p.categoria_id] ?? '—') : '—'}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.familia_id ? (famNome[p.familia_id] ?? '—') : '—'}</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500 text-right">{brl(p.custo)}</span>
                        <span className="text-sm text-right text-gray-500 dark:text-gray-400">{p.custo && p.custo > 0 ? `${Math.round((valor / p.custo - 1) * 100)}%` : '—'}</span>
                        <span className="text-sm text-right font-medium text-gray-900 dark:text-gray-100">{brl(valor)}</span>
                        <span className="text-sm text-right text-gray-500 dark:text-gray-400">{desc ? `${desc}%` : '—'}</span>
                      </div>
                    )
                  })}
                  {produtos.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <Tag size={28} className="mx-auto text-gray-200 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Nenhum produto cadastrado.</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Cadastre ou importe produtos em{' '}
                        <Link href="/produtos" className="text-blue-600 hover:underline font-medium">Produtos</Link>.
                      </p>
                    </div>
                  ) : produtosFiltrados.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Nenhum produto encontrado.</p>
                  ) : null}
                  {produtosFiltrados.length > 200 && (
                    <p className="text-[11px] text-gray-400 text-center py-3">Mostrando 200 de {produtosFiltrados.length}. Refine a busca/filtro.</p>
                  )}
                </div>
              </div>
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">A tabela <strong>{deletando.nome}</strong> e suas margens serão removidas.</p>
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
