'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, X, Save, UserPlus,
  CheckCircle, XCircle, KeyRound, Copy, Check,
  Eye, EyeOff, Mail, Building2, Activity, Settings2,
} from 'lucide-react'

/* ─────────────────────────────── Types ── */

export interface TenantComContagem {
  id: string
  nome: string
  plano: string | null
  status: string | null
  criado_em: string
  expiracao_contrato: string | null
  total_usuarios: number
}

export interface LogAcesso {
  tenant_id: string
  nome_tenant: string
  status_tenant: string | null
  ultimo_acesso: string | null
  nome_usuario: string | null
}

export interface ConfigRow {
  chave: string
  valor: string
  atualizado_em: string | null
}

interface Props {
  tenants: TenantComContagem[]
  logsAcesso: LogAcesso[]
  configs: ConfigRow[]
}

type Aba = 'tenants' | 'integracoes' | 'logs'

type Modal =
  | { tipo: 'criar_tenant' }
  | { tipo: 'editar_tenant'; tenant: TenantComContagem }
  | { tipo: 'criar_usuario'; tenant_id: string; nome_tenant: string }
  | { tipo: 'reset_link'; link: string }

/* ─────────────────────────────── Helpers ── */

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function relativo(iso: string | null): { label: string; dot: string; txt: string } {
  if (!iso) return { label: 'Nunca acessou', dot: 'bg-gray-300', txt: 'text-gray-400' }
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d === 0) return { label: 'Hoje',            dot: 'bg-green-500', txt: 'text-green-600' }
  if (d === 1) return { label: 'Ontem',           dot: 'bg-green-400', txt: 'text-green-600' }
  if (d <= 7)  return { label: `${d} dias atrás`, dot: 'bg-green-400', txt: 'text-green-700' }
  if (d <= 30) return { label: `${d} dias atrás`, dot: 'bg-amber-400', txt: 'text-amber-600' }
  return             { label: `${d} dias atrás`, dot: 'bg-red-400',   txt: 'text-red-500'   }
}

function expInfo(data: string | null): { label: string; cls: string } | null {
  if (!data) return null
  const d = Math.ceil((new Date(data).getTime() - Date.now()) / 86_400_000)
  if (d < 0)   return { label: 'Expirado',        cls: 'text-red-600   bg-red-50   border border-red-200'   }
  if (d <= 30) return { label: `Expira em ${d}d`,  cls: 'text-amber-600 bg-amber-50 border border-amber-200' }
  return         { label: fmt(data),              cls: 'text-gray-500 bg-gray-100 border border-gray-200'   }
}

function corPlano(plano: string | null) {
  if (plano === 'Enterprise')   return 'bg-purple-100 text-purple-700'
  if (plano === 'Profissional') return 'bg-blue-100   text-blue-700'
  return 'bg-gray-100 text-gray-600'
}

/* ─────────────────────────────── Main ── */

export default function SuperadminView({ tenants, logsAcesso, configs }: Props) {
  const router  = useRouter()
  const [aba,     setAba]     = useState<Aba>('tenants')
  const [modal,   setModal]   = useState<Modal | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState('')
  const [copiado, setCopiado] = useState(false)

  async function api(body: Record<string, unknown>) {
    setErro('')
    setLoading(true)
    const res  = await fetch('/api/gerenciar-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setErro(data.error ?? 'Erro desconhecido'); return null }
    return data
  }

  async function toggleStatus(t: TenantComContagem) {
    const novoStatus = t.status === 'ativo' ? 'inativo' : 'ativo'
    const ok = await api({ action: 'toggle_status', id: t.id, status: novoStatus })
    if (ok) router.refresh()
  }

  async function handleResetSenha(email: string) {
    const data = await api({ action: 'reset_senha', email })
    if (data?.link)    setModal({ tipo: 'reset_link', link: data.link })
    else if (data?.ok) { alert('Link de reset enviado por e-mail.'); setModal(null) }
  }

  function copiarLink(link: string) {
    navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const ativos = tenants.filter(t => t.status === 'ativo').length

  const TABS = [
    { key: 'tenants'     as const, label: 'Tenants',        Icon: Building2 },
    { key: 'integracoes' as const, label: 'Integrações',    Icon: Settings2 },
    { key: 'logs'        as const, label: 'Logs de Acesso', Icon: Activity  },
  ]

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Painel do Fornecedor</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} · {ativos} ativo{ativos !== 1 ? 's' : ''}
          </p>
        </div>
        {aba === 'tenants' && (
          <button
            onClick={() => setModal({ tipo: 'criar_tenant' })}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> Novo tenant
          </button>
        )}
      </div>

      {/* Abas */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setAba(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              aba === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Aba: Tenants ── */}
      {aba === 'tenants' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Plano</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Usuários</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Contrato</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenants.map((t) => {
                const exp = expInfo(t.expiracao_contrato)
                return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{t.nome}</div>
                      <div className="text-xs text-gray-400 mt-0.5">desde {fmt(t.criado_em)}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${corPlano(t.plano)}`}>
                        {t.plano ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg ${
                        t.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {t.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{t.total_usuarios}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {exp
                        ? <span className={`text-xs font-medium px-2 py-1 rounded-lg ${exp.cls}`}>{exp.label}</span>
                        : <span className="text-xs text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal({ tipo: 'criar_usuario', tenant_id: t.id, nome_tenant: t.nome })}
                          title="Adicionar usuário"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                          <UserPlus size={14} />
                        </button>
                        <button onClick={() => setModal({ tipo: 'editar_tenant', tenant: t })}
                          title="Editar"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => toggleStatus(t)}
                          title={t.status === 'ativo' ? 'Desativar' : 'Ativar'}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          {t.status === 'ativo' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    Nenhum tenant cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Aba: Integrações ── */}
      {aba === 'integracoes' && <IntegracaoTab configs={configs} />}

      {/* ── Aba: Logs de Acesso ── */}
      {aba === 'logs' && <LogsTab logs={logsAcesso} />}

      {erro && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>
      )}

      {/* ── Modal: Criar tenant ── */}
      {modal?.tipo === 'criar_tenant' && (
        <ModalBase titulo="Novo tenant" onClose={() => setModal(null)}>
          <CriarTenantForm loading={loading} erro={erro}
            onSubmit={async (d) => {
              const ok = await api({ action: 'criar_tenant', ...d })
              if (ok) { setModal(null); router.refresh() }
            }}
            onClose={() => setModal(null)} />
        </ModalBase>
      )}

      {/* ── Modal: Editar tenant ── */}
      {modal?.tipo === 'editar_tenant' && (
        <ModalBase titulo="Editar tenant" onClose={() => setModal(null)}>
          <EditarTenantForm tenant={modal.tenant} loading={loading} erro={erro}
            onResetSenha={handleResetSenha}
            onSubmit={async (d) => {
              const ok = await api({ action: 'atualizar_tenant', id: modal.tenant.id, ...d })
              if (ok) { setModal(null); router.refresh() }
            }}
            onClose={() => setModal(null)} />
        </ModalBase>
      )}

      {/* ── Modal: Criar usuário ── */}
      {modal?.tipo === 'criar_usuario' && (
        <ModalBase titulo={`Novo usuário — ${modal.nome_tenant}`} onClose={() => setModal(null)}>
          <CriarUsuarioForm tenantId={modal.tenant_id} loading={loading} erro={erro}
            onSubmit={async (d) => {
              const ok = await api({ action: 'criar_usuario', tenant_id: modal.tenant_id, ...d })
              if (ok) { setModal(null); router.refresh() }
            }}
            onClose={() => setModal(null)} />
        </ModalBase>
      )}

      {/* ── Modal: Link de reset ── */}
      {modal?.tipo === 'reset_link' && (
        <ModalBase titulo="Link de reset de senha" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Copie e envie este link para o usuário. Ele expira em 1 hora.</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
              <p className="text-xs text-gray-500 truncate flex-1 font-mono">{modal.link}</p>
              <button onClick={() => copiarLink(modal.link)}
                className="shrink-0 p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors">
                {copiado ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>
            <button onClick={() => setModal(null)}
              className="w-full border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Fechar
            </button>
          </div>
        </ModalBase>
      )}
    </>
  )
}

/* ──────────────────────────── Aba Integrações ── */

function IntegracaoTab({ configs }: { configs: ConfigRow[] }) {
  const router     = useRouter()
  const map        = Object.fromEntries(configs.map(c => [c.chave, c.valor]))
  const keyMasked  = map['resend_api_key']    ?? ''
  const emailAtual = map['resend_from_email'] ?? ''
  const keyOk      = keyMasked.length > 0

  const [novaKey,   setNovaKey]   = useState('')
  const [fromEmail, setFromEmail] = useState(emailAtual)
  const [showKey,   setShowKey]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saveErro,  setSaveErro]  = useState('')
  const [saveOk,    setSaveOk]    = useState(false)

  async function salvar() {
    setSaving(true); setSaveErro(''); setSaveOk(false)
    try {
      if (novaKey.trim()) {
        const r = await fetch('/api/gerenciar-tenant', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_config', chave: 'resend_api_key', valor: novaKey.trim() }),
        })
        if (!r.ok) throw new Error((await r.json()).error ?? 'Erro ao salvar chave')
      }
      if (fromEmail.trim() !== emailAtual) {
        const r = await fetch('/api/gerenciar-tenant', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_config', chave: 'resend_from_email', valor: fromEmail.trim() }),
        })
        if (!r.ok) throw new Error((await r.json()).error ?? 'Erro ao salvar remetente')
      }
      setSaveOk(true); setNovaKey('')
      setTimeout(() => { setSaveOk(false); router.refresh() }, 1500)
    } catch (e: unknown) {
      setSaveErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  const semMudanca = !novaKey.trim() && fromEmail.trim() === emailAtual

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Card Resend */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Mail size={16} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">E-mail — Resend</h3>
              <p className="text-xs text-gray-500">Propostas e convites de novos usuários</p>
            </div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            keyOk ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {keyOk ? '● Configurado' : '○ Não configurado'}
          </span>
        </div>

        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              API Key
              {keyOk && (
                <span className="ml-2 font-normal text-gray-400">atual: {keyMasked}</span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={novaKey}
                onChange={e => setNovaKey(e.target.value)}
                placeholder={keyOk ? 'Digite para substituir a chave atual' : 're_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button type="button" onClick={() => setShowKey(s => !s)}
                className="px-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors">
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Remetente */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Remetente</label>
            <input
              type="text"
              value={fromEmail}
              onChange={e => setFromEmail(e.target.value)}
              placeholder="Isyon CRM <noreply@seudominio.com.br>"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Padrão: <span className="font-mono">Isyon CRM &lt;onboarding@resend.dev&gt;</span>
            </p>
          </div>

          {saveErro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{saveErro}</p>
          )}
          {saveOk && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <Check size={14} /> Configurações salvas com sucesso.
            </p>
          )}

          <button onClick={salvar} disabled={saving || semMudanca}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {saving ? 'Salvando...' : <><Save size={14} /> Salvar configurações</>}
          </button>
        </div>
      </div>

      {/* Placeholder futuras integrações */}
      <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center">
        <p className="text-sm text-gray-400">Mais integrações em breve — WhatsApp, NF-e, …</p>
      </div>
    </div>
  )
}

/* ────────────────────────────── Aba Logs ── */

function LogsTab({ logs }: { logs: LogAcesso[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Usuário</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Último Acesso</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {logs.map((l) => {
            const rel = relativo(l.ultimo_acesso)
            return (
              <tr key={l.tenant_id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{l.nome_tenant}</div>
                  <span className={`text-xs ${l.status_tenant === 'ativo' ? 'text-green-600' : 'text-gray-400'}`}>
                    {l.status_tenant ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                  {l.nome_usuario ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${rel.dot}`} />
                    <span className={`text-sm ${rel.txt}`}>{rel.label}</span>
                  </div>
                  {l.ultimo_acesso && (
                    <div className="text-xs text-gray-400 mt-0.5 ml-4">
                      {new Date(l.ultimo_acesso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
          {logs.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-400">
                Nenhum registro de acesso ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ──────────────────────────── Modal wrapper ── */

function ModalBase({ titulo, onClose, children }: {
  titulo: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[94vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

/* ──────────────────── Form: Criar tenant ── */

function CriarTenantForm({ loading, erro, onSubmit, onClose }: {
  loading: boolean; erro: string
  onSubmit: (d: Record<string, string>) => void; onClose: () => void
}) {
  const [nome,      setNome]      = useState('')
  const [plano,     setPlano]     = useState('Básico')
  const [expiracao, setExpiracao] = useState('')
  const [nomeAdmin, setNomeAdmin] = useState('')
  const [email,     setEmail]     = useState('')
  const [senha,     setSenha]     = useState('')

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ nome, plano, nomeAdmin, email, senha, expiracao_contrato: expiracao }) }}
      className="space-y-4">
      <Field label="Nome da empresa *"      value={nome}      onChange={setNome}      placeholder="Acme Ltda" />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Plano</label>
        <select value={plano} onChange={e => setPlano(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {['Básico', 'Profissional', 'Enterprise'].map(p => <option key={p}>{p}</option>)}
        </select>
      </div>
      <Field label="Expiração do contrato"  value={expiracao} onChange={setExpiracao} type="date" />
      <Field label="Nome do admin"           value={nomeAdmin} onChange={setNomeAdmin} placeholder="João Silva" />
      <Field label="E-mail do admin *"       value={email}     onChange={setEmail}     placeholder="admin@empresa.com" type="email" />
      <Field label="Senha temporária *"      value={senha}     onChange={setSenha}     placeholder="Mínimo 6 caracteres" type="password" />
      {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>}
      <FormFooter loading={loading} labelConfirm="Criar tenant" onClose={onClose} />
    </form>
  )
}

/* ──────────────────── Form: Editar tenant ── */

function EditarTenantForm({ tenant, loading, erro, onSubmit, onClose, onResetSenha }: {
  tenant: TenantComContagem; loading: boolean; erro: string
  onSubmit: (d: Record<string, string>) => void
  onResetSenha: (email: string) => void; onClose: () => void
}) {
  const [nome,       setNome]       = useState(tenant.nome)
  const [plano,      setPlano]      = useState(tenant.plano ?? 'Básico')
  const [expiracao,  setExpiracao]  = useState(tenant.expiracao_contrato ?? '')
  const [emailReset, setEmailReset] = useState('')

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ nome, plano, expiracao_contrato: expiracao }) }}
      className="space-y-4">
      <Field label="Nome da empresa *"     value={nome}      onChange={setNome} />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Plano</label>
        <select value={plano} onChange={e => setPlano(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {['Básico', 'Profissional', 'Enterprise'].map(p => <option key={p}>{p}</option>)}
        </select>
      </div>
      <Field label="Expiração do contrato" value={expiracao} onChange={setExpiracao} type="date" />

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Reset de senha</p>
        <div className="flex gap-2">
          <input type="email" value={emailReset} onChange={e => setEmailReset(e.target.value)}
            placeholder="E-mail do usuário"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="button" onClick={() => emailReset && onResetSenha(emailReset)}
            disabled={!emailReset || loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-40">
            <KeyRound size={13} /> Gerar link
          </button>
        </div>
      </div>

      {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>}
      <FormFooter loading={loading} labelConfirm="Salvar" onClose={onClose} />
    </form>
  )
}

/* ──────────────────── Form: Criar usuário ── */

function CriarUsuarioForm({ tenantId: _tid, loading, erro, onSubmit, onClose }: {
  tenantId: string; loading: boolean; erro: string
  onSubmit: (d: Record<string, string>) => void; onClose: () => void
}) {
  const [nome,   setNome]   = useState('')
  const [email,  setEmail]  = useState('')
  const [senha,  setSenha]  = useState('')
  const [perfil, setPerfil] = useState('vendedor')

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ nome, email, senha, perfil }) }}
      className="space-y-4">
      <Field label="Nome"               value={nome}  onChange={setNome}  placeholder="Maria Souza" />
      <Field label="E-mail *"           value={email} onChange={setEmail} placeholder="maria@empresa.com" type="email" />
      <Field label="Senha temporária *" value={senha} onChange={setSenha} placeholder="Mínimo 6 caracteres" type="password" />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Perfil</label>
        <select value={perfil} onChange={e => setPerfil(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {['admin', 'gestor', 'vendedor', 'financeiro'].map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>
      {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>}
      <FormFooter loading={loading} labelConfirm="Criar usuário" onClose={onClose} />
    </form>
  )
}

/* ─────────────────────────── UI helpers ── */

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}

function FormFooter({ loading, labelConfirm, onClose }: {
  loading: boolean; labelConfirm: string; onClose: () => void
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onClose}
        className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
        Cancelar
      </button>
      <button type="submit" disabled={loading}
        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5">
        {loading ? 'Aguarde...' : <><Save size={14} />{labelConfirm}</>}
      </button>
    </div>
  )
}
