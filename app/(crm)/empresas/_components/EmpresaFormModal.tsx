'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
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

function maskCnpj(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function maskCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
}

export default function EmpresaFormModal({ empresa, onClose }: Props) {
  const router    = useRouter()
  const toast     = useToast()
  const tenantId  = useTenantId()
  const isEditing = !!empresa

  const [form, setForm] = useState({
    nome:               empresa?.nome               ?? '',
    sigla:              empresa?.sigla              ?? '',
    cnpj:               empresa?.cnpj               ?? '',
    telefone:           empresa?.telefone           ?? '',
    email:              empresa?.email              ?? '',
    cep:                empresa?.cep                ?? '',
    rua:                empresa?.rua                ?? '',
    numero:             empresa?.numero             ?? '',
    complemento:        empresa?.complemento        ?? '',
    bairro:             empresa?.bairro             ?? '',
    cidade:             empresa?.cidade             ?? '',
    estado:             empresa?.estado             ?? '',
    inscricao_estadual: empresa?.inscricao_estadual ?? '',
    cor:                empresa?.cor                ?? '#1a56a0',
  })

  const [saving,      setSaving]      = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [error,       setError]       = useState('')

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function buscarCep(cep: string) {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setBuscandoCep(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(f => ({
          ...f,
          rua:    data.logradouro ?? f.rua,
          bairro: data.bairro     ?? f.bairro,
          cidade: data.localidade ?? f.cidade,
          estado: data.uf         ?? f.estado,
        }))
      }
    } catch { /* ignore */ }
    setBuscandoCep(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }
    if (!form.sigla.trim()) { setError('Sigla é obrigatória'); return }
    setSaving(true); setError('')

    const supabase = createClient()
    const payload = {
      nome:               form.nome.trim().toUpperCase() === form.nome.trim() ? form.nome.trim() : form.nome.trim(),
      sigla:              form.sigla.trim().toUpperCase(),
      cnpj:               form.cnpj.replace(/\D/g, '') || null,
      telefone:           form.telefone.trim() || null,
      email:              form.email.trim()    || null,
      cep:                form.cep.replace(/\D/g, '') || null,
      rua:                form.rua.trim()          || null,
      numero:             form.numero.trim()        || null,
      complemento:        form.complemento.trim()   || null,
      bairro:             form.bairro.trim()         || null,
      cidade:             form.cidade.trim()         || null,
      estado:             form.estado                || null,
      inscricao_estadual: form.inscricao_estadual.trim() || null,
      cor:                form.cor,
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

  const inputCls  = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls  = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[92vh] flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar empresa' : 'Nova empresa'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">

            {/* Nome + Sigla */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Nome <span className="text-red-500">*</span></label>
                <input value={form.nome} onChange={e => set('nome', e.target.value)}
                  required placeholder="Razão social ou nome fantasia" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Sigla <span className="text-red-500">*</span></label>
                <input value={form.sigla} onChange={e => set('sigla', e.target.value.toUpperCase())}
                  required maxLength={10} placeholder="EX" className={inputCls} />
              </div>
            </div>

            {/* CNPJ + IE */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>CNPJ</label>
                <input value={form.cnpj} onChange={e => set('cnpj', maskCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Inscrição Estadual</label>
                <input value={form.inscricao_estadual} onChange={e => set('inscricao_estadual', e.target.value)}
                  placeholder="000.000.000.000" className={inputCls} />
              </div>
            </div>

            {/* Telefone + Email */}
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

            {/* CEP */}
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

            {/* Bairro + Cidade + Estado */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Bairro</label>
                <input value={form.bairro} onChange={e => set('bairro', e.target.value)}
                  placeholder="Bairro" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Cidade</label>
                <input value={form.cidade} onChange={e => set('cidade', e.target.value)}
                  placeholder="Cidade" className={inputCls} />
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

            {/* Cor */}
            <div>
              <label className={labelCls}>Cor de identificação</label>
              <div className="flex gap-2 flex-wrap">
                {CORES.map(c => (
                  <button key={c} type="button" onClick={() => set('cor', c)}
                    className={`w-7 h-7 rounded-full transition-all ${form.cor === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input type="color" value={form.cor} onChange={e => set('cor', e.target.value)}
                  className="w-7 h-7 rounded-full cursor-pointer border-0 p-0 overflow-hidden"
                  title="Cor personalizada" />
              </div>
            </div>

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
