'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Compromisso, TIPOS_COMPROMISSO, STATUS_COMPROMISSO } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'

interface ClienteRef { id: string; nome: string; empresa: string | null }
interface LeadRef    { id: string; nome: string }

interface Props {
  compromisso?: Compromisso
  onClose: () => void
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultDatetime() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return toLocalDatetime(d.toISOString())
}

export default function CompromissoFormModal({ compromisso, onClose }: Props) {
  const router   = useRouter()
  const toast    = useToast()
  const tenantId = useTenantId()
  const isEditing = !!compromisso

  const [form, setForm] = useState({
    titulo:      compromisso?.titulo      ?? '',
    tipo:        compromisso?.tipo        ?? 'tarefa',
    data_hora:   compromisso ? toLocalDatetime(compromisso.data_hora) : defaultDatetime(),
    duracao_min: compromisso?.duracao_min != null ? String(compromisso.duracao_min) : '60',
    descricao:   compromisso?.descricao   ?? '',
    cliente_id:  compromisso?.cliente_id  ?? '',
    lead_id:     compromisso?.lead_id     ?? '',
    status:      compromisso?.status      ?? 'pendente',
  })

  const [clientes, setClientes] = useState<ClienteRef[]>([])
  const [leads,    setLeads]    = useState<LeadRef[]>([])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('clientes').select('id, nome, empresa').eq('status', 'ativo').order('nome')
      .then(({ data }) => { if (data) setClientes(data) })
    supabase.from('leads').select('id, nome').order('nome')
      .then(({ data }) => { if (data) setLeads(data) })
  }, [])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // Vincular a cliente OU lead — limpa o outro ao selecionar
  function handleClienteChange(id: string) {
    setForm(f => ({ ...f, cliente_id: id, lead_id: id ? '' : f.lead_id }))
  }
  function handleLeadChange(id: string) {
    setForm(f => ({ ...f, lead_id: id, cliente_id: id ? '' : f.cliente_id }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) { setError('Título é obrigatório'); return }
    if (!form.data_hora)     { setError('Data e hora são obrigatórios'); return }
    setSaving(true); setError('')

    const supabase = createClient()
    const payload = {
      titulo:      form.titulo.trim(),
      tipo:        form.tipo,
      data_hora:   new Date(form.data_hora).toISOString(),
      duracao_min: form.duracao_min ? parseInt(form.duracao_min) : null,
      descricao:   form.descricao.trim() || null,
      cliente_id:  form.cliente_id || null,
      lead_id:     form.lead_id    || null,
      status:      form.status,
    }

    const { error: err } = isEditing
      ? await supabase.from('compromissos').update(payload).eq('id', compromisso!.id)
      : await supabase.from('compromissos').insert({ ...payload, tenant_id: tenantId })

    if (err) { setError(err.message); setSaving(false); return }

    toast(isEditing ? 'Atividade atualizada!' : 'Atividade criada!')
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[92vh] flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar atividade' : 'Nova atividade'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">

            {/* Título */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Título <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.titulo} onChange={e => set('titulo', e.target.value)}
                autoFocus required placeholder="Ex: Reunião com cliente"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_COMPROMISSO.map(t => (
                  <button key={t.value} type="button" onClick={() => set('tipo', t.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      form.tipo === t.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Data/hora + duração */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Data e hora <span className="text-red-500">*</span>
                </label>
                <input type="datetime-local" value={form.data_hora} onChange={e => set('data_hora', e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Duração (min)</label>
                <input type="number" min="5" step="5" value={form.duracao_min} onChange={e => set('duracao_min', e.target.value)}
                  placeholder="60"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Vínculo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Vincular a cliente</label>
                <select value={form.cliente_id} onChange={e => handleClienteChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Nenhum</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.empresa ? `${c.empresa} — ${c.nome}` : c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Vincular a lead</label>
                <select value={form.lead_id} onChange={e => handleLeadChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Nenhum</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {STATUS_COMPROMISSO.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Descrição</label>
              <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)}
                rows={3} placeholder="Notas, pauta, observações..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex gap-3 shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar atividade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
