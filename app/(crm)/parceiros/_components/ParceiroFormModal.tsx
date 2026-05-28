'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Parceiro, type Vendedor, ESTADOS_BR } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
import { fetchCnpj, maskCnpj } from '@/lib/cnpj'

interface Props {
  parceiro?: Parceiro
  onClose: () => void
}

export default function ParceiroFormModal({ parceiro, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const isEditing = !!parceiro

  const [nome, setNome] = useState(parceiro?.nome ?? '')
  const [email, setEmail] = useState(parceiro?.email ?? '')
  const [telefone, setTelefone] = useState(parceiro?.telefone ?? '')
  const [cnpj, setCnpj] = useState(parceiro?.cnpj ?? '')
  const [cidade, setCidade] = useState(parceiro?.cidade ?? '')
  const [estado, setEstado] = useState(parceiro?.estado ?? '')
  const [status, setStatus] = useState(parceiro?.status ?? 'ativo')
  const [vendedorMaqId, setVendedorMaqId] = useState(parceiro?.vendedor_maq_id ?? '')
  const [vendedorPecId, setVendedorPecId] = useState(parceiro?.vendedor_pec_id ?? '')

  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [cnpjStatus, setCnpjStatus] = useState<'success' | 'notfound' | null>(null)
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCnpjChange(raw: string) {
    const masked = maskCnpj(raw)
    setCnpj(masked)
    setCnpjStatus(null)
    const digits = masked.replace(/\D/g, '')
    if (digits.length !== 14) return
    setBuscandoCnpj(true)
    const data = await fetchCnpj(digits)
    setBuscandoCnpj(false)
    if (!data) { setCnpjStatus('notfound'); return }
    if (!nome.trim()) setNome(data.nome_fantasia || data.razao_social || '')
    if (data.email) setEmail(data.email)
    if (data.ddd_telefone_1) setTelefone(data.ddd_telefone_1)
    if (data.municipio) setCidade(data.municipio)
    if (data.uf) setEstado(data.uf)
    setCnpjStatus('success')
  }

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('vendedores')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => { if (data) setVendedores(data) })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const payload = {
      nome: nome.trim(),
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      cnpj: cnpj.trim() || null,
      cidade: cidade.trim() || null,
      estado: estado || null,
      status: status || null,
      vendedor_maq_id: vendedorMaqId || null,
      vendedor_pec_id: vendedorPecId || null,
    }

    const { error: err } = isEditing
      ? await supabase.from('parceiros').update(payload).eq('id', parceiro!.id)
      : await supabase.from('parceiros').insert({ ...payload, tenant_id: tenantId })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    toast(isEditing ? 'Parceiro atualizado!' : 'Parceiro criado!')
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[94vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar parceiro comercial' : 'Novo parceiro comercial'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                required placeholder="Nome do parceiro ou empresa"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">E-mail</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@parceiro.com.br"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Telefone</label>
                <input
                  type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* CNPJ */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">CNPJ</label>
                <div className="relative">
                  <input
                    type="text" value={cnpj} onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder="00.000.000/0000-00" maxLength={18}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  {buscandoCnpj && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}
                  {!buscandoCnpj && cnpjStatus === 'success' && <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
                  {!buscandoCnpj && cnpjStatus === 'notfound' && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500" />}
                </div>
                {buscandoCnpj && <p className="text-xs text-blue-500 mt-1">Buscando na Receita Federal...</p>}
                {!buscandoCnpj && cnpjStatus === 'success' && <p className="text-xs text-green-600 mt-1">Dados preenchidos automaticamente ✓</p>}
                {!buscandoCnpj && cnpjStatus === 'notfound' && <p className="text-xs text-amber-600 mt-1">CNPJ não encontrado na Receita Federal</p>}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                <select
                  value={status} onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              {/* Cidade */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Cidade</label>
                <input
                  type="text" value={cidade} onChange={(e) => setCidade(e.target.value)}
                  placeholder="São Paulo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Estado</label>
                <select
                  value={estado} onChange={(e) => setEstado(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Selecione...</option>
                  {ESTADOS_BR.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>

              {/* Vendedor Máquinas */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Vendedor — Máquinas</label>
                <select
                  value={vendedorMaqId} onChange={(e) => setVendedorMaqId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Nenhum</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>{v.nome}</option>
                  ))}
                </select>
              </div>

              {/* Vendedor Peças */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Vendedor — Peças</label>
                <select
                  value={vendedorPecId} onChange={(e) => setVendedorPecId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Nenhum</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>{v.nome}</option>
                  ))}
                </select>
              </div>
            </div>

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
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar parceiro comercial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
