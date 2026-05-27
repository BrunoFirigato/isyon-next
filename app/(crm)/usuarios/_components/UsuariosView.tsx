'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, X, Save, UserCheck, UserX,
  Trash2, KeyRound, Copy, Check, Search,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: string | null
  ativo: boolean | null
  criado_em: string
}

const PERFIS = [
  { value: 'admin',      label: 'Admin',      style: 'bg-purple-100 text-purple-700' },
  { value: 'gestor',     label: 'Gestor',     style: 'bg-blue-100 text-blue-700' },
  { value: 'vendedor',   label: 'Vendedor',   style: 'bg-green-100 text-green-700' },
  { value: 'financeiro', label: 'Financeiro', style: 'bg-amber-100 text-amber-700' },
]

function perfilInfo(perfil: string | null) {
  return PERFIS.find((p) => p.value === perfil) ?? { label: perfil ?? 'Sem perfil', style: 'bg-gray-100 text-gray-600' }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface EditState { id: string; perfil: string; ativo: boolean }

interface Props { usuarios: Usuario[] }

export default function UsuariosView({ usuarios }: Props) {
  const router = useRouter()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resetLink, setResetLink] = useState<{ nome: string; link: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const filtered = usuarios.filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  // ─── Editar perfil/status inline ──────────────────────────────────────────
  function startEdit(u: Usuario) {
    setEditing({ id: u.id, perfil: u.perfil ?? '', ativo: u.ativo ?? true })
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('usuarios')
      .update({ perfil: editing.perfil || null, ativo: editing.ativo })
      .eq('id', editing.id)
    setSaving(false)
    setEditing(null)
    if (error) { toast('Erro ao salvar', 'error'); return }
    toast('Usuário atualizado!')
    router.refresh()
  }

  // ─── Toggle ativo ─────────────────────────────────────────────────────────
  async function toggleAtivo(u: Usuario) {
    const supabase = createClient()
    await supabase.from('usuarios').update({ ativo: !u.ativo }).eq('id', u.id)
    toast(u.ativo ? 'Usuário desativado' : 'Usuário ativado', 'info')
    router.refresh()
  }

  // ─── Excluir ──────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deletingId) return
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'excluir', usuario_id: deletingId }),
    })
    const data = await res.json()
    setDeletingId(null)
    if (!res.ok) { toast(data.error ?? 'Erro ao excluir', 'error'); return }
    toast('Usuário excluído', 'info')
    router.refresh()
  }

  // ─── Reset de senha ───────────────────────────────────────────────────────
  async function handleReset(u: Usuario) {
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_senha', email: u.email, usuario_id: u.id }),
    })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Erro ao gerar link', 'error'); return }
    if (data.link) {
      setResetLink({ nome: u.nome, link: data.link })
    } else {
      toast('Link de reset enviado para o e-mail', 'info')
    }
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} de {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo usuário</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Busca */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ─── Tabela desktop ────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Nome', 'E-mail', 'Perfil', 'Status', 'Cadastro', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((u) => {
                const info = perfilInfo(u.perfil)
                const isEditing = editing?.id === u.id
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.nome}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>

                    {/* Perfil */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editing.perfil}
                          onChange={(e) => setEditing({ ...editing, perfil: e.target.value })}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Sem perfil</option>
                          {PERFIS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg ${info.style}`}>
                          {info.label}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editing.ativo}
                            onChange={(e) => setEditing({ ...editing, ativo: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-xs text-gray-600">Ativo</span>
                        </label>
                      ) : (
                        <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg ${
                          u.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {u.ativo !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(u.criado_em)}</td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={handleSave} disabled={saving}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 disabled:opacity-50 transition-colors"
                            title="Salvar">
                            <Save size={14} />
                          </button>
                          <button onClick={() => setEditing(null)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                            title="Cancelar">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleReset(u)} title="Gerar link de reset de senha"
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors">
                            <KeyRound size={14} />
                          </button>
                          <button onClick={() => toggleAtivo(u)} title={u.ativo !== false ? 'Desativar' : 'Ativar'}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            {u.ativo !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                          <button onClick={() => startEdit(u)} title="Editar perfil"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeletingId(u.id)} title="Excluir usuário"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Cards mobile ──────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="md:hidden space-y-3">
          {filtered.map((u) => {
            const info = perfilInfo(u.perfil)
            const isEditing = editing?.id === u.id
            return (
              <div key={u.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{u.nome}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-lg ${info.style}`}>
                    {info.label}
                  </span>
                </div>

                {isEditing ? (
                  <div className="space-y-3 mt-3 pt-3 border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Perfil</label>
                      <select
                        value={editing.perfil}
                        onChange={(e) => setEditing({ ...editing, perfil: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Sem perfil</option>
                        {PERFIS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editing.ativo}
                        onChange={(e) => setEditing({ ...editing, ativo: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-600">Ativo</span>
                    </label>
                    <div className="flex gap-2">
                      <button onClick={handleSave} disabled={saving}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg">
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                      u.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {u.ativo !== false ? 'Ativo' : 'Inativo'}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => handleReset(u)} className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600">
                        <KeyRound size={14} />
                      </button>
                      <button onClick={() => toggleAtivo(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        {u.ativo !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button onClick={() => startEdit(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeletingId(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-gray-400 text-sm">
            {search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
          </p>
        </div>
      )}

      {/* ─── Modal: Confirmar exclusão ──────────────────────────────────────── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Excluir usuário?</h3>
            <p className="text-sm text-gray-500 mb-5">
              O usuário perderá acesso ao sistema imediatamente. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Link de reset de senha ──────────────────────────────────── */}
      {resetLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setResetLink(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Link de reset — {resetLink.nome}</h3>
              <button onClick={() => setResetLink(null)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Envie este link ao usuário. Ele expira em 24h.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={resetLink.link}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 truncate focus:outline-none"
              />
              <button
                onClick={() => copyLink(resetLink.link)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Convidar novo usuário ───────────────────────────────────── */}
      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onSuccess={() => { setInviteOpen(false); router.refresh() }}
        />
      )}
    </>
  )
}

// ─── InviteModal ──────────────────────────────────────────────────────────────
function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ nome: '', email: '', perfil: 'vendedor', senha: '', confirmar: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim()) { setError('E-mail é obrigatório'); return }
    if (!form.senha) { setError('Senha é obrigatória'); return }
    if (form.senha.length < 6) { setError('Senha deve ter no mínimo 6 caracteres'); return }
    if (form.senha !== form.confirmar) { setError('As senhas não coincidem'); return }

    setSaving(true)
    setError('')

    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'convidar',
        nome: form.nome,
        email: form.email,
        perfil: form.perfil,
        senha: form.senha,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error ?? 'Erro ao criar usuário'); return }

    toast('Usuário criado com sucesso!')
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-xl flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Novo usuário</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
            <input
              type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)}
              placeholder="Nome completo" autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              E-mail <span className="text-red-500">*</span>
            </label>
            <input
              type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              placeholder="usuario@empresa.com" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Perfil</label>
            <select
              value={form.perfil} onChange={(e) => set('perfil', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {PERFIS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Senha <span className="text-red-500">*</span>
              </label>
              <input
                type="password" value={form.senha} onChange={(e) => set('senha', e.target.value)}
                placeholder="Mín. 6 caracteres" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar</label>
              <input
                type="password" value={form.confirmar} onChange={(e) => set('confirmar', e.target.value)}
                placeholder="Repetir senha"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}
        </form>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm">
            {saving ? 'Criando...' : 'Criar usuário'}
          </button>
        </div>
      </div>
    </div>
  )
}
