'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, X, Save, UserPlus,
  CheckCircle, XCircle, KeyRound, Copy, Check,
} from 'lucide-react'

export interface TenantComContagem {
  id: string
  nome: string
  plano: string | null
  status: string | null
  criado_em: string
  total_usuarios: number
}

interface Props {
  tenants: TenantComContagem[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type Modal =
  | { tipo: 'criar_tenant' }
  | { tipo: 'editar_tenant'; tenant: TenantComContagem }
  | { tipo: 'criar_usuario'; tenant_id: string; nome_tenant: string }
  | { tipo: 'reset_link'; link: string }

export default function SuperadminView({ tenants }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<Modal | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)

  async function api(body: Record<string, unknown>) {
    setErro('')
    setLoading(true)
    const res = await fetch('/api/gerenciar-tenant', {
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
    if (data?.link) {
      setModal({ tipo: 'reset_link', link: data.link })
    } else if (data?.ok) {
      alert('Link de reset enviado por e-mail.')
      setModal(null)
    }
  }

  function copiarLink(link: string) {
    navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Superadmin</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} cadastrados
          </p>
        </div>
        <button
          onClick={() => setModal({ tipo: 'criar_tenant' })}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Novo tenant
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Plano</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Usuários</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Criado em</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-4 py-3 font-medium text-gray-900">{t.nome}</td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{t.plano ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg ${
                    t.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {t.status ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{t.total_usuarios}</td>
                <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{formatDate(t.criado_em)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setModal({ tipo: 'criar_usuario', tenant_id: t.id, nome_tenant: t.nome })}
                      title="Adicionar usuário"
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <UserPlus size={14} />
                    </button>
                    <button
                      onClick={() => setModal({ tipo: 'editar_tenant', tenant: t })}
                      title="Editar"
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => toggleStatus(t)}
                      title={t.status === 'ativo' ? 'Desativar' : 'Ativar'}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {t.status === 'ativo' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {erro && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>
      )}

      {/* ── Modal criar tenant ── */}
      {modal?.tipo === 'criar_tenant' && (
        <ModalBase titulo="Novo tenant" onClose={() => setModal(null)}>
          <CriarTenantForm
            loading={loading}
            erro={erro}
            onSubmit={async (dados) => {
              const ok = await api({ action: 'criar_tenant', ...dados })
              if (ok) { setModal(null); router.refresh() }
            }}
            onClose={() => setModal(null)}
          />
        </ModalBase>
      )}

      {/* ── Modal editar tenant ── */}
      {modal?.tipo === 'editar_tenant' && (
        <ModalBase titulo="Editar tenant" onClose={() => setModal(null)}>
          <EditarTenantForm
            tenant={modal.tenant}
            loading={loading}
            erro={erro}
            onResetSenha={handleResetSenha}
            onSubmit={async (dados) => {
              const ok = await api({ action: 'atualizar_tenant', id: modal.tenant.id, ...dados })
              if (ok) { setModal(null); router.refresh() }
            }}
            onClose={() => setModal(null)}
          />
        </ModalBase>
      )}

      {/* ── Modal criar usuário ── */}
      {modal?.tipo === 'criar_usuario' && (
        <ModalBase titulo={`Novo usuário — ${modal.nome_tenant}`} onClose={() => setModal(null)}>
          <CriarUsuarioForm
            tenantId={modal.tenant_id}
            loading={loading}
            erro={erro}
            onSubmit={async (dados) => {
              const ok = await api({ action: 'criar_usuario', tenant_id: modal.tenant_id, ...dados })
              if (ok) { setModal(null); router.refresh() }
            }}
            onClose={() => setModal(null)}
          />
        </ModalBase>
      )}

      {/* ── Modal link de reset ── */}
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

/* ─── Componentes auxiliares ─── */

function ModalBase({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
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

function CriarTenantForm({ loading, erro, onSubmit, onClose }: {
  loading: boolean; erro: string
  onSubmit: (d: Record<string, string>) => void; onClose: () => void
}) {
  const [nome, setNome] = useState('')
  const [plano, setPlano] = useState('Básico')
  const [nomeAdmin, setNomeAdmin] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ nome, plano, nomeAdmin, email, senha }) }} className="space-y-4">
      <Field label="Nome da empresa *" value={nome} onChange={setNome} placeholder="Acme Ltda" />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Plano</label>
        <select value={plano} onChange={(e) => setPlano(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {['Básico', 'Profissional', 'Enterprise'].map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <Field label="Nome do admin" value={nomeAdmin} onChange={setNomeAdmin} placeholder="João Silva" />
      <Field label="E-mail do admin *" value={email} onChange={setEmail} placeholder="admin@empresa.com" type="email" />
      <Field label="Senha temporária *" value={senha} onChange={setSenha} placeholder="Mínimo 6 caracteres" type="password" />
      {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>}
      <FormFooter loading={loading} labelConfirm="Criar tenant" onClose={onClose} />
    </form>
  )
}

function EditarTenantForm({ tenant, loading, erro, onSubmit, onClose, onResetSenha }: {
  tenant: TenantComContagem; loading: boolean; erro: string
  onSubmit: (d: Record<string, string>) => void
  onResetSenha: (email: string) => void; onClose: () => void
}) {
  const [nome, setNome] = useState(tenant.nome)
  const [plano, setPlano] = useState(tenant.plano ?? 'Básico')
  const [emailReset, setEmailReset] = useState('')

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ nome, plano }) }} className="space-y-4">
      <Field label="Nome da empresa *" value={nome} onChange={setNome} />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Plano</label>
        <select value={plano} onChange={(e) => setPlano(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {['Básico', 'Profissional', 'Enterprise'].map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Reset de senha</p>
        <div className="flex gap-2">
          <input type="email" value={emailReset} onChange={(e) => setEmailReset(e.target.value)}
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

function CriarUsuarioForm({ tenantId: _tenantId, loading, erro, onSubmit, onClose }: {
  tenantId: string; loading: boolean; erro: string
  onSubmit: (d: Record<string, string>) => void; onClose: () => void
}) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [perfil, setPerfil] = useState('vendedor')

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ nome, email, senha, perfil }) }} className="space-y-4">
      <Field label="Nome" value={nome} onChange={setNome} placeholder="Maria Souza" />
      <Field label="E-mail *" value={email} onChange={setEmail} placeholder="maria@empresa.com" type="email" />
      <Field label="Senha temporária *" value={senha} onChange={setSenha} placeholder="Mínimo 6 caracteres" type="password" />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Perfil</label>
        <select value={perfil} onChange={(e) => setPerfil(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {['admin', 'gestor', 'vendedor', 'financeiro'].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>
      {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>}
      <FormFooter loading={loading} labelConfirm="Criar usuário" onClose={onClose} />
    </form>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}

function FormFooter({ loading, labelConfirm, onClose }: { loading: boolean; labelConfirm: string; onClose: () => void }) {
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
