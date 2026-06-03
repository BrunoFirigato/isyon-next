'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, TrendingUp, Loader2, Building2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Lead } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantConfig } from '@/app/(crm)/_components/TenantContext'

// Na conversão, o lead nasce no início do funil — etapas avançadas
// (Proposta, Negociação) são alcançadas depois, movendo pelo pipeline.
const ETAPAS = ['Prospecção', 'Qualificação']

interface VendedorRef  { id: string; nome: string }
interface EmpresaRef   { id: string; nome: string; sigla: string }

interface Props {
  lead: Lead
  onClose: () => void
}

export default function ConvertModal({ lead, onClose }: Props) {
  const router   = useRouter()
  const toast    = useToast()
  const { tenantId, perfil, divisaoCarteira } = useTenantConfig()

  const [titulo,           setTitulo]          = useState(lead.empresa ? `${lead.empresa} — ${lead.nome}` : lead.nome)
  const [valor,            setValor]            = useState('')
  const [etapa,            setEtapa]            = useState('Prospecção')
  // Vendedor: herda o responsável do lead, se houver
  const [vendedorId,       setVendedorId]       = useState(lead.vendedor_id ?? '')
  const [empresaId,        setEmpresaId]        = useState('')
  const [prazoFechamento,  setPrazoFechamento]  = useState('')
  const [saving,           setSaving]           = useState(false)
  const [error,            setError]            = useState('')

  const [vendedores,       setVendedores]       = useState<VendedorRef[]>([])
  const [empresas,         setEmpresas]         = useState<EmpresaRef[]>([])
  const [autoPreenchido,   setAutoPreenchido]   = useState(!!lead.vendedor_id)
  const [loadingVendedor,  setLoadingVendedor]  = useState(true)

  // Carrega vendedores, empresas e tenta auto-preencher pelo e-mail do usuário logado
  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const [{ data: vends }, { data: emps }, { data: { user } }] = await Promise.all([
        supabase.from('vendedores').select('id, nome').eq('status', 'ativo').order('nome'),
        supabase.from('empresas').select('id, nome, sigla').order('nome'),
        supabase.auth.getUser(),
      ])

      if (vends) setVendedores(vends)

      // Auto-seleciona empresa se houver apenas uma
      if (emps) {
        setEmpresas(emps)
        if (emps.length === 1) setEmpresaId(emps[0].id)
      }

      // Se o lead não tem responsável, tenta auto-preencher pelo e-mail do usuário logado
      if (!lead.vendedor_id && user?.email) {
        const { data: meu } = await supabase
          .from('vendedores')
          .select('id')
          .eq('email', user.email)
          .eq('status', 'ativo')
          .limit(1)
          .maybeSingle()

        if (meu) {
          setVendedorId(meu.id)
          setAutoPreenchido(true)
        }
      }

      setLoadingVendedor(false)
    }

    init()
  }, [])

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault()

    // Validações obrigatórias
    if (empresas.length === 0) {
      setError('Cadastre uma empresa antes de converter — ela emite as notas dos pedidos.')
      return
    }
    if (!empresaId) {
      setError('Selecione a empresa responsável.')
      return
    }
    if (!vendedorId) {
      setError('Selecione o vendedor responsável.')
      return
    }

    setSaving(true)
    setError('')

    const supabase = createClient()

    // 1. Cria o prospect — pertence ao tenant, sem vínculo de filial
    const { data: prospect, error: prospectErr } = await supabase
      .from('clientes')
      .insert({
        tenant_id: tenantId,
        nome:      lead.nome,
        empresa:   lead.empresa  ?? null,
        email:     lead.email    ?? null,
        telefone:  lead.telefone ?? null,
        tipo:      'direto',
        status:    'prospect',
        origem:    lead.origem   ?? null,
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
      titulo:           titulo.trim(),
      valor:            valor ? parseFloat(valor.replace(',', '.')) : null,
      etapa,
      status:           'aberto',
      tenant_id:        tenantId,
      lead_id:          lead.id,
      cliente_id:       prospect.id,
      vendedor_id:      vendedorId  || null,
      empresa_id:       empresaId   || null,
      prazo_fechamento: prazoFechamento || null,
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

  const inputCls   = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const selectCls  = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls   = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg shadow-xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp size={14} className="text-purple-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Converter em oportunidade</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Lead info */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">Lead</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{lead.nome}</p>
          {lead.empresa && <p className="text-xs text-gray-500 dark:text-gray-400">{lead.empresa}</p>}
        </div>

        <form onSubmit={handleConvert} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">

            {/* Título */}
            <div>
              <label className={labelCls}>Título da oportunidade <span className="text-red-500">*</span></label>
              <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required className={inputCls} />
            </div>

            {/* Empresa do tenant responsável */}
            {empresas.length > 0 && (
              <div>
                <label className={labelCls}>
                  Empresa <span className="text-red-500">*</span>
                  {empresas.length === 1 && (
                    <span className="ml-1.5 text-[10px] font-normal text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                      auto
                    </span>
                  )}
                </label>
                <select value={empresaId} onChange={e => setEmpresaId(e.target.value)} required className={selectCls}>
                  {empresas.length > 1 && <option value="">Selecione a empresa...</option>}
                  {empresas.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nome} ({e.sigla})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sem empresa cadastrada: guia o usuário ao primeiro cadastro */}
            {!loadingVendedor && empresas.length === 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <Building2 size={17} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cadastre sua primeira empresa</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      A empresa é quem emite as notas dos seus pedidos. Você precisa de pelo menos uma para abrir oportunidades.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push('/empresas')}
                      className="mt-3 inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                    >
                      Cadastrar empresa <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Valor + Etapa */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Valor estimado (R$)</label>
                <input type="text" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Etapa</label>
                <select value={etapa} onChange={e => setEtapa(e.target.value)} className={selectCls}>
                  {ETAPAS.map(et => <option key={et} value={et}>{et}</option>)}
                </select>
              </div>
            </div>

            {/* Vendedor + Data fechamento */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>
                  Vendedor <span className="text-red-500">*</span>
                  {autoPreenchido && (
                    <span className="ml-1.5 text-[10px] font-normal text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                      auto
                    </span>
                  )}
                </label>
                <div className="relative">
                  {loadingVendedor && (
                    <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                  )}
                  <select
                    value={vendedorId}
                    onChange={e => { setVendedorId(e.target.value); setAutoPreenchido(false) }}
                    disabled={loadingVendedor || (divisaoCarteira && perfil === 'vendedor' && autoPreenchido)}
                    required
                    className={`${selectCls} ${divisaoCarteira && perfil === 'vendedor' && autoPreenchido ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Selecione...</option>
                    {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                  </select>
                </div>
                {divisaoCarteira && perfil === 'vendedor' && autoPreenchido && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    Divisão de carteira ativa — você só atribui a si mesmo.
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>Data prevista de fechamento</label>
                <input
                  type="date"
                  value={prazoFechamento}
                  onChange={e => setPrazoFechamento(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex gap-3 shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || (!loadingVendedor && empresas.length === 0)}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              {saving ? 'Convertendo...' : 'Converter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
