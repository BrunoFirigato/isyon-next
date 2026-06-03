'use client'

import { AlertTriangle } from 'lucide-react'
import { type Vinculo, descreverVinculos } from '@/lib/exclusao'

interface Props {
  /** Quando null, o diálogo fica fechado. */
  vinculos: Vinculo[] | null
  /** Se a entidade suporta inativação (tem campo ativo/status). */
  podeInativar: boolean
  /** Em andamento (inativando). */
  inativando?: boolean
  onInativar: () => void
  onClose: () => void
}

export default function BloqueioExclusaoDialog({ vinculos, podeInativar, inativando, onInativar, onClose }: Props) {
  if (!vinculos) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => { if (!inativando) onClose() }} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle size={18} />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Não é possível excluir</h3>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Este registro está vinculado a <strong className="text-gray-700 dark:text-gray-300">{descreverVinculos(vinculos)}</strong>, por isso não pode ser excluído.
        </p>
        {podeInativar && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Você pode <strong className="text-gray-700 dark:text-gray-300">inativá-lo</strong>: ele fica marcado como inativo e todo o histórico é preservado.
          </p>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            disabled={inativando}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60 transition-colors"
          >
            {podeInativar ? 'Cancelar' : 'Entendi'}
          </button>
          {podeInativar && (
            <button
              onClick={onInativar}
              disabled={inativando}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 transition-colors"
            >
              {inativando ? 'Inativando...' : 'Inativar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
