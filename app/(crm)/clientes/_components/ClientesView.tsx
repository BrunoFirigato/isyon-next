'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, Search, X, Pencil, Trash2, MapPin, LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ClienteFormModal from './ClienteFormModal'
import {
  type Cliente, type VendedorRef, type ParceiroRef,
  STATUS_CLIENTE, TIPOS,
  tipoLabel, statusStyle, statusLabel,
  brl, formatDate,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useSegmentos, segmentoLabel } from '@/app/(crm)/_components/SegmentosContext'

interface Props {
  clientes: Cliente[]
  currentStatus: string
  currentQ: string
  currentVendedor: string
  currentParceiro: string
  vendedores: VendedorRef[]
  parceiros: ParceiroRef[]
}

export default function ClientesView({ clientes, currentStatus, currentQ, currentVendedor, currentParceiro, vendedores, parceiros }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const toast = useToast()
  const segmentos = useSegmentos()

  const [search, setSearch]               = useState(currentQ)
  const [formOpen, setFormOpen]           = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [expandedId, setExpandedId]       = useState<string | null>(null)

  // Lookups rápidos ID → nome
  const vendedorMap = Object.fromEntries(vendedores.map(v => [v.id, v.nome]))
  const parceiroMap = Object.fromEntries(parceiros.map(p => [p.id, p.nome]))

  function vendedorNome(c: Cliente): string | null {
    const maq = c.vendedor_maq_id ? vendedorMap[c.vendedor_maq_id] : null
    const pec = c.vendedor_pec_id ? vendedorMap[c.vendedor_pec_id] : null
    if (maq && pec && maq !== pec) return `${maq} / ${pec}`
    return maq ?? pec ?? null
  }

  function updateParams(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (params.status && params.status !== 'todos') sp.set('status', params.status)
    if (params.q?.trim()) sp.set('q', params.q.trim())
    if (params.vendedor) sp.set('vendedor', params.vendedor)
    if (params.parceiro) sp.set('parceiro', params.parceiro)
    const qs = sp.toString()
    startTransition(() => {
      router.push(pathname + (qs ? '?' + qs : ''))
    })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ status: currentStatus, q: search, vendedor: currentVendedor, parceiro: currentParceiro })
  }

  function clearSearch() {
    setSearch('')
    updateParams({ status: currentStatus, q: '', vendedor: currentVendedor, parceiro: currentParceiro })
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Clientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {clientes.length} registro{clientes.length !== 1 ? 's' : ''}
            {currentStatus !== 'todos' && ` · ${statusLabel(currentStatus)}`}
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

      {/* Filtros por status */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-hide">
        {STATUS_CLIENTE.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParams({ status: value, q: search, vendedor: currentVendedor, parceiro: currentParceiro })}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentStatus === value
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtros por vendedor e parceiro */}
      {(vendedores.length > 0 || parceiros.length > 0) && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {vendedores.length > 0 && (
            <select
              value={currentVendedor}
              onChange={e => updateParams({ status: currentStatus, q: search, vendedor: e.target.value, parceiro: currentParceiro })}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
            >
              <option value="">Todos os vendedores</option>
              {vendedores.map(v => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
          )}
          {parceiros.length > 0 && (
            <select
              value={currentParceiro}
              onChange={e => updateParams({ status: currentStatus, q: search, vendedor: currentVendedor, parceiro: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
            >
              <option value="">Todos os parceiros</option>
              {parceiros.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          )}
          {(currentVendedor || currentParceiro) && (
            <button
              onClick={() => updateParams({ status: currentStatus, q: search, vendedor: '', parceiro: '' })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-300 dark:border-gray-600 transition-colors"
            >
              <X size={13} /> Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Busca */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa, e-mail, CPF/CNPJ..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button type="button" onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={14} />
            </button>
          )}
        </div>
        <button type="submit"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Buscar
        </button>
      </form>

      {/* Lista vazia */}
      {clientes.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm py-16 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum cliente encontrado.</p>
          <button onClick={() => { setEditingCliente(null); setFormOpen(true) }}
            className="mt-4 text-sm text-blue-600 hover:underline">
            Cadastrar o primeiro cliente
          </button>
        </div>
      )}

      {/* Tabela — desktop */}
      {clientes.length > 0 && (
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Razão social / Nome</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Contato</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tipo</th>
                {segmentos.length > 0 && <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Segmento</th>}
                {vendedores.length > 0 && <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Vendedor</th>}
                {parceiros.length > 0 && <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Parceiro</th>}
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {clientes.map((c) => {
                const st = statusStyle(c.status)
                return (
                  <>
                    <tr key={c.id} className="hover:bg-blue-50/40 dark:hover:bg-gray-700/50 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{c.nome}</p>
                        {c.empresa && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.empresa}</p>}
                        {endereco(c) && (
                          <button
                            onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-500 mt-0.5 transition-colors"
                          >
                            <MapPin size={10} />
                            {c.cidade}{c.estado ? ` / ${c.estado}` : ''}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.email && <p className="text-gray-600 dark:text-gray-400">{c.email}</p>}
                        {c.telefone && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.telefone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400">{tipoLabel(c.tipo)}</span>
                      </td>
                      {segmentos.length > 0 && <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{segmentoLabel(c.segmento, segmentos)}</td>}
                      {vendedores.length > 0 && (
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[130px]">
                          {vendedorNome(c) ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                      )}
                      {parceiros.length > 0 && (
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[130px] truncate">
                          {c.parceiro_id ? (parceiroMap[c.parceiro_id] ?? '—') : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${st.bg} ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {statusLabel(c.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/clientes/${c.id}`} title="Ver 360°"
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors">
                            <LayoutGrid size={15} />
                          </Link>
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
                      <tr key={`${c.id}-addr`} className="bg-blue-50/40 dark:bg-blue-900/10">
                        <td colSpan={9} className="px-4 py-2">
                          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                            <MapPin size={11} className="text-blue-400" />
                            {[c.rua, c.numero, c.complemento, c.bairro, c.cidade, c.estado, c.cep]
                              .filter(Boolean).join(', ')}
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards — mobile */}
      {clientes.length > 0 && (
        <div className="md:hidden space-y-3">
          {clientes.map((c) => {
            const st = statusStyle(c.status)
            return (
              <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{c.nome}</p>
                    {c.empresa && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.empresa}</p>}
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${st.bg} ${st.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {statusLabel(c.status)}
                  </span>
                </div>

                {(c.email || c.telefone) && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5 mb-2">
                    {c.email && <p className="truncate">{c.email}</p>}
                    {c.telefone && <p className="text-xs text-gray-500 dark:text-gray-400">{c.telefone}</p>}
                  </div>
                )}

                {(vendedorNome(c) || c.parceiro_id) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 mb-1">
                    {vendedorNome(c) && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="text-gray-400 dark:text-gray-500">Vendedor:</span> {vendedorNome(c)}
                      </span>
                    )}
                    {c.parceiro_id && parceiroMap[c.parceiro_id] && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="text-gray-400 dark:text-gray-500">Parceiro:</span> {parceiroMap[c.parceiro_id]}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{tipoLabel(c.tipo)}</span>
                    {c.valor_total ? (
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{brl(c.valor_total)}</span>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <Link href={`/clientes/${c.id}`}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600">
                      <LayoutGrid size={15} />
                    </Link>
                    <button onClick={() => { setEditingCliente(c); setFormOpen(true) }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setDeletingId(c.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir cliente?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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

      {/* Modal criar/editar */}
      {formOpen && (
        <ClienteFormModal
          cliente={editingCliente ?? undefined}
          onClose={() => { setFormOpen(false); setEditingCliente(null) }}
        />
      )}
    </>
  )
}
