'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    // Verifica se é realmente o superadmin antes de redirecionar
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email !== 'sa@isyon.com.br') {
      await supabase.auth.signOut()
      setError('Acesso restrito ao superadmin.')
      setLoading(false)
      return
    }

    router.push('/superadmin')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-600 text-white mb-4">
            <ShieldAlert size={22} />
          </div>
          <h1 className="text-2xl font-bold text-white">Área restrita</h1>
          <p className="text-sm text-gray-400 mt-1">Acesso exclusivo para superadmin</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sa@isyon.com.br"
              required
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center mt-6">
          <Link href="/login" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            ← Voltar ao login normal
          </Link>
        </p>
      </div>
    </div>
  )
}
