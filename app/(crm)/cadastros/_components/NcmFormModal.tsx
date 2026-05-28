'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Ncm } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'

interface Props {
  ncm?: Ncm
  onClose: () => void
}

export default function NcmFormModal({ ncm, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const isEditing = !!ncm

  const [form, setForm] = useState({
    codigo: ncm?.codigo ?? '',
    descricao: ncm?.descricao ?? '',
    aliq_ipi: ncm?.aliq_ipi != null ? String(ncm.aliq_ipi) : '',
    unid_trib: ncm?.unid_trib ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.codigo.trim()) { setError('Código é obrigatório'); return }
    if (!form.descricao.trim()) { setError('Descrição é obrigatória'); return }

    setSaving(true)
    setError('')

    const supabase = createClient()
    const payload = {
      codigo: form.codigo.trim(),
      descricao: form.descricao.trim(),
      aliq_ipi: form.aliq_ipi ? parseFloat(form.aliq_ipi.replace(',', '.')) : null,
      unid_trib: form.unid_trib.trim() || null,
    }

    const { error: err } = isEditing
      ? await supabase.from('ncms').update(payload).eq('id', ncm!.id)
      : await supabase.from('ncms').insert({ ...payload, tenant_id: tenantId })

    if (err) { setError(err.message); setSaving(false); return }

    toast(isEditing ? 'NCM atualizado!' : 'NCM criado!')
    router.refresh()
    onClose()
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar NCM' : 'Novo NCM'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Código */}
          <div>
            <label className={labelCls}>
              Código <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.codigo}
              onChange={(e) => set('codigo', e.target.value)}
              placeholder="Ex: 8443.99.90"
              autoFocus
              className={inputCls}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className={labelCls}>
              Descrição <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
              placeholder="Descrição do NCM"
              className={inputCls}
            />
          </div>

          {/* Aliq IPI + Unid Tributável */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Alíq. IPI (%)</label>
              <input
                type="text"
                value={form.aliq_ipi}
                onChange={(e) => set('aliq_ipi', e.target.value)}
                placeholder="Ex: 5"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Unid. Tributável</label>
              <input
                type="text"
                value={form.unid_trib}
                onChange={(e) => set('unid_trib', e.target.value)}
                placeholder="Ex: UN"
                className={inputCls}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar NCM'}
          </button>
        </div>
      </div>
    </div>
  )
}
