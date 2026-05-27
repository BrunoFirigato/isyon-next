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

    // 1. Autenticar
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    // 2. Verificar se o usuário pertence ao tenant selecionado
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

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-xl mb-4">
            I
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Isyon CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Acesse sua conta</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Empresa
            </label>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              disabled={loadingTenants}
              required
            >
              <option value="">
                {loadingTenants ? 'Carregando...' : 'Selecione a empresa'}
              </option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || loadingTenants}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
