'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowLeft, Mail, Phone, MapPin, Building2,
  FileText, ShoppingCart, TrendingUp, DollarSign,
  Calendar, Pencil, ChevronRight,
} from 'lucide-react'
import ClienteFormModal from '../../_components/ClienteFormModal'
import { type Cliente, tipoStyle, tipoLabel, brl as brlCliente } from '../../_components/types'

/* ─────────────── Types ── */

interface OpData {
  id: string
  titulo: string
  numero: string | null
  status: string
  etapa: string | null
  valor: number | null
  criado_em: string
}

interface PropostaData {
  id: string
  titulo: string
  numero: string | null
  status: string
  valor: number | null
  validade: string | null
  criado_em: string
}

interface PedidoData {
  id: string
  numero: string | null
  status: string
  valor: number | null
  criado_em: string
}

interface Props {
  cliente: Cliente
  oportunidades: OpData[]
  propostas: PropostaData[]
  pedidos: PedidoData[]
}

/* ─────────────── Helpers ── */

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function brl(v: number | null | undefined) {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v)
}

function initials(nome: string) {
  const p = nome.trim().split(/\s+/)
  if (p.length === 1) return p[0][0].toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function avatarBg(nome: string) {
  const palette = ['bg-blue-500','bg-indigo-500','bg-violet-500','bg-emerald-500','bg-teal-500','bg-amber-500','bg-rose-500','bg-cyan-500']
  let h = 0; for (const c of nome) h = h * 31 + c.charCodeAt(0)
  return palette[Math.abs(h) % palette.length]
}

/* ─────────── Op status ── */
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

/* ─────────── Proposta status ── */
function propostaBadge(status: string) {
  switch (status) {
    case 'enviada':   return { label: 'Enviada',   cls: 'bg-blue-100 text-blue-700' }
    case 'aprovada':  return { label: 'Aprovada',  cls: 'bg-green-100 text-green-700' }
    case 'recusada':  return { label: 'Recusada',  cls: 'bg-red-100 text-red-600' }
    default:          return { label: 'Rascunho',  cls: 'bg-gray-100 text-gray-500' }
  }
}

/* ─────────── Pedido status ── */
function pedidoBadge(status: string) {
  switch (status) {
    case 'em_producao': return { label: 'Em produção', cls: 'bg-blue-100 text-blue-700' }
    case 'entregue':    return { label: 'Entregue',    cls: 'bg-green-100 text-green-700' }
    case 'cancelado':   return { label: 'Cancelado',   cls: 'bg-red-100 text-red-600' }
    default:            return { label: 'Aguardando',  cls: 'bg-yellow-100 text-yellow-700' }
  }
}

/* ─────────────── Main ── */

export default function Cliente360View({ cliente, oportunidades, propostas, pedidos }: Props) {
  const [editOpen, setEditOpen] = useState(false)

  const opsAbertas  = oportunidades.filter(o => o.status !== 'ganho' && o.status !== 'perdido')
  const opsGanhas   = oportunidades.filter(o => o.status === 'ganho')
  const totalPedido = pedidos.reduce((s, p) => s + (p.valor ?? 0), 0)
  const endereco    = [cliente.cidade, cliente.estado].filter(Boolean).join(' / ')
  const endFull     = [cliente.rua, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(', ')

  return (
    <>
      {/* Cabeçalho de navegação */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clientes"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={15} /> Clientes
        </Link>
        <ChevronRight size={13} className="text-gray-300" />
        <span className="text-sm text-gray-700 font-medium truncate">{cliente.nome}</span>
      </div>

      {/* Card principal do cliente */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-xl ${avatarBg(cliente.nome)} text-white font-bold text-lg flex items-center justify-center shrink-0`}>
            {initials(cliente.nome)}
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-lg font-semibold text-gray-900 leading-tight">{cliente.nome}</h1>
                {cliente.empresa && (
                  <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                    <Building2 size={12} className="shrink-0" /> {cliente.empresa}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${tipoStyle(cliente.tipo)}`}>
                  {tipoLabel(cliente.tipo)}
                </span>
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 px-2.5 py-1 rounded-lg transition-colors">
                  <Pencil size={11} /> Editar
                </button>
              </div>
            </div>

            {/* Contato */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
              {cliente.email && (
                <a href={`mailto:${cliente.email}`}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  <Mail size={13} className="text-gray-400 shrink-0" /> {cliente.email}
                </a>
              )}
              {cliente.telefone && (
                <a href={`tel:${cliente.telefone}`}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  <Phone size={13} className="text-gray-400 shrink-0" /> {cliente.telefone}
                </a>
              )}
              {endereco && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500" title={endFull}>
                  <MapPin size={13} className="text-gray-400 shrink-0" /> {endereco}
                </span>
              )}
              {cliente.cpf_cnpj && (
                <span className="text-sm text-gray-500 font-mono">{cliente.cpf_cnpj}</span>
              )}
            </div>
          </div>
        </div>

        {/* Linha de data */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
          <Calendar size={11} />
          Cliente desde {fmt(cliente.criado_em)}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={TrendingUp}
          label="Ops abertas"
          value={String(opsAbertas.length)}
          sub={opsGanhas.length > 0 ? `${opsGanhas.length} ganha${opsGanhas.length > 1 ? 's' : ''}` : undefined}
          color="blue"
        />
        <StatCard
          icon={FileText}
          label="Propostas"
          value={String(propostas.length)}
          sub={propostas.filter(p => p.status === 'aprovada').length > 0
            ? `${propostas.filter(p => p.status === 'aprovada').length} aprovada${propostas.filter(p => p.status === 'aprovada').length > 1 ? 's' : ''}`
            : undefined}
          color="indigo"
        />
        <StatCard
          icon={ShoppingCart}
          label="Pedidos"
          value={String(pedidos.length)}
          sub={pedidos.filter(p => p.status === 'entregue').length > 0
            ? `${pedidos.filter(p => p.status === 'entregue').length} entregue${pedidos.filter(p => p.status === 'entregue').length > 1 ? 's' : ''}`
            : undefined}
          color="emerald"
        />
        <StatCard
          icon={DollarSign}
          label="Total comprado"
          value={totalPedido > 0 ? brl(totalPedido) : brlCliente(cliente.valor_total) ?? '—'}
          color="violet"
        />
      </div>

      {/* Seção: Oportunidades */}
      <Section
        titulo="Oportunidades"
        count={oportunidades.length}
        icon={TrendingUp}
        emptyMsg="Nenhuma oportunidade vinculada."
        linkHref="/oportunidades"
        linkLabel="Ver oportunidades"
      >
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
                <span className="text-sm font-semibold text-gray-700">{brl(op.valor)}</span>
              </div>
            </div>
          )
        })}
      </Section>

      {/* Seção: Propostas */}
      <Section
        titulo="Propostas"
        count={propostas.length}
        icon={FileText}
        emptyMsg="Nenhuma proposta vinculada."
        linkHref="/propostas"
        linkLabel="Ver propostas"
      >
        {propostas.map((p) => {
          const badge = propostaBadge(p.status)
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {p.numero && <span className="text-xs font-mono text-gray-400">{p.numero}</span>}
                  <span className="text-sm font-medium text-gray-800 truncate">{p.titulo}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Calendar size={10} />
                  {fmt(p.criado_em)}
                  {p.validade && <span className="ml-2">· válida até {fmt(p.validade)}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${badge.cls}`}>{badge.label}</span>
                <span className="text-sm font-semibold text-gray-700">{brl(p.valor)}</span>
              </div>
            </div>
          )
        })}
      </Section>

      {/* Seção: Pedidos */}
      <Section
        titulo="Pedidos"
        count={pedidos.length}
        icon={ShoppingCart}
        emptyMsg="Nenhum pedido vinculado."
        linkHref="/pedidos"
        linkLabel="Ver pedidos"
      >
        {pedidos.map((p) => {
          const badge = pedidoBadge(p.status)
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {p.numero && <span className="text-xs font-mono text-gray-400">{p.numero}</span>}
                  <span className="text-sm font-medium text-gray-800">{p.numero ? '' : 'Pedido sem número'}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Calendar size={10} /> {fmt(p.criado_em)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${badge.cls}`}>{badge.label}</span>
                <span className="text-sm font-semibold text-gray-700">{brl(p.valor)}</span>
              </div>
            </div>
          )
        })}
      </Section>

      {/* Modal de edição */}
      {editOpen && (
        <ClienteFormModal
          cliente={cliente}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  )
}

/* ──────────────── Stat card ── */

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: 'blue' | 'indigo' | 'emerald' | 'violet'
}) {
  const colors = {
    blue:    { bg: 'bg-blue-50',    icon: 'text-blue-500' },
    indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-500' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500' },
    violet:  { bg: 'bg-violet-50',  icon: 'text-violet-500' },
  }
  const c = colors[color]
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
        <Icon size={15} className={c.icon} />
      </div>
      <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ──────────────── Section wrapper ── */

function Section({
  titulo, count, icon: Icon, emptyMsg, linkHref, linkLabel, children,
}: {
  titulo: string; count: number; icon: React.ElementType
  emptyMsg: string; linkHref: string; linkLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-4">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">{titulo}</h2>
          {count > 0 && (
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        <Link href={linkHref} className="text-xs text-blue-600 hover:underline">
          {linkLabel}
        </Link>
      </div>
      <div className="px-5">
        {count === 0
          ? <p className="py-6 text-sm text-gray-400 text-center">{emptyMsg}</p>
          : children
        }
      </div>
    </div>
  )
}
