'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Building2, Tag, Plus, Trash2, GripVertical, Pencil, Check, X, Mail, MessageCircle, BarChart2, Loader2, CheckCircle2, AlertCircle, Users, Smartphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import { type Segmento } from '@/app/(crm)/_components/SegmentosContext'

interface Tenant {
  id: string
  nome: string
  plano: string | null
  status: string | null
  criado_em: string
  expiracao_contrato: string | null
  wa_limite: number | null
  limite_usuarios: number | null
  divisao_carteira: boolean | null
  aprovacao_pedido: boolean | null
  usa_parceiros: boolean | null
  tabela_preco_padrao: string | null
  proposta_aceite_gera_pedido: boolean | null
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
  usuariosUsados: number
  whatsappUsados: number
  tabelas: { id: string; nome: string }[]
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function diasRestantes(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}
function UsoBar({ label, usado, limite, icon }: { label: string; usado: number; limite: number; icon: React.ReactNode }) {
  const pct = limite > 0 ? Math.min(100, Math.round((usado / limite) * 100)) : 0
  const restam = Math.max(0, limite - usado)
  // Cor por nível de uso: tranquilo → atenção → cheio
  const nivel = pct >= 100 ? 'cheio' : pct >= 80 ? 'alerta' : 'ok'
  const cores = {
    ok:     { bar: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300', txt: 'text-gray-900 dark:text-gray-100' },
    alerta: { bar: 'bg-amber-500',   icon: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',         txt: 'text-amber-700 dark:text-amber-300' },
    cheio:  { bar: 'bg-red-500',     icon: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',                 txt: 'text-red-700 dark:text-red-300' },
  }[nivel]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cores.icon}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-lg font-bold leading-tight">
            <span className={cores.txt}>{usado}</span>
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> / {limite > 0 ? limite : '∞'}</span>
          </p>
        </div>
        {limite > 0 && (
          <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
            {pct >= 100 ? 'limite atingido' : `${restam} ${restam === 1 ? 'livre' : 'livres'}`}
          </span>
        )}
      </div>
      {limite > 0 && (
        <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${cores.bar}`} style={{ width: `${Math.max(pct, 3)}%` }} />
        </div>
      )}
    </div>
  )
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

export default function ConfiguracoesView({ tenant, configs, usuarioId, segmentosIniciais, usuariosUsados, whatsappUsados, tabelas }: Props) {
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
  // Recurso opcional — parceiros comerciais (revenda)
  const [usaParceiros, setUsaParceiros] = useState(tenant.usa_parceiros ?? false)
  // Tabela de preço padrão (carrega nos modais de pedido/proposta)
  const [tabelaPadrao, setTabelaPadrao] = useState(tenant.tabela_preco_padrao ?? '')
  const [propostaAceiteGeraPedido, setPropostaAceiteGeraPedido] = useState(tenant.proposta_aceite_gera_pedido ?? false)

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
      usa_parceiros: usaParceiros,
      tabela_preco_padrao: tabelaPadrao || null,
      proposta_aceite_gera_pedido: propostaAceiteGeraPedido,
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
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Nome da sua empresa — usado nos e-mails enviados aos clientes</p>
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
                    placeholder="Nome da sua empresa"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                  <p className="flex items-start gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                    <Mail size={13} className="shrink-0 mt-0.5" />
                    <span>É o nome da empresa que seus clientes veem como remetente nos e-mails e campanhas enviados pelo Isyon. Identifica também a sua conta no sistema.</span>
                  </p>
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
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cliente desde</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{fmtData(tenant.criado_em)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Contrato</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {tenant.expiracao_contrato ? fmtData(tenant.expiracao_contrato) : '—'}
                      {tenant.expiracao_contrato && (() => {
                        const d = diasRestantes(tenant.expiracao_contrato)!
                        return (
                          <span className={`ml-1 text-xs ${d < 0 ? 'text-red-500' : d <= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            ({d < 0 ? 'vencido' : `${d} dias`})
                          </span>
                        )
                      })()}
                    </p>
                  </div>
                </div>

                {/* Uso do plano */}
                <div className="pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">Uso do plano</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <UsoBar label="Usuários" usado={usuariosUsados} limite={tenant.limite_usuarios ?? 0} icon={<Users size={18} />} />
                    <UsoBar label="Números de WhatsApp" usado={whatsappUsados} limite={tenant.wa_limite ?? 0} icon={<Smartphone size={18} />} />
                  </div>
                </div>

                <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
                  Precisa de mais usuários ou números de WhatsApp? <strong>Fale com o suporte</strong> para aumentar o seu plano. Os dados da sua empresa (CNPJ, endereço) ficam em <strong>Administração → Empresas</strong>.
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

              {/* Tabela de preço padrão (tenant) */}
              {tabelas.length > 0 && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Tabela de preço padrão</label>
                  <select value={tabelaPadrao} onChange={(e) => setTabelaPadrao(e.target.value)}
                    className="w-full sm:max-w-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100">
                    <option value="">Nenhuma (usa o custo)</option>
                    {tabelas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                    Já vem selecionada ao criar pedidos e propostas — evita fechar venda no custo por engano.
                  </p>
                </div>
              )}

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
                      Quando ativado, todo pedido nasce &quot;Aguardando aprovação&quot; e só pode ser faturado (enviado ao ERP)
                      após um gestor ou administrador liberar. Desligado, o pedido já nasce pronto para faturar.
                    </p>
                  </div>
                </label>
              </div>

              {/* Parceiros comerciais (tenant) */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <label className="flex items-start gap-3 cursor-pointer">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={usaParceiros}
                    onClick={() => setUsaParceiros(v => !v)}
                    className={`mt-0.5 relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      usaParceiros ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      usaParceiros ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Usar parceiros comerciais (revenda)</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Para quem vende por meio de parceiros/revendedores. Quando ativado, aparece o menu
                      &quot;Parc. Comerciais&quot; e a opção de vincular o cliente a um parceiro no cadastro.
                      Desligado (padrão), o cadastro de cliente fica mais simples (venda direta).
                    </p>
                  </div>
                </label>
              </div>

              {/* Aceite da proposta gera pedido automaticamente */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <label className="flex items-start gap-3 cursor-pointer">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={propostaAceiteGeraPedido}
                    onClick={() => setPropostaAceiteGeraPedido(v => !v)}
                    className={`mt-0.5 relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      propostaAceiteGeraPedido ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      propostaAceiteGeraPedido ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Aceite da proposta gera o pedido automaticamente</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Quando o cliente <strong>aceita</strong> a proposta pelo link público, o pedido é criado na hora
                      (e a oportunidade fecha como ganha). Desligado (padrão), o aceite apenas marca a proposta como
                      &quot;Aceita&quot; e o vendedor gera o pedido manualmente, conferindo frete e condição antes.
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
