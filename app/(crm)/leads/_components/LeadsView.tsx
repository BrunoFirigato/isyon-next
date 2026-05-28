'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, Search, X, Pencil, TrendingUp, Trash2, LayoutGrid, Mail, MessageCircle, Send } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LeadFormModal from './LeadFormModal'
import ConvertModal from './ConvertModal'
import { type Lead, STATUS_LEADS, statusStyle, statusLabel, formatDate } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantConfig } from '@/app/(crm)/_components/TenantContext'

interface Props {
  leads: Lead[]
  currentStatus: string
  currentQ: string
}

const DEFAULT_WA_TEMPLATE = 'Olá {nome}, tudo bem? Gostaria de entrar em contato para conhecer melhor suas necessidades.'

function applyTemplate(tpl: string, lead: Lead) {
  return tpl.replace(/\{nome\}/g, lead.nome).replace(/\{empresa\}/g, lead.empresa ?? '')
}
function formatPhone(tel: string) {
  const d = tel.replace(/\D/g, '')
  return d.startsWith('55') && d.length >= 12 ? d : `55${d}`
}

export default function LeadsView({ leads, currentStatus, currentQ }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const toast = useToast()
  const { tenantId, whatsappTemplate, emailTemplateAssunto, emailTemplateCorpo } = useTenantConfig()

  const [search, setSearch] = useState(currentQ)
  const [formOpen, setFormOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Modal de compose de e-mail
  const [composingLead, setComposingLead] = useState<Lead | null>(null)
  const [emailAssunto,  setEmailAssunto]  = useState('')
  const [emailCorpo,    setEmailCorpo]    = useState('')
  const [sendingEmail,  setSendingEmail]  = useState(false)
  const [emailErro,     setEmailErro]     = useState('')

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
    const tpl = whatsappTemplate ?? DEFAULT_WA_TEMPLATE
    const msg = encodeURIComponent(applyTemplate(tpl, lead))
    window.open(`https://wa.me/${formatPhone(lead.telefone)}?text=${msg}`, '_blank')
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
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
        <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Contato</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Origem</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-blue-50/30 transition-colors group">
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
            <div key={lead.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
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

      {/* Modal compose e-mail */}
      {composingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeEmailModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-blue-500 shrink-0" />
                <h3 className="text-base font-semibold text-gray-900">Novo e-mail</h3>
              </div>
              <button onClick={closeEmailModal} className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Destinatário */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-medium text-gray-500 shrink-0">Para</span>
              <span className="text-sm font-medium text-gray-800">{composingLead.nome}</span>
              <span className="text-xs text-gray-400 truncate">&lt;{composingLead.email}&gt;</span>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              {/* Assunto */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Assunto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={emailAssunto}
                  onChange={e => setEmailAssunto(e.target.value)}
                  placeholder="Ex: Proposta comercial para {empresa}"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Mensagem */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Mensagem <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={emailCorpo}
                  onChange={e => setEmailCorpo(e.target.value)}
                  rows={7}
                  placeholder={`Olá ${composingLead.nome},\n\nEscreva sua mensagem aqui...`}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="mt-1 text-xs text-gray-400">Cada quebra de linha será preservada no e-mail enviado.</p>
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
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
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
    </>
  )
}
