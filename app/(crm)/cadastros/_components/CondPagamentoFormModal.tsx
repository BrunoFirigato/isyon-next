'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type CondPagamento, FORMAS_PAGAMENTO } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'

interface Props {
  cond?: CondPagamento
  onClose: () => void
}

export default function CondPagamentoFormModal({ cond, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const isEditing = !!cond

  const [form, setForm] = useState({
    nome:      cond?.nome ?? '',
    forma:     cond?.forma ?? 'boleto',
    parcelas:  cond?.parcelas != null ? String(cond.parcelas) : '1',
    intervalo: cond?.intervalo != null ? String(cond.intervalo) : '30',
    entrada:   cond?.entrada != null && cond.entrada > 0 ? String(cond.entrada) : '',
    desconto:  cond?.desconto != null && cond.desconto > 0 ? String(cond.desconto) : '',
    obs:       cond?.obs ?? '',
    ativo:     cond?.ativo ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  // Preview automático do nome com base em parcelas + intervalo
  function gerarNomePreview(): string {
    const parc = parseInt(form.parcelas) || 1
    const intv = parseInt(form.intervalo) || 30
    if (parc === 1 && intv <= 1) return 'À Vista'
    if (parc === 1) return `${intv} Dias`
    const dias = Array.from({ length: parc }, (_, i) => (i + 1) * intv)
    return dias.join('/')  + ' Dias'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }

    const parcelas = parseInt(form.parcelas)
    const intervalo = parseInt(form.intervalo)
    if (isNaN(parcelas) || parcelas < 1) { setError('Parcelas deve ser ≥ 1'); return }
    if (isNaN(intervalo) || intervalo < 0) { setError('Intervalo inválido'); return }

    setSaving(true)
    setError('')

    const supabase = createClient()
    const payload = {
      nome:      form.nome.trim(),
      forma:     form.forma || null,
      parcelas,
      intervalo,
      entrada:   form.entrada ? parseFloat(form.entrada.replace(',', '.')) : 0,
      desconto:  form.desconto ? parseFloat(form.desconto.replace(',', '.')) : 0,
      obs:       form.obs.trim() || null,
      ativo:     form.ativo,
    }

    const { error: err } = isEditing
      ? await supabase.from('cond_pagamentos').update(payload).eq('id', cond!.id)
      : await supabase.from('cond_pagamentos').insert({ ...payload, tenant_id: tenantId })

    if (err) { setError(err.message); setSaving(false); return }

    toast(isEditing ? 'Condição atualizada!' : 'Condição criada!')
    router.refresh()
    onClose()
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const selectCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar condição de pagamento' : 'Nova condição de pagamento'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Nome */}
          <div>
            <label className={labelCls}>
              Nome <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Ex: 30/60/90 Dias"
                autoFocus
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => set('nome', gerarNomePreview())}
                className="shrink-0 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                title="Gerar nome automaticamente"
              >
                Auto
              </button>
            </div>
          </div>

          {/* Forma + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Forma de pagamento</label>
              <select
                value={form.forma}
                onChange={(e) => set('forma', e.target.value)}
                className={selectCls}
              >
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select
                value={form.ativo ? 'true' : 'false'}
                onChange={(e) => set('ativo', e.target.value === 'true')}
                className={selectCls}
              >
                <option value="true">Ativa</option>
                <option value="false">Inativa</option>
              </select>
            </div>
          </div>

          {/* Parcelas + Intervalo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nº de parcelas</label>
              <input
                type="number"
                min="1"
                value={form.parcelas}
                onChange={(e) => set('parcelas', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Intervalo (dias)</label>
              <input
                type="number"
                min="0"
                value={form.intervalo}
                onChange={(e) => set('intervalo', e.target.value)}
                placeholder="Ex: 30"
                className={inputCls}
              />
            </div>
          </div>

          {/* Entrada + Desconto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Entrada (R$)</label>
              <input
                type="text"
                value={form.entrada}
                onChange={(e) => set('entrada', e.target.value)}
                placeholder="0,00"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Desconto (%)</label>
              <input
                type="text"
                value={form.desconto}
                onChange={(e) => set('desconto', e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className={labelCls}>Observações</label>
            <textarea
              value={form.obs}
              onChange={(e) => set('obs', e.target.value)}
              placeholder="Ex: 5% de desconto sobre o valor do pedido"
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Preview — keep blue as-is */}
          {(parseInt(form.parcelas) > 1 || parseInt(form.intervalo) > 0) && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 text-xs text-blue-700">
              <span className="font-medium">Preview: </span>
              {parseInt(form.parcelas)}x de intervalo {form.intervalo} dias
              {form.entrada && parseFloat(form.entrada) > 0 ? ` · Entrada R$ ${form.entrada}` : ''}
              {form.desconto && parseFloat(form.desconto) > 0 ? ` · Desconto ${form.desconto}%` : ''}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
            {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar condição'}
          </button>
        </div>
      </div>
    </div>
  )
}
