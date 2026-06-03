'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Oportunidade, ETAPAS } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
import { useSegmentos } from '@/app/(crm)/_components/SegmentosContext'

// Etapas válidas ao CRIAR: oportunidade nova nasce no início do funil.
// Proposta/Negociação são alcançadas movendo o card (ou criando uma proposta).
const ETAPAS_INICIAIS = ['Prospecção', 'Qualificação']

interface ClienteRef  { id: string; nome: string; empresa: string | null }
interface EmpresaRef  { id: string; nome: string; sigla: string }
interface VendedorRef { id: string; nome: string }

interface Props {
  op?: Oportunidade
  defaultEtapa?: string
  onClose: () => void
}

export default function OpFormModal({ op, defaultEtapa, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const segmentos = useSegmentos()
  const isEditing = !!op

  // Ao criar, a etapa default é clampada para uma etapa inicial válida.
  const etapaInicial = op?.etapa
    ?? (defaultEtapa && ETAPAS_INICIAIS.includes(defaultEtapa) ? defaultEtapa : 'Prospecção')

  const [form, setForm] = useState({
    titulo:    op?.titulo ?? '',
    etapa:     etapaInicial,
    valor:     op?.valor != null ? String(op.valor) : '',
    segmento:  op?.segmento ?? '',
    clienteId: op?.cliente_id ?? '',
    empresaId: op?.empresa_id ?? '',
    vendedorId: op?.vendedor_id ?? '',
    prazo:     op?.prazo_fechamento?.slice(0, 10) ?? '',
  })
  const [clientes,   setClientes]   = useState<ClienteRef[]>([])
  const [empresas,   setEmpresas]   = useState<EmpresaRef[]>([])
  const [vendedores, setVendedores] = useState<VendedorRef[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const [{ data: cls }, { data: emps }, { data: vends }, { data: { user } }] = await Promise.all([
        supabase.from('clientes').select('id, nome, empresa').order('nome'),
        supabase.from('empresas').select('id, nome, sigla').order('nome'),
        supabase.from('vendedores').select('id, nome').eq('status', 'ativo').order('nome'),
        supabase.auth.getUser(),
      ])
      if (cls)   setClientes(cls)
      if (vends) setVendedores(vends)
      if (emps) {
        setEmpresas(emps)
        if (emps.length === 1 && !op?.empresa_id) setForm((f) => ({ ...f, empresaId: emps[0].id }))
      }
      // Auto-preenche o vendedor pelo e-mail do usuário logado (oportunidade nova)
      if (!op?.vendedor_id && user?.email) {
        const { data: meu } = await supabase.from('vendedores').select('id').eq('email', user.email).eq('status', 'ativo').limit(1).maybeSingle()
        if (meu) setForm((f) => ({ ...f, vendedorId: meu.id }))
      }
    }
    init()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const valorNum = form.valor.trim()
      ? parseFloat(form.valor.replace(',', '.'))
      : null

    const payload = {
      titulo:           form.titulo.trim(),
      etapa:            form.etapa,
      valor:            valorNum,
      segmento:         form.segmento || null,
      cliente_id:       form.clienteId  || null,
      empresa_id:       form.empresaId  || null,
      vendedor_id:      form.vendedorId || null,
      prazo_fechamento: form.prazo      || null,
      status:           op?.status ?? 'aberto',
    }

    const { error: err } = isEditing
      ? await supabase.from('oportunidades').update(payload).eq('id', op!.id)
      : await supabase.from('oportunidades').insert({ ...payload, tenant_id: tenantId })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    toast(isEditing ? 'Oportunidade atualizada!' : 'Oportunidade criada!')
    router.refresh()
    onClose()
  }

  const inputCls  = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const selectCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls  = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[92vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar oportunidade' : 'Nova oportunidade'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className={labelCls}>Título <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              required
              placeholder="Ex: Proposta de manutenção anual"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Cliente</label>
            <select value={form.clienteId} onChange={(e) => set('clienteId', e.target.value)} className={selectCls}>
              <option value="">Selecione...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.empresa ? `${c.empresa} — ${c.nome}` : c.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Etapa</label>
              <select value={form.etapa} onChange={(e) => set('etapa', e.target.value)} className={selectCls}>
                {/* Ao criar: só etapas iniciais. Ao editar: todas (permite correção manual). */}
                {(isEditing ? ETAPAS : ETAPAS_INICIAIS).map((et) => (
                  <option key={et} value={et}>{et}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Valor estimado (R$)</label>
              <input
                type="text"
                value={form.valor}
                onChange={(e) => set('valor', e.target.value)}
                placeholder="0,00"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {empresas.length > 0 && (
              <div>
                <label className={labelCls}>Empresa emissora</label>
                <select value={form.empresaId} onChange={(e) => set('empresaId', e.target.value)} className={selectCls}>
                  <option value="">Selecione...</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nome} ({emp.sigla})</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={labelCls}>Vendedor</label>
              <select value={form.vendedorId} onChange={(e) => set('vendedorId', e.target.value)} className={selectCls}>
                <option value="">Selecione...</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Previsão de fechamento</label>
              <input
                type="date"
                value={form.prazo}
                onChange={(e) => set('prazo', e.target.value)}
                className={inputCls}
              />
            </div>

            {segmentos.length > 0 && (
              <div>
                <label className={labelCls}>Segmento</label>
                <select value={form.segmento} onChange={(e) => set('segmento', e.target.value)} className={selectCls}>
                  <option value="">Selecione...</option>
                  {segmentos.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
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
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
