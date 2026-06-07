'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Plus, Search, X, Pencil, TrendingUp, Trash2, LayoutGrid, Mail, MessageCircle, Send, Upload, ChevronLeft, ChevronRight, Loader2, CalendarPlus } from 'lucide-react'
import ExportButton from '@/app/(crm)/_components/ExportButton'
import ImportModal  from '@/app/(crm)/_components/ImportModal'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { vinculosLead, mensagemBloqueio } from '@/lib/exclusao'
import LeadFormModal from './LeadFormModal'
import ConvertModal from './ConvertModal'
import CompromissoFormModal from '@/app/(crm)/agenda/_components/CompromissoFormModal'
import { type Lead, STATUS_LEADS, SCORE_OPTIONS, LEADS_PAGE_SIZE, LEAD_COLS, statusStyle, statusLabel, formatDate, scoreInfo } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantConfig } from '@/app/(crm)/_components/TenantContext'

interface Props {
  leads: Lead[]
  total: number
  currentStatus: string
  currentQ: string
}

/** Calcula os números de página visíveis, com reticências (ex.: 1 … 4 5 6 … 20). */
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

function applyTemplate(tpl: string, lead: Lead) {
  return tpl.replace(/\{nome\}/g, lead.nome).replace(/\{empresa\}/g, lead.empresa ?? '')
}

export default function LeadsView({ leads, total: totalProp, currentStatus, currentQ }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const toast = useToast()
  const { tenantId, emailTemplateAssunto, emailTemplateCorpo } = useTenantConfig()

  // Paginação: items é a fatia exibida; total é o universo filtrado
  const [items, setItems] = useState<Lead[]>(leads)
  const [total, setTotal] = useState(totalProp)
  const [page, setPage]   = useState(1)
  const [loadingPage, setLoadingPage] = useState(false)
  const totalPages = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE))

  // Quando o servidor reenvia dados (busca, filtro, criação/edição), reseta a paginação
  useEffect(() => {
    setItems(leads)
    setTotal(totalProp)
    setPage(1)
  }, [leads, totalProp])

  // Busca uma página no banco (respeitando filtro/busca atuais via RLS do tenant)
  async function fetchPage(n: number): Promise<Lead[]> {
    const supabase = createClient()
    let qy = supabase.from('leads').select(LEAD_COLS).order('criado_em', { ascending: false })
    if (currentStatus && currentStatus !== 'todos') qy = qy.eq('status', currentStatus)
    if (currentQ.trim()) {
      const termo = currentQ.trim()
      qy = qy.or(`nome.ilike.%${termo}%,empresa.ilike.%${termo}%,email.ilike.%${termo}%,telefone.ilike.%${termo}%`)
    }
    const { data, error } = await qy.range((n - 1) * LEADS_PAGE_SIZE, n * LEADS_PAGE_SIZE - 1)
    if (error) { toast('Erro ao carregar leads', 'error'); return [] }
    return (data ?? []) as Lead[]
  }

  // Desktop: troca a janela exibida pela página clicada
  async function goToPage(n: number) {
    if (n === page || n < 1 || n > totalPages || loadingPage) return
    setLoadingPage(true)
    const rows = await fetchPage(n)
    setItems(rows); setPage(n); setLoadingPage(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Mobile: acrescenta a próxima página ao final
  async function loadMore() {
    if (loadingPage) return
    setLoadingPage(true)
    const rows = await fetchPage(page + 1)
    setItems((prev) => [...prev, ...rows]); setPage((p) => p + 1); setLoadingPage(false)
  }

  const [search, setSearch] = useState(currentQ)
  const [formOpen,   setFormOpen]   = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null)
  const [agendarLead, setAgendarLead] = useState<Lead | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Modal de compose de e-mail
  const [composingLead, setComposingLead] = useState<Lead | null>(null)
  const [emailAssunto,  setEmailAssunto]  = useState('')
  const [emailCorpo,    setEmailCorpo]    = useState('')
  const [sendingEmail,  setSendingEmail]  = useState(false)
  const [emailErro,     setEmailErro]     = useState('')

  // Abre o modal de novo lead direto quando vem do dashboard (?novo=1)
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('novo') === '1') { setEditingLead(null); setFormOpen(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  async function handleContato(lead: Lead, canal: 'whatsapp' | 'email') {
    const supabase = createClient()
    const ops = [
      Promise.resolve(supabase.from('historico').insert({
        tenant_id: tenantId,
        lead_id:   lead.id,
        tipo:      canal,
        texto:     canal === 'whatsapp' ? 'WhatsApp iniciado' : 'E-mail iniciado',
        criado_em: new Date().toISOString(),
      })),
    ]
    if (lead.status === 'novo') {
      ops.push(Promise.resolve(supabase.from('leads').update({ status: 'contato' }).eq('id', lead.id)))
    }
    await Promise.all(ops)
    router.refresh()
  }

  function openWhatsApp(lead: Lead) {
    if (!lead.telefone) return
    // Abre a conversa interna do Isyon (existente ou nova) em vez do WhatsApp externo
    router.push(`/conversas?lead=${lead.id}`)
    handleContato(lead, 'whatsapp')
  }

  function openEmailModal(lead: Lead) {
    const DEFAULT_ASSUNTO = `Olá ${lead.nome}`
    const DEFAULT_CORPO   = ''
    setEmailAssunto(emailTemplateAssunto ? applyTemplate(emailTemplateAssunto, lead) : DEFAULT_ASSUNTO)
    setEmailCorpo(emailTemplateCorpo   ? applyTemplate(emailTemplateCorpo,   lead) : DEFAULT_CORPO)
    setEmailErro('')
    setComposingLead(lead)
  }

  function closeEmailModal() {
    setComposingLead(null)
    setEmailAssunto('')
    setEmailCorpo('')
    setEmailErro('')
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!composingLead?.email) return
    setSendingEmail(true); setEmailErro('')
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:      composingLead.email,
        subject: emailAssunto,
        html:    emailCorpo.replace(/\n/g, '<br>'),
      }),
    })
    setSendingEmail(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setEmailErro(data.error ?? 'Erro ao enviar e-mail.')
      return
    }
    await handleContato(composingLead, 'email')
    toast('E-mail enviado!')
    closeEmailModal()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const vinc = await vinculosLead(supabase, id)
    if (vinc.length) { setDeletingId(null); toast(mensagemBloqueio(vinc), 'error'); return }
    const { error } = await supabase.from('leads').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Não foi possível excluir — há registros vinculados.', 'error'); return }
    // Remoção otimista — evita recarregar a página inteira
    setItems((prev) => prev.filter((l) => l.id !== id))
    setTotal((t) => Math.max(0, t - 1))
    toast('Lead excluído', 'info')
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Leads</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total} lead{total !== 1 ? 's' : ''}
            {currentStatus !== 'todos' && ` · ${statusLabel(currentStatus)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            href={`/api/exportar/leads?status=${currentStatus}`}
            label="Exportar"
            filename={`leads_${new Date().toISOString().slice(0,10)}.xlsx`}
          />
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Importar</span>
          </button>
          <button
            onClick={() => { setEditingLead(null); setFormOpen(true) }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo lead</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
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
            placeholder="Buscar por nome, empresa, e-mail..."
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

      {/* Legenda do score — só aparece quando há leads pontuados */}
      {items.some((l) => l.score) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4 text-xs text-gray-400 dark:text-gray-500">
          <span className="font-medium text-gray-500 dark:text-gray-400">Score do lead:</span>
          {SCORE_OPTIONS.map((s) => (
            <span key={s.value} className="inline-flex items-center gap-1">
              <span>{s.emoji}</span> {s.label}
            </span>
          ))}
        </div>
      )}

      {/* Lista vazia */}
      {total === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm py-16 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum lead encontrado.</p>
          <button
            onClick={() => { setEditingLead(null); setFormOpen(true) }}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Criar o primeiro lead
          </button>
        </div>
      )}

      {/* Tabela — desktop */}
      {items.length > 0 && (
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/50">
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Contato</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Origem</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((lead) => (
                <tr key={lead.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/50 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      {scoreInfo(lead.score) && (
                        <span title={`Lead ${scoreInfo(lead.score)!.label}`} className="text-sm leading-none">{scoreInfo(lead.score)!.emoji}</span>
                      )}
                      {lead.nome}
                    </p>
                    {lead.empresa && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{lead.empresa}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {lead.email && <p className="text-gray-600 dark:text-gray-400">{lead.email}</p>}
                    {lead.telefone && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{lead.telefone}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{lead.origem ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg capitalize ${statusStyle(lead.status)}`}>
                      {statusLabel(lead.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(lead.criado_em)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/leads/${lead.id}`}
                        title="Visão 360°"
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        <LayoutGrid size={15} />
                      </Link>
                      {lead.status !== 'convertido' && lead.telefone && (
                        <button onClick={() => openWhatsApp(lead)} title="WhatsApp"
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors">
                          <MessageCircle size={15} />
                        </button>
                      )}
                      {lead.status !== 'convertido' && lead.email && (
                        <button onClick={() => openEmailModal(lead)} title="Enviar e-mail"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                          <Mail size={15} />
                        </button>
                      )}
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
                          onClick={() => setAgendarLead(lead)}
                          title="Agendar atividade"
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                        >
                          <CalendarPlus size={15} />
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

      {/* Paginação numerada — desktop */}
      {items.length > 0 && totalPages > 1 && (
        <div className="hidden md:flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Página {page} de {totalPages} · {total} leads
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
          {items.map((lead) => (
            <div key={lead.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    {scoreInfo(lead.score) && (
                      <span title={`Lead ${scoreInfo(lead.score)!.label}`} className="text-sm leading-none">{scoreInfo(lead.score)!.emoji}</span>
                    )}
                    {lead.nome}
                  </p>
                  {lead.empresa && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{lead.empresa}</p>}
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-lg capitalize ${statusStyle(lead.status)}`}>
                  {statusLabel(lead.status)}
                </span>
              </div>

              {(lead.email || lead.telefone) && (
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5 mb-3">
                  {lead.email && <p>{lead.email}</p>}
                  {lead.telefone && <p>{lead.telefone}</p>}
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(lead.criado_em)}</p>
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
                      onClick={() => setAgendarLead(lead)}
                      className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600"
                    >
                      <CalendarPlus size={15} />
                    </button>
                  )}
                  {lead.status !== 'convertido' && (
                    <button
                      onClick={() => { setEditingLead(lead); setFormOpen(true) }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
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
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir lead?</h3>
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

      {agendarLead && (
        <CompromissoFormModal
          prefill={{ leadId: agendarLead.id, titulo: `Contato — ${agendarLead.nome}` }}
          onClose={() => setAgendarLead(null)}
        />
      )}

      {/* Modal compose e-mail */}
      {composingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeEmailModal} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-blue-500 shrink-0" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Novo e-mail</h3>
              </div>
              <button onClick={closeEmailModal} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Destinatário */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">Para</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{composingLead.nome}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate">&lt;{composingLead.email}&gt;</span>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              {/* Assunto */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Assunto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={emailAssunto}
                  onChange={e => setEmailAssunto(e.target.value)}
                  placeholder="Ex: Proposta comercial para {empresa}"
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Mensagem */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Mensagem <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={emailCorpo}
                  onChange={e => setEmailCorpo(e.target.value)}
                  rows={7}
                  placeholder={`Olá ${composingLead.nome},\n\nEscreva sua mensagem aqui...`}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Cada quebra de linha será preservada no e-mail enviado.</p>
              </div>

              {/* Avisos */}
              {composingLead.status === 'novo' && !emailErro && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
                  ✓ O status do lead será atualizado para <strong>Em contato</strong> ao enviar.
                </div>
              )}
              {emailErro && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  {emailErro}
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeEmailModal}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  <Send size={13} />
                  {sendingEmail ? 'Enviando...' : 'Enviar e-mail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importOpen && (
        <ImportModal modulo="leads" onClose={() => setImportOpen(false)} />
      )}
    </>
  )
}
