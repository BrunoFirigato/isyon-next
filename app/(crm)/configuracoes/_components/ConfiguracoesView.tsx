'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Building2, Tag, Plus, Trash2, GripVertical, Pencil, Check, X, MessageCircle, Info, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import { type Segmento } from '@/app/(crm)/_components/SegmentosContext'

const DEFAULT_WA_TEMPLATE = 'Olá {nome}, tudo bem? Gostaria de entrar em contato para conhecer melhor suas necessidades.'

interface Tenant {
  id: string
  nome: string
  plano: string | null
  status: string | null
  criado_em: string
  whatsapp_template: string | null
  email_template_assunto: string | null
  email_template_corpo: string | null
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
  const [nomeEmpresa, setNomeEmpresa] = useState(tenant.nome)
  const [savingEmpresa, setSavingEmpresa] = useState(false)

  async function salvarEmpresa(e: React.FormEvent) {
    e.preventDefault()
    setSavingEmpresa(true)
    const supabase = createClient()
    await supabase.from('tenants').update({ nome: nomeEmpresa.trim() }).eq('id', tenant.id)
    setSavingEmpresa(false)
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

  // ─── WhatsApp Template ──────────────────────────────────────────────────
  const [waTemplate, setWaTemplate] = useState(tenant.whatsapp_template ?? DEFAULT_WA_TEMPLATE)
  const [savingWa, setSavingWa] = useState(false)

  async function salvarWaTemplate() {
    setSavingWa(true)
    const supabase = createClient()
    await supabase.from('tenants').update({ whatsapp_template: waTemplate.trim() || DEFAULT_WA_TEMPLATE }).eq('id', tenant.id)
    setSavingWa(false)
    toast('Template WhatsApp salvo!')
    router.refresh()
  }

  // ─── Email Template ──────────────────────────────────────────────────────
  const DEFAULT_EMAIL_ASSUNTO = 'Olá {nome}, seguem informações conforme nosso contato.'
  const DEFAULT_EMAIL_CORPO   = 'Olá {nome},\n\nFico à disposição para qualquer dúvida.\n\nAtenciosamente.'

  const [emailAssunto, setEmailAssunto] = useState(tenant.email_template_assunto ?? DEFAULT_EMAIL_ASSUNTO)
  const [emailCorpo,   setEmailCorpo]   = useState(tenant.email_template_corpo   ?? DEFAULT_EMAIL_CORPO)
  const [savingEmail,  setSavingEmail]  = useState(false)

  async function salvarEmailTemplate() {
    setSavingEmail(true)
    const supabase = createClient()
    await supabase.from('tenants').update({
      email_template_assunto: emailAssunto.trim() || DEFAULT_EMAIL_ASSUNTO,
      email_template_corpo:   emailCorpo.trim()   || DEFAULT_EMAIL_CORPO,
    }).eq('id', tenant.id)
    setSavingEmail(false)
    toast('Template de e-mail salvo!')
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

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie as configurações da empresa e preferências</p>
      </div>

      <div className="space-y-6 max-w-2xl">

        {/* ─── Dados da empresa ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Building2 size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Dados da empresa</h2>
          </div>
          <form onSubmit={salvarEmpresa} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome da empresa</label>
              <input
                type="text" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Plano</label>
                <p className="text-sm text-gray-900 py-2">{tenant.plano ?? '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg mt-1 ${
                  tenant.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tenant.status ?? '—'}
                </span>
              </div>
            </div>
            <button
              type="submit" disabled={savingEmpresa}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Save size={14} />
              {savingEmpresa ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </div>

        {/* ─── Segmentos ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Tag size={16} className="text-gray-400" />
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Segmentos de negócio</h2>
              <p className="text-xs text-gray-400 mt-0.5">Usados em oportunidades, propostas, pedidos e vendedores</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {/* Lista */}
            <div className="space-y-2">
              {segmentos.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum segmento cadastrado.</p>
              )}
              {segmentos.map((seg, idx) => (
                <div
                  key={seg.value}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 bg-gray-50 group"
                >
                  <GripVertical size={14} className="text-gray-300 shrink-0" />

                  {editingIdx === idx ? (
                    <>
                      <input
                        autoFocus
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditingIdx(null) }}
                        className="flex-1 text-sm border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button onClick={confirmEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingIdx(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-800">{seg.label}</span>
                      <span className="text-xs text-gray-400 font-mono shrink-0">{seg.value}</span>
                      <button
                        onClick={() => startEdit(idx)}
                        className="p-1 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => removeSegmento(idx)}
                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Adicionar novo */}
            <div className="flex gap-2">
              <input
                type="text"
                value={novoLabel}
                onChange={(e) => setNovoLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSegmento() } }}
                placeholder="Nome do novo segmento..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addSegmento}
                disabled={!novoLabel.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>

            <button
              onClick={salvarSegmentos}
              disabled={savingSegs}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Save size={14} />
              {savingSegs ? 'Salvando...' : 'Salvar segmentos'}
            </button>
          </div>
        </div>

        {/* ─── Template WhatsApp ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <MessageCircle size={16} className="text-gray-400" />
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Template de WhatsApp</h2>
              <p className="text-xs text-gray-400 mt-0.5">Mensagem enviada ao iniciar contato com um lead</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <textarea
              value={waTemplate}
              onChange={(e) => setWaTemplate(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex items-start gap-1.5 text-xs text-gray-400">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                Use <code className="bg-gray-100 px-1 rounded">{'{nome}'}</code> e{' '}
                <code className="bg-gray-100 px-1 rounded">{'{empresa}'}</code> como variáveis — elas serão substituídas
                automaticamente pelos dados do lead.
              </span>
            </div>
            <button
              onClick={salvarWaTemplate}
              disabled={savingWa}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Save size={14} />
              {savingWa ? 'Salvando...' : 'Salvar template'}
            </button>
          </div>
        </div>

        {/* ─── Template E-mail ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Mail size={16} className="text-gray-400" />
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Template de E-mail</h2>
              <p className="text-xs text-gray-400 mt-0.5">Mensagem pré-preenchida ao iniciar contato por e-mail com um lead</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Assunto</label>
              <input
                type="text"
                value={emailAssunto}
                onChange={(e) => setEmailAssunto(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Corpo</label>
              <textarea
                value={emailCorpo}
                onChange={(e) => setEmailCorpo(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex items-start gap-1.5 text-xs text-gray-400">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                Use <code className="bg-gray-100 px-1 rounded">{'{nome}'}</code> e{' '}
                <code className="bg-gray-100 px-1 rounded">{'{empresa}'}</code> como variáveis — elas serão substituídas
                automaticamente pelos dados do lead.
              </span>
            </div>
            <button
              onClick={salvarEmailTemplate}
              disabled={savingEmail}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Save size={14} />
              {savingEmail ? 'Salvando...' : 'Salvar template'}
            </button>
          </div>
        </div>

        {/* ─── Preferências comerciais ────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Preferências comerciais</h2>
            <p className="text-xs text-gray-400 mt-0.5">Parâmetros usados nos alertas e no dashboard</p>
          </div>
          <form onSubmit={salvarConfigs} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(CONFIG_LABELS).map(([chave, label]) => (
                <div key={chave}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
                  <input
                    type="number" min="0" value={valores[chave]}
                    onChange={(e) => setValores((v) => ({ ...v, [chave]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <button
              type="submit" disabled={savingConfig}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Save size={14} />
              {savingConfig ? 'Salvando...' : 'Salvar preferências'}
            </button>
          </form>
        </div>

      </div>
    </>
  )
}
