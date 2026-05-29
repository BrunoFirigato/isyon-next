'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Building2, Tag, Plus, Trash2, GripVertical, Pencil, Check, X, Mail, MessageCircle, BarChart2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import { type Segmento } from '@/app/(crm)/_components/SegmentosContext'
import { fetchCnpj, maskCnpj } from '@/lib/cnpj'

interface Tenant {
  id: string
  nome: string
  plano: string | null
  status: string | null
  criado_em: string
  // Dados da empresa
  razao_social: string | null
  nome_fantasia: string | null
  cnpj: string | null
  inscricao_estadual: string | null
  inscricao_municipal: string | null
  regime_tributario: string | null
  crt: string | null
  cnae: string | null
  cep: string | null
  rua: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  telefone: string | null
  email_empresa: string | null
  website: string | null
}

interface ConfigUsuario {
  id: string
  usuario_id: string
  chave: string
  valor: string
}

interface Props {
  tenant: Tenant
  configs: ConfigUsuario[]
  usuarioId: string
  segmentosIniciais: Segmento[]
}

const CONFIG_LABELS: Record<string, string> = {
  dias_sem_contato: 'Dias sem contato (alerta)',
  dias_followup:    'Dias para follow-up',
  dias_op_parada:   'Dias de oportunidade parada',
  dias_proposta:    'Dias de proposta sem retorno',
  meta_global:      'Meta mensal (R$)',
}

const CONFIG_DEFAULTS: Record<string, string> = {
  dias_sem_contato: '30',
  dias_followup:    '7',
  dias_op_parada:   '14',
  dias_proposta:    '15',
  meta_global:      '0',
}

export default function ConfiguracoesView({ tenant, configs, usuarioId, segmentosIniciais }: Props) {
  const router = useRouter()
  const toast = useToast()

  // ─── Empresa ────────────────────────────────────────────────────────────────
  const [empresa, setEmpresa] = useState({
    nome:               tenant.nome              ?? '',
    razao_social:       tenant.razao_social       ?? '',
    nome_fantasia:      tenant.nome_fantasia      ?? '',
    cnpj:               tenant.cnpj               ?? '',
    inscricao_estadual: tenant.inscricao_estadual ?? '',
    inscricao_municipal:tenant.inscricao_municipal?? '',
    regime_tributario:  tenant.regime_tributario  ?? '',
    crt:                tenant.crt                ?? '',
    cnae:               tenant.cnae               ?? '',
    cep:                tenant.cep                ?? '',
    rua:                tenant.rua                ?? '',
    numero:             tenant.numero             ?? '',
    complemento:        tenant.complemento        ?? '',
    bairro:             tenant.bairro             ?? '',
    cidade:             tenant.cidade             ?? '',
    estado:             tenant.estado             ?? '',
    telefone:           tenant.telefone           ?? '',
    email_empresa:      tenant.email_empresa      ?? '',
    website:            tenant.website            ?? '',
  })
  const [savingEmpresa, setSavingEmpresa] = useState(false)
  const [buscandoCep,   setBuscandoCep]   = useState(false)
  const [buscandoCnpj,  setBuscandoCnpj]  = useState(false)
  const [cnpjStatus,    setCnpjStatus]    = useState<'success' | 'notfound' | null>(null)

  function setE(field: keyof typeof empresa, value: string) {
    setEmpresa((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCnpjChange(raw: string) {
    const masked = maskCnpj(raw)
    setE('cnpj', masked)
    setCnpjStatus(null)
    const digits = masked.replace(/\D/g, '')
    if (digits.length !== 14) return
    setBuscandoCnpj(true)
    const data = await fetchCnpj(digits)
    setBuscandoCnpj(false)
    if (!data) { setCnpjStatus('notfound'); return }
    setEmpresa((prev) => ({
      ...prev,
      razao_social:  data.razao_social  ?? prev.razao_social,
      nome_fantasia: data.nome_fantasia ?? prev.nome_fantasia,
      rua:           data.logradouro    ?? prev.rua,
      numero:        data.numero        ?? prev.numero,
      complemento:   data.complemento  ?? prev.complemento,
      bairro:        data.bairro        ?? prev.bairro,
      cidade:        data.municipio     ?? prev.cidade,
      estado:        data.uf            ?? prev.estado,
      cep:           data.cep ? maskCep(data.cep) : prev.cep,
      telefone:      data.ddd_telefone_1 ?? prev.telefone,
      email_empresa: data.email         ?? prev.email_empresa,
    }))
    setCnpjStatus('success')
  }

  function maskCep(v: string) {
    return v.replace(/\D/g,'').slice(0,8).replace(/^(\d{5})(\d)/,'$1-$2')
  }

  async function buscarCep(cep: string) {
    const digits = cep.replace(/\D/g,'')
    if (digits.length !== 8) return
    setBuscandoCep(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setEmpresa((prev) => ({
          ...prev,
          rua:    data.logradouro ?? prev.rua,
          bairro: data.bairro     ?? prev.bairro,
          cidade: data.localidade ?? prev.cidade,
          estado: data.uf         ?? prev.estado,
        }))
      }
    } catch { /* silently ignore */ }
    setBuscandoCep(false)
  }

  async function salvarEmpresa(e: React.FormEvent) {
    e.preventDefault()
    setSavingEmpresa(true)
    const supabase = createClient()
    const { error, count } = await supabase.from('tenants').update({
      nome:               empresa.nome.trim()               || tenant.nome,
      razao_social:       empresa.razao_social.trim()       || null,
      nome_fantasia:      empresa.nome_fantasia.trim()      || null,
      cnpj:               empresa.cnpj.replace(/\D/g,'')   || null,
      inscricao_estadual: empresa.inscricao_estadual.trim() || null,
      inscricao_municipal:empresa.inscricao_municipal.trim()|| null,
      regime_tributario:  empresa.regime_tributario         || null,
      crt:                empresa.crt                       || null,
      cnae:               empresa.cnae.trim()               || null,
      cep:                empresa.cep.replace(/\D/g,'')     || null,
      rua:                empresa.rua.trim()                || null,
      numero:             empresa.numero.trim()             || null,
      complemento:        empresa.complemento.trim()        || null,
      bairro:             empresa.bairro.trim()             || null,
      cidade:             empresa.cidade.trim()             || null,
      estado:             empresa.estado.trim()             || null,
      telefone:           empresa.telefone.trim()           || null,
      email_empresa:      empresa.email_empresa.trim()      || null,
      website:            empresa.website.trim()            || null,
    }, { count: 'exact' }).eq('id', tenant.id)
    setSavingEmpresa(false)
    if (error) {
      toast(`Erro ao salvar: ${error.message}`, 'error')
      return
    }
    if (count === 0) {
      toast('Sem permissão para atualizar. Verifique as políticas RLS da tabela tenants.', 'error')
      return
    }
    toast('Dados da empresa salvos!')
    router.refresh()
  }

  // ─── Preferências comerciais ─────────────────────────────────────────────
  const configMap = new Map(configs.map((c) => [c.chave, c]))
  const [valores, setValores] = useState<Record<string, string>>(
    Object.keys(CONFIG_LABELS).reduce((acc, chave) => {
      acc[chave] = configMap.get(chave)?.valor ?? CONFIG_DEFAULTS[chave]
      return acc
    }, {} as Record<string, string>)
  )
  const [savingConfig, setSavingConfig] = useState(false)

  async function salvarConfigs(e: React.FormEvent) {
    e.preventDefault()
    setSavingConfig(true)
    const supabase = createClient()
    for (const [chave, valor] of Object.entries(valores)) {
      const existing = configMap.get(chave)
      if (existing) {
        await supabase.from('config_usuario').update({ valor }).eq('id', existing.id)
      } else {
        await supabase.from('config_usuario').insert({ usuario_id: usuarioId, chave, valor })
      }
    }
    setSavingConfig(false)
    toast('Preferências salvas!')
    router.refresh()
  }

  // ─── Segmentos ───────────────────────────────────────────────────────────
  const [segmentos, setSegmentos] = useState<Segmento[]>(segmentosIniciais)
  const [novoLabel, setNovoLabel] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [savingSegs, setSavingSegs] = useState(false)

  function gerarValue(label: string): string {
    return label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  function addSegmento() {
    const label = novoLabel.trim()
    if (!label) return
    const value = gerarValue(label)
    if (segmentos.some((s) => s.value === value)) {
      toast('Segmento já existe', 'error')
      return
    }
    setSegmentos([...segmentos, { value, label }])
    setNovoLabel('')
  }

  function removeSegmento(idx: number) {
    setSegmentos(segmentos.filter((_, i) => i !== idx))
  }

  function startEdit(idx: number) {
    setEditingIdx(idx)
    setEditLabel(segmentos[idx].label)
  }

  function confirmEdit() {
    if (editingIdx === null) return
    const label = editLabel.trim()
    if (!label) { setEditingIdx(null); return }
    const updated = [...segmentos]
    updated[editingIdx] = { ...updated[editingIdx], label }
    setSegmentos(updated)
    setEditingIdx(null)
  }

  async function salvarSegmentos() {
    setSavingSegs(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('tenants')
      .update({ segmentos })
      .eq('id', tenant.id)
    setSavingSegs(false)
    if (error) { toast('Erro ao salvar segmentos', 'error'); return }
    toast('Segmentos salvos!')
    router.refresh()
  }

  const TABS = [
    { key: 'conta',     label: 'Conta',     icon: Building2 },
    { key: 'segmentos', label: 'Segmentos', icon: Tag },
    { key: 'comercial', label: 'Comercial', icon: BarChart2 },
  ] as const
  type TabKey = typeof TABS[number]['key']
  const [tab, setTab] = useState<TabKey>('conta')

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Configurações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gerencie as configurações da empresa e preferências</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl">

        {/* ─── Empresa ───────────────────────────────────────────────────── */}
        {tab === 'conta' && (
          <form onSubmit={salvarEmpresa} className="space-y-5">

            {/* Identificação */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
                <Building2 size={15} className="text-gray-400 dark:text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Identificação</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Razão Social</label>
                    <input value={empresa.razao_social} onChange={(e) => setE('razao_social', e.target.value)}
                      placeholder="Ex: ACME Produtos Industriais Ltda"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nome Fantasia</label>
                    <input value={empresa.nome_fantasia} onChange={(e) => setE('nome_fantasia', e.target.value)}
                      placeholder="Ex: ACME"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">CNPJ</label>
                  <div className="relative">
                    <input value={maskCnpj(empresa.cnpj)} onChange={(e) => handleCnpjChange(e.target.value)}
                      placeholder="00.000.000/0000-00" maxLength={18}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
                    {buscandoCnpj && (
                      <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
                    )}
                    {!buscandoCnpj && cnpjStatus === 'success' && (
                      <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                    )}
                    {!buscandoCnpj && cnpjStatus === 'notfound' && (
                      <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500" />
                    )}
                  </div>
                  {buscandoCnpj && (
                    <p className="text-xs text-blue-500 mt-1">Buscando na Receita Federal...</p>
                  )}
                  {!buscandoCnpj && cnpjStatus === 'success' && (
                    <p className="text-xs text-green-600 mt-1">Dados preenchidos automaticamente ✓</p>
                  )}
                  {!buscandoCnpj && cnpjStatus === 'notfound' && (
                    <p className="text-xs text-amber-600 mt-1">CNPJ não encontrado na Receita Federal</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dados tributários */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
                <Tag size={15} className="text-gray-400 dark:text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dados tributários</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Inscrição Estadual (IE)</label>
                    <input value={empresa.inscricao_estadual} onChange={(e) => setE('inscricao_estadual', e.target.value)}
                      placeholder="000.000.000.000"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Inscrição Municipal (IM)</label>
                    <input value={empresa.inscricao_municipal} onChange={(e) => setE('inscricao_municipal', e.target.value)}
                      placeholder="000000"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Regime Tributário</label>
                    <select value={empresa.regime_tributario} onChange={(e) => setE('regime_tributario', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100">
                      <option value="">Selecione...</option>
                      <option value="mei">MEI</option>
                      <option value="simples_nacional">Simples Nacional</option>
                      <option value="lucro_presumido">Lucro Presumido</option>
                      <option value="lucro_real">Lucro Real</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">CRT <span className="text-gray-400 dark:text-gray-500 font-normal">(NF-e)</span></label>
                    <select value={empresa.crt} onChange={(e) => setE('crt', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100">
                      <option value="">—</option>
                      <option value="1">1 — Simples Nacional</option>
                      <option value="2">2 — Simples Nacional (excesso)</option>
                      <option value="3">3 — Regime Normal</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">CNAE principal</label>
                  <input value={empresa.cnae} onChange={(e) => setE('cnae', e.target.value)}
                    placeholder="Ex: 4679-6/99"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
                <Mail size={15} className="text-gray-400 dark:text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Endereço</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">CEP</label>
                    <div className="relative">
                      <input
                        value={maskCep(empresa.cep)}
                        onChange={(e) => {
                          const v = maskCep(e.target.value)
                          setE('cep', v)
                          if (v.replace(/\D/g,'').length === 8) buscarCep(v)
                        }}
                        placeholder="00000-000" maxLength={9}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                      />
                      {buscandoCep && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-blue-500">buscando...</span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Logradouro / Rua</label>
                    <input value={empresa.rua} onChange={(e) => setE('rua', e.target.value)}
                      placeholder="Rua, Avenida, Travessa..."
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Número</label>
                    <input value={empresa.numero} onChange={(e) => setE('numero', e.target.value)}
                      placeholder="000"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
                  </div>
                  <div className="col-span-1 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Complemento</label>
                    <input value={empresa.complemento} onChange={(e) => setE('complemento', e.target.value)}
                      placeholder="Sala, Andar, Galpão..."
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Bairro</label>
                    <input value={empresa.bairro} onChange={(e) => setE('bairro', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Cidade</label>
                    <input value={empresa.cidade} onChange={(e) => setE('cidade', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">UF</label>
                    <select value={empresa.estado} onChange={(e) => setE('estado', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100">
                      <option value="">—</option>
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contato */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
                <MessageCircle size={15} className="text-gray-400 dark:text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contato</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Telefone</label>
                    <input value={empresa.telefone} onChange={(e) => setE('telefone', e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">E-mail</label>
                    <input type="email" value={empresa.email_empresa} onChange={(e) => setE('email_empresa', e.target.value)}
                      placeholder="contato@empresa.com.br"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Website</label>
                    <input value={empresa.website} onChange={(e) => setE('website', e.target.value)}
                      placeholder="https://empresa.com.br"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={savingEmpresa}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              <Save size={14} />
              {savingEmpresa ? 'Salvando...' : 'Salvar dados da empresa'}
            </button>
          </form>
        )}

        {/* ─── Segmentos ─────────────────────────────────────────────────── */}
        {tab === 'segmentos' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <Tag size={16} className="text-gray-400 dark:text-gray-500" />
              <div>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Segmentos de negócio</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Usados em oportunidades, propostas, pedidos e vendedores</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-2">
                {segmentos.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Nenhum segmento cadastrado.</p>
                )}
                {segmentos.map((seg, idx) => (
                  <div
                    key={seg.value}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 group"
                  >
                    <GripVertical size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
                    {editingIdx === idx ? (
                      <>
                        <input
                          autoFocus value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditingIdx(null) }}
                          className="flex-1 text-sm border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        />
                        <button onClick={confirmEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingIdx(null)} className="p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-800 dark:text-gray-100">{seg.label}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono shrink-0">{seg.value}</span>
                        <button onClick={() => startEdit(idx)}
                          className="p-1 text-gray-300 dark:text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => removeSegmento(idx)}
                          className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text" value={novoLabel}
                  onChange={(e) => setNovoLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSegmento() } }}
                  placeholder="Nome do novo segmento..."
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                />
                <button type="button" onClick={addSegmento} disabled={!novoLabel.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors">
                  <Plus size={14} /> Adicionar
                </button>
              </div>
              <button onClick={salvarSegmentos} disabled={savingSegs}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <Save size={14} />
                {savingSegs ? 'Salvando...' : 'Salvar segmentos'}
              </button>
            </div>
          </div>
        )}

        {/* ─── Comercial ─────────────────────────────────────────────────── */}
        {tab === 'comercial' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <BarChart2 size={16} className="text-gray-400 dark:text-gray-500" />
              <div>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preferências comerciais</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Parâmetros usados nos alertas e no dashboard</p>
              </div>
            </div>
            <form onSubmit={salvarConfigs} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(CONFIG_LABELS).map(([chave, label]) => (
                  <div key={chave}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
                    <input
                      type="number" min="0" value={valores[chave]}
                      onChange={(e) => setValores((v) => ({ ...v, [chave]: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={savingConfig}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <Save size={14} />
                {savingConfig ? 'Salvando...' : 'Salvar preferências'}
              </button>
            </form>
          </div>
        )}

      </div>
    </>
  )
}
