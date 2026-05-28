'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ChevronRight, Mail, Phone,
  TrendingUp, Calendar, Pencil,
  MessageSquare, Plus, X, Save, Lock, Send,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import LeadFormModal from '../../_components/LeadFormModal'
import ConvertModal from '../../_components/ConvertModal'
import { type Lead, statusStyle, statusLabel } from '../../_components/types'
import { useTenantConfig } from '@/app/(crm)/_components/TenantContext'

/* ─────────────── Types ── */

interface OpData {
  id: string; titulo: string; numero: string | null
  status: string; etapa: string | null; valor: number | null; criado_em: string
}
interface HistoricoData {
  id: string; tipo: string | null; texto: string | null
  valor: number | null; usuario_nome: string | null; criado_em: string
}
interface Props {
  lead: Lead
  oportunidades: OpData[]
  historico: HistoricoData[]
}

/* ─────────────── Helpers ── */

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
function brl(v: number | null | undefined) {
  if (v == null) return null
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v)
}
function initials(nome: string) {
  const p = nome.trim().split(/\s+/)
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
function avatarBg(nome: string) {
  const palette = ['bg-blue-500','bg-indigo-500','bg-violet-500','bg-emerald-500','bg-teal-500','bg-amber-500','bg-rose-500','bg-cyan-500']
  let h = 0; for (const c of nome) h = h * 31 + c.charCodeAt(0)
  return palette[Math.abs(h) % palette.length]
}

function tipoHistoricoIcon(tipo: string | null) {
  switch (tipo) {
    case 'ligacao':  return { icon: '📞', label: 'Ligação' }
    case 'reuniao':  return { icon: '🤝', label: 'Reunião' }
    case 'email':    return { icon: '📧', label: 'E-mail' }
    case 'visita':   return { icon: '🏢', label: 'Visita' }
    case 'whatsapp': return { icon: '💬', label: 'WhatsApp' }
    default:         return { icon: '📝', label: 'Nota' }
  }
}

function opBadge(status: string, etapa: string | null) {
  if (status === 'ganho')   return { label: 'Ganho',   cls: 'bg-green-100 text-green-700' }
  if (status === 'perdido') return { label: 'Perdido', cls: 'bg-red-100 text-red-600' }
  switch (etapa) {
    case 'Qualificação': return { label: etapa, cls: 'bg-blue-100 text-blue-700' }
    case 'Proposta':     return { label: etapa, cls: 'bg-indigo-100 text-indigo-700' }
    case 'Negociação':   return { label: etapa, cls: 'bg-violet-100 text-violet-700' }
    default:             return { label: etapa ?? 'Prospecção', cls: 'bg-gray-100 text-gray-600' }
  }
}

/* ─────────────── Jornada de status ── */

const JORNADA = [
  { value: 'novo',       label: 'Novo',        color: 'blue'   },
  { value: 'contato',    label: 'Em contato',  color: 'yellow' },
  { value: 'qualificado',label: 'Qualificado', color: 'purple' },
  { value: 'convertido', label: 'Convertido',  color: 'green'  },
]

const STEP_COLORS: Record<string, { done: string; active: string; text: string }> = {
  blue:   { done: 'bg-blue-500',   active: 'ring-blue-400   bg-blue-500',   text: 'text-blue-600'   },
  yellow: { done: 'bg-yellow-400', active: 'ring-yellow-300 bg-yellow-400', text: 'text-yellow-600' },
  purple: { done: 'bg-purple-500', active: 'ring-purple-400 bg-purple-500', text: 'text-purple-600' },
  green:  { done: 'bg-green-500',  active: 'ring-green-400  bg-green-500',  text: 'text-green-600'  },
}

function JornadaStatus({ status }: { status: string }) {
  if (status === 'perdido') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Jornada</p>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
          <span className="text-sm font-medium text-red-600">Lead perdido</span>
        </div>
      </div>
    )
  }

  const currentIdx = JORNADA.findIndex(s => s.value === status)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Jornada</p>
      <div className="flex items-center gap-0">
        {JORNADA.map((step, idx) => {
          const isDone    = idx < currentIdx
          const isActive  = idx === currentIdx
          const isPending = idx > currentIdx
          const c = STEP_COLORS[step.color]

          return (
            <div key={step.value} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full shrink-0 transition-all ${
                  isDone    ? c.done :
                  isActive  ? `ring-2 ring-offset-2 ${c.active}` :
                  'bg-gray-200'
                }`} />
                <span className={`text-xs font-medium whitespace-nowrap ${
                  isDone || isActive ? c.text : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < JORNADA.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mb-5 ${idx < currentIdx ? 'bg-gray-400' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────── Tipos de interação ── */

const TIPOS_HISTORICO = [
  { value: 'ligacao',  label: '📞 Ligação' },
  { value: 'reuniao',  label: '🤝 Reunião' },
  { value: 'email',    label: '📧 E-mail' },
  { value: 'visita',   label: '🏢 Visita' },
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'nota',     label: '📝 Nota interna' },
  { value: 'outros',   label: '💡 Outros' },
]

/* ─────────────── Main ── */

const DEFAULT_WA_TEMPLATE = 'Olá {nome}, tudo bem? Gostaria de entrar em contato para conhecer melhor suas necessidades.'

function applyTemplate(template: string, lead: Lead) {
  return template
    .replace(/\{nome\}/g, lead.nome)
    .replace(/\{empresa\}/g, lead.empresa ?? '')
}

function formatPhone(tel: string) {
  const d = tel.replace(/\D/g, '')
  if (d.startsWith('55') && d.length >= 12) return d
  return `55${d}`
}

export default function Lead360View({ lead, oportunidades, historico }: Props) {
  const router = useRouter()
  const { tenantId, whatsappTemplate } = useTenantConfig()

  const [editOpen,    setEditOpen]    = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)

  // Form de interação
  const [showForm,  setShowForm]  = useState(false)
  const [tipo,      setTipo]      = useState('ligacao')
  const [descricao, setDescricao] = useState('')
  const [valor,     setValor]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [erro,      setErro]      = useState('')

  // Form de e-mail
  const [showEmail,    setShowEmail]    = useState(false)
  const [emailAssunto, setEmailAssunto] = useState(`Olá ${lead.nome}`)
  const [emailCorpo,   setEmailCorpo]   = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailErro,    setEmailErro]    = useState('')

  /** Marca o lead como 'contato' se ainda for 'novo', e loga no histórico */
  async function registrarPrimeiroContato(tipoContato: 'whatsapp' | 'email') {
    const supabase = createClient()
    const ops = [
      Promise.resolve(supabase.from('historico').insert({
        tenant_id: tenantId,
        lead_id:   lead.id,
        tipo:      tipoContato,
        texto:     tipoContato === 'whatsapp' ? 'WhatsApp iniciado pelo sistema' : 'E-mail enviado pelo sistema',
        criado_em: new Date().toISOString(),
      })),
    ]
    if (lead.status === 'novo') {
      ops.push(Promise.resolve(
        supabase.from('leads').update({ status: 'contato' }).eq('id', lead.id)
      ))
    }
    await Promise.all(ops)
    router.refresh()
  }

  function handleWhatsApp() {
    if (!lead.telefone) return
    const template = whatsappTemplate ?? DEFAULT_WA_TEMPLATE
    const msg = encodeURIComponent(applyTemplate(template, lead))
    const tel = formatPhone(lead.telefone)
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank')
    registrarPrimeiroContato('whatsapp')
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!emailCorpo.trim()) { setEmailErro('Escreva o conteúdo do e-mail.'); return }
    setSendingEmail(true); setEmailErro('')
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: lead.email, subject: emailAssunto, html: emailCorpo.replace(/\n/g, '<br>') }),
    })
    setSendingEmail(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setEmailErro(data.error ?? 'Erro ao enviar e-mail.')
      return
    }
    setShowEmail(false); setEmailCorpo(''); setEmailAssunto(`Olá ${lead.nome}`)
    await registrarPrimeiroContato('email')
  }

  async function handleSaveInteracao(e: React.FormEvent) {
    e.preventDefault()
    if (!descricao.trim()) { setErro('Descreva a interação.'); return }
    setSaving(true); setErro('')
    const supabase = createClient()
    const { error } = await supabase.from('historico').insert({
      tenant_id:  tenantId,
      lead_id:    lead.id,
      tipo,
      texto:      descricao.trim(),
      valor:      valor ? Number(valor) : null,
      criado_em:  new Date().toISOString(),
    })
    setSaving(false)
    if (error) { setErro(error.message); return }
    setDescricao(''); setValor(''); setTipo('ligacao')
    setShowForm(false)
    router.refresh()
  }

  const isConvertido = lead.status === 'convertido'
  const isPerdido    = lead.status === 'perdido'

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/leads" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={15} /> Leads
        </Link>
        <ChevronRight size={13} className="text-gray-300" />
        <span className="text-sm text-gray-700 font-medium truncate">{lead.nome}</span>
      </div>

      {/* Card do lead */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl ${avatarBg(lead.nome)} text-white font-bold text-lg flex items-center justify-center shrink-0`}>
            {initials(lead.nome)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-lg font-semibold text-gray-900 leading-tight">{lead.nome}</h1>
                {lead.empresa && (
                  <p className="text-sm text-gray-500 mt-0.5">{lead.empresa}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${statusStyle(lead.status)}`}>
                  {statusLabel(lead.status)}
                </span>
                {!isConvertido && !isPerdido && (
                  <>
                    {lead.telefone && (
                      <button onClick={handleWhatsApp}
                        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-300 px-2.5 py-1 rounded-lg font-medium transition-colors">
                        💬 WhatsApp
                      </button>
                    )}
                    {lead.email && (
                      <button onClick={() => setShowEmail(s => !s)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 px-2.5 py-1 rounded-lg font-medium transition-colors">
                        <Mail size={11} /> E-mail
                      </button>
                    )}
                    <button onClick={() => setConvertOpen(true)}
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 border border-green-200 hover:border-green-300 px-2.5 py-1 rounded-lg font-medium transition-colors">
                      <TrendingUp size={11} /> Converter
                    </button>
                    <button onClick={() => setEditOpen(true)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 px-2.5 py-1 rounded-lg transition-colors">
                      <Pencil size={11} /> Editar
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  <Mail size={13} className="text-gray-400 shrink-0" /> {lead.email}
                </a>
              )}
              {lead.telefone && (
                <a href={`tel:${lead.telefone}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  <Phone size={13} className="text-gray-400 shrink-0" /> {lead.telefone}
                </a>
              )}
            </div>

            {lead.obs && (
              <p className="text-sm text-gray-500 mt-2 italic">"{lead.obs}"</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Calendar size={11} /> Cadastrado em {fmt(lead.criado_em)}</span>
          {lead.origem && (
            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{lead.origem}</span>
          )}
        </div>
      </div>

      {/* Modal inline de e-mail */}
      {showEmail && lead.email && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail size={15} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900">Enviar e-mail</h3>
              <span className="text-xs text-gray-400">→ {lead.email}</span>
            </div>
            <button onClick={() => setShowEmail(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSendEmail} className="space-y-3">
            <input
              type="text" value={emailAssunto} onChange={e => setEmailAssunto(e.target.value)}
              placeholder="Assunto"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={emailCorpo} onChange={e => setEmailCorpo(e.target.value)} rows={5}
              placeholder={`Olá ${lead.nome},\n\n`}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {emailErro && <p className="text-xs text-red-600">{emailErro}</p>}
            {lead.status === 'novo' && (
              <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                ✓ Status do lead será atualizado para <strong>Em contato</strong> ao enviar.
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowEmail(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={sendingEmail}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                <Send size={13} /> {sendingEmail ? 'Enviando...' : 'Enviar e-mail'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Jornada de status */}
      <JornadaStatus status={lead.status} />

      {/* Oportunidade(s) vinculada(s) */}
      {oportunidades.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 mb-4">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
            <TrendingUp size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">
              Oportunidade{oportunidades.length > 1 ? 's' : ''} gerada{oportunidades.length > 1 ? 's' : ''}
            </h2>
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{oportunidades.length}</span>
          </div>
          <div className="px-5">
            {oportunidades.map((op) => {
              const badge = opBadge(op.status, op.etapa)
              return (
                <div key={op.id} className="flex items-center justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {op.numero && <span className="text-xs font-mono text-gray-400">{op.numero}</span>}
                      <span className="text-sm font-medium text-gray-800 truncate">{op.titulo}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Calendar size={10} /> {fmt(op.criado_em)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${badge.cls}`}>{badge.label}</span>
                    {brl(op.valor) && <span className="text-sm font-semibold text-gray-700">{brl(op.valor)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Histórico de interações */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MessageSquare size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Histórico de Interações</h2>
            {historico.length > 0 && (
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{historico.length}</span>
            )}
          </div>
          {/* Só permite registrar se o lead ainda está ativo */}
          {!isConvertido && !isPerdido && (
            <button onClick={() => setShowForm(s => !s)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
              {showForm ? <><X size={12} /> Cancelar</> : <><Plus size={12} /> Registrar</>}
            </button>
          )}
        </div>

        {/* Banner de bloqueio para leads encerrados */}
        {(isConvertido || isPerdido) && (
          <div className={`mx-5 mt-4 mb-2 flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm ${
            isConvertido
              ? 'bg-purple-50 border border-purple-100 text-purple-700'
              : 'bg-red-50 border border-red-100 text-red-700'
          }`}>
            <Lock size={14} className="shrink-0 mt-0.5" />
            <div>
              {isConvertido ? (
                <>
                  <span className="font-semibold">Lead convertido.</span>{' '}
                  Novas interações devem ser registradas na oportunidade ou no cliente.
                  {oportunidades.length > 0 && (
                    <Link href="/oportunidades" className="ml-1 underline font-medium hover:opacity-80">
                      Ver oportunidades →
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <span className="font-semibold">Lead perdido.</span>{' '}
                  O histórico abaixo é mantido como registro.
                </>
              )}
            </div>
          </div>
        )}

        {showForm && !isConvertido && !isPerdido && (
          <form onSubmit={handleSaveInteracao} className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {TIPOS_HISTORICO.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor (opcional)</label>
                <input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrição *</label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
                placeholder="Descreva o que foi tratado nessa interação..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            {erro && <p className="text-xs text-red-600">{erro}</p>}
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
              <Save size={13} /> {saving ? 'Salvando...' : 'Registrar interação'}
            </button>
          </form>
        )}

        <div className="px-5">
          {historico.length === 0 && !showForm
            ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">Nenhuma interação registrada ainda.</p>
                {!isConvertido && !isPerdido && (
                  <button onClick={() => setShowForm(true)}
                    className="mt-2 text-sm text-blue-600 hover:underline">
                    Registrar primeira interação
                  </button>
                )}
              </div>
            )
            : historico.map((h) => {
                const { icon, label } = tipoHistoricoIcon(h.tipo)
                return (
                  <div key={h.id} className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
                    <span className="text-lg leading-none mt-0.5 shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                          {h.usuario_nome && (
                            <span className="text-xs text-gray-400 ml-2">por {h.usuario_nome}</span>
                          )}
                          {h.texto && (
                            <p className="text-sm text-gray-700 mt-0.5">{h.texto}</p>
                          )}
                        </div>
                        {h.valor != null && (
                          <span className="text-sm font-semibold text-gray-700 shrink-0">{brl(h.valor)}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{fmtDatetime(h.criado_em)}</p>
                    </div>
                  </div>
                )
              })
          }
        </div>
      </div>

      {/* Modais */}
      {editOpen && (
        <LeadFormModal lead={lead} onClose={() => setEditOpen(false)} />
      )}
      {convertOpen && (
        <ConvertModal lead={lead} onClose={() => setConvertOpen(false)} />
      )}
    </>
  )
}
