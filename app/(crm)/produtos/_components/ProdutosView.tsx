'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, Search, X, Pencil, Trash2, Package, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ProdutoFormModal from './ProdutoFormModal'
import {
  type Produto, TIPOS, tipoStyle, brl, formatDate,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'

interface Props {
  produtos: Produto[]
  currentTipo: string
  currentAtivo: string
  currentQ: string
}

export default function ProdutosView({ produtos, currentTipo, currentAtivo, currentQ }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const toast = useToast()

  const [search, setSearch] = useState(currentQ)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Erro ao excluir produto', 'error'); return }
    toast('Produto excluído', 'info')
    router.refresh()
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
          <h1 className="text-xl font-semibold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {produtos.length} {produtos.length !== 1 ? 'itens' : 'item'}
            {currentTipo !== 'todos' && ` · ${currentTipo === 'servico' ? 'Serviços' : 'Produtos'}`}
          </p>
        </div>
        <button
          onClick={() => { setEditingProduto(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo produto</span>
          <span className="sm:hidden">Novo</span>
        </button>
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
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-0.5 self-stretch" />
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
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Busca */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código ou NCM..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button type="button" onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        <button type="submit" className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          Buscar
        </button>
      </form>

      {/* Lista vazia */}
      {produtos.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
          <Package size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum produto encontrado.</p>
          <button
            onClick={() => { setEditingProduto(null); setFormOpen(true) }}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Cadastrar primeiro produto
          </button>
        </div>
      )}

      {/* ─── Tabela desktop ──────────────────────────────────────────────────── */}
      {produtos.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Un.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Preço</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Custo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">NCM</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {produtos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.codigo ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.nome}</p>
                    {p.descricao && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-56">{p.descricao}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg ${tipoStyle(p.tipo)}`}>
                      {p.tipo === 'servico' ? <Wrench size={10} /> : <Package size={10} />}
                      {p.tipo === 'servico' ? 'Serviço' : 'Produto'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.unidade ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{brl(p.preco)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{brl(p.custo)}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.ncm ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${p.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* ─── Cards mobile ────────────────────────────────────────────────────── */}
      {produtos.length > 0 && (
        <div className="md:hidden space-y-3">
          {produtos.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.codigo && <span className="text-xs font-mono text-gray-400">{p.codigo}</span>}
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${tipoStyle(p.tipo)}`}>
                      {p.tipo === 'servico' ? <Wrench size={10} /> : <Package size={10} />}
                      {p.tipo === 'servico' ? 'Serviço' : 'Produto'}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 mt-0.5">{p.nome}</p>
                  {p.descricao && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.descricao}</p>}
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-lg ${p.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-xs text-gray-400">Preço </span>
                    <span className="font-semibold text-gray-900">{brl(p.preco)}</span>
                  </div>
                  {p.custo != null && (
                    <div>
                      <span className="text-xs text-gray-400">Custo </span>
                      <span className="text-gray-600">{brl(p.custo)}</span>
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
                <div className="mt-2 pt-2 border-t border-gray-50 flex gap-3 text-xs text-gray-400">
                  {p.unidade && <span>Un: {p.unidade}</span>}
                  {p.ncm && <span>NCM: {p.ncm}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal: Confirmar exclusão ─────────────────────────────────────── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Excluir produto?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deletingId)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Criar/Editar ──────────────────────────────────────────── */}
      {formOpen && (
        <ProdutoFormModal
          produto={editingProduto ?? undefined}
          onClose={() => { setFormOpen(false); setEditingProduto(null) }}
        />
      )}
    </>
  )
}
