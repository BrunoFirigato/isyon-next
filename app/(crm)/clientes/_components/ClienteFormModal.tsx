'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Cliente, SEGMENTOS, STATUS_CLIENTE, ESTADOS_BR, TIPOS } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'

type FormData = {
  nome: string
  empresa: string
  email: string
  telefone: string
  cpf_cnpj: string
  tipo: string
  segmento: string
  status: string
  cep: string
  rua: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

interface Props {
  cliente?: Cliente
  onClose: () => void
}

export default function ClienteFormModal({ cliente, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const isEditing = !!cliente

  const [form, setForm] = useState<FormData>({
    nome: cliente?.nome ?? '',
    empresa: cliente?.empresa ?? '',
    email: cliente?.email ?? '',
    telefone: cliente?.telefone ?? '',
    cpf_cnpj: cliente?.cpf_cnpj ?? '',
    tipo: cliente?.tipo ?? 'prospect',
    segmento: cliente?.segmento ?? '',
    status: cliente?.status ?? 'ativo',
    cep: cliente?.cep ?? '',
    rua: cliente?.rua ?? '',
    numero: cliente?.numero ?? '',
    complemento: cliente?.complemento ?? '',
    bairro: cliente?.bairro ?? '',
    cidade: cliente?.cidade ?? '',
    estado: cliente?.estado ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadingCep, setLoadingCep] = useState(false)
  const [tab, setTab] = useState<'dados' | 'endereco'>('dados')

  function set(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function buscarCep() {
    const cep = form.cep.replace(/\D/g, '')
    if (cep.length !== 8) return
    setLoadingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          rua: data.logradouro ?? f.rua,
          bairro: data.bairro ?? f.bairro,
          cidade: data.localidade ?? f.cidade,
          estado: data.uf ?? f.estado,
        }))
      }
    } catch {
      // silencia erro de rede
    } finally {
      setLoadingCep(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const payload = {
      nome: form.nome.trim(),
      empresa: form.empresa.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      cpf_cnpj: form.cpf_cnpj.trim() || null,
      tipo: form.tipo,
      segmento: form.segmento || null,
      status: form.status,
      cep: form.cep.replace(/\D/g, '') || null,
      rua: form.rua.trim() || null,
      numero: form.numero.trim() || null,
      complemento: form.complemento.trim() || null,
      bairro: form.bairro.trim() || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado || null,
    }

    const { error: err } = isEditing
      ? await supabase.from('clientes').update(payload).eq('id', cliente!.id)
      : await supabase.from('clientes').insert({ ...payload, tenant_id: tenantId })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    toast(isEditing ? 'Cliente atualizado!' : 'Cliente criado!')
    router.refresh()
    onClose()
  }

  const tabCls = (t: 'dados' | 'endereco') =>
    `flex-1 py-2 text-sm font-medium transition-colors rounded-lg ${
      tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[92vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar cliente' : 'Novo cliente'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 py-2 shrink-0 bg-gray-50 border-b border-gray-100">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button className={tabCls('dados')} onClick={() => setTab('dados')}>Dados</button>
            <button className={tabCls('endereco')} onClick={() => setTab('endereco')}>Endereço</button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            {tab === 'dados' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <input type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)}
                      required placeholder="Nome completo ou razão social"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Empresa</label>
                    <input type="text" value={form.empresa} onChange={(e) => set('empresa', e.target.value)}
                      placeholder="Nome da empresa"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">CPF / CNPJ</label>
                    <input type="text" value={form.cpf_cnpj} onChange={(e) => set('cpf_cnpj', e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">E-mail</label>
                    <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                      placeholder="email@empresa.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Telefone</label>
                    <input type="tel" value={form.telefone} onChange={(e) => set('telefone', e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipo</label>
                    <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      {TIPOS.filter((t) => t.value !== 'todos').map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Segmento</label>
                    <select value={form.segmento} onChange={(e) => set('segmento', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">Selecione...</option>
                      {SEGMENTOS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                    <select value={form.status} onChange={(e) => set('status', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      {STATUS_CLIENTE.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {tab === 'endereco' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">CEP</label>
                    <div className="flex gap-2">
                      <input type="text" value={form.cep}
                        onChange={(e) => set('cep', e.target.value)}
                        onBlur={buscarCep}
                        placeholder="00000-000" maxLength={9}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button type="button" onClick={buscarCep} disabled={loadingCep}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                        <Search size={15} className={loadingCep ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Estado</label>
                    <select value={form.estado} onChange={(e) => set('estado', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">UF</option>
                      {ESTADOS_BR.map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Rua / Logradouro</label>
                    <input type="text" value={form.rua} onChange={(e) => set('rua', e.target.value)}
                      placeholder="Av. Paulista"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Número</label>
                    <input type="text" value={form.numero} onChange={(e) => set('numero', e.target.value)}
                      placeholder="123"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Complemento</label>
                    <input type="text" value={form.complemento} onChange={(e) => set('complemento', e.target.value)}
                      placeholder="Sala 42"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Bairro</label>
                    <input type="text" value={form.bairro} onChange={(e) => set('bairro', e.target.value)}
                      placeholder="Bela Vista"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Cidade</label>
                    <input type="text" value={form.cidade} onChange={(e) => set('cidade', e.target.value)}
                      placeholder="São Paulo"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
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
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
