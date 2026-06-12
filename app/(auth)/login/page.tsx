'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  // Recuperação de senha
  const [recuperando, setRecuperando] = useState(false)
  const [recEnviado, setRecEnviado] = useState(false)
  const [loadingRec, setLoadingRec] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    // O e-mail é único no sistema todo, então e-mail + senha já identificam o
    // usuário e, por consequência, o tenant dele. Não pedimos a empresa para não
    // expor a lista de clientes do Isyon na tela de login.
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    const { data: usuario, error: errUsuario } = await supabase
      .from('usuarios')
      .select('ativo')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (errUsuario || !usuario) {
      await supabase.auth.signOut()
      setError('Usuário não encontrado. Contate o administrador.')
      setLoading(false)
      return
    }
    if (!usuario.ativo) {
      await supabase.auth.signOut()
      setError('Usuário inativo. Contate o administrador.')
      setLoading(false)
      return
    }

    supabase
      .from('usuarios')
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq('email', email.trim().toLowerCase())
      .then(() => {})

    router.push('/dashboard')
    router.refresh()
  }

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault()
    setLoadingRec(true)
    setError('')
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    // Sempre mostra sucesso — não revela se o e-mail existe (boa prática de segurança)
    setLoadingRec(false)
    setRecEnviado(true)
  }

  function voltarParaLogin() {
    setRecuperando(false)
    setRecEnviado(false)
    setError('')
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400'
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="Isyon" className="inline-block w-14 h-14 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Isyon CRM</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {recuperando ? 'Recuperar senha' : 'Acesse sua conta'}
          </p>
        </div>

        {/* ── Recuperação de senha ── */}
        {recuperando ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {recEnviado ? (
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-2xl mx-auto mb-3">✉️</div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">Verifique seu e-mail</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                  Se houver uma conta com <strong className="text-gray-700 dark:text-gray-300">{email}</strong>, enviamos um link para você criar uma nova senha. Confira também a caixa de spam.
                </p>
                <button onClick={voltarParaLogin} className="mt-5 text-sm font-medium text-blue-600 hover:underline">
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecuperar} className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Informe seu e-mail e enviaremos um link para você criar uma nova senha.
                </p>
                <div>
                  <label className={labelCls}>E-mail</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required autoFocus className={inputCls} />
                </div>
                {error && (
                  <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2.5">{error}</div>
                )}
                <button type="submit" disabled={loadingRec} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                  {loadingRec ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
                <button type="button" onClick={voltarParaLogin} className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Voltar ao login
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ── Login ── */
          <form onSubmit={handleLogin} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div>
              <label className={labelCls}>E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required autoFocus className={inputCls} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
                <button type="button" onClick={() => { setRecuperando(true); setError('') }} className="text-xs font-medium text-blue-600 hover:underline">
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input type={mostrarSenha ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setMostrarSenha((v) => !v)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2.5">{error}</div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2">
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        )}

        {/* Rodapé de confiança */}
        <div className="mt-6 text-center space-y-2">
          <p className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <ShieldCheck size={13} className="text-emerald-500" />
            Conexão segura · seus dados protegidos
          </p>
          <div className="flex items-center justify-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <Link href="/politica-privacidade" className="hover:text-gray-600 dark:hover:text-gray-300">Política de Privacidade</Link>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <Link href="/termos-de-uso" className="hover:text-gray-600 dark:hover:text-gray-300">Termos de Uso</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
