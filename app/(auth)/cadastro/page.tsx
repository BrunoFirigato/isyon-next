'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CadastroPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    nomeEmpresa: '',
    nome: '',
    email: '',
    senha: '',
    confirmar: '',
    website: '', // honeypot — fica invisível; só bots preenchem
  })
  const [mostrarSenha,     setMostrarSenha]     = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const [aceite,   setAceite]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [sucesso,  setSucesso]  = useState(false)

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.senha)) {
      setError('A senha deve ter ao menos 8 caracteres, incluindo letra e número.')
      return
    }
    if (form.senha !== form.confirmar) { setError('As senhas não coincidem'); return }
    if (!aceite) { setError('É preciso aceitar a Política de Privacidade e os Termos de Uso.'); return }

    setLoading(true)
    setError('')

    // 1. Criar tenant + usuário via API
    const res = await fetch('/api/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nomeEmpresa: form.nomeEmpresa,
        nome:        form.nome,
        email:       form.email,
        senha:       form.senha,
        website:     form.website, // honeypot
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Erro ao criar conta')
      setLoading(false)
      return
    }

    // 2. Login automático
    const supabase = createClient()
    const { error: errLogin } = await supabase.auth.signInWithPassword({
      email:    form.email.trim().toLowerCase(),
      password: form.senha,
    })

    if (errLogin) {
      // Conta criada mas login falhou — redireciona pro login normal
      setSucesso(true)
      setLoading(false)
      return
    }

    // 3. Redireciona para o CRM
    router.push('/dashboard')
    router.refresh()
  }

  const inputCls = `
    w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400
  `

  // ── Tela de sucesso (fallback se auto-login falhar) ──────────────────────
  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Conta criada!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Sua empresa foi cadastrada com sucesso. Faça login para acessar o CRM.
          </p>
          <Link
            href="/login"
            className="w-full inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="Isyon" className="inline-block w-14 h-14 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Isyon CRM</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Crie sua conta gratuitamente</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4"
        >
          {/* Honeypot anti-bot — invisível para humanos, ignorado por leitores de tela */}
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={e => set('website', e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />

          {/* Nome da empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nome da empresa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nomeEmpresa}
              onChange={e => set('nomeEmpresa', e.target.value)}
              placeholder="Minha Empresa Ltda"
              required
              autoFocus
              className={inputCls}
            />
          </div>

          {/* Seu nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Seu nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              placeholder="Nome completo"
              required
              className={inputCls}
            />
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              E-mail <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="voce@empresa.com"
              required
              className={inputCls}
            />
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Senha <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={form.senha}
                onChange={e => set('senha', e.target.value)}
                placeholder="Mín. 8 caracteres, com letra e número"
                required
                className={inputCls + ' pr-10'}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirmar senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Confirmar senha <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={mostrarConfirmar ? 'text' : 'password'}
                value={form.confirmar}
                onChange={e => set('confirmar', e.target.value)}
                placeholder="Repetir senha"
                required
                className={inputCls + ' pr-10'}
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmar(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {mostrarConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Aceite LGPD */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={aceite}
              onChange={e => { setAceite(e.target.checked); setError('') }}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 shrink-0"
            />
            <span className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Li e concordo com a{' '}
              <Link href="/politica-privacidade" target="_blank" className="text-blue-600 hover:text-blue-700 font-medium">Política de Privacidade</Link>
              {' '}e os{' '}
              <Link href="/termos-de-uso" target="_blank" className="text-blue-600 hover:text-blue-700 font-medium">Termos de Uso</Link>.
            </span>
          </label>

          {/* Erro */}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !aceite}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2"
          >
            {loading ? 'Criando conta...' : 'Criar conta grátis'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
          Já tem conta?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Entrar
          </Link>
        </p>

      </div>
    </div>
  )
}
