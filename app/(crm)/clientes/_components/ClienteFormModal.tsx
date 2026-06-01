'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Cliente, type VendedorRef, type ParceiroRef, STATUS_CLIENTE, ESTADOS_BR, TIPOS, tipoLabel } from './types'
import { fetchCnpj } from '@/lib/cnpj'
import { useSegmentos } from '@/app/(crm)/_components/SegmentosContext'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'

const ORIGEM_OPTIONS = [
  'Site', 'Indicação', 'LinkedIn', 'WhatsApp',
  'Evento', 'Prospecção', 'Parceiro', 'Outro',
]

type FormData = {
  nome: string
  empresa: string
  email: string
  telefone: string
  cpf_cnpj: string
  inscricao_estadual: string
  indicador_ie: string
  tipo: string
  segmento: string
  status: string
  origem: string
  cep: string
  rua: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  vendedor0: string
  vendedor1: string
  parceiro_id: string
}

interface Props {
  cliente?: Cliente
  onClose: () => void
}

export default function ClienteFormModal({ cliente, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const segmentos = useSegmentos()
  const isEditing = !!cliente

  const [form, setForm] = useState<FormData>({
    nome:        cliente?.nome        ?? '',
    empresa:     cliente?.empresa     ?? '',
    email:       cliente?.email       ?? '',
    telefone:    cliente?.telefone    ?? '',
    cpf_cnpj:    cliente?.cpf_cnpj    ?? '',
    inscricao_estadual: cliente?.inscricao_estadual ?? '',
    indicador_ie:       cliente?.indicador_ie       ?? '9',  // padrão: não contribuinte
    tipo:        cliente?.tipo        ?? 'direto',
    segmento:    cliente?.segmento    ?? '',
    status:      cliente?.status      ?? 'prospect',
    origem:      cliente?.origem      ?? '',
    cep:         cliente?.cep         ?? '',
    rua:         cliente?.rua         ?? '',
    numero:      cliente?.numero      ?? '',
    complemento: cliente?.complemento ?? '',
    bairro:      cliente?.bairro      ?? '',
    cidade:      cliente?.cidade      ?? '',
    estado:      cliente?.estado      ?? '',
    vendedor0:   cliente?.vendedor_maq_id ?? '',
    vendedor1:   cliente?.vendedor_pec_id ?? '',
    parceiro_id: cliente?.parceiro_id     ?? '',
  })

  const [vendedores,  setVendedores]  = useState<VendedorRef[]>([])
  const [parceiros,   setParceiros]   = useState<ParceiroRef[]>([])
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [loadingCep,  setLoadingCep]  = useState(false)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [cnpjStatus,  setCnpjStatus]  = useState<'success' | 'notfound' | null>(null)
  const [tab,         setTab]         = useState<'dados' | 'endereco'>('dados')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('vendedores').select('id, nome').eq('status', 'ativo').order('nome')
      .then(({ data }) => { if (data) setVendedores(data) })
    supabase.from('parceiros').select('id, nome').eq('status', 'ativo').order('nome')
      .then(({ data }) => { if (data) setParceiros(data) })
  }, [])

  function set(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleCpfCnpjChange(value: string) {
    set('cpf_cnpj', value)
    setCnpjStatus(null)
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 14) return
    setBuscandoCnpj(true)
    const data = await fetchCnpj(digits)
    setBuscandoCnpj(false)
    if (!data) { setCnpjStatus('notfound'); return }
    setForm((f) => ({
      ...f,
      empresa:    data.nome_fantasia || data.razao_social || f.empresa,
      email:      data.email         ?? f.email,
      telefone:   data.ddd_telefone_1 ?? f.telefone,
      cep:        data.cep           ?? f.cep,
      rua:        data.logradouro    ?? f.rua,
      numero:     data.numero        ?? f.numero,
      complemento:data.complemento  ?? f.complemento,
      bairro:     data.bairro        ?? f.bairro,
      cidade:     data.municipio     ?? f.cidade,
      estado:     data.uf            ?? f.estado,
    }))
    setCnpjStatus('success')
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

    if (!form.telefone.trim() && !form.email.trim()) {
      setError('Informe ao menos um contato — telefone ou e-mail.')
      return
    }
    if (form.indicador_ie === '1' && !form.inscricao_estadual.trim()) {
      setError('Contribuinte de ICMS exige a Inscrição Estadual.')
      return
    }

    setSaving(true)
    setError('')

    const supabase = createClient()
    const payload = {
      nome:            form.nome.trim(),
      empresa:         form.empresa.trim()        || null,
      email:           form.email.trim()          || null,
      telefone:        form.telefone.trim()        || null,
      cpf_cnpj:        form.cpf_cnpj.trim()        || null,
      inscricao_estadual: form.indicador_ie === '1' ? (form.inscricao_estadual.trim() || null) : null,
      indicador_ie:    form.indicador_ie,
      tipo:            form.tipo,
      segmento:        form.segmento               || null,
      status:          form.status,
      origem:          form.origem                 || null,
      cep:             form.cep.replace(/\D/g, '') || null,
      rua:             form.rua.trim()             || null,
      numero:          form.numero.trim()          || null,
      complemento:     form.complemento.trim()     || null,
      bairro:          form.bairro.trim()          || null,
      cidade:          form.cidade.trim()          || null,
      estado:          form.estado                 || null,
      vendedor_maq_id: form.vendedor0              || null,
      vendedor_pec_id: form.vendedor1              || null,
      parceiro_id:     form.parceiro_id            || null,
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
      tab === t ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
    }`

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
            {isEditing ? 'Editar cliente' : 'Novo cliente'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 py-2 shrink-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-1">
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
                    <label className={labelCls}>
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <input type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)}
                      required placeholder="Nome completo ou razão social"
                      className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Empresa</label>
                    <input type="text" value={form.empresa} onChange={(e) => set('empresa', e.target.value)}
                      placeholder="Nome da empresa" className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>CPF / CNPJ</label>
                    <div className="relative">
                      <input type="text" value={form.cpf_cnpj}
                        onChange={(e) => handleCpfCnpjChange(e.target.value)}
                        placeholder="000.000.000-00 ou CNPJ"
                        className={`${inputCls} pr-9`} />
                      {buscandoCnpj && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}
                      {!buscandoCnpj && cnpjStatus === 'success' && <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
                      {!buscandoCnpj && cnpjStatus === 'notfound' && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500" />}
                    </div>
                    {buscandoCnpj && <p className="text-xs text-blue-500 mt-1">Buscando na Receita Federal...</p>}
                    {!buscandoCnpj && cnpjStatus === 'success' && <p className="text-xs text-green-600 mt-1">Dados preenchidos automaticamente ✓</p>}
                    {!buscandoCnpj && cnpjStatus === 'notfound' && <p className="text-xs text-amber-600 mt-1">CNPJ não encontrado na Receita Federal</p>}
                  </div>

                  <div>
                    <label className={labelCls}>Contribuinte de ICMS <span className="text-gray-400 dark:text-gray-500 font-normal">(NF-e)</span></label>
                    <select value={form.indicador_ie} onChange={(e) => set('indicador_ie', e.target.value)} className={selectCls}>
                      <option value="9">Não contribuinte (consumidor final)</option>
                      <option value="1">Contribuinte de ICMS</option>
                      <option value="2">Contribuinte isento de Inscrição</option>
                    </select>
                  </div>

                  {form.indicador_ie === '1' && (
                    <div>
                      <label className={labelCls}>Inscrição Estadual <span className="text-red-500">*</span></label>
                      <input type="text" value={form.inscricao_estadual}
                        onChange={(e) => set('inscricao_estadual', e.target.value)}
                        placeholder="000.000.000.000" className={inputCls} />
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>E-mail</label>
                    <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                      placeholder="email@empresa.com" className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Telefone</label>
                    <input type="tel" value={form.telefone} onChange={(e) => set('telefone', e.target.value)}
                      placeholder="(11) 99999-9999" className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Tipo</label>
                    <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)} className={selectCls}>
                      {TIPOS.filter(t => t.value !== 'todos').map((t) => (
                        <option key={t.value} value={t.value}>{tipoLabel(t.value)}</option>
                      ))}
                    </select>
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

                  <div>
                    <label className={labelCls}>Status</label>
                    <select value={form.status} onChange={(e) => set('status', e.target.value)} className={selectCls}>
                      {STATUS_CLIENTE.filter(s => s.value !== 'todos').map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Origem</label>
                    <select value={form.origem} onChange={(e) => set('origem', e.target.value)} className={selectCls}>
                      <option value="">Selecione...</option>
                      {ORIGEM_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>

                  {/* Vendedor(es) — dinâmico por segmento */}
                  {segmentos.length === 0 ? (
                    <div className="md:col-span-2">
                      <label className={labelCls}>Vendedor responsável</label>
                      <select value={form.vendedor0} onChange={(e) => set('vendedor0', e.target.value)} className={selectCls}>
                        <option value="">Nenhum</option>
                        {vendedores.map((v) => (
                          <option key={v.id} value={v.id}>{v.nome}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    segmentos.slice(0, 2).map((seg, idx) => (
                      <div key={seg.value}>
                        <label className={labelCls}>
                          Vendedor — {seg.label}
                        </label>
                        <select
                          value={idx === 0 ? form.vendedor0 : form.vendedor1}
                          onChange={(e) => set(idx === 0 ? 'vendedor0' : 'vendedor1', e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Nenhum</option>
                          {vendedores.map((v) => (
                            <option key={v.id} value={v.id}>{v.nome}</option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}

                  {/* Parceiro comercial — só para tipo Revenda */}
                  {form.tipo === 'revenda' && (
                    <div className="md:col-span-2">
                      <label className={labelCls}>Parceiro comercial</label>
                      <select value={form.parceiro_id} onChange={(e) => set('parceiro_id', e.target.value)} className={selectCls}>
                        <option value="">Selecione...</option>
                        {parceiros.map((p) => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === 'endereco' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>CEP</label>
                    <div className="flex gap-2">
                      <input type="text" value={form.cep}
                        onChange={(e) => set('cep', e.target.value)}
                        onBlur={buscarCep}
                        placeholder="00000-000" maxLength={9}
                        className={`flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`} />
                      <button type="button" onClick={buscarCep} disabled={loadingCep}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Search size={15} className={loadingCep ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Estado</label>
                    <select value={form.estado} onChange={(e) => set('estado', e.target.value)} className={selectCls}>
                      <option value="">UF</option>
                      {ESTADOS_BR.map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>Rua / Logradouro</label>
                    <input type="text" value={form.rua} onChange={(e) => set('rua', e.target.value)}
                      placeholder="Av. Paulista" className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Número</label>
                    <input type="text" value={form.numero} onChange={(e) => set('numero', e.target.value)}
                      placeholder="123" className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Complemento</label>
                    <input type="text" value={form.complemento} onChange={(e) => set('complemento', e.target.value)}
                      placeholder="Sala 42" className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Bairro</label>
                    <input type="text" value={form.bairro} onChange={(e) => set('bairro', e.target.value)}
                      placeholder="Bela Vista" className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Cidade</label>
                    <input type="text" value={form.cidade} onChange={(e) => set('cidade', e.target.value)}
                      placeholder="São Paulo" className={inputCls} />
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
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
