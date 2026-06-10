'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
import { fetchCnpj, maskCnpj } from '@/lib/cnpj'
import type { Empresa } from './types'

interface Props {
  empresa?: Empresa
  onClose: () => void
}

const CORES = [
  '#1a56a0', '#2563eb', '#7c3aed', '#db2777',
  '#dc2626', '#ea580c', '#16a34a', '#0891b2',
  '#374151', '#78716c',
]

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO',
  'MA','MT','MS','MG','PA','PB','PR','PE','PI',
  'RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

function maskCep(v: string) {
  return v.replace(/\D/g,'').slice(0,8).replace(/^(\d{5})(\d)/,'$1-$2')
}

type TabKey = 'geral' | 'endereco'

export default function EmpresaFormModal({ empresa, onClose }: Props) {
  const router   = useRouter()
  const toast    = useToast()
  const tenantId = useTenantId()
  const isEditing = !!empresa

  const [tab, setTab] = useState<TabKey>('geral')

  const [form, setForm] = useState({
    // Geral
    nome:               empresa?.nome               ?? '',
    sigla:              empresa?.sigla              ?? '',
    cnpj:               empresa?.cnpj               ?? '',
    razao_social:       empresa?.razao_social       ?? '',
    telefone:           empresa?.telefone           ?? '',
    email:              empresa?.email              ?? '',
    cor:                empresa?.cor                ?? '#1a56a0',
    // Endereço
    cep:                empresa?.cep                ?? '',
    rua:                empresa?.rua                ?? '',
    numero:             empresa?.numero             ?? '',
    complemento:        empresa?.complemento        ?? '',
    bairro:             empresa?.bairro             ?? '',
    cidade:             empresa?.cidade             ?? '',
    estado:             empresa?.estado             ?? '',
  })

  const [saving,       setSaving]       = useState(false)
  const [buscandoCep,  setBuscandoCep]  = useState(false)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [cnpjStatus,   setCnpjStatus]   = useState<'success' | 'notfound' | null>(null)
  const [error,        setError]        = useState('')

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // ── Lookup CNPJ na Receita Federal ────────────────────────────────────────
  async function handleCnpjChange(raw: string) {
    const masked = maskCnpj(raw)
    set('cnpj', masked)
    setCnpjStatus(null)
    const digits = masked.replace(/\D/g,'')
    if (digits.length !== 14) return
    setBuscandoCnpj(true)
    const data = await fetchCnpj(digits)
    setBuscandoCnpj(false)
    if (!data) { setCnpjStatus('notfound'); return }
    setForm(prev => ({
      ...prev,
      razao_social:  data.razao_social   ?? prev.razao_social,
      rua:           data.logradouro     ?? prev.rua,
      numero:        data.numero         ?? prev.numero,
      complemento:   data.complemento   ?? prev.complemento,
      bairro:        data.bairro         ?? prev.bairro,
      cidade:        data.municipio      ?? prev.cidade,
      estado:        data.uf             ?? prev.estado,
      cep:           data.cep ? maskCep(data.cep) : prev.cep,
      telefone:      data.ddd_telefone_1 ?? prev.telefone,
      email:         data.email          ?? prev.email,
    }))
    setCnpjStatus('success')
  }

  // ── Lookup CEP no ViaCEP ──────────────────────────────────────────────────
  async function buscarCep(cep: string) {
    const digits = cep.replace(/\D/g,'')
    if (digits.length !== 8) return
    setBuscandoCep(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          rua:    data.logradouro ?? prev.rua,
          bairro: data.bairro     ?? prev.bairro,
          cidade: data.localidade ?? prev.cidade,
          estado: data.uf         ?? prev.estado,
        }))
      }
    } catch { /* ignore */ }
    setBuscandoCep(false)
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim())  { setError('Nome é obrigatório');  setTab('geral'); return }
    if (!form.sigla.trim()) { setError('Sigla é obrigatória'); setTab('geral'); return }
    setSaving(true); setError('')

    const supabase = createClient()
    const payload = {
      nome:                form.nome.trim(),
      sigla:               form.sigla.trim().toUpperCase(),
      cnpj:                form.cnpj.replace(/\D/g,'')     || null,
      razao_social:        form.razao_social.trim()        || null,
      telefone:            form.telefone.trim()            || null,
      email:               form.email.trim()               || null,
      cep:                 form.cep.replace(/\D/g,'')      || null,
      rua:                 form.rua.trim()                 || null,
      numero:              form.numero.trim()              || null,
      complemento:         form.complemento.trim()         || null,
      bairro:              form.bairro.trim()              || null,
      cidade:              form.cidade.trim()              || null,
      estado:              form.estado                     || null,
      cor:                 form.cor,
    }

    const { error: err } = isEditing
      ? await supabase.from('empresas').update(payload).eq('id', empresa!.id)
      : await supabase.from('empresas').insert({ ...payload, tenant_id: tenantId })

    setSaving(false)
    if (err) { setError(err.message); return }

    toast(isEditing ? 'Empresa atualizada!' : 'Empresa criada!')
    router.refresh()
    onClose()
  }

  // ── Estilos ───────────────────────────────────────────────────────────────
  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5'

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'geral',    label: 'Geral' },
    { key: 'endereco', label: 'Endereço' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[94vh] flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar empresa' : 'Nova empresa'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 shrink-0 px-1">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                tab === t.key
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">

            {/* ── Aba Geral ─────────────────────────────────────────────── */}
            {tab === 'geral' && (
              <>
                {/* Nome + Sigla */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>Nome <span className="text-red-500">*</span></label>
                    <input value={form.nome} onChange={e => set('nome', e.target.value)}
                      required placeholder="Nome fantasia ou razão social curta" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Sigla <span className="text-red-500">*</span></label>
                    <input value={form.sigla} onChange={e => set('sigla', e.target.value.toUpperCase())}
                      required maxLength={10} placeholder="EX" className={inputCls} />
                  </div>
                </div>

                {/* CNPJ com lookup Receita Federal */}
                <div>
                  <label className={labelCls}>CNPJ</label>
                  <div className="relative">
                    <input value={form.cnpj} onChange={e => handleCnpjChange(e.target.value)}
                      placeholder="00.000.000/0000-00" maxLength={18}
                      className={inputCls + ' pr-9 font-mono'} />
                    {buscandoCnpj && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}
                    {!buscandoCnpj && cnpjStatus === 'success'  && <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
                    {!buscandoCnpj && cnpjStatus === 'notfound' && <AlertCircle  size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500" />}
                  </div>
                  {buscandoCnpj                    && <p className="text-xs text-blue-500 mt-1">Buscando na Receita Federal...</p>}
                  {!buscandoCnpj && cnpjStatus === 'success'  && <p className="text-xs text-green-600 mt-1">Dados preenchidos automaticamente ✓</p>}
                  {!buscandoCnpj && cnpjStatus === 'notfound' && <p className="text-xs text-amber-600 mt-1">CNPJ não encontrado</p>}
                </div>

                {/* Razão Social */}
                <div>
                  <label className={labelCls}>Razão Social</label>
                  <input value={form.razao_social} onChange={e => set('razao_social', e.target.value)}
                    placeholder="Razão social completa (para NF-e)" className={inputCls} />
                </div>

                {/* Telefone + E-mail */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Telefone</label>
                    <input value={form.telefone} onChange={e => set('telefone', e.target.value)}
                      placeholder="(00) 00000-0000" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>E-mail</label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="contato@empresa.com.br" className={inputCls} />
                  </div>
                </div>

                {/* Cor de identificação */}
                <div>
                  <label className={labelCls}>Cor de identificação</label>
                  <div className="flex gap-2 flex-wrap">
                    {CORES.map(c => (
                      <button key={c} type="button" onClick={() => set('cor', c)}
                        className={`w-7 h-7 rounded-full transition-all ${form.cor === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                    <input type="color" value={form.cor} onChange={e => set('cor', e.target.value)}
                      className="w-7 h-7 rounded-full cursor-pointer border-0 p-0 overflow-hidden" title="Cor personalizada" />
                  </div>
                </div>
              </>
            )}

            {/* ── Aba Endereço ──────────────────────────────────────────── */}
            {tab === 'endereco' && (
              <>
                {/* CEP com ViaCEP */}
                <div>
                  <label className={labelCls}>CEP</label>
                  <div className="flex gap-2">
                    <input value={form.cep}
                      onChange={e => set('cep', maskCep(e.target.value))}
                      onBlur={e => buscarCep(e.target.value)}
                      placeholder="00000-000" className={inputCls} />
                    {buscandoCep && <Loader2 size={16} className="self-center text-gray-400 animate-spin shrink-0" />}
                  </div>
                </div>

                {/* Rua + Número */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>Logradouro</label>
                    <input value={form.rua} onChange={e => set('rua', e.target.value)}
                      placeholder="Rua, Av..." className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Número</label>
                    <input value={form.numero} onChange={e => set('numero', e.target.value)}
                      placeholder="100" className={inputCls} />
                  </div>
                </div>

                {/* Complemento + Bairro */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Complemento</label>
                    <input value={form.complemento} onChange={e => set('complemento', e.target.value)}
                      placeholder="Sala, Galpão..." className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Bairro</label>
                    <input value={form.bairro} onChange={e => set('bairro', e.target.value)}
                      className={inputCls} />
                  </div>
                </div>

                {/* Cidade + Estado */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>Cidade</label>
                    <input value={form.cidade} onChange={e => set('cidade', e.target.value)}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Estado</label>
                    <select value={form.estado} onChange={e => set('estado', e.target.value)}
                      className={inputCls}>
                      <option value="">UF</option>
                      {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="px-5 pb-5 flex gap-3 shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
