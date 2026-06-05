import Link from 'next/link'
import { Calendar } from 'lucide-react'

export interface CompromissoData {
  id: string; titulo: string; tipo: string; data_hora: string
  status: string; descricao: string | null; duracao_min: number | null
}

const TIPOS_COMP: Record<string, { label: string; dot: string; badge: string }> = {
  reuniao:   { label: 'Reunião',   dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700'     },
  ligacao:   { label: 'Ligação',   dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700'   },
  visita:    { label: 'Visita',    dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700' },
  follow_up: { label: 'Follow-up', dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700' },
  tarefa:    { label: 'Tarefa',    dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600'    },
}
function compTipo(tipo: string) {
  return TIPOS_COMP[tipo] ?? { label: tipo, dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600' }
}
function compStatus(status: string) {
  if (status === 'realizado') return { label: 'Realizado', cls: 'bg-green-100 text-green-700' }
  if (status === 'cancelado') return { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500' }
  return { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-700' }
}

/** Seção "Atividades da Agenda" reutilizada nos 360° de cliente e lead. */
export default function AgendaVinculada({ compromissos }: { compromissos: CompromissoData[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-gray-400 dark:text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Atividades da Agenda</h2>
          {compromissos.length > 0 && (
            <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
              {compromissos.length}
            </span>
          )}
        </div>
        <Link href="/agenda" className="text-xs text-blue-600 hover:underline">Ver agenda</Link>
      </div>
      <div className="px-5">
        {compromissos.length === 0 ? (
          <p className="py-6 text-sm text-gray-400 dark:text-gray-500 text-center">Nenhuma atividade vinculada.</p>
        ) : (
          compromissos.map((c) => {
            const tipo   = compTipo(c.tipo)
            const status = compStatus(c.status)
            const isDone = c.status === 'realizado'
            return (
              <div key={c.id} className="flex items-center gap-3 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${tipo.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
                    {c.titulo}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(c.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    {c.duracao_min ? ` · ${c.duracao_min} min` : ''}
                  </p>
                  {c.descricao && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{c.descricao}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${tipo.badge}`}>{tipo.label}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${status.cls}`}>{status.label}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
