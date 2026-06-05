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
interface OpRef      { id: string; titulo: string; cliente_id: string | null }

interface Props {
  compromisso?: Compromisso
  prefill?: { clienteId?: string; leadId?: string; oportunidadeId?: string; titulo?: string }
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

export default function CompromissoFormModal({ compromisso, prefill, onClose }: Props) {
  const router   = useRouter()
  const toast    = useToast()
  const tenantId = useTenantId()
  const isEditing = !!compromisso

  const [form, setForm] = useState({
    titulo:      compromisso?.titulo      ?? prefill?.titulo    ?? '',
    tipo:        compromisso?.tipo        ?? 'tarefa',
    data_hora:   compromisso ? toLocalDatetime(compromisso.data_hora) : defaultDatetime(),
    duracao_min: compromisso?.duracao_min != null ? String(compromisso.duracao_min) : '60',
    descricao:   compromisso?.descricao   ?? '',
    cliente_id:  compromisso?.cliente_id  ?? prefill?.clienteId      ?? '',
    lead_id:     compromisso?.lead_id     ?? prefill?.leadId         ?? '',
    op_id:       compromisso?.op_id       ?? prefill?.oportunidadeId ?? '',
    status:      compromisso?.status      ?? 'pendente',
  })

  const [clientes, setClientes] = useState<ClienteRef[]>([])
  const [leads,    setLeads]    = useState<LeadRef[]>([])
  const [ops,      setOps]      = useState<OpRef[]>([])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  // Contexto de origem: quando aberto de um lead/cliente/oportunidade, o vínculo é fixo.
  const contexto: 'lead' | 'cliente' | 'op' | 'livre' =
    prefill?.leadId ? 'lead'
    : prefill?.oportunidadeId ? 'op'
    : prefill?.clienteId ? 'cliente'
    : 'livre'

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const linkedCliente = compromisso?.cliente_id ?? prefill?.clienteId
      const linkedOp      = compromisso?.op_id      ?? prefill?.oportunidadeId

      const [{ data: cls }, { data: lds }, { data: ops0 }] = await Promise.all([
        supabase.from('clientes').select('id, nome, empresa').in('status', ['ativo', 'prospect']).order('nome'),
        supabase.from('leads').select('id, nome').order('nome'),
        supabase.from('oportunidades').select('id, titulo, cliente_id').eq('status', 'aberto').order('criado_em', { ascending: false }),
      ])
      let clientesList = cls ?? []
      let opsList      = ops0 ?? []

      // Garante que o vínculo atual apareça no select mesmo se o cliente estiver
      // inativo ou a oportunidade já fechada (senão sumiria ao editar).
      if (linkedCliente && !clientesList.some(c => c.id === linkedCliente)) {
        const { data } = await supabase.from('clientes').select('id, nome, empresa').eq('id', linkedCliente).maybeSingle()
        if (data) clientesList = [data, ...clientesList]
      }
      if (linkedOp && !opsList.some(o => o.id === linkedOp)) {
        const { data } = await supabase.from('oportunidades').select('id, titulo, cliente_id').eq('id', linkedOp).maybeSingle()
        if (data) opsList = [data, ...opsList]
      }

      setClientes(clientesList)
      if (lds) setLeads(lds)
      setOps(opsList)
    }
    init()
  }, [])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // Vínculo livre: cliente, lead e oportunidade são mutuamente exclusivos.
  function handleClienteChange(id: string) {
    setForm(f => ({ ...f, cliente_id: id, lead_id: '', op_id: '' }))
  }
  function handleLeadChange(id: string) {
    setForm(f => ({ ...f, lead_id: id, cliente_id: '', op_id: '' }))
  }
  function handleOpChange(id: string) {
    const op = ops.find(o => o.id === id)
    // Vincular à op também vincula ao cliente dela (aparece no 360° do cliente)
    setForm(f => ({ ...f, op_id: id, cliente_id: id ? (op?.cliente_id ?? '') : '', lead_id: '' }))
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
      op_id:       form.op_id      || null,
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

  const vinculoLabel = (() => {
    if (contexto === 'lead') {
      const l = leads.find(x => x.id === form.lead_id)
      return `🎯 Lead${l ? ` · ${l.nome}` : ''}`
    }
    if (contexto === 'cliente') {
      const c = clientes.find(x => x.id === form.cliente_id)
      return `🏢 Cliente${c ? ` · ${c.empresa ? `${c.empresa} — ${c.nome}` : c.nome}` : ''}`
    }
    if (contexto === 'op') {
      const o = ops.find(x => x.id === form.op_id)
      return `📈 Oportunidade${o ? ` · ${o.titulo}` : ''}`
    }
    return ''
  })()

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const selectCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[92vh] flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar atividade' : 'Nova atividade'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">

            {/* Título */}
            <div>
              <label className={labelCls}>
                Título <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.titulo} onChange={e => set('titulo', e.target.value)}
                autoFocus required placeholder="Ex: Reunião com cliente"
                className={inputCls} />
            </div>

            {/* Tipo */}
            <div>
              <label className={labelCls}>Tipo</label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_COMPROMISSO.map(t => (
                  <button key={t.value} type="button" onClick={() => set('tipo', t.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      form.tipo === t.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
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
                <label className={labelCls}>
                  Data e hora <span className="text-red-500">*</span>
                </label>
                <input type="datetime-local" value={form.data_hora} onChange={e => set('data_hora', e.target.value)}
                  required
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Duração (min)</label>
                <input type="number" min="5" step="5" value={form.duracao_min} onChange={e => set('duracao_min', e.target.value)}
                  placeholder="60"
                  className={inputCls} />
              </div>
            </div>

            {/* Vínculo — contextual */}
            {contexto === 'livre' ? (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Vincular a oportunidade</label>
                  <select value={form.op_id} onChange={e => handleOpChange(e.target.value)} className={selectCls}>
                    <option value="">Nenhuma</option>
                    {ops.map(o => <option key={o.id} value={o.id}>{o.titulo}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Vincular a cliente</label>
                    <select value={form.cliente_id} onChange={e => handleClienteChange(e.target.value)} className={selectCls}>
                      <option value="">Nenhum</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>{c.empresa ? `${c.empresa} — ${c.nome}` : c.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Vincular a lead</label>
                    <select value={form.lead_id} onChange={e => handleLeadChange(e.target.value)} className={selectCls}>
                      <option value="">Nenhum</option>
                      {leads.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className={labelCls}>Vinculado a</label>
                <div className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 text-sm font-medium text-gray-700 dark:text-gray-200">
                  {vinculoLabel}
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className={selectCls}>
                {STATUS_COMPROMISSO.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className={labelCls}>Descrição</label>
              <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)}
                rows={3} placeholder="Notas, pauta, observações..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex gap-3 shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
