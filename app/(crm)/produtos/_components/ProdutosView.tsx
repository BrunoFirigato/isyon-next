'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, Search, X, Pencil, Trash2, Package, Wrench, Upload, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { vinculosProduto, inativarRegistro, type Vinculo } from '@/lib/exclusao'
import BloqueioExclusaoDialog from '@/app/(crm)/_components/BloqueioExclusaoDialog'
import ProdutoFormModal from './ProdutoFormModal'
import ExportButton from '@/app/(crm)/_components/ExportButton'
import OmieImportButton from '@/app/(crm)/_components/OmieImportButton'
import ImportModal  from '@/app/(crm)/_components/ImportModal'
import {
  type Produto, TIPOS, PRODUTOS_PAGE_SIZE, PRODUTO_COLS, tipoStyle, brl, formatDate,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'

interface Props {
  produtos: Produto[]
  total: number
  currentTipo: string
  currentAtivo: string
  currentQ: string
}

/** Números de página visíveis com reticências (ex.: 1 … 4 5 6 … 20). */
function pageNumbers(current: number, totalPages: number): (number | '…')[] {
  const set = new Set<number>()
  ;[1, current - 1, current, current + 1, totalPages].forEach((p) => {
    if (p >= 1 && p <= totalPages) set.add(p)
  })
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

export default function ProdutosView({ produtos, total: totalProp, currentTipo, currentAtivo, currentQ }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const toast = useToast()

  // Paginação
  const [items, setItems] = useState<Produto[]>(produtos)
  const [total, setTotal] = useState(totalProp)
  const [page, setPage]   = useState(1)
  const [loadingPage, setLoadingPage] = useState(false)
  const totalPages = Math.max(1, Math.ceil(total / PRODUTOS_PAGE_SIZE))

  useEffect(() => {
    setItems(produtos)
    setTotal(totalProp)
    setPage(1)
  }, [produtos, totalProp])

  async function fetchPage(n: number): Promise<Produto[]> {
    const supabase = createClient()
    let qy = supabase.from('produtos').select(PRODUTO_COLS).order('nome')
    if (currentTipo && currentTipo !== 'todos') qy = qy.eq('tipo', currentTipo)
    if (currentAtivo === 'ativo')   qy = qy.eq('ativo', true)
    if (currentAtivo === 'inativo') qy = qy.eq('ativo', false)
    if (currentQ.trim()) {
      const termo = currentQ.trim()
      qy = qy.or(`nome.ilike.%${termo}%,codigo.ilike.%${termo}%,ncm.ilike.%${termo}%`)
    }
    const { data, error } = await qy.range((n - 1) * PRODUTOS_PAGE_SIZE, n * PRODUTOS_PAGE_SIZE - 1)
    if (error) { toast('Erro ao carregar produtos', 'error'); return [] }
    return (data ?? []) as Produto[]
  }

  async function goToPage(n: number) {
    if (n === page || n < 1 || n > totalPages || loadingPage) return
    setLoadingPage(true)
    const rows = await fetchPage(n)
    setItems(rows); setPage(n); setLoadingPage(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function loadMore() {
    if (loadingPage) return
    setLoadingPage(true)
    const rows = await fetchPage(page + 1)
    setItems((prev) => [...prev, ...rows]); setPage((p) => p + 1); setLoadingPage(false)
  }

  const [search, setSearch] = useState(currentQ)
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bloqueio, setBloqueio] = useState<{ id: string; vinculos: Vinculo[] } | null>(null)
  const [inativando, setInativando] = useState(false)

  function updateParams(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (params.tipo && params.tipo !== 'todos') sp.set('tipo', params.tipo)
    if (params.ativo && params.ativo !== 'todos') sp.set('ativo', params.ativo)
    if (params.q?.trim()) sp.set('q', params.q.trim())
    startTransition(() => {
      router.push(pathname + (sp.toString() ? '?' + sp.toString() : ''))
    })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ tipo: currentTipo, ativo: currentAtivo, q: search })
  }

  function clearSearch() {
    setSearch('')
    updateParams({ tipo: currentTipo, ativo: currentAtivo, q: '' })
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const vinc = await vinculosProduto(supabase, id)
    if (vinc.length) { setDeletingId(null); setBloqueio({ id, vinculos: vinc }); return }
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Não foi possível excluir — há registros vinculados.', 'error'); return }
    // Remoção otimista
    setItems((prev) => prev.filter((p) => p.id !== id))
    setTotal((t) => Math.max(0, t - 1))
    toast('Produto excluído', 'info')
  }

  async function handleInativar() {
    if (!bloqueio) return
    setInativando(true)
    const supabase = createClient()
    const { error } = await inativarRegistro(supabase, 'produtos', bloqueio.id)
    setInativando(false)
    setBloqueio(null)
    if (error) { toast('Não foi possível inativar.', 'error'); return }
    setItems((prev) => prev.map((p) => (p.id === bloqueio.id ? { ...p, ativo: false } : p)))
    toast('Produto inativado', 'info')
  }

  const ativos = [
    { value: 'ativo',   label: 'Ativos' },
    { value: 'inativo', label: 'Inativos' },
  ]

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Produtos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total} {total !== 1 ? 'itens' : 'item'}
            {currentTipo !== 'todos' && ` · ${currentTipo === 'servico' ? 'Serviços' : 'Produtos'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OmieImportButton tipo="produtos" />
          <ExportButton href={`/api/exportar/produtos?tipo=${currentTipo}&q=${encodeURIComponent(currentQ)}`} label="Exportar" filename="produtos.xlsx" />
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Importar</span>
          </button>
          <button
            onClick={() => { setEditingProduto(null); setFormOpen(true) }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo produto</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Filtros: tipo */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {TIPOS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParams({ tipo: value, ativo: currentAtivo, q: search })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentTipo === value
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="w-px bg-gray-200 dark:bg-gray-700 mx-0.5 self-stretch" />
        {ativos.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParams({
              tipo: currentTipo,
              ativo: currentAtivo === value ? 'todos' : value,
              q: search,
            })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentAtivo === value
                ? 'bg-gray-800 dark:bg-gray-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Busca */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código ou NCM..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button type="button" onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={14} />
            </button>
          )}
        </div>
        <button type="submit" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Buscar
        </button>
      </form>

      {/* Lista vazia */}
      {total === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm py-16 text-center">
          <Package size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum produto encontrado.</p>
          <button
            onClick={() => { setEditingProduto(null); setFormOpen(true) }}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Cadastrar primeiro produto
          </button>
        </div>
      )}

      {/* Tabela desktop */}
      {items.length > 0 && (
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Un.</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Preço</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Custo</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">NCM</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/40 dark:hover:bg-gray-700/50 transition-colors group">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{p.codigo ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{p.nome}</p>
                    {p.descricao && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-56">{p.descricao}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg ${tipoStyle(p.tipo)}`}>
                      {p.tipo === 'servico' ? <Wrench size={10} /> : <Package size={10} />}
                      {p.tipo === 'servico' ? 'Serviço' : 'Produto'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{p.unidade ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{brl(p.preco)}</td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{brl(p.custo)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{p.ncm ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${p.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingProduto(p); setFormOpen(true) }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingId(p.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação numerada — desktop */}
      {items.length > 0 && totalPages > 1 && (
        <div className="hidden md:flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Página {page} de {totalPages} · {total} itens
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || loadingPage}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            {pageNumbers(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`e${i}`} className="px-2 text-sm text-gray-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  disabled={loadingPage}
                  className={`min-w-[2rem] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || loadingPage}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Cards mobile */}
      {items.length > 0 && (
        <div className="md:hidden space-y-3">
          {items.map((p) => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.codigo && <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{p.codigo}</span>}
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${tipoStyle(p.tipo)}`}>
                      {p.tipo === 'servico' ? <Wrench size={10} /> : <Package size={10} />}
                      {p.tipo === 'servico' ? 'Serviço' : 'Produto'}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">{p.nome}</p>
                  {p.descricao && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{p.descricao}</p>}
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-lg ${p.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">Preço </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{brl(p.preco)}</span>
                  </div>
                  {p.custo != null && (
                    <div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">Custo </span>
                      <span className="text-gray-600 dark:text-gray-400">{brl(p.custo)}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditingProduto(p); setFormOpen(true) }}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeletingId(p.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {(p.ncm || p.unidade) && (
                <div className="mt-2 pt-2 border-t border-gray-50 dark:border-gray-700 flex gap-3 text-xs text-gray-400 dark:text-gray-500">
                  {p.unidade && <span>Un: {p.unidade}</span>}
                  {p.ncm && <span>NCM: {p.ncm}</span>}
                </div>
              )}
            </div>
          ))}

          {/* Carregar mais — mobile */}
          {items.length < total && (
            <button
              onClick={loadMore}
              disabled={loadingPage}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors"
            >
              {loadingPage
                ? <><Loader2 size={15} className="animate-spin" /> Carregando...</>
                : <>Carregar mais <span className="text-gray-400">· {items.length} de {total}</span></>}
            </button>
          )}
        </div>
      )}

      {/* Modal: Confirmar exclusão */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir produto?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deletingId)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <BloqueioExclusaoDialog
        vinculos={bloqueio?.vinculos ?? null}
        podeInativar
        inativando={inativando}
        onInativar={handleInativar}
        onClose={() => setBloqueio(null)}
      />

      {/* Modal: Criar/Editar */}
      {formOpen && (
        <ProdutoFormModal
          produto={editingProduto ?? undefined}
          onClose={() => { setFormOpen(false); setEditingProduto(null) }}
        />
      )}

      {importOpen && (
        <ImportModal modulo="produtos" onClose={() => setImportOpen(false)} />
      )}
    </>
  )
}
