'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Search, Tag, Save, X, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
import { type TabelaPreco, type TabelaPrecoItem, type ProdutoRef, brl } from './types'

interface Props {
  tabelas:  TabelaPreco[]
  produtos: ProdutoRef[]
  itens:    TabelaPrecoItem[]
}

export default function TabelasPrecoView({ tabelas, produtos, itens }: Props) {
  const router   = useRouter()
  const toast    = useToast()
  const tenantId = useTenantId()

  const [selectedId, setSelectedId] = useState<string>(tabelas[0]?.id ?? '')
  const [busca,      setBusca]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [novaOpen,   setNovaOpen]   = useState(false)
  const [novoNome,   setNovoNome]   = useState('')
  const [deletando,  setDeletando]  = useState<TabelaPreco | null>(null)

  // Mapa produto_id → preço (string) da tabela selecionada
  const initialPrecos = useMemo(() => {
    const map: Record<string, string> = {}
    itens.filter(i => i.tabela_id === selectedId).forEach(i => {
      if (i.preco != null) map[i.produto_id] = String(i.preco)
    })
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, itens])

  const [precos, setPrecos] = useState<Record<string, string>>(initialPrecos)

  // Recarrega os preços ao trocar de tabela
  function selecionar(id: string) {
    setSelectedId(id)
    const map: Record<string, string> = {}
    itens.filter(i => i.tabela_id === id).forEach(i => {
      if (i.preco != null) map[i.produto_id] = String(i.preco)
    })
    setPrecos(map)
    setBusca('')
  }

  const produtosFiltrados = produtos.filter(p =>
    !busca.trim() || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.codigo?.toLowerCase().includes(busca.toLowerCase())
  )

  function setPreco(produtoId: string, valor: string) {
    setPrecos(prev => ({ ...prev, [produtoId]: valor }))
  }

  // Preenche os preços vazios com o preço base do produto
  function copiarBase() {
    setPrecos(prev => {
      const map = { ...prev }
      produtos.forEach(p => {
        if (!map[p.id] && p.preco != null) map[p.id] = String(p.preco)
      })
      return map
    })
  }

  // ─── Criar tabela ────────────────────────────────────────────────────────
  async function criarTabela() {
    if (!novoNome.trim()) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tabelas_preco')
      .insert({ tenant_id: tenantId, nome: novoNome.trim(), ativo: true })
      .select('id')
      .single()
    if (error) { toast('Erro ao criar tabela', 'error'); return }
    toast('Tabela criada!')
    setNovaOpen(false); setNovoNome('')
    if (data) setSelectedId(data.id)
    router.refresh()
  }

  // ─── Excluir tabela ──────────────────────────────────────────────────────
  async function excluirTabela() {
    if (!deletando) return
    const supabase = createClient()
    const { error } = await supabase.from('tabelas_preco').delete().eq('id', deletando.id)
    setDeletando(null)
    if (error) { toast('Erro ao excluir', 'error'); return }
    toast('Tabela excluída', 'info')
    router.refresh()
  }

  // ─── Salvar preços ───────────────────────────────────────────────────────
  async function salvarPrecos() {
    if (!selectedId) return
    setSaving(true)
    const supabase = createClient()

    const toUpsert: { tenant_id: string; tabela_id: string; produto_id: string; preco: number }[] = []
    const toDeleteIds: string[] = []
    const itensTabela = itens.filter(i => i.tabela_id === selectedId)

    for (const p of produtos) {
      const raw = precos[p.id]?.trim()
      const existente = itensTabela.find(i => i.produto_id === p.id)
      if (raw) {
        const num = parseFloat(raw.replace(',', '.'))
        if (!isNaN(num)) toUpsert.push({ tenant_id: tenantId, tabela_id: selectedId, produto_id: p.id, preco: num })
      } else if (existente) {
        toDeleteIds.push(existente.id)
      }
    }

    if (toUpsert.length) {
      const { error } = await supabase.from('tabela_preco_itens').upsert(toUpsert, { onConflict: 'tabela_id,produto_id' })
      if (error) { toast(`Erro ao salvar: ${error.message}`, 'error'); setSaving(false); return }
    }
    if (toDeleteIds.length) {
      await supabase.from('tabela_preco_itens').delete().in('id', toDeleteIds)
    }

    setSaving(false)
    toast('Preços salvos!')
    router.refresh()
  }

  const inputCls = 'w-28 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm text-right dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'

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
          <button onClick={() => setNovaOpen(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
            + Criar primeira tabela
          </button>
        </div>
      ) : (
        <>
          {/* Chips de tabelas */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
            {tabelas.map(t => (
              <button key={t.id} onClick={() => selecionar(t.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedId === t.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                {t.nome}
                {selectedId === t.id && (
                  <span onClick={(e) => { e.stopPropagation(); setDeletando(t) }}
                    className="ml-1 -mr-1 p-0.5 rounded hover:bg-white/20"><Trash2 size={12} /></span>
                )}
              </button>
            ))}
          </div>

          {/* Busca + copiar base */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100" />
            </div>
            <button onClick={copiarBase} type="button"
              className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
              <Copy size={14} /> <span className="hidden sm:inline">Copiar preço base</span>
            </button>
          </div>

          {/* Tabela de produtos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_130px] gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Produto</span>
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Preço base</span>
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Preço nesta tabela</span>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
              {produtosFiltrados.map(p => (
                <div key={p.id} className="grid grid-cols-[1fr_120px_130px] gap-2 items-center px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{p.nome}</p>
                    {p.codigo && <p className="text-[11px] text-gray-400 font-mono">{p.codigo}</p>}
                  </div>
                  <span className="text-sm text-gray-400 dark:text-gray-500 text-right">{brl(p.preco)}</span>
                  <div className="flex justify-end">
                    <input
                      type="number" min="0" step="0.01"
                      value={precos[p.id] ?? ''}
                      onChange={(e) => setPreco(p.id, e.target.value)}
                      placeholder={p.preco != null ? String(p.preco) : '0,00'}
                      className={inputCls}
                    />
                  </div>
                </div>
              ))}
              {produtosFiltrados.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Nenhum produto encontrado.</p>
              )}
            </div>
            <div className="flex justify-end px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
              <button onClick={salvarPrecos} disabled={saving}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <Save size={14} /> {saving ? 'Salvando...' : 'Salvar preços'}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Produtos sem preço nesta tabela usam o <strong>preço base</strong> do cadastro.
          </p>
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              A tabela <strong>{deletando.nome}</strong> e todos os preços dela serão removidos. Esta ação não pode ser desfeita.
            </p>
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
