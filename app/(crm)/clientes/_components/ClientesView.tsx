'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, Search, X, Pencil, Trash2, MapPin, LayoutGrid, Upload, ChevronLeft, ChevronRight, Loader2, CalendarPlus } from 'lucide-react'
import WhatsAppIcon from '@/app/(crm)/_components/WhatsAppIcon'
import { isWhatsappCapable } from '@/app/(crm)/_components/PhoneInput'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { vinculosCliente, inativarRegistro, type Vinculo } from '@/lib/exclusao'
import BloqueioExclusaoDialog from '@/app/(crm)/_components/BloqueioExclusaoDialog'
import CompromissoFormModal from '@/app/(crm)/agenda/_components/CompromissoFormModal'
import ClienteFormModal from './ClienteFormModal'
import ExportButton from '@/app/(crm)/_components/ExportButton'
import OmieImportButton from '@/app/(crm)/_components/OmieImportButton'
import ImportModal from '@/app/(crm)/_components/ImportModal'
import {
  type Cliente, type VendedorRef, type ParceiroRef,
  STATUS_CLIENTE, TIPOS, CLIENTES_PAGE_SIZE, CLIENTE_COLS,
  tipoLabel, statusStyle, statusLabel,
  brl, formatDate,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useSegmentos, segmentoLabel } from '@/app/(crm)/_components/SegmentosContext'
import { useTenantConfig } from '@/app/(crm)/_components/TenantContext'

interface Props {
  clientes: Cliente[]
  total: number
  restrict: boolean
  scopedVendedorId: string | null
  currentStatus: string
  currentQ: string
  currentVendedor: string
  currentParceiro: string
  vendedores: VendedorRef[]
  parceiros: ParceiroRef[]
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

export default function ClientesView({ clientes, total: totalProp, restrict, scopedVendedorId, currentStatus, currentQ, currentVendedor, currentParceiro, vendedores, parceiros }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const toast = useToast()
  const segmentos = useSegmentos()
  const { usaParceiros } = useTenantConfig()

  function openWhatsApp(c: Cliente) {
    if (!c.telefone) return
    router.push(`/conversas?cliente=${c.id}`)
  }

  // Paginação
  const [items, setItems] = useState<Cliente[]>(clientes)
  const [total, setTotal] = useState(totalProp)
  const [page, setPage]   = useState(1)
  const [loadingPage, setLoadingPage] = useState(false)
  const totalPages = Math.max(1, Math.ceil(total / CLIENTES_PAGE_SIZE))

  useEffect(() => {
    setItems(clientes)
    setTotal(totalProp)
    setPage(1)
  }, [clientes, totalProp])

  // Busca uma página aplicando os mesmos filtros do servidor (inclui carteira)
  async function fetchPage(n: number): Promise<Cliente[]> {
    const supabase = createClient()
    let qy = supabase.from('clientes').select(CLIENTE_COLS).order('nome', { ascending: true })
    if (currentStatus && currentStatus !== 'todos') qy = qy.eq('status', currentStatus)
    if (currentQ.trim()) {
      const termo = currentQ.trim()
      qy = qy.or(`nome.ilike.%${termo}%,empresa.ilike.%${termo}%,email.ilike.%${termo}%,cpf_cnpj.ilike.%${termo}%,telefone.ilike.%${termo}%`)
    }
    if (currentVendedor) qy = qy.or(`vendedor_maq_id.eq.${currentVendedor},vendedor_pec_id.eq.${currentVendedor}`)
    if (restrict && scopedVendedorId) qy = qy.or(`vendedor_maq_id.eq.${scopedVendedorId},vendedor_pec_id.eq.${scopedVendedorId}`)
    if (currentParceiro) qy = qy.eq('parceiro_id', currentParceiro)
    const { data, error } = await qy.range((n - 1) * CLIENTES_PAGE_SIZE, n * CLIENTES_PAGE_SIZE - 1)
    if (error) { toast('Erro ao carregar clientes', 'error'); return [] }
    return (data ?? []) as Cliente[]
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

  const [search, setSearch]               = useState(currentQ)
  const [formOpen,   setFormOpen]   = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [expandedId, setExpandedId]       = useState<string | null>(null)
  const [bloqueio, setBloqueio]           = useState<{ id: string; vinculos: Vinculo[] } | null>(null)
  const [inativando, setInativando]       = useState(false)
  const [agendarCliente, setAgendarCliente] = useState<Cliente | null>(null)

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
    const vinc = await vinculosCliente(supabase, id)
    if (vinc.length) { setDeletingId(null); setBloqueio({ id, vinculos: vinc }); return }
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Não foi possível excluir — há registros vinculados.', 'error'); return }
    // Remoção otimista
    setItems((prev) => prev.filter((c) => c.id !== id))
    setTotal((t) => Math.max(0, t - 1))
    toast('Cliente excluído', 'info')
  }

  async function handleInativar() {
    if (!bloqueio) return
    setInativando(true)
    const supabase = createClient()
    const { error } = await inativarRegistro(supabase, 'clientes', bloqueio.id)
    setInativando(false)
    setBloqueio(null)
    if (error) { toast('Não foi possível inativar.', 'error'); return }
    setItems((prev) => prev.map((c) => (c.id === bloqueio.id ? { ...c, status: 'inativo' } : c)))
    toast('Cliente inativado', 'info')
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
            {total} registro{total !== 1 ? 's' : ''}
            {currentStatus !== 'todos' && ` · ${statusLabel(currentStatus)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OmieImportButton tipo="clientes" />
          <ExportButton
            href={`/api/exportar/clientes?status=${currentStatus}`}
            label="Exportar"
            filename={`clientes_${new Date().toISOString().slice(0,10)}.xlsx`}
          />
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Importar</span>
          </button>
          <button
            onClick={() => { setEditingCliente(null); setFormOpen(true) }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo cliente</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
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
      {(vendedores.length > 0 || usaParceiros) && (
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
          {usaParceiros && (
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
      {total === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm py-16 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum cliente encontrado.</p>
          <button onClick={() => { setEditingCliente(null); setFormOpen(true) }}
            className="mt-4 text-sm text-blue-600 hover:underline">
            Cadastrar o primeiro cliente
          </button>
        </div>
      )}

      {/* Tabela — desktop */}
      {items.length > 0 && (
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Razão social / Nome</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Contato</th>
                {usaParceiros && <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tipo</th>}
                {segmentos.length > 0 && <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Segmento</th>}
                {vendedores.length > 0 && <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Vendedor</th>}
                {usaParceiros && <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Parceiro</th>}
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((c) => {
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
                      {usaParceiros && (
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600 dark:text-gray-400">{tipoLabel(c.tipo)}</span>
                        </td>
                      )}
                      {segmentos.length > 0 && <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{segmentoLabel(c.segmento, segmentos)}</td>}
                      {vendedores.length > 0 && (
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[130px]">
                          {vendedorNome(c) ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                      )}
                      {usaParceiros && (
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
                        <div className="flex items-center gap-0.5 justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                          <Link href={`/clientes/${c.id}`} title="Ver 360°"
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors">
                            <LayoutGrid size={15} />
                          </Link>
                          {isWhatsappCapable(c.telefone) && (
                            <button onClick={() => openWhatsApp(c)} title="Conversar no WhatsApp"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors">
                              <WhatsAppIcon size={15} />
                            </button>
                          )}
                          <button onClick={() => setAgendarCliente(c)} title="Agendar atividade"
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors">
                            <CalendarPlus size={15} />
                          </button>
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

      {/* Paginação numerada — desktop */}
      {items.length > 0 && totalPages > 1 && (
        <div className="hidden md:flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Página {page} de {totalPages} · {total} registros
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

      {/* Cards — mobile */}
      {items.length > 0 && (
        <div className="md:hidden space-y-3">
          {items.map((c) => {
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

                {(vendedorNome(c) || (usaParceiros && c.parceiro_id)) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 mb-1">
                    {vendedorNome(c) && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="text-gray-400 dark:text-gray-500">Vendedor:</span> {vendedorNome(c)}
                      </span>
                    )}
                    {usaParceiros && c.parceiro_id && parceiroMap[c.parceiro_id] && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="text-gray-400 dark:text-gray-500">Parceiro:</span> {parceiroMap[c.parceiro_id]}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {usaParceiros && <span className="text-xs text-gray-400 dark:text-gray-500">{tipoLabel(c.tipo)}</span>}
                    {c.valor_total ? (
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{brl(c.valor_total)}</span>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <Link href={`/clientes/${c.id}`}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600">
                      <LayoutGrid size={15} />
                    </Link>
                    {isWhatsappCapable(c.telefone) && (
                      <button onClick={() => openWhatsApp(c)} title="Conversar no WhatsApp"
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600">
                        <WhatsAppIcon size={15} />
                      </button>
                    )}
                    <button onClick={() => setAgendarCliente(c)}
                      className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600">
                      <CalendarPlus size={15} />
                    </button>
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

      {/* Bloqueio de exclusão → oferece inativar */}
      <BloqueioExclusaoDialog
        vinculos={bloqueio?.vinculos ?? null}
        podeInativar
        inativando={inativando}
        onInativar={handleInativar}
        onClose={() => setBloqueio(null)}
      />

      {agendarCliente && (
        <CompromissoFormModal
          prefill={{ clienteId: agendarCliente.id, titulo: `Contato — ${agendarCliente.empresa || agendarCliente.nome}` }}
          onClose={() => setAgendarCliente(null)}
        />
      )}

      {/* Modal criar/editar */}
      {formOpen && (
        <ClienteFormModal
          cliente={editingCliente ?? undefined}
          onClose={() => { setFormOpen(false); setEditingCliente(null) }}
        />
      )}

      {importOpen && (
        <ImportModal
          modulo="clientes"
          onClose={() => setImportOpen(false)}
        />
      )}
    </>
  )
}
