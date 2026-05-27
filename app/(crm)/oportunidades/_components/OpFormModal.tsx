'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Oportunidade, ETAPAS, SEGMENTOS } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'

interface Props {
  op?: Oportunidade
  defaultEtapa?: string
  onClose: () => void
}

export default function OpFormModal({ op, defaultEtapa, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const isEditing = !!op

  const [form, setForm] = useState({
    titulo: op?.titulo ?? '',
    etapa: op?.etapa ?? defaultEtapa ?? 'Prospecção',
    valor: op?.valor != null ? String(op.valor) : '',
    segmento: op?.segmento ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const valorNum = form.valor.trim()
      ? parseFloat(form.valor.replace(',', '.'))
      : null

    const payload = {
      titulo: form.titulo.trim(),
      etapa: form.etapa,
      valor: valorNum,
      segmento: form.segmento || null,
      status: op?.status ?? 'aberta',
    }

    const { error: err } = isEditing
      ? await supabase.from('oportunidades').update(payload).eq('id', op!.id)
      : await supabase.from('oportunidades').insert(payload)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    toast(isEditing ? 'Oportunidade atualizada!' : 'Oportunidade criada!')
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar oportunidade' : 'Nova oportunidade'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              required
              placeholder="Ex: Proposta de manutenção anual"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Etapa</label>
              <select
                value={form.etapa}
                onChange={(e) => set('etapa', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {ETAPAS.map((et) => (
                  <option key={et} value={et}>{et}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Valor (R$)
              </label>
              <input
                type="text"
                value={form.valor}
                onChange={(e) => set('valor', e.target.value)}
                placeholder="0,00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Segmento</label>
            <select
              value={form.segmento}
              onChange={(e) => set('segmento', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecione...</option>
              {SEGMENTOS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
