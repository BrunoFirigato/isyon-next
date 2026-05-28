'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Transportadora } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
import { fetchCnpj, maskCnpj } from '@/lib/cnpj'

interface Props {
  transportadora?: Transportadora
  onClose: () => void
}

export default function TransportadoraFormModal({ transportadora, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const isEditing = !!transportadora

  const [form, setForm] = useState({
    nome: transportadora?.nome ?? '',
    cnpj: transportadora?.cnpj ?? '',
    contato: transportadora?.contato ?? '',
    telefone: transportadora?.telefone ?? '',
    email: transportadora?.email ?? '',
    obs: transportadora?.obs ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [cnpjStatus, setCnpjStatus] = useState<'success' | 'notfound' | null>(null)

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleCnpjChange(raw: string) {
    const masked = maskCnpj(raw)
    set('cnpj', masked)
    setCnpjStatus(null)
    const digits = masked.replace(/\D/g, '')
    if (digits.length !== 14) return
    setBuscandoCnpj(true)
    const data = await fetchCnpj(digits)
    setBuscandoCnpj(false)
    if (!data) { setCnpjStatus('notfound'); return }
    setForm((f) => ({
      ...f,
      nome:     f.nome     || data.nome_fantasia || data.razao_social || f.nome,
      telefone: data.ddd_telefone_1 ?? f.telefone,
      email:    data.email ?? f.email,
    }))
    setCnpjStatus('success')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }

    setSaving(true)
    setError('')

    const supabase = createClient()
    const payload = {
      nome: form.nome.trim(),
      cnpj: form.cnpj.trim() || null,
      contato: form.contato.trim() || null,
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      obs: form.obs.trim() || null,
    }

    const { error: err } = isEditing
      ? await supabase.from('transportadoras').update(payload).eq('id', transportadora!.id)
      : await supabase.from('transportadoras').insert({ ...payload, tenant_id: tenantId })

    if (err) { setError(err.message); setSaving(false); return }

    toast(isEditing ? 'Transportadora atualizada!' : 'Transportadora criada!')
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
            {isEditing ? 'Editar Transportadora' : 'Nova Transportadora'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
              placeholder="Nome da transportadora"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* CNPJ + Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">CNPJ</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  placeholder="00.000.000/0000-00" maxLength={18}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                {buscandoCnpj && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}
                {!buscandoCnpj && cnpjStatus === 'success' && <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
                {!buscandoCnpj && cnpjStatus === 'notfound' && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500" />}
              </div>
              {buscandoCnpj && <p className="text-xs text-blue-500 mt-1">Buscando na Receita Federal...</p>}
              {!buscandoCnpj && cnpjStatus === 'success' && <p className="text-xs text-green-600 mt-1">Preenchido automaticamente ✓</p>}
              {!buscandoCnpj && cnpjStatus === 'notfound' && <p className="text-xs text-amber-600 mt-1">CNPJ não encontrado</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contato</label>
              <input
                type="text"
                value={form.contato}
                onChange={(e) => set('contato', e.target.value)}
                placeholder="Nome do contato"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Telefone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
              <input
                type="tel"
                value={form.telefone}
                onChange={(e) => set('telefone', e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@transportadora.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Obs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              value={form.obs}
              onChange={(e) => set('obs', e.target.value)}
              placeholder="Observações..."
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
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
            {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar transportadora'}
          </button>
        </div>
      </div>
    </div>
  )
}
