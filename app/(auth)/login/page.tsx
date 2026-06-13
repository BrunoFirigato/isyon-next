'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ShieldCheck, CheckCircle2, Route, FileCheck2, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [confirmado, setConfirmado] = useState(false) // voltou do link de confirmação
  // Recuperação de senha
  const [recuperando, setRecuperando] = useState(false)
  const [recEnviado, setRecEnviado] = useState(false)
  const [loadingRec, setLoadingRec] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('confirmado') === '1') setConfirmado(true)
  }, [])

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
    <div className="min-h-screen flex">
      {/* Painel de marca — some no mobile, aparece a partir de lg */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-white/5 blur-3xl" />

        {/* Topo: logo */}
        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="bg-white rounded-xl p-1.5 shadow-lg"><img src="/logo-mark.svg" alt="Isyon" className="w-8 h-8" /></div>
          <span className="text-xl font-bold tracking-tight">Isyon CRM</span>
        </div>

        {/* Centro: proposta de valor */}
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight mb-3">Do primeiro contato<br />ao pedido fechado.</h2>
          <p className="text-blue-100 text-sm mb-10 max-w-sm">Toda a sua operação comercial em um só lugar — do lead que chega à venda concluída.</p>
          <ul className="space-y-5">
            <Destaque Icon={Route}        titulo="Funil completo"       texto="Leads, oportunidades, propostas e pedidos conectados." />
            <Destaque Icon={WhatsAppIcon} titulo="WhatsApp integrado"   texto="Converse com o cliente sem sair do CRM." chipClassName="bg-white" />
            <Destaque Icon={FileCheck2}   titulo="Aceite digital"       texto="O cliente aprova a proposta pelo link." />
            <Destaque Icon={Target}       titulo="Gestão por vendedor"  texto="Metas, carteira e desempenho por vendedor." />
          </ul>
        </div>

        {/* Rodapé */}
        <div className="relative text-xs text-blue-100/70">© {new Date().getFullYear()} Isyon CRM</div>
      </div>

      {/* Painel do formulário */}
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="Isyon" className="lg:hidden inline-block w-14 h-14 mb-4" />
          <h1 className="lg:hidden text-2xl font-bold text-gray-900 dark:text-gray-100">Isyon CRM</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 lg:mt-0 lg:text-base lg:font-medium lg:text-gray-700 lg:dark:text-gray-300">
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
            {confirmado && (
              <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg px-3 py-2.5">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>E-mail confirmado! Faça login para acessar sua conta.</span>
              </div>
            )}
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
    </div>
  )
}

function Destaque({ Icon, titulo, texto, chipClassName = 'bg-white/15' }: { Icon: React.ElementType; titulo: string; texto: string; chipClassName?: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className={`${chipClassName} rounded-lg p-2 shrink-0`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="font-semibold text-sm">{titulo}</p>
        <p className="text-blue-100/80 text-xs leading-relaxed">{texto}</p>
      </div>
    </li>
  )
}

/** Logo oficial do WhatsApp (verde de marca) — passa mais credibilidade. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#25D366" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
