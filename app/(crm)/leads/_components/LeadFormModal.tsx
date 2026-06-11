'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  type Lead, CARGOS, FATURAMENTO_FAIXAS, FUNCIONARIOS_FAIXAS, SCORE_OPTIONS, ESTADOS, ORIGEM_OPTIONS,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
import PhoneInput, { phoneIsComplete } from '@/app/(crm)/_components/PhoneInput'

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo' },
  { value: 'contato', label: 'Em contato' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'convertido', label: 'Convertido' },
  { value: 'perdido', label: 'Perdido' },
]

interface Props {
  lead?: Lead
  onClose: () => void
}

export default function LeadFormModal({ lead, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const isEditing = !!lead

  const [form, setForm] = useState({
    nome: lead?.nome ?? '',
    empresa: lead?.empresa ?? '',
    email: lead?.email ?? '',
    telefone: lead?.telefone ?? '',
    status: lead?.status ?? 'novo',
    origem: lead?.origem ?? '',
    obs: lead?.obs ?? '',
    vendedor_id: lead?.vendedor_id ?? '',
    cargo: lead?.cargo ?? '',
    cidade: lead?.cidade ?? '',
    estado: lead?.estado ?? '',
    faturamento: lead?.faturamento ?? '',
    funcionarios: lead?.funcionarios ?? '',
    score: lead?.score ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([])

  // Abre a seção de qualificação já expandida quando o lead tem algum desses dados
  const temQualif = !!(lead?.cargo || lead?.cidade || lead?.estado || lead?.faturamento || lead?.funcionarios || lead?.score)
  const [qualifAberta, setQualifAberta] = useState(temQualif)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('vendedores').select('id, nome').eq('status', 'ativo').order('nome')
      .then(({ data }) => { if (data) setVendedores(data) })
  }, [])

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validações obrigatórias
    if (!form.origem) {
      setError('Selecione a origem do lead.')
      return
    }
    if (!form.telefone.trim() && !form.email.trim()) {
      setError('Informe ao menos um contato — telefone ou e-mail.')
      return
    }
    if (form.telefone.trim() && !phoneIsComplete(form.telefone)) {
      setError('Telefone incompleto — inclua DDD + número.')
      return
    }

    setSaving(true)
    setError('')

    const supabase = createClient()
    const payload = {
      nome: form.nome.trim(),
      empresa: form.empresa.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      status: form.status,
      origem: form.origem || null,
      obs: form.obs.trim() || null,
      vendedor_id: form.vendedor_id || null,
      cargo: form.cargo || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado || null,
      faturamento: form.faturamento || null,
      funcionarios: form.funcionarios || null,
      score: form.score || null,
    }

    const { error: err } = isEditing
      ? await supabase.from('leads').update(payload).eq('id', lead!.id)
      : await supabase.from('leads').insert({ ...payload, tenant_id: tenantId })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    toast(isEditing ? 'Lead atualizado!' : 'Lead criado!')
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar lead' : 'Novo lead'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                required
                placeholder="Nome completo"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Empresa</label>
              <input
                type="text"
                value={form.empresa}
                onChange={(e) => set('empresa', e.target.value)}
                placeholder="Nome da empresa"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Telefone
              </label>
              <PhoneInput value={form.telefone} onChange={(v) => set('telefone', v)} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@empresa.com"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Telefone ou e-mail: preencha ao menos um.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Origem <span className="text-red-500">*</span>
              </label>
              <select
                value={form.origem}
                onChange={(e) => set('origem', e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                {ORIGEM_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendedor responsável (mesmo campo do "Vendedor" na conversão) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Vendedor</label>
              <select
                value={form.vendedor_id}
                onChange={(e) => set('vendedor_id', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Qualificação — recolhível para não poluir a captura */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setQualifAberta((v) => !v)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Sparkles size={14} className="text-amber-500" />
                Qualificação <span className="text-xs font-normal text-gray-400 dark:text-gray-500">· opcional</span>
              </span>
              {qualifAberta
                ? <ChevronUp size={16} className="text-gray-400" />
                : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {qualifAberta && (
              <div className="px-3.5 pb-4 pt-2 space-y-4 border-t border-gray-100 dark:border-gray-700">
                {/* Score */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Score</label>
                  <div className="flex gap-2">
                    {SCORE_OPTIONS.map((s) => {
                      const active = form.score === s.value
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => set('score', active ? '' : s.value)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            active
                              ? `${s.bg} ${s.text} border-transparent`
                              : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span>{s.emoji}</span> {s.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cargo */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Cargo do contato</label>
                    <select
                      value={form.cargo}
                      onChange={(e) => set('cargo', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {CARGOS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Cidade + UF */}
                  <div className="grid grid-cols-[1fr_5rem] gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Cidade</label>
                      <input
                        type="text"
                        value={form.cidade}
                        onChange={(e) => set('cidade', e.target.value)}
                        placeholder="Cidade"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">UF</label>
                      <select
                        value={form.estado}
                        onChange={(e) => set('estado', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">—</option>
                        {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Faturamento */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Faturamento anual</label>
                    <select
                      value={form.faturamento}
                      onChange={(e) => set('faturamento', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {FATURAMENTO_FAIXAS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  {/* Funcionários */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nº de funcionários</label>
                    <select
                      value={form.funcionarios}
                      onChange={(e) => set('funcionarios', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {FUNCIONARIOS_FAIXAS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Observações
            </label>
            <textarea
              value={form.obs}
              onChange={(e) => set('obs', e.target.value)}
              rows={3}
              placeholder="Anotações sobre o lead..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
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
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
