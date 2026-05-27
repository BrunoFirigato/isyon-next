'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, Search, X, Pencil, Trash2, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ClienteFormModal from './ClienteFormModal'
import {
  type Cliente, TIPOS, tipoStyle, tipoLabel,
  brl, formatDate,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useSegmentos, segmentoLabel } from '@/app/(crm)/_components/SegmentosContext'

interface Props {
  clientes: Cliente[]
  currentTipo: string
  currentQ: string
}

export default function ClientesView({ clientes, currentTipo, currentQ }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const toast = useToast()
  const segmentos = useSegmentos()

  const [search, setSearch] = useState(currentQ)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function updateParams(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (params.tipo && params.tipo !== 'todos') sp.set('tipo', params.tipo)
    if (params.q?.trim()) sp.set('q', params.q.trim())
    const qs = sp.toString()
    startTransition(() => {
      router.push(pathname + (qs ? '?' + qs : ''))
    })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ tipo: currentTipo, q: search })
  }

  function clearSearch() {
    setSearch('')
    updateParams({ tipo: currentTipo, q: '' })
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Erro ao excluir cliente', 'error'); return }
    toast('Cliente excluído', 'info')
    router.refresh()
  }

  function endereco(c: Cliente) {
    const partes = [c.rua, c.numero, c.bairro, c.cidade, c.estado].filter(Boolean)
    return partes.length > 0 ? partes.join(', ') : null
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {clientes.length} registro{clientes.length !== 1 ? 's' : ''}
            {currentTipo !== 'todos' && ` · ${tipoLabel(currentTipo)}`}
          </p>
        </div>
        <button
          onClick={() => { setEditingCliente(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo cliente</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Filtros de tipo */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
        {TIPOS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParams({ tipo: value, q: search })}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentTipo === value
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
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa, e-mail, CPF/CNPJ..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button type="button" onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        <button type="submit"
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          Buscar
        </button>
      </form>

      {/* Lista vazia */}
      {clientes.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-gray-400 text-sm">Nenhum cliente encontrado.</p>
          <button onClick={() => { setEditingCliente(null); setFormOpen(true) }}
            className="mt-4 text-sm text-blue-600 hover:underline">
            Cadastrar o primeiro cliente
          </button>
        </div>
      )}

      {/* Tabela — desktop */}
      {clientes.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome / Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contato</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">CPF / CNPJ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Segmento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientes.map((c) => (
                <>
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.nome}</p>
                      {c.empresa && <p className="text-xs text-gray-500 mt-0.5">{c.empresa}</p>}
                      {endereco(c) && (
                        <button
                          onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 mt-0.5 transition-colors"
                        >
                          <MapPin size={10} />
                          {c.cidade}{c.estado ? ` / ${c.estado}` : ''}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.email && <p className="text-gray-600">{c.email}</p>}
                      {c.telefone && <p className="text-xs text-gray-500 mt-0.5">{c.telefone}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.cpf_cnpj ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg ${tipoStyle(c.tipo)}`}>
                        {tipoLabel(c.tipo)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{segmentoLabel(c.segmento, segmentos)}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium text-sm">
                      {brl(c.valor_total) ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingCliente(c); setFormOpen(true) }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setDeletingId(c.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === c.id && (
                    <tr key={`${c.id}-addr`} className="bg-blue-50/40">
                      <td colSpan={7} className="px-4 py-2">
                        <p className="text-xs text-gray-600 flex items-center gap-1.5">
                          <MapPin size={11} className="text-blue-400" />
                          {[c.rua, c.numero, c.complemento, c.bairro, c.cidade, c.estado, c.cep]
                            .filter(Boolean).join(', ')}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards — mobile */}
      {clientes.length > 0 && (
        <div className="md:hidden space-y-3">
          {clientes.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-gray-900">{c.nome}</p>
                  {c.empresa && <p className="text-xs text-gray-500 mt-0.5">{c.empresa}</p>}
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-lg ${tipoStyle(c.tipo)}`}>
                  {tipoLabel(c.tipo)}
                </span>
              </div>

              {(c.email || c.telefone) && (
                <div className="text-sm text-gray-600 space-y-0.5 mb-2">
                  {c.email && <p>{c.email}</p>}
                  {c.telefone && <p>{c.telefone}</p>}
                </div>
              )}

              {endereco(c) && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                  <MapPin size={10} />
                  {c.cidade}{c.estado ? ` / ${c.estado}` : ''}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {c.segmento && (
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-medium">
                      {segmentoLabel(c.segmento, segmentos)}
                    </span>
                  )}
                  {brl(c.valor_total) && (
                    <span className="text-xs font-semibold text-gray-700">{brl(c.valor_total)}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingCliente(c); setFormOpen(true) }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setDeletingId(c.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmar exclusão */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Excluir cliente?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deletingId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <ClienteFormModal
          cliente={editingCliente ?? undefined}
          onClose={() => { setFormOpen(false); setEditingCliente(null) }}
        />
      )}
    </>
  )
}
