'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Eye, EyeOff, User, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './Toast'

interface Props {
  userEmail: string
  userName: string
  onClose: () => void
}

type Tab = 'perfil' | 'senha'

export default function PerfilModal({ userEmail, userName: initialName, onClose }: Props) {
  const toast  = useToast()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('perfil')

  // Perfil
  const [nome,         setNome]         = useState(initialName)
  const [savingPerfil, setSavingPerfil] = useState(false)

  // Senha
  const [senhaAtual,    setSenhaAtual]    = useState('')
  const [novaSenha,     setNovaSenha]     = useState('')
  const [confirmar,     setConfirmar]     = useState('')
  const [showAtual,     setShowAtual]     = useState(false)
  const [showNova,      setShowNova]      = useState(false)
  const [savingSenha,   setSavingSenha]   = useState(false)
  const [errorSenha,    setErrorSenha]    = useState('')

  async function salvarPerfil() {
    if (!nome.trim()) return
    setSavingPerfil(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      data: { name: nome.trim() },
    })
    setSavingPerfil(false)
    if (error) { toast(error.message, 'error'); return }
    toast('Nome atualizado!')
    router.refresh()
    onClose()
  }

  async function salvarSenha() {
    setErrorSenha('')
    if (!novaSenha) { setErrorSenha('Digite a nova senha'); return }
    if (novaSenha.length < 6) { setErrorSenha('A senha deve ter pelo menos 6 caracteres'); return }
    if (novaSenha !== confirmar) { setErrorSenha('As senhas não coincidem'); return }

    setSavingSenha(true)
    const supabase = createClient()

    // Re-authenticate first
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: senhaAtual,
    })
    if (signInErr) {
      setErrorSenha('Senha atual incorreta')
      setSavingSenha(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSavingSenha(false)
    if (error) { setErrorSenha(error.message); return }
    toast('Senha alterada com sucesso!')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Meu perfil</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {(['perfil', 'senha'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t === 'perfil' ? <User size={14} /> : <Lock size={14} />}
              {t === 'perfil' ? 'Dados' : 'Senha'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'perfil' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">E-mail</label>
                <input
                  type="text" value={userEmail} disabled
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">O e-mail não pode ser alterado.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nome de exibição</label>
                <input
                  type="text" value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={salvarPerfil}
                disabled={savingPerfil || !nome.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {savingPerfil ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          )}

          {tab === 'senha' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Senha atual</label>
                <div className="relative">
                  <input
                    type={showAtual ? 'text' : 'password'}
                    value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-9 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button" onClick={() => setShowAtual(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  >
                    {showAtual ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nova senha</label>
                <div className="relative">
                  <input
                    type={showNova ? 'text' : 'password'}
                    value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-9 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button" onClick={() => setShowNova(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  >
                    {showNova ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmar} onChange={e => setConfirmar(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {errorSenha && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {errorSenha}
                </p>
              )}
              <button
                onClick={salvarSenha}
                disabled={savingSenha}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {savingSenha ? 'Alterando...' : 'Alterar senha'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
