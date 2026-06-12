'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, MapPin, Building2,
  FileText, ShoppingCart, TrendingUp, DollarSign, Target,
  Calendar, Pencil, ChevronRight, MessageSquare,
  Plus, X, Save, Radar,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AgendaVinculada, { type CompromissoData } from '@/app/(crm)/_components/AgendaVinculada'
import WhatsAppConversaSection from '@/app/(crm)/_components/WhatsAppConversaSection'
import WhatsAppIcon from '@/app/(crm)/_components/WhatsAppIcon'
import ClienteFormModal from '../../_components/ClienteFormModal'
import { type Cliente, tipoLabel, statusStyle, statusLabel, brl as brlCliente } from '../../_components/types'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
import { useBreadcrumb } from '@/app/(crm)/_components/BreadcrumbContext'

/* ─────────────────────── Types ── */

interface OpData {
  id: string; titulo: string; numero: string | null
  status: string; etapa: string | null; valor: number | null; criado_em: string
}
interface PropostaData {
  id: string; titulo: string; numero: string | null
  status: string; valor: number | null; validade: string | null; criado_em: string
}
interface PedidoData {
  id: string; numero: string | null; status: string; valor: number | null; criado_em: string
}
interface HistoricoData {
  id: string; tipo: string | null; texto: string | null
  valor: number | null; usuario_nome: string | null; criado_em: string
}
interface Props {
  cliente: Cliente
  oportunidades: OpData[]
  propostas: PropostaData[]
  pedidos: PedidoData[]
  historico: HistoricoData[]
  compromissos: CompromissoData[]
}

/* ─────────────────────── Helpers ── */

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
function brl(v: number | null | undefined) {
  if (v == null) return '—'
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

/* ── Badges ── */
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
function propostaBadge(s: string) {
  if (s === 'enviada')  return { label: 'Enviada',  cls: 'bg-blue-100 text-blue-700' }
  if (s === 'aprovada') return { label: 'Aceita', cls: 'bg-green-100 text-green-700' }
  if (s === 'recusada') return { label: 'Recusada', cls: 'bg-red-100 text-red-600' }
  return { label: 'Rascunho', cls: 'bg-gray-100 text-gray-500' }
}
function pedidoBadge(s: string) {
  if (s === 'em_producao') return { label: 'Em produção', cls: 'bg-blue-100 text-blue-700' }
  if (s === 'entregue')    return { label: 'Entregue',    cls: 'bg-green-100 text-green-700' }
  if (s === 'cancelado')   return { label: 'Cancelado',   cls: 'bg-red-100 text-red-600' }
  return { label: 'Aguardando', cls: 'bg-yellow-100 text-yellow-700' }
}
function tipoHistoricoIcon(tipo: string | null) {
  switch (tipo) {
    case 'ligacao':  return { icon: '📞', label: 'Ligação' }
    case 'reuniao':  return { icon: '🤝', label: 'Reunião' }
    case 'email':    return { icon: '📧', label: 'E-mail' }
    case 'visita':   return { icon: '🏢', label: 'Visita' }
    case 'whatsapp': return { icon: '💬', label: 'WhatsApp' }
    case 'proposta': return { icon: '📄', label: 'Proposta' }
    case 'pedido':   return { icon: '📦', label: 'Pedido' }
    case 'op':       return { icon: '🏆', label: 'Oportunidade' }
    default:         return { icon: '📝', label: 'Nota' }
  }
}

/* ─────────────────────── Main ── */

export default function Cliente360View({ cliente, oportunidades, propostas, pedidos, historico, compromissos }: Props) {
  const router    = useRouter()
  const tenantId  = useTenantId()
  const { setBreadcrumb } = useBreadcrumb()
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    const label = cliente.empresa ?? cliente.nome
    setBreadcrumb({ parentLabel: 'Clientes', parentHref: '/clientes', currentLabel: label })
    return () => setBreadcrumb(null)
  }, [cliente, setBreadcrumb])

  const opsAbertas  = oportunidades.filter(o => o.status !== 'ganho' && o.status !== 'perdido')
  const opsGanhas   = oportunidades.filter(o => o.status === 'ganho')
  const endereco    = [cliente.cidade, cliente.estado].filter(Boolean).join(' / ')
  const endFull     = [cliente.rua, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(', ')

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/clientes" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">
          <ArrowLeft size={15} /> Clientes
        </Link>
        <ChevronRight size={13} className="text-gray-300 dark:text-gray-600" />
        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">{cliente.nome}</span>
      </div>

      {/* Card do cliente */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl ${avatarBg(cliente.nome)} text-white font-bold text-lg flex items-center justify-center shrink-0`}>
            {initials(cliente.nome)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">{cliente.nome}</h1>
                {cliente.empresa && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                    <Building2 size={12} className="shrink-0" /> {cliente.empresa}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status — badge com ponto colorido */}
                {(() => { const st = statusStyle(cliente.status); return (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {statusLabel(cliente.status)}
                  </span>
                )})()}
                {/* Tipo — Direto / Revenda */}
                {cliente.tipo && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                    {tipoLabel(cliente.tipo)}
                  </span>
                )}
                <button onClick={() => setEditOpen(true)}
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 px-2.5 py-1 rounded-lg transition-colors">
                  <Pencil size={11} /> Editar
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
              {cliente.email && (
                <a href={`mailto:${cliente.email}`} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <Mail size={13} className="text-gray-400 dark:text-gray-500 shrink-0" /> {cliente.email}
                </a>
              )}
              {cliente.telefone && (
                <a href={`tel:${cliente.telefone}`} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <Phone size={13} className="text-gray-400 dark:text-gray-500 shrink-0" /> {cliente.telefone}
                </a>
              )}
              {endereco && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400" title={endFull}>
                  <MapPin size={13} className="text-gray-400 dark:text-gray-500 shrink-0" /> {endereco}
                </span>
              )}
              {cliente.cpf_cnpj && (
                <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{cliente.cpf_cnpj}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <Calendar size={11} /> Cliente desde {fmt(cliente.criado_em)}
          </span>
          {cliente.origem && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              <Radar size={10} /> {cliente.origem}
            </span>
          )}
          {cliente.lead_id && (
            <Link
              href={`/leads/${cliente.lead_id}`}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-100 px-2 py-0.5 rounded-full font-medium transition-colors"
            >
              <Target size={10} /> Originado de lead
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={TrendingUp} label="Ops abertas"
          value={String(opsAbertas.length)}
          sub={opsGanhas.length > 0 ? `${opsGanhas.length} ganha${opsGanhas.length > 1 ? 's' : ''}` : undefined}
          color="blue" />
        <StatCard icon={FileText} label="Propostas"
          value={String(propostas.length)}
          sub={propostas.filter(p => p.status === 'aprovada').length > 0
            ? `${propostas.filter(p => p.status === 'aprovada').length} aceita${propostas.filter(p => p.status === 'aprovada').length > 1 ? 's' : ''}`
            : undefined}
          color="indigo" />
        <StatCard icon={ShoppingCart} label="Pedidos"
          value={String(pedidos.length)}
          sub={pedidos.filter(p => p.status === 'entregue').length > 0
            ? `${pedidos.filter(p => p.status === 'entregue').length} entregue${pedidos.filter(p => p.status === 'entregue').length > 1 ? 's' : ''}`
            : undefined}
          color="emerald" />
        <StatCard icon={DollarSign} label="Total comprado"
          value={brlCliente(cliente.valor_total) ?? '—'}
          color="violet" />
      </div>

      {/* ── Oportunidades ── */}
      <Section titulo="Oportunidades" count={oportunidades.length} icon={TrendingUp} emptyMsg="Nenhuma oportunidade vinculada." linkHref="/oportunidades" linkLabel="Ver todas">
        {oportunidades.map((op) => {
          const badge = opBadge(op.status, op.etapa)
          return (
            <ItemRow key={op.id}
              numero={op.numero}
              titulo={op.titulo}
              data={fmt(op.criado_em)}
              badge={badge}
              valor={brl(op.valor)}
            />
          )
        })}
      </Section>

      {/* ── Propostas ── */}
      <Section titulo="Propostas" count={propostas.length} icon={FileText} emptyMsg="Nenhuma proposta vinculada." linkHref="/propostas" linkLabel="Ver todas">
        {propostas.map((p) => {
          const badge = propostaBadge(p.status)
          return (
            <ItemRow key={p.id}
              numero={p.numero}
              titulo={p.titulo}
              data={`${fmt(p.criado_em)}${p.validade ? ` · válida até ${fmt(p.validade)}` : ''}`}
              badge={badge}
              valor={brl(p.valor)}
            />
          )
        })}
      </Section>

      {/* ── Pedidos ── */}
      <Section titulo="Pedidos" count={pedidos.length} icon={ShoppingCart} emptyMsg="Nenhum pedido vinculado." linkHref="/pedidos" linkLabel="Ver todos">
        {pedidos.map((p) => {
          const badge = pedidoBadge(p.status)
          return (
            <ItemRow key={p.id}
              numero={p.numero}
              titulo={p.numero ? undefined : 'Pedido sem número'}
              data={fmt(p.criado_em)}
              badge={badge}
              valor={brl(p.valor)}
            />
          )
        })}
      </Section>

      {/* Financeiro do cliente (a receber / inadimplência via ERP) virá aqui — ver roadmap */}

      {/* ── Atividades da Agenda ── */}
      <WhatsAppConversaSection clienteId={cliente.id} />
      <AgendaVinculada compromissos={compromissos} />

      {/* ── Histórico de Interações ── */}
      <HistoricoSection
        clienteId={cliente.id}
        tenantId={tenantId}
        historico={historico}
        onSaved={() => router.refresh()}
      />

      {editOpen && (
        <ClienteFormModal cliente={cliente} onClose={() => setEditOpen(false)} />
      )}
    </>
  )
}

/* ──────────────────── Notas Fiscais section ── */

/* ──────────────────── Agenda section ── */


/* ──────────────────── Histórico section ── */

const TIPOS_HISTORICO = [
  { value: 'ligacao',  label: '📞 Ligação' },
  { value: 'reuniao',  label: '🤝 Reunião' },
  { value: 'email',    label: '📧 E-mail' },
  { value: 'visita',   label: '🏢 Visita' },
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'nota',     label: '📝 Nota interna' },
  { value: 'outros',   label: '💡 Outros' },
]

function HistoricoSection({
  clienteId, tenantId, historico, onSaved,
}: { clienteId: string; tenantId: string; historico: HistoricoData[]; onSaved: () => void }) {
  const [showForm, setShowForm]   = useState(false)
  const [tipo, setTipo]           = useState('ligacao')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [erro, setErro]           = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!descricao.trim()) { setErro('Descreva a interação.'); return }
    setSaving(true); setErro('')
    const supabase = createClient()
    const { error } = await supabase.from('historico').insert({
      tenant_id:  tenantId,
      cliente_id: clienteId,
      tipo,
      texto:      descricao.trim(),
      valor:      valor ? Number(valor) : null,
      criado_em:  new Date().toISOString(),
    })
    setSaving(false)
    if (error) { setErro(error.message); return }
    setDescricao(''); setValor(''); setTipo('ligacao')
    setShowForm(false)
    onSaved()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-gray-400 dark:text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Histórico de Interações</h2>
          {historico.length > 0 && (
            <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">{historico.length}</span>
          )}
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
          {showForm ? <><X size={12} /> Cancelar</> : <><Plus size={12} /> Registrar</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100">
                {TIPOS_HISTORICO.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Valor (opcional)</label>
              <input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="R$ 0,00"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descrição *</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
              placeholder="Descreva o que foi tratado nessa interação..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
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
          ? <p className="py-6 text-sm text-gray-400 dark:text-gray-500 text-center">Nenhuma interação registrada.</p>
          : historico.map((h) => {
              const { icon, label } = tipoHistoricoIcon(h.tipo)
              return (
                <div key={h.id} className="flex gap-3 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <span className="text-lg leading-none mt-0.5 shrink-0">{h.tipo === 'whatsapp' ? <WhatsAppIcon size={16} className="text-emerald-500" /> : icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
                        {h.usuario_nome && <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">por {h.usuario_nome}</span>}
                        {h.texto && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{h.texto}</p>
                        )}
                      </div>
                      {h.valor != null && (
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">{brl(h.valor)}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{fmtDatetime(h.criado_em)}</p>
                  </div>
                </div>
              )
            })
        }
      </div>
    </div>
  )
}

/* ──────────────── Stat card ── */

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string
  color: 'blue' | 'indigo' | 'emerald' | 'violet'
}) {
  const c = { blue: { bg: 'bg-blue-50', ic: 'text-blue-500' }, indigo: { bg: 'bg-indigo-50', ic: 'text-indigo-500' }, emerald: { bg: 'bg-emerald-50', ic: 'text-emerald-500' }, violet: { bg: 'bg-violet-50', ic: 'text-violet-500' } }[color]
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
        <Icon size={15} className={c.ic} />
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ──────────────── Section wrapper ── */

function Section({ titulo, count, icon: Icon, emptyMsg, linkHref, linkLabel, children }: {
  titulo: string; count: number; icon: React.ElementType
  emptyMsg: string; linkHref: string; linkLabel: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-gray-400 dark:text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{titulo}</h2>
          {count > 0 && (
            <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        <Link href={linkHref} className="text-xs text-blue-600 hover:underline">{linkLabel}</Link>
      </div>
      <div className="px-5">
        {count === 0
          ? <p className="py-6 text-sm text-gray-400 dark:text-gray-500 text-center">{emptyMsg}</p>
          : children
        }
      </div>
    </div>
  )
}

/* ──────────────── Item row ── */

function ItemRow({ numero, titulo, data, badge, valor }: {
  numero?: string | null; titulo?: string; data: string
  badge: { label: string; cls: string }; valor: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {numero && <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{numero}</span>}
          {titulo  && <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{titulo}</span>}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
          <Calendar size={10} /> {data}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-medium px-2 py-1 rounded-lg ${badge.cls}`}>{badge.label}</span>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{valor}</span>
      </div>
    </div>
  )
}
