'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Save, UserCheck, UserX } from 'lucide-react'
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
  { value: 'admin', label: 'Admin' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'financeiro', label: 'Financeiro' },
]

function perfilStyle(perfil: string | null) {
  switch (perfil) {
    case 'admin':      return 'bg-purple-100 text-purple-700'
    case 'gestor':     return 'bg-blue-100 text-blue-700'
    case 'vendedor':   return 'bg-green-100 text-green-700'
    case 'financeiro': return 'bg-amber-100 text-amber-700'
    default:           return 'bg-gray-100 text-gray-600'
  }
}

function perfilLabel(perfil: string | null) {
  return PERFIS.find((p) => p.value === perfil)?.label ?? (perfil ?? 'Sem perfil')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface EditState {
  id: string
  perfil: string
  ativo: boolean
}

interface Props {
  usuarios: Usuario[]
}

export default function UsuariosView({ usuarios }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  function startEdit(u: Usuario) {
    setEditing({ id: u.id, perfil: u.perfil ?? '', ativo: u.ativo ?? true })
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('usuarios')
      .update({ perfil: editing.perfil || null, ativo: editing.ativo })
      .eq('id', editing.id)
    setSaving(false)
    setEditing(null)
    toast('Usuário atualizado!')
    router.refresh()
  }

  async function toggleAtivo(u: Usuario) {
    const supabase = createClient()
    await supabase.from('usuarios').update({ ativo: !u.ativo }).eq('id', u.id)
    toast(u.ativo ? 'Usuário desativado' : 'Usuário ativado', 'info')
    router.refresh()
  }

  return (
    <>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrados
          </p>
        </div>
      </div>

      {/* Tabela — desktop */}
      {usuarios.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">E-mail</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Perfil</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cadastro</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.nome}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    {editing?.id === u.id ? (
                      <select
                        value={editing.perfil}
                        onChange={(e) => setEditing({ ...editing, perfil: e.target.value })}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Sem perfil</option>
                        {PERFIS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg ${perfilStyle(u.perfil)}`}>
                        {perfilLabel(u.perfil)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing?.id === u.id ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox" checked={editing.ativo}
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
                  <td className="px-4 py-3">
                    {editing?.id === u.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={handleSave} disabled={saving}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50">
                          <Save size={14} />
                        </button>
                        <button onClick={() => setEditing(null)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => toggleAtivo(u)} title={u.ativo !== false ? 'Desativar' : 'Ativar'}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          {u.ativo !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        <button onClick={() => startEdit(u)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards — mobile */}
      {usuarios.length > 0 && (
        <div className="md:hidden space-y-3">
          {usuarios.map((u) => (
            <div key={u.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-gray-900">{u.nome}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-lg ${perfilStyle(u.perfil)}`}>
                  {perfilLabel(u.perfil)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                  u.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {u.ativo !== false ? 'Ativo' : 'Inativo'}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => toggleAtivo(u)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                    {u.ativo !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                  </button>
                  <button onClick={() => startEdit(u)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {usuarios.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-gray-400 text-sm">Nenhum usuário encontrado.</p>
        </div>
      )}
    </>
  )
}
