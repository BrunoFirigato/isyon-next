'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Building2, Tag, Plus, Trash2, GripVertical, Pencil, Check, X, Mail, MessageCircle, BarChart2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import { type Segmento } from '@/app/(crm)/_components/SegmentosContext'

interface Tenant {
  id: string
  nome: string
  plano: string | null
  status: string | null
  criado_em: string
  divisao_carteira: boolean | null
  aprovacao_pedido: boolean | null
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

  // ─── Conta ───────────────────────────────────────────────────────────────────
  const [nomeConta,    setNomeConta]    = useState(tenant.nome ?? '')
  const [savingConta,  setSavingConta]  = useState(false)

  async function salvarConta(e: React.FormEvent) {
    e.preventDefault()
    if (!nomeConta.trim()) return
    setSavingConta(true)
    const supabase = createClient()
    const { error, count } = await supabase
      .from('tenants')
      .update({ nome: nomeConta.trim() }, { count: 'exact' })
      .eq('id', tenant.id)
    setSavingConta(false)
    if (error) { toast(`Erro ao salvar: ${error.message}`, 'error'); return }
    if (count === 0) { toast('Sem permissão para atualizar.', 'error'); return }
    toast('Nome da conta atualizado!')
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

  // Política do tenant (não é por usuário) — divisão de carteira por vendedor
  const [divisaoCarteira, setDivisaoCarteira] = useState(tenant.divisao_carteira ?? false)
  // Política do tenant — exigir aprovação do gestor no pedido
  const [aprovacaoPedido, setAprovacaoPedido] = useState(tenant.aprovacao_pedido ?? false)

  async function salvarConfigs(e: React.FormEvent) {
    e.preventDefault()
    setSavingConfig(true)
    const supabase = createClient()

    // Preferências numéricas — por usuário (config_usuario)
    for (const [chave, valor] of Object.entries(valores)) {
      const existing = configMap.get(chave)
      if (existing) {
        await supabase.from('config_usuario').update({ valor }).eq('id', existing.id)
      } else {
        await supabase.from('config_usuario').insert({ usuario_id: usuarioId, chave, valor })
      }
    }

    // Políticas do tenant (tenants)
    await supabase.from('tenants').update({
      divisao_carteira: divisaoCarteira,
      aprovacao_pedido: aprovacaoPedido,
    }).eq('id', tenant.id)

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

        {/* ─── Conta ─────────────────────────────────────────────────────── */}
        {tab === 'conta' && (
          <form onSubmit={salvarConta} className="space-y-5">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
                <Building2 size={15} className="text-gray-400 dark:text-gray-500" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dados da conta</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Nome exibido no seletor de login</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Nome da conta <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={nomeConta}
                    onChange={e => setNomeConta(e.target.value)}
                    required
                    placeholder="Nome que aparece no login"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                </div>

                {/* Info read-only */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Plano</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{tenant.plano ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</p>
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                      tenant.status === 'ativo'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {tenant.status ?? '—'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
                  Dados fiscais (CNPJ, regime tributário, NF-e) são configurados por empresa em <strong>Administração → Empresas</strong>.
                </p>
              </div>
            </div>

            <button type="submit" disabled={savingConta}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              <Save size={14} />
              {savingConta ? 'Salvando...' : 'Salvar'}
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

              {/* Política de carteira (tenant) */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <label className="flex items-start gap-3 cursor-pointer">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={divisaoCarteira}
                    onClick={() => setDivisaoCarteira(v => !v)}
                    className={`mt-0.5 relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      divisaoCarteira ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      divisaoCarteira ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Divisão de carteira por vendedor</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Quando ativado, vendedores só atribuem oportunidades a si mesmos — o vendedor fica travado na conversão.
                      Gestores e administradores continuam livres para escolher. Desligado, qualquer um atribui livremente.
                    </p>
                  </div>
                </label>
              </div>

              {/* Aprovação de pedido (tenant) */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <label className="flex items-start gap-3 cursor-pointer">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={aprovacaoPedido}
                    onClick={() => setAprovacaoPedido(v => !v)}
                    className={`mt-0.5 relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      aprovacaoPedido ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      aprovacaoPedido ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Exigir aprovação do gestor no pedido</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Quando ativado, todo pedido nasce &quot;Aguardando aprovação&quot; e só pode ser faturado (emitir NF-e)
                      após um gestor ou administrador liberar. Desligado, o pedido já nasce pronto para faturar.
                    </p>
                  </div>
                </label>
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
