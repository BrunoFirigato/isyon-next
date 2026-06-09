'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Plus, Clock, CheckCircle2, XCircle, Pencil, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './Toast'
import VinculoBadge from './VinculoBadge'
import CompromissoFormModal from '@/app/(crm)/agenda/_components/CompromissoFormModal'
import { type Compromisso, tipoInfo, formatTime } from '@/app/(crm)/agenda/_components/types'

export default function AgendaHojeCard({ compromissos }: { compromissos: Compromisso[] }) {
  const router = useRouter()
  const toast = useToast()
  const [editing, setEditing] = useState<Compromisso | null>(null)
  const [novo, setNovo] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  // Hora/data dependem do fuso do cliente — só renderiza após montar (evita mismatch de hidratação)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  async function mudarStatus(c: Compromisso, status: string) {
    setLoadingId(c.id)
    const supabase = createClient()
    const { error } = await supabase.from('compromissos').update({ status }).eq('id', c.id)
    setLoadingId(null)
    if (error) { toast('Não foi possível atualizar.', 'error'); return }
    toast(status === 'realizado' ? 'Atividade concluída!' : status === 'cancelado' ? 'Atividade cancelada' : 'Atividade reaberta', 'info')
    router.refresh()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col lg:absolute lg:inset-0">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <Calendar size={15} className="text-gray-400" /> Hoje
        </h2>
        <button onClick={() => setNovo(true)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
          <Plus size={13} /> Agendar
        </button>
      </div>

      {compromissos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-5 py-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-2xl mb-3">📅</div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nenhum compromisso hoje</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">Agenda livre — aproveite para prospectar!</p>
          <button onClick={() => setNovo(true)} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
            <Plus size={15} /> Nova atividade
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-700 flex-1 min-h-0 overflow-y-auto max-h-[60vh] lg:max-h-none">
          {compromissos.map(c => {
            const tipo = tipoInfo(c.tipo)
            const isDone = c.status === 'realizado'
            const isLate = mounted && !isDone && new Date(c.data_hora).getTime() < Date.now()
            // Itens atrasados de dias anteriores aparecem aqui — mostra a data pra não parecer "de hoje"
            const dt = new Date(c.data_hora)
            const ehHoje = dt.toDateString() === new Date().toDateString()
            const quando = ehHoje ? formatTime(c.data_hora) : `${dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${formatTime(c.data_hora)}`
            const busy = loadingId === c.id
            return (
              <div key={c.id} className="px-4 py-3 flex items-start gap-2.5 group">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${tipo.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm truncate ${isDone ? 'line-through text-gray-400 dark:text-gray-500' : isLate ? 'text-red-700 dark:text-red-400 font-medium' : 'text-gray-800 dark:text-gray-200'}`}>
                    {c.titulo}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {mounted && (
                      <span className={`text-[11px] flex items-center gap-1 ${isLate ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        <Clock size={10} /> {quando}{isLate ? ' · atrasada' : ''}
                      </span>
                    )}
                    <VinculoBadge cliente={c.cliente} lead={c.lead} op={c.op} />
                  </div>
                </div>
                {/* Ações */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {isDone ? (
                    <button onClick={() => mudarStatus(c, 'pendente')} disabled={busy} title="Reabrir"
                      className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50">
                      <RotateCcw size={14} />
                    </button>
                  ) : (
                    <button onClick={() => mudarStatus(c, 'realizado')} disabled={busy} title="Concluir"
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 transition-colors disabled:opacity-50">
                      <CheckCircle2 size={14} />
                    </button>
                  )}
                  <button onClick={() => mudarStatus(c, 'cancelado')} disabled={busy} title="Cancelar"
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors disabled:opacity-50">
                    <XCircle size={14} />
                  </button>
                  <button onClick={() => setEditing(c)} title="Editar"
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <CompromissoFormModal compromisso={editing} onClose={() => setEditing(null)} />
      )}
      {novo && (
        <CompromissoFormModal onClose={() => setNovo(false)} />
      )}
    </div>
  )
}
