'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Oportunidade } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'

const MOTIVOS = [
  'Preço alto',
  'Escolheu concorrente',
  'Sem orçamento',
  'Sem necessidade',
  'Sem retorno',
  'Outro',
]

interface Props {
  op: Oportunidade
  onClose: () => void
}

export default function LostModal({ op, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  const [erro, setErro] = useState('')

  async function handleConfirm() {
    setSaving(true)
    setErro('')
    const supabase = createClient()

    const { error } = await supabase
      .from('oportunidades')
      .update({ status: 'perdido', motivo_perda: motivo || null, perdido_em: new Date().toISOString() })
      .eq('id', op.id)

    if (error) {
      setErro(error.message ?? JSON.stringify(error))
      setSaving(false)
      return
    }

    // Sincroniza: propostas abertas desta oportunidade viram "Recusada"
    await supabase.from('propostas')
      .update({ status: 'recusada' })
      .eq('oportunidade_id', op.id)
      .in('status', ['rascunho', 'enviada'])

    toast('Oportunidade marcada como perdida', 'info')
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Marcar como perdida</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{op.titulo}</span> será marcada como perdida.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Motivo da perda
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione (opcional)</option>
              {MOTIVOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {erro && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Salvando...' : 'Confirmar perda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
