'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus, Pencil, Trophy, XCircle, Trash2, ChevronRight, FileText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ExportButton from '@/app/(crm)/_components/ExportButton'
import OpFormModal from './OpFormModal'
import LostModal from './LostModal'
import PropostaFormModal from '@/app/(crm)/propostas/_components/PropostaFormModal'
import ClienteFormModal from '@/app/(crm)/clientes/_components/ClienteFormModal'
import type { Cliente } from '@/app/(crm)/clientes/_components/types'
import {
  type Oportunidade, ETAPAS, brl, formatDate,
  etapaCanonica, proximaEtapa,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useSegmentos, segmentoLabel } from '@/app/(crm)/_components/SegmentosContext'

interface Props {
  ops: Oportunidade[]
}

type Tab = 'abertas' | 'ganhas' | 'perdidas'

export default function OpsView({ ops }: Props) {
  const router = useRouter()
  const toast = useToast()
  const segmentos = useSegmentos()
  const searchParams = useSearchParams()

  // Aba inicial pode vir do dashboard (?tab=ganhas)
  const tabInicial = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(tabInicial === 'ganhas' || tabInicial === 'perdidas' ? tabInicial : 'abertas')
  const [mobileEtapa, setMobileEtapa] = useState<string>(ETAPAS[0])
  const [formOpen, setFormOpen] = useState(false)
  const [editingOp, setEditingOp] = useState<Oportunidade | null>(null)

  // Abre o modal de nova oportunidade direto quando vem do dashboard (?novo=1)
  useEffect(() => {
    if (searchParams.get('novo') === '1') { setEditingOp(null); setFormOpen(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [defaultEtapa, setDefaultEtapa] = useState<string>('Prospecção')
  const [lostOp, setLostOp] = useState<Oportunidade | null>(null)
  const [propostaOp, setPropostaOp] = useState<Oportunidade | null>(null)
  const [completarCliente, setCompletarCliente] = useState<Cliente | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const abertas = ops.filter((o) => o.status === 'aberto')
  const ganhas   = ops.filter((o) => o.status === 'ganho')
  const perdidas = ops.filter((o) => o.status === 'perdido')

  const totalPipeline = abertas.reduce((s, o) => s + (o.valor ?? 0), 0)

  async function handleAvancarEtapa(op: Oportunidade) {
    const proxima = proximaEtapa(op.etapa)
    if (!proxima) return
    const supabase = createClient()
    await supabase.from('oportunidades').update({ etapa: proxima }).eq('id', op.id)
    toast(`Etapa avançada para ${proxima}`, 'info')
    router.refresh()
  }

  async function handleGanho(op: Oportunidade) {
    const supabase = createClient()

    // Adota o valor real da proposta aceita (mais recente), se houver — senão mantém a estimativa
    const { data: prop } = await supabase
      .from('propostas').select('valor')
      .eq('oportunidade_id', op.id).eq('status', 'aprovada')
      .order('criado_em', { ascending: false }).limit(1).maybeSingle()
    const updates = prop?.valor != null
      ? { status: 'ganho', valor: prop.valor }
      : { status: 'ganho' }
    await supabase.from('oportunidades').update(updates).eq('id', op.id)

    // Promove o prospect a cliente ativo e abre o cadastro para completar dados fiscais
    if (op.cliente_id) {
      await supabase.from('clientes').update({ status: 'ativo' })
        .eq('id', op.cliente_id).eq('status', 'prospect')

      const { data: cli } = await supabase.from('clientes').select('*').eq('id', op.cliente_id).maybeSingle()
      if (cli) {
        setCompletarCliente(cli as Cliente)
        toast('🏆 Oportunidade ganha! Complete o cadastro fiscal do cliente para emitir a NF-e.')
        router.refresh()
        return
      }
    }

    toast('🏆 Oportunidade marcada como ganha!')
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('oportunidades').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Erro ao excluir oportunidade', 'error'); return }
    toast('Oportunidade excluída', 'info')
    router.refresh()
  }

  function openCreate(etapa?: string) {
    setEditingOp(null)
    setDefaultEtapa(etapa ?? 'Prospecção')
    setFormOpen(true)
  }

  function openEdit(op: Oportunidade) {
    setEditingOp(op)
    setFormOpen(true)
  }

  // ── Kanban card ─────────────────────────────────────────────────────────────
  function OpCard({ op, compact = false }: { op: Oportunidade; compact?: boolean }) {
    const proxima = proximaEtapa(op.etapa)
    const seg = segmentos.find((s) => s.value === op.segmento)

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3.5 shadow-sm group hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md transition-all">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{op.titulo}</p>
          {seg && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
              {seg.label}
            </span>
          )}
        </div>

        <p className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{brl(op.valor)}</p>

        {/* Actions */}
        <div className={`flex items-center gap-1 ${compact ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
          {proxima && (
            <button
              onClick={() => handleAvancarEtapa(op)}
              title={`Mover para ${proxima}`}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium transition-colors"
            >
              {proxima} <ChevronRight size={12} />
            </button>
          )}
          <button
            onClick={() => setPropostaOp(op)}
            title="Criar proposta a partir desta oportunidade"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 text-xs font-medium transition-colors"
          >
            <FileText size={12} /> Proposta
          </button>
          <div className="ml-auto flex gap-1">
            <button onClick={() => handleGanho(op)} title="Marcar ganho"
              className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
              <Trophy size={14} />
            </button>
            <button onClick={() => setLostOp(op)} title="Marcar perdida"
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
              <XCircle size={14} />
            </button>
            <button onClick={() => openEdit(op)} title="Editar"
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={() => setDeletingId(op.id)} title="Excluir"
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Closed list (ganhas / perdidas) ─────────────────────────────────────────
  function ClosedList({ items }: { items: Oportunidade[] }) {
    if (items.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm py-14 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma oportunidade aqui.</p>
        </div>
      )
    }
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((op) => (
            <div key={op.id} className="px-5 py-3.5 flex items-center justify-between group">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{op.titulo}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {etapaCanonica(op.etapa)} · {formatDate(op.criado_em)}
                  {op.motivo_perda && ` · ${op.motivo_perda}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{brl(op.valor)}</p>
                <button onClick={() => setDeletingId(op.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Oportunidades</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {abertas.length} abertas · pipeline {brl(totalPipeline)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton href="/api/exportar/oportunidades" label="Exportar" filename="oportunidades.xlsx" />
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nova oportunidade</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </div>
      </div>

      {/* Tabs status */}
      <div className="flex gap-1.5 mb-5">
        {([
          { key: 'abertas', label: `Abertas (${abertas.length})` },
          { key: 'ganhas', label: `Ganhas (${ganhas.length})` },
          { key: 'perdidas', label: `Perdidas (${perdidas.length})` },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? key === 'ganhas' ? 'bg-green-600 text-white'
                  : key === 'perdidas' ? 'bg-red-600 text-white'
                  : 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Ganhas / Perdidas */}
      {tab === 'ganhas' && <ClosedList items={ganhas} />}
      {tab === 'perdidas' && <ClosedList items={perdidas} />}

      {/* Abertas — Kanban (desktop) */}
      {tab === 'abertas' && (
        <>
          <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
            {ETAPAS.map((etapa) => {
              const cards = abertas.filter((o) => etapaCanonica(o.etapa) === etapa)
              const total = cards.reduce((s, o) => s + (o.valor ?? 0), 0)
              return (
                <div key={etapa} className="min-w-[260px] max-w-[260px] flex flex-col">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{etapa}</span>
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{cards.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{brl(total)}</span>
                      {/* Criação só nas etapas iniciais — oportunidade nova nasce no começo do funil */}
                      {['Prospecção', 'Qualificação'].includes(etapa) && (
                        <button
                          onClick={() => openCreate(etapa)}
                          title="Nova oportunidade"
                          className="ml-1 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2 flex-1 min-h-[120px] bg-gray-100/60 dark:bg-gray-700/50 rounded-xl p-2">
                    {cards.length === 0 && (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-xs text-gray-400 dark:text-gray-500">Vazio</p>
                      </div>
                    )}
                    {cards.map((op) => (
                      <OpCard key={op.id} op={op} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Abertas — Lista por etapa (mobile) */}
          <div className="md:hidden">
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
              {ETAPAS.map((et) => {
                const count = abertas.filter((o) => etapaCanonica(o.etapa) === et).length
                return (
                  <button
                    key={et}
                    onClick={() => setMobileEtapa(et)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      mobileEtapa === et
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {et} {count > 0 && <span className="opacity-70">({count})</span>}
                  </button>
                )
              })}
            </div>

            {(() => {
              const cards = abertas.filter((o) => etapaCanonica(o.etapa) === mobileEtapa)
              return cards.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-12 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">Nenhuma oportunidade nesta etapa.</p>
                  {['Prospecção', 'Qualificação'].includes(mobileEtapa) && (
                    <button
                      onClick={() => openCreate(mobileEtapa)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      + Adicionar
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {cards.map((op) => <OpCard key={op.id} op={op} compact />)}
                </div>
              )
            })()}
          </div>
        </>
      )}

      {/* Confirmar exclusão */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir oportunidade?</h3>
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

      {formOpen && (
        <OpFormModal
          op={editingOp ?? undefined}
          defaultEtapa={defaultEtapa}
          onClose={() => { setFormOpen(false); setEditingOp(null) }}
        />
      )}

      {lostOp && (
        <LostModal op={lostOp} onClose={() => setLostOp(null)} />
      )}

      {propostaOp && (
        <PropostaFormModal
          prefill={{
            titulo:            propostaOp.titulo,
            clienteId:         propostaOp.cliente_id  ?? undefined,
            empresaId:         propostaOp.empresa_id  ?? undefined,
            segmento:          propostaOp.segmento    ?? undefined,
            vendedorId:        propostaOp.vendedor_id ?? undefined,
            oportunidadeId:    propostaOp.id,
            oportunidadeEtapa: propostaOp.etapa ?? undefined,
          }}
          onClose={() => setPropostaOp(null)}
        />
      )}

      {completarCliente && (
        <ClienteFormModal
          cliente={completarCliente}
          onClose={() => { setCompletarCliente(null); router.refresh() }}
        />
      )}
    </>
  )
}
