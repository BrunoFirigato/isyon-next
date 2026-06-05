'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, CheckCircle2, Pencil, Trash2, Calendar, Search, X, TrendingUp, Building2, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  type Compromisso, TIPOS_COMPROMISSO,
  tipoInfo, formatTime, formatDateGroup, getDateGroup, groupLabel,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import CompromissoFormModal from './CompromissoFormModal'

const FILTROS = [
  { key: 'pendentes',  label: 'Pendentes'    },
  { key: 'hoje',       label: 'Hoje'         },
  { key: 'semana',     label: 'Esta semana'  },
  { key: 'realizados', label: 'Realizados'   },
  { key: 'todos',      label: 'Todos'        },
] as const

type Filtro = typeof FILTROS[number]['key']

function applyFilter(items: Compromisso[], filtro: Filtro): Compromisso[] {
  const now  = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekEnd    = new Date(todayStart.getTime() + 7 * 86_400_000)

  switch (filtro) {
    case 'pendentes':
      return items.filter(c => c.status === 'pendente')
    case 'hoje':
      return items.filter(c => {
        const d = new Date(c.data_hora)
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        return day.getTime() === todayStart.getTime()
      })
    case 'semana':
      return items.filter(c => {
        const d = new Date(c.data_hora)
        return d >= todayStart && d < weekEnd
      })
    case 'realizados':
      return items.filter(c => c.status === 'realizado')
    default:
      return items
  }
}

function groupByDate(items: Compromisso[]): { key: string; label: string; items: Compromisso[] }[] {
  const map = new Map<string, Compromisso[]>()
  for (const c of items) {
    const k = getDateGroup(c.data_hora)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(c)
  }
  return Array.from(map.entries()).map(([key, list]) => ({
    key,
    label: groupLabel(key, list[0].data_hora),
    items: list,
  }))
}

interface Props { compromissos: Compromisso[] }

export default function AgendaView({ compromissos }: Props) {
  const router = useRouter()
  const toast  = useToast()

  const [filtro,          setFiltro]         = useState<Filtro>('pendentes')
  const [tipoFiltro,      setTipoFiltro]      = useState('')
  const [busca,           setBusca]          = useState('')
  const [formOpen,        setFormOpen]        = useState(false)
  const [editing,         setEditing]         = useState<Compromisso | null>(null)
  const [deletingId,      setDeletingId]      = useState<string | null>(null)
  const [loadingId,       setLoadingId]       = useState<string | null>(null)

  // Abre o modal de novo compromisso direto quando vem do dashboard (?novo=1)
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('novo') === '1') { setEditing(null); setFormOpen(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const q = busca.trim().toLowerCase()
  const base = compromissos.filter(c => {
    if (tipoFiltro && c.tipo !== tipoFiltro) return false
    if (!q) return true
    const alvo = [c.titulo, c.cliente?.empresa, c.cliente?.nome, c.lead?.nome, c.op?.titulo, c.op?.numero]
      .filter(Boolean).join(' ').toLowerCase()
    return alvo.includes(q)
  })
  const filtered = applyFilter(base, filtro)
  const groups = groupByDate(filtered)

  async function marcarRealizado(c: Compromisso) {
    setLoadingId(c.id)
    const supabase = createClient()
    const novoStatus = c.status === 'realizado' ? 'pendente' : 'realizado'
    await supabase.from('compromissos').update({ status: novoStatus }).eq('id', c.id)
    toast(novoStatus === 'realizado' ? 'Marcado como realizado!' : 'Reaberto como pendente')
    router.refresh()
    setLoadingId(null)
  }

  async function excluir(id: string) {
    const supabase = createClient()
    await supabase.from('compromissos').delete().eq('id', id)
    toast('Atividade excluída', 'info')
    router.refresh()
    setDeletingId(null)
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Agenda</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{compromissos.length} atividade{compromissos.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nova atividade</span>
        </button>
      </div>

      {/* Busca por título, cliente, lead ou oportunidade */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título, cliente, lead ou oportunidade..."
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-9 pr-9 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {busca && (
          <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filtro por status */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtro === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtro por tipo */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        <button onClick={() => setTipoFiltro('')}
          className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            tipoFiltro === '' ? 'bg-gray-800 dark:bg-gray-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}>
          Todos os tipos
        </button>
        {TIPOS_COMPROMISSO.map(t => (
          <button key={t.value} onClick={() => setTipoFiltro(tipoFiltro === t.value ? '' : t.value)}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              tipoFiltro === t.value ? 'bg-gray-800 dark:bg-gray-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center py-14 text-center">
          <Calendar size={32} className="text-gray-200 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhuma atividade encontrada</p>
          <button
            onClick={() => { setEditing(null); setFormOpen(true) }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Criar primeira atividade
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(group => (
            <div key={group.key}>
              {/* Cabeçalho do grupo */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  group.key === '__atrasadas' ? 'text-red-500' :
                  group.key === '__hoje'      ? 'text-blue-600' :
                  'text-gray-400 dark:text-gray-500'
                }`}>
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 dark:text-gray-500">{group.items.length}</span>
              </div>

              {/* Itens do grupo */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm divide-y divide-gray-50 dark:divide-gray-700">
                {group.items.map(c => {
                  const tipo   = tipoInfo(c.tipo)
                  const isDone = c.status === 'realizado'
                  const isLate = group.key === '__atrasadas'

                  return (
                    <div key={c.id} className={`flex items-center gap-3 px-4 py-3 group ${isDone ? 'opacity-60' : ''}`}>
                      {/* Tipo dot */}
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${tipo.dot}`} />

                      {/* Hora */}
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0 w-10">
                        {formatTime(c.data_hora)}
                      </span>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-gray-400 dark:text-gray-500' : isLate ? 'text-red-700' : 'text-gray-900 dark:text-gray-100'}`}>
                          {c.titulo}
                        </p>
                        {c.descricao && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{c.descricao}</p>
                        )}
                      </div>

                      {/* Vínculo — ícone + cor por tipo (oportunidade > cliente > lead) */}
                      {c.op ? (
                        <span title={`Oportunidade: ${c.op.titulo}`}
                          className="hidden sm:flex items-center gap-1 text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full shrink-0 max-w-[160px]">
                          <TrendingUp size={11} className="shrink-0" />
                          <span className="truncate">{c.op.numero ?? c.op.titulo}</span>
                        </span>
                      ) : c.cliente ? (
                        <span title={`Cliente: ${c.cliente.empresa ?? c.cliente.nome}`}
                          className="hidden sm:flex items-center gap-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full shrink-0 max-w-[160px]">
                          <Building2 size={11} className="shrink-0" />
                          <span className="truncate">{c.cliente.empresa ?? c.cliente.nome}</span>
                        </span>
                      ) : c.lead ? (
                        <span title={`Lead: ${c.lead.nome}`}
                          className="hidden sm:flex items-center gap-1 text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 px-2 py-0.5 rounded-full shrink-0 max-w-[160px]">
                          <UserPlus size={11} className="shrink-0" />
                          <span className="truncate">{c.lead.nome}</span>
                        </span>
                      ) : null}

                      {/* Tipo badge */}
                      <span className={`hidden md:block text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${tipo.badge}`}>
                        {tipo.label}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => marcarRealizado(c)}
                          disabled={loadingId === c.id}
                          title={isDone ? 'Reabrir' : 'Marcar como realizado'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDone
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-300 dark:text-gray-600 hover:text-green-600 hover:bg-green-50'
                          }`}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                        <button
                          onClick={() => { setEditing(c); setFormOpen(true) }}
                          className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeletingId(c.id)}
                          className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de exclusão */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir atividade?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button onClick={() => excluir(deletingId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <CompromissoFormModal
          compromisso={editing ?? undefined}
          onClose={() => { setFormOpen(false); setEditing(null) }}
        />
      )}
    </>
  )
}
