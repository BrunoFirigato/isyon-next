'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Tenant {
  id: string
  nome: string
}

export default function LoginPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantId, setTenantId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [error, setError] = useState('')
  // Recuperação de senha
  const [recuperando, setRecuperando] = useState(false)
  const [recEnviado, setRecEnviado] = useState(false)
  const [loadingRec, setLoadingRec] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tenants')
      .select('id, nome')
      .eq('status', 'ativo')
      .order('nome')
      .then(({ data }) => {
        if (data) setTenants(data)
        setLoadingTenants(false)
      })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!tenantId) {
      setError('Selecione a empresa antes de continuar.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    const { data: usuario, error: errUsuario } = await supabase
      .from('usuarios')
      .select('tenant_id, ativo')
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
    if (usuario.tenant_id !== tenantId) {
      await supabase.auth.signOut()
      setError('Este usuário não pertence à empresa selecionada.')
      setLoading(false)
      return
    }

    supabase
      .from('usuarios')
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq('email', email.trim().toLowerCase())
      .eq('tenant_id', tenantId)
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-xl mb-4">I</div>
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
              <label className={labelCls}>Empresa</label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-gray-100"
                disabled={loadingTenants}
                required
              >
                <option value="">{loadingTenants ? 'Carregando...' : 'Selecione a empresa'}</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>

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
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className={inputCls} />
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2.5">{error}</div>
            )}

            <button type="submit" disabled={loading || loadingTenants} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2">
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
