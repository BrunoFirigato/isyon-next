'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Cfop } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'

interface Props {
  cfop?: Cfop
  onClose: () => void
}

export default function CfopFormModal({ cfop, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const isEditing = !!cfop

  const [form, setForm] = useState({
    codigo: cfop?.codigo ?? '',
    descricao: cfop?.descricao ?? '',
    tipo: cfop?.tipo ?? 'saida',
    ativo: cfop?.ativo ?? true,
    obs_fiscal: cfop?.obs_fiscal ?? '',
    csosn: cfop?.csosn ?? '',
    cst_icms: cfop?.cst_icms ?? '',
    cst_ipi: cfop?.cst_ipi ?? '',
    cst_pis: cfop?.cst_pis ?? '',
    cst_pis_sn: cfop?.cst_pis_sn ?? '',
    cst_cofins: cfop?.cst_cofins ?? '',
    cst_cofins_sn: cfop?.cst_cofins_sn ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string | boolean) {
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
      tipo: form.tipo || null,
      ativo: form.ativo,
      obs_fiscal: form.obs_fiscal.trim() || null,
      csosn: form.csosn.trim() || null,
      cst_icms: form.cst_icms.trim() || null,
      cst_ipi: form.cst_ipi.trim() || null,
      cst_pis: form.cst_pis.trim() || null,
      cst_pis_sn: form.cst_pis_sn.trim() || null,
      cst_cofins: form.cst_cofins.trim() || null,
      cst_cofins_sn: form.cst_cofins_sn.trim() || null,
    }

    const { error: err } = isEditing
      ? await supabase.from('cfops').update(payload).eq('id', cfop!.id)
      : await supabase.from('cfops').insert({ ...payload, tenant_id: tenantId })

    if (err) { setError(err.message); setSaving(false); return }

    toast(isEditing ? 'CFOP atualizado!' : 'CFOP criado!')
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
            {isEditing ? 'Editar CFOP' : 'Novo CFOP'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Código + Tipo + Ativo */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Código <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => set('codigo', e.target.value)}
                placeholder="Ex: 5102"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select
                value={form.ativo ? 'true' : 'false'}
                onChange={(e) => set('ativo', e.target.value === 'true')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
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
              placeholder="Descrição do CFOP"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Observação fiscal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Obs. Fiscal</label>
            <textarea
              value={form.obs_fiscal}
              onChange={(e) => set('obs_fiscal', e.target.value)}
              placeholder="Observações fiscais..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* CSTs — seção colapsável / simplificada */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">CSTs / CSOSN</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">CSOSN</label>
                <input type="text" value={form.csosn} onChange={(e) => set('csosn', e.target.value)}
                  placeholder="Ex: 102" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">CST ICMS</label>
                <input type="text" value={form.cst_icms} onChange={(e) => set('cst_icms', e.target.value)}
                  placeholder="Ex: 00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">CST IPI</label>
                <input type="text" value={form.cst_ipi} onChange={(e) => set('cst_ipi', e.target.value)}
                  placeholder="Ex: 50" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">CST PIS</label>
                <input type="text" value={form.cst_pis} onChange={(e) => set('cst_pis', e.target.value)}
                  placeholder="Ex: 01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">CST PIS (SN)</label>
                <input type="text" value={form.cst_pis_sn} onChange={(e) => set('cst_pis_sn', e.target.value)}
                  placeholder="Ex: 07" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">CST COFINS</label>
                <input type="text" value={form.cst_cofins} onChange={(e) => set('cst_cofins', e.target.value)}
                  placeholder="Ex: 01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">CST COFINS (SN)</label>
                <input type="text" value={form.cst_cofins_sn} onChange={(e) => set('cst_cofins_sn', e.target.value)}
                  placeholder="Ex: 07" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
            {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar CFOP'}
          </button>
        </div>
      </div>
    </div>
  )
}
