'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Megaphone, Send, Pencil, Trash2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  type Campanha,
  statusInfo,
  tipoInfo,
  formatEnviado,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import CampanhaFormModal from './CampanhaFormModal'

const FILTROS = [
  { key: 'todas',     label: 'Todas'     },
  { key: 'rascunho',  label: 'Rascunhos' },
  { key: 'enviada',   label: 'Enviadas'  },
] as const

type Filtro = typeof FILTROS[number]['key']

interface Props { campanhas: Campanha[] }

export default function CampanhasView({ campanhas }: Props) {
  const router = useRouter()
  const toast  = useToast()

  const [filtro,     setFiltro]    = useState<Filtro>('todas')
  const [formOpen,   setFormOpen]  = useState(false)
  const [editing,    setEditing]   = useState<Campanha | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sendingId,  setSendingId]  = useState<string | null>(null)
  const [confirmSend, setConfirmSend] = useState<Campanha | null>(null)

  const filtered = filtro === 'todas'
    ? campanhas
    : campanhas.filter(c => c.status === filtro)

  async function excluir(id: string) {
    const supabase = createClient()
    await supabase.from('campanhas').delete().eq('id', id)
    toast('Campanha excluída', 'info')
    router.refresh()
    setDeletingId(null)
  }

  async function enviar(campanha: Campanha) {
    setSendingId(campanha.id)
    setConfirmSend(null)
    try {
      const res = await fetch('/api/campanhas/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campanhaId: campanha.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar')
      toast(`Campanha enviada! ${data.total_enviados} destinatário${data.total_enviados !== 1 ? 's' : ''}`)
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar campanha'
      toast(message, 'error')
    } finally {
      setSendingId(null)
    }
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Campanhas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {campanhas.length} campanha{campanhas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nova campanha</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
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

      {/* Conteúdo */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center py-14 text-center">
          <Megaphone size={32} className="text-gray-200 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhuma campanha encontrada</p>
          <button
            onClick={() => { setEditing(null); setFormOpen(true) }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Criar primeira campanha
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const tipo   = tipoInfo(c.tipo)
            const status = statusInfo(c.status)
            const pct    = c.total_destinatarios > 0
              ? Math.round(c.total_enviados / c.total_destinatarios * 100)
              : null

            return (
              <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 group">
                <div className="flex items-start gap-3">
                  {/* Canal icon */}
                  <span className="text-xl shrink-0 mt-0.5">{tipo.icon}</span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{c.titulo}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    {c.assunto && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        Assunto: {c.assunto}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {/* Destinatários */}
                      {c.total_destinatarios > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Users size={11} />
                          {c.total_destinatarios} destinatário{c.total_destinatarios !== 1 ? 's' : ''}
                        </span>
                      )}

                      {/* Taxa de envio */}
                      {pct !== null && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {c.total_enviados} enviados
                          {c.total_erros > 0 && (
                            <span className="text-red-500 ml-1">· {c.total_erros} erros</span>
                          )}
                          {' '}· {pct}%
                        </span>
                      )}

                      {/* Data de envio */}
                      {c.enviado_em && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          Enviada em {formatEnviado(c)}
                        </span>
                      )}

                      {/* Criado em */}
                      {!c.enviado_em && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          Criada em {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>

                    {/* Barra de progresso */}
                    {c.total_destinatarios > 0 && (
                      <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(c.status === 'rascunho') && (
                      <button
                        onClick={() => setConfirmSend(c)}
                        disabled={sendingId === c.id}
                        title="Enviar campanha"
                        className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <Send size={14} />
                      </button>
                    )}
                    {c.status === 'rascunho' && (
                      <button
                        onClick={() => { setEditing(c); setFormOpen(true) }}
                        className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingId(c.id)}
                      className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm send modal */}
      {confirmSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmSend(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Enviar campanha?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-300">{confirmSend.titulo}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Esta ação vai disparar mensagens para todos os destinatários do público selecionado.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSend(null)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button
                onClick={() => enviar(confirmSend)}
                disabled={sendingId === confirmSend.id}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium"
              >
                {sendingId === confirmSend.id ? 'Enviando...' : 'Confirmar envio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir campanha?</h3>
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
        <CampanhaFormModal
          campanha={editing ?? undefined}
          onClose={() => { setFormOpen(false); setEditing(null) }}
        />
      )}
    </>
  )
}
