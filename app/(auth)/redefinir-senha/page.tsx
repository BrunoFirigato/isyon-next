'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [pronto, setPronto] = useState(false)        // sessão de recuperação detectada
  const [linkInvalido, setLinkInvalido] = useState(false)
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelado = false
    // O link cria uma sessão de recuperação (hash) ou traz ?code= (PKCE)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setPronto(true)
    })

    async function init() {
      // 1) Já tem sessão? (auto-detect já resolveu)
      const { data: s1 } = await supabase.auth.getSession()
      if (s1.session) { setPronto(true); return }
      // 2) Espera o auto-detect do cliente e checa de novo
      await new Promise((r) => setTimeout(r, 1500))
      if (cancelado) return
      const { data: s2 } = await supabase.auth.getSession()
      if (s2.session) { setPronto(true); return }
      // 3) PKCE: troca o ?code= manualmente
      const code = new URL(window.location.href).searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!cancelado && !error) { setPronto(true); return }
      }
      // 4) Sem sessão e sem code válido → link inválido/expirado
      if (!cancelado) setLinkInvalido(true)
    }
    init()

    return () => { cancelado = true; sub.subscription.unsubscribe() }
  }, [])

  async function handle(e: React.FormEvent) {
    e.preventDefault()
    if (senha.length < 8) { setErro('A senha deve ter ao menos 8 caracteres.'); return }
    if (senha !== confirma) { setErro('As senhas não coincidem.'); return }
    setLoading(true); setErro('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) {
      setLoading(false)
      setErro('Não foi possível redefinir. O link pode ter expirado — solicite um novo.')
      return
    }
    await supabase.auth.signOut() // login limpo com a nova senha
    setOk(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400'
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Isyon" className="inline-block w-14 h-14 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nova senha</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Crie uma nova senha de acesso</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {ok ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-2xl mx-auto mb-3">✅</div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Senha redefinida!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Redirecionando para o login...</p>
            </div>
          ) : linkInvalido && !pronto ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-2xl mx-auto mb-3">⚠️</div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Link inválido ou expirado</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Por segurança, o link de redefinição vale por tempo limitado. Solicite um novo na tela de login.</p>
              <button onClick={() => router.push('/login')} className="mt-5 text-sm font-medium text-blue-600 hover:underline">Voltar ao login</button>
            </div>
          ) : !pronto ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Validando link...</p>
          ) : (
            <form onSubmit={handle} className="space-y-4">
              <div>
                <label className={labelCls}>Nova senha</label>
                <div className="relative">
                  <input type={mostrarSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 8 caracteres" required autoFocus className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setMostrarSenha((v) => !v)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Confirmar nova senha</label>
                <div className="relative">
                  <input type={mostrarSenha ? 'text' : 'password'} value={confirma} onChange={(e) => setConfirma(e.target.value)} placeholder="Repita a senha" required className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setMostrarSenha((v) => !v)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {erro && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2.5">{erro}</div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
