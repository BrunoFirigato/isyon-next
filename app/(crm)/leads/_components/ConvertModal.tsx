'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Lead } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'

const ETAPAS = [
  'Prospecção',
  'Qualificação',
  'Proposta',
  'Negociação',
]

interface Props {
  lead: Lead
  onClose: () => void
}

export default function ConvertModal({ lead, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const [titulo, setTitulo] = useState(lead.empresa ? `${lead.empresa} — ${lead.nome}` : lead.nome)
  const [valor, setValor] = useState('')
  const [etapa, setEtapa] = useState('Prospecção')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()

    // 1. Cria o prospect a partir dos dados do lead
    const { data: prospect, error: prospectErr } = await supabase
      .from('clientes')
      .insert({
        tenant_id: tenantId,
        nome:      lead.nome,
        empresa:   lead.empresa   ?? null,
        email:     lead.email     ?? null,
        telefone:  lead.telefone  ?? null,
        tipo:      'direto',
        status:    'prospect',
        origem:    lead.origem    ?? null,
        lead_id:   lead.id,
      })
      .select('id')
      .single()

    if (prospectErr) {
      setError(prospectErr.message)
      setSaving(false)
      return
    }

    // 2. Cria a oportunidade vinculada ao lead e ao prospect
    const { error: opErr } = await supabase.from('oportunidades').insert({
      titulo:     titulo.trim(),
      valor:      valor ? parseFloat(valor.replace(',', '.')) : null,
      etapa,
      status:     'aberto',
      tenant_id:  tenantId,
      lead_id:    lead.id,
      cliente_id: prospect.id,
    })

    if (opErr) {
      setError(opErr.message)
      setSaving(false)
      return
    }

    // 3. Marca o lead como convertido
    await supabase.from('leads').update({ status: 'convertido' }).eq('id', lead.id)

    toast('Lead convertido! Prospect criado em Clientes.')
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp size={14} className="text-purple-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Converter em oportunidade</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-500">Lead</p>
          <p className="text-sm font-medium text-gray-900">{lead.nome}</p>
          {lead.empresa && <p className="text-xs text-gray-500">{lead.empresa}</p>}
        </div>

        <form onSubmit={handleConvert} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Título da oportunidade <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Valor estimado (R$)
              </label>
              <input
                type="text"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Etapa</label>
              <select
                value={etapa}
                onChange={(e) => setEtapa(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {ETAPAS.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>
            </div>
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
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Convertendo...' : 'Converter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
