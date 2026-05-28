'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, Search, X, Pencil, TrendingUp, Trash2, LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LeadFormModal from './LeadFormModal'
import ConvertModal from './ConvertModal'
import { type Lead, STATUS_LEADS, statusStyle, statusLabel, formatDate } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'

interface Props {
  leads: Lead[]
  currentStatus: string
  currentQ: string
}

export default function LeadsView({ leads, currentStatus, currentQ }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const toast = useToast()

  const [search, setSearch] = useState(currentQ)
  const [formOpen, setFormOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function updateParams(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (params.status && params.status !== 'todos') sp.set('status', params.status)
    if (params.q?.trim()) sp.set('q', params.q.trim())
    const qs = sp.toString()
    startTransition(() => {
      router.push(pathname + (qs ? '?' + qs : ''))
    })
  }

  function handleStatusFilter(status: string) {
    updateParams({ status, q: search })
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
    const { error } = await supabase.from('leads').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Erro ao excluir lead', 'error'); return }
    toast('Lead excluído', 'info')
    router.refresh()
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
            {currentStatus !== 'todos' && ` · ${statusLabel(currentStatus)}`}
          </p>
        </div>
        <button
          onClick={() => { setEditingLead(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo lead</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {STATUS_LEADS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleStatusFilter(value)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentStatus === value
                ? 'bg-blue-600 text-white'
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
            placeholder="Buscar por nome, empresa, e-mail..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Buscar
        </button>
      </form>

      {/* Lista vazia */}
      {leads.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-gray-400 text-sm">Nenhum lead encontrado.</p>
          <button
            onClick={() => { setEditingLead(null); setFormOpen(true) }}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Criar o primeiro lead
          </button>
        </div>
      )}

      {/* Tabela — desktop */}
      {leads.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contato</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Origem</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{lead.nome}</p>
                    {lead.empresa && <p className="text-xs text-gray-500 mt-0.5">{lead.empresa}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {lead.email && <p className="text-gray-600">{lead.email}</p>}
                    {lead.telefone && <p className="text-xs text-gray-500 mt-0.5">{lead.telefone}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{lead.origem ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg capitalize ${statusStyle(lead.status)}`}>
                      {statusLabel(lead.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(lead.criado_em)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/leads/${lead.id}`}
                        title="Visão 360°"
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        <LayoutGrid size={15} />
                      </Link>
                      {lead.status !== 'convertido' && (
                        <button
                          onClick={() => setConvertingLead(lead)}
                          title="Converter em oportunidade"
                          className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
                        >
                          <TrendingUp size={15} />
                        </button>
                      )}
                      {lead.status !== 'convertido' && (
                        <button
                          onClick={() => { setEditingLead(lead); setFormOpen(true) }}
                          title="Editar"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {lead.status !== 'convertido' && (
                        <button
                          onClick={() => setDeletingId(lead.id)}
                          title="Excluir"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards — mobile */}
      {leads.length > 0 && (
        <div className="md:hidden space-y-3">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-gray-900">{lead.nome}</p>
                  {lead.empresa && <p className="text-xs text-gray-500 mt-0.5">{lead.empresa}</p>}
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-lg capitalize ${statusStyle(lead.status)}`}>
                  {statusLabel(lead.status)}
                </span>
              </div>

              {(lead.email || lead.telefone) && (
                <div className="text-sm text-gray-600 space-y-0.5 mb-3">
                  {lead.email && <p>{lead.email}</p>}
                  {lead.telefone && <p>{lead.telefone}</p>}
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{formatDate(lead.criado_em)}</p>
                <div className="flex gap-1">
                  {lead.status !== 'convertido' && (
                    <button
                      onClick={() => setConvertingLead(lead)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-600 text-xs font-medium"
                    >
                      <TrendingUp size={12} />
                      Converter
                    </button>
                  )}
                  <Link
                    href={`/leads/${lead.id}`}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600"
                    title="Visão 360°"
                  >
                    <LayoutGrid size={15} />
                  </Link>
                  {lead.status !== 'convertido' && (
                    <button
                      onClick={() => { setEditingLead(lead); setFormOpen(true) }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {lead.status !== 'convertido' && (
                    <button
                      onClick={() => setDeletingId(lead.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
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
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Excluir lead?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
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

      {/* Modal criar/editar */}
      {formOpen && (
        <LeadFormModal
          lead={editingLead ?? undefined}
          onClose={() => { setFormOpen(false); setEditingLead(null) }}
        />
      )}

      {/* Modal converter */}
      {convertingLead && (
        <ConvertModal
          lead={convertingLead}
          onClose={() => setConvertingLead(null)}
        />
      )}
    </>
  )
}
