'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type NaturezaOperacao } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'

interface Props {
  natureza?: NaturezaOperacao
  onClose: () => void
}

export default function NaturezaFormModal({ natureza, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const isEditing = !!natureza

  const [form, setForm] = useState({
    codigo: natureza?.codigo ?? '',
    descricao: natureza?.descricao ?? '',
    cfop: natureza?.cfop ?? '',
    tipo: natureza?.tipo ?? 'saida',
    obs: natureza?.obs ?? '',
    chave: natureza?.chave ?? '',
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
      cfop: form.cfop.trim() || null,
      tipo: form.tipo || null,
      obs: form.obs.trim() || null,
      chave: form.chave.trim() || null,
    }

    const { error: err } = isEditing
      ? await supabase.from('naturezas_operacao').update(payload).eq('id', natureza!.id)
      : await supabase.from('naturezas_operacao').insert({ ...payload, tenant_id: tenantId })

    if (err) { setError(err.message); setSaving(false); return }

    toast(isEditing ? 'Natureza de operação atualizada!' : 'Natureza de operação criada!')
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar Natureza de Operação' : 'Nova Natureza de Operação'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Código + Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Código <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => set('codigo', e.target.value)}
                placeholder="Ex: 001"
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="saida">Saída</option>
                <option value="entrada">Entrada</option>
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descrição <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
              placeholder="Ex: Venda de mercadoria"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* CFOP + Chave */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">CFOP</label>
              <input
                type="text"
                value={form.cfop}
                onChange={(e) => set('cfop', e.target.value)}
                placeholder="Ex: 5102"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Chave</label>
              <input
                type="text"
                value={form.chave}
                onChange={(e) => set('chave', e.target.value)}
                placeholder="Ex: venda_produto"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              value={form.obs}
              onChange={(e) => set('obs', e.target.value)}
              placeholder="Observações fiscais..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}
