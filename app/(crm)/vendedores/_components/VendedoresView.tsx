'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, Search, X, Pencil, Trash2, Phone, Mail, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { vinculosVendedor, inativarRegistro, type Vinculo } from '@/lib/exclusao'
import BloqueioExclusaoDialog from '@/app/(crm)/_components/BloqueioExclusaoDialog'
import VendedorFormModal from './VendedorFormModal'
import {
  type Vendedor, STATUS_VENDEDOR,
  statusStyle, formatDate,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useSegmentos, segmentosLabel } from '@/app/(crm)/_components/SegmentosContext'

interface Props {
  vendedores: Vendedor[]
  currentStatus: string
  currentQ: string
}

export default function VendedoresView({ vendedores, currentStatus, currentQ }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const toast = useToast()
  const segmentos = useSegmentos()

  const [search, setSearch] = useState(currentQ)
  const [formOpen, setFormOpen] = useState(false)
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bloqueio, setBloqueio] = useState<{ id: string; vinculos: Vinculo[] } | null>(null)
  const [inativando, setInativando] = useState(false)

  function updateParams(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (params.status && params.status !== 'todos') sp.set('status', params.status)
    if (params.q?.trim()) sp.set('q', params.q.trim())
    const qs = sp.toString()
    startTransition(() => {
      router.push(pathname + (qs ? '?' + qs : ''))
    })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ status: currentStatus, q: search })
  }

  function clearSearch() {
    setSearch('')
    updateParams({ status: currentStatus, q: '' })
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const vinc = await vinculosVendedor(supabase, id)
    if (vinc.length) { setDeletingId(null); setBloqueio({ id, vinculos: vinc }); return }
    const { error } = await supabase.from('vendedores').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Não foi possível excluir — há registros vinculados.', 'error'); return }
    toast('Vendedor excluído', 'info')
    router.refresh()
  }

  async function handleInativar() {
    if (!bloqueio) return
    setInativando(true)
    const supabase = createClient()
    const { error } = await inativarRegistro(supabase, 'vendedores', bloqueio.id)
    setInativando(false)
    setBloqueio(null)
    if (error) { toast('Não foi possível inativar.', 'error'); return }
    toast('Vendedor inativado', 'info')
    router.refresh()
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Vendedores</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
            {vendedores.length} vendedor{vendedores.length !== 1 ? 'es' : ''}
            {currentStatus !== 'todos' && ` · ${currentStatus}`}
            {isPending && <Loader2 size={13} className="animate-spin text-blue-500" />}
          </p>
        </div>
        <button
          onClick={() => { setEditingVendedor(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo vendedor</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Filtros — Status como dropdown (estilo Leads) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={currentStatus}
          onChange={(e) => updateParams({ status: e.target.value, q: search })}
          className={`text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 ${
            currentStatus !== 'todos' ? 'border-blue-400 dark:border-blue-500 text-gray-800 dark:text-gray-100' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
          }`}
        >
          {STATUS_VENDEDOR.map(({ value, label }) => (
            <option key={value} value={value}>{value === 'todos' ? 'Status: todos' : label}</option>
          ))}
        </select>
        {currentStatus !== 'todos' && (
          <button onClick={() => updateParams({ status: 'todos', q: search })}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2">
            limpar filtros
          </button>
        )}
      </div>

      {/* Busca */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Buscar
        </button>
      </form>

      {/* Lista vazia */}
      {vendedores.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm py-16 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum vendedor encontrado.</p>
          <button
            onClick={() => { setEditingVendedor(null); setFormOpen(true) }}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Cadastrar primeiro vendedor
          </button>
        </div>
      )}

      {/* Tabela — desktop */}
      {vendedores.length > 0 && (
        <div className={`hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-50' : ''}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Contato</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Cargo</th>
                {segmentos.length > 0 && <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Segmentos</th>}
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Comissão</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {vendedores.map((v) => (
                <tr key={v.id} className="hover:bg-blue-50/40 dark:hover:bg-gray-700/50 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{v.nome}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(v.criado_em)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {v.email && <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1"><Mail size={12} className="text-gray-400 dark:text-gray-500" />{v.email}</p>}
                    {v.telefone && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1"><Phone size={11} className="text-gray-400 dark:text-gray-500" />{v.telefone}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{v.cargo ?? '—'}{v.ramal ? ` · r.${v.ramal}` : ''}</td>
                  {segmentos.length > 0 && <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{segmentosLabel(v.segmentos, segmentos)}</td>}
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {v.perc_comissao != null ? `${v.perc_comissao}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg capitalize ${statusStyle(v.status)}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingVendedor(v); setFormOpen(true) }}
                        title="Editar"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingId(v.id)}
                        title="Excluir"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
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

      {/* Cards — mobile */}
      {vendedores.length > 0 && (
        <div className={`md:hidden space-y-3 transition-opacity ${isPending ? 'opacity-50' : ''}`}>
          {vendedores.map((v) => (
            <div key={v.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{v.nome}</p>
                  {v.cargo && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{v.cargo}</p>}
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-lg capitalize ${statusStyle(v.status)}`}>
                  {v.status}
                </span>
              </div>

              {(v.email || v.telefone) && (
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5 mb-3">
                  {v.email && <p className="flex items-center gap-1.5"><Mail size={12} className="text-gray-400 dark:text-gray-500" />{v.email}</p>}
                  {v.telefone && <p className="flex items-center gap-1.5"><Phone size={12} className="text-gray-400 dark:text-gray-500" />{v.telefone}</p>}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
                  {v.segmentos.length > 0 && <p>{segmentosLabel(v.segmentos, segmentos)}</p>}
                  {v.perc_comissao != null && <p>{v.perc_comissao}% comissão</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditingVendedor(v); setFormOpen(true) }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeletingId(v.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir vendedor?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
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

      {/* Modal criar/editar */}
      {formOpen && (
        <VendedorFormModal
          vendedor={editingVendedor ?? undefined}
          onClose={() => { setFormOpen(false); setEditingVendedor(null) }}
        />
      )}
    </>
  )
}
