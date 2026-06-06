'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Save, Wifi, Loader2, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Eye, EyeOff, Info, Smartphone, ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'

const DEFAULT_WA_TEMPLATE    = 'Olá {nome}, tudo bem? Gostaria de entrar em contato para conhecer melhor suas necessidades.'
const DEFAULT_EMAIL_ASSUNTO  = 'Olá {nome}, seguem informações conforme nosso contato.'
const DEFAULT_EMAIL_CORPO    = 'Olá {nome},\n\nFico à disposição para qualquer dúvida.\n\nAtenciosamente.'

interface Props {
  tenantId: string
  evolution:        { url: string | null; key: string | null; instance: string | null }
  waTemplate:       string | null
  emailAssunto:     string | null
  emailCorpo:       string | null
  emailConfigurado: boolean
  resendApiKey:     string | null
  resendFromEmail:  string | null
  tokenBrasilNFe:   string | null
  tokenFocusNFe:    string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Badge({ status }: { status: 'connected' | 'disconnected' | 'soon' }) {
  if (status === 'connected')
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Conectado</span>
  if (status === 'disconnected')
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Não configurado</span>
  return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Em breve</span>
}

function Card({ children, expanded }: { children: React.ReactNode; expanded?: boolean }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden transition-all ${
      expanded
        ? 'border-blue-200 dark:border-blue-800 ring-1 ring-blue-200 dark:ring-blue-800'
        : 'border-gray-100 dark:border-gray-700'
    }`}>
      {children}
    </div>
  )
}

function VarsHint() {
  return (
    <div className="flex items-start gap-1.5 text-xs text-gray-400 dark:text-gray-500">
      <Info size={13} className="mt-0.5 shrink-0" />
      <span>
        Use{' '}
        <code className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1 rounded">{'{nome}'}</code>{' '}
        e{' '}
        <code className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1 rounded">{'{empresa}'}</code>{' '}
        como variáveis — substituídas automaticamente pelos dados do lead.
      </span>
    </div>
  )
}

const inputCls  = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400'
const labelCls  = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5'

// ── WhatsApp card ─────────────────────────────────────────────────────────────
function WhatsAppCard({
  tenantId,
  initial,
  initialTemplate,
}: {
  tenantId:        string
  initial:         { url: string | null; key: string | null; instance: string | null }
  initialTemplate: string | null
}) {
  const router = useRouter()
  const toast  = useToast()

  const [open,       setOpen]       = useState(false)
  const [url,        setUrl]        = useState(initial.url      ?? '')
  const [key,        setKey]        = useState(initial.key      ?? '')
  const [instance,   setInstance]   = useState(initial.instance ?? '')
  const [showKey,    setShowKey]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [testing,    setTesting]    = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const [template,      setTemplate]      = useState(initialTemplate ?? DEFAULT_WA_TEMPLATE)
  const [savingTpl,     setSavingTpl]     = useState(false)

  const isConfigured = !!(initial.url && initial.key && initial.instance)

  async function salvarConexao() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('tenants').update({
      evolution_url:      url.trim()      || null,
      evolution_key:      key.trim()      || null,
      evolution_instance: instance.trim() || null,
    }).eq('id', tenantId)
    setSaving(false)
    if (error) { toast('Erro ao salvar', 'error'); return }
    toast('Conexão WhatsApp salva!')
    router.refresh()
  }

  async function testar() {
    if (!url || !key || !instance) {
      setTestResult({ ok: false, msg: 'Preencha todos os campos antes de testar.' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res  = await fetch('/api/whatsapp/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ url, key, instance }),
      })
      const data = await res.json()
      setTestResult(data.ok
        ? { ok: true,  msg: `Conectado ✓  —  status: ${data.status ?? 'online'}` }
        : { ok: false, msg: data.error ?? 'Falha na conexão' }
      )
    } catch {
      setTestResult({ ok: false, msg: 'Erro ao testar conexão' })
    }
    setTesting(false)
  }

  async function salvarTemplate() {
    setSavingTpl(true)
    const supabase = createClient()
    await supabase.from('tenants').update({
      whatsapp_template: template.trim() || DEFAULT_WA_TEMPLATE,
    }).eq('id', tenantId)
    setSavingTpl(false)
    toast('Template WhatsApp salvo!')
    router.refresh()
  }

  return (
    <Card expanded={open}>
      {/* Cabeçalho */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-xl shrink-0">💬</div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">WhatsApp</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Evolution API</p>
            </div>
          </div>
          <Badge status={isConfigured ? 'connected' : 'disconnected'} />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Envio de mensagens individuais e campanhas em massa via WhatsApp.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => { setOpen(o => !o); setTestResult(null) }}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {open ? 'Fechar' : isConfigured ? 'Editar' : 'Configurar'}
          </button>
          {isConfigured && (
            <Link href="/integracoes/whatsapp" className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
              <Smartphone size={15} /> Gerenciar múltiplos números <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* Expandido */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">

          {/* Seção conexão */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Conexão</p>
            <div>
              <label className={labelCls}>URL da API</label>
              <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="http://seu-servidor:8080" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>API Key</label>
              <div className="relative">
                <input type={showKey ? 'text' : 'password'} value={key} onChange={e => setKey(e.target.value)}
                  placeholder="Chave de autenticação" className={inputCls + ' pr-10'} />
                <button type="button" onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Nome da instância</label>
              <input type="text" value={instance} onChange={e => setInstance(e.target.value)}
                placeholder="ex: isyon-principal" className={inputCls} />
            </div>
            {testResult && (
              <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${
                testResult.ok
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-600 dark:text-red-400'
              }`}>
                {testResult.ok ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" /> : <AlertCircle size={13} className="mt-0.5 shrink-0" />}
                {testResult.msg}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={testar} disabled={testing}
                className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                {testing ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
                {testing ? 'Testando...' : 'Testar'}
              </button>
              <button onClick={salvarConexao} disabled={saving}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                <Save size={14} />
                {saving ? 'Salvando...' : 'Salvar conexão'}
              </button>
            </div>
          </div>

          {/* Seção template */}
          <div className="px-5 py-4 space-y-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Template de mensagem</p>
            <textarea value={template} onChange={e => setTemplate(e.target.value)} rows={4}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:bg-gray-700 dark:text-gray-100" />
            <VarsHint />
            <button onClick={salvarTemplate} disabled={savingTpl}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <Save size={14} />
              {savingTpl ? 'Salvando...' : 'Salvar template'}
            </button>
          </div>

        </div>
      )}
    </Card>
  )
}

// ── E-mail card ───────────────────────────────────────────────────────────────
function EmailCard({
  tenantId,
  plataformaConfigurada,
  initialApiKey,
  initialFromEmail,
  initialAssunto,
  initialCorpo,
}: {
  tenantId:             string
  plataformaConfigurada:boolean
  initialApiKey:        string | null
  initialFromEmail:     string | null
  initialAssunto:       string | null
  initialCorpo:         string | null
}) {
  const router = useRouter()
  const toast  = useToast()

  const [open,       setOpen]       = useState(false)
  const [apiKey,     setApiKey]     = useState(initialApiKey     ?? '')
  const [fromEmail,  setFromEmail]  = useState(initialFromEmail  ?? '')
  const [showKey,    setShowKey]    = useState(false)
  const [savingConn, setSavingConn] = useState(false)
  const [testing,    setTesting]    = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const [assunto,    setAssunto]    = useState(initialAssunto ?? DEFAULT_EMAIL_ASSUNTO)
  const [corpo,      setCorpo]      = useState(initialCorpo   ?? DEFAULT_EMAIL_CORPO)
  const [savingTpl,  setSavingTpl]  = useState(false)

  const isConfigured = !!initialApiKey

  async function salvarConexao() {
    setSavingConn(true)
    const supabase = createClient()
    const { error } = await supabase.from('tenants').update({
      resend_api_key:    apiKey.trim()    || null,
      resend_from_email: fromEmail.trim() || null,
    }).eq('id', tenantId)
    setSavingConn(false)
    if (error) { toast('Erro ao salvar', 'error'); return }
    toast('Configuração de e-mail salva!')
    router.refresh()
    setOpen(false)
  }

  async function testar() {
    if (!apiKey.trim()) { setTestResult({ ok: false, msg: 'Informe a API key antes de testar.' }); return }
    setTesting(true); setTestResult(null)
    try {
      const res  = await fetch('/api/email/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      const data = await res.json()
      setTestResult(data.ok
        ? { ok: true,  msg: data.status ?? 'Conexão bem-sucedida ✓' }
        : { ok: false, msg: data.error  ?? 'Falha na conexão' }
      )
    } catch { setTestResult({ ok: false, msg: 'Erro ao testar' }) }
    setTesting(false)
  }

  async function salvarTemplate() {
    setSavingTpl(true)
    const supabase = createClient()
    await supabase.from('tenants').update({
      email_template_assunto: assunto.trim() || DEFAULT_EMAIL_ASSUNTO,
      email_template_corpo:   corpo.trim()   || DEFAULT_EMAIL_CORPO,
    }).eq('id', tenantId)
    setSavingTpl(false)
    toast('Template de e-mail salvo!')
    router.refresh()
  }

  return (
    <Card expanded={open}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xl shrink-0">📧</div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">E-mail</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Resend</p>
            </div>
          </div>
          <Badge status={isConfigured ? 'connected' : plataformaConfigurada ? 'connected' : 'disconnected'} />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Envio de campanhas e e-mails de contato.
        </p>

        <button
          onClick={() => { setOpen(o => !o); setTestResult(null) }}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {open ? 'Fechar' : isConfigured ? 'Editar' : 'Configurar'}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          {/* Seção conexão */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Conexão</p>

            {!isConfigured && (
              <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
                {plataformaConfigurada
                  ? 'Usando a chave padrão da plataforma. Configure sua própria chave para enviar pelo seu domínio.'
                  : 'Sem chave configurada. Configure abaixo ou contate o suporte.'}
              </p>
            )}

            <div>
              <label className={labelCls}>API Key do Resend</label>
              <div className="relative">
                <input type={showKey ? 'text' : 'password'} value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className={inputCls + ' pr-10'} />
                <button type="button" onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>E-mail remetente</label>
              <input type="email" value={fromEmail} onChange={e => setFromEmail(e.target.value)}
                placeholder="Isyon CRM <noreply@suaempresa.com.br>"
                className={inputCls} />
            </div>
            {testResult && (
              <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${
                testResult.ok
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-600 dark:text-red-400'
              }`}>
                {testResult.ok ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" /> : <AlertCircle size={13} className="mt-0.5 shrink-0" />}
                {testResult.msg}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={testar} disabled={testing}
                className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                {testing ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
                {testing ? 'Testando...' : 'Testar'}
              </button>
              <button onClick={salvarConexao} disabled={savingConn}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                <Save size={14} />
                {savingConn ? 'Salvando...' : 'Salvar conexão'}
              </button>
            </div>
          </div>

          {/* Seção template */}
          <div className="px-5 py-4 space-y-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Template de mensagem</p>
            <div>
              <label className={labelCls}>Assunto</label>
              <input type="text" value={assunto} onChange={e => setAssunto(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Corpo</label>
              <textarea value={corpo} onChange={e => setCorpo(e.target.value)} rows={5}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:bg-gray-700 dark:text-gray-100" />
            </div>
            <VarsHint />
            <button onClick={salvarTemplate} disabled={savingTpl}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <Save size={14} />
              {savingTpl ? 'Salvando...' : 'Salvar template'}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Card genérico NF-e (BrasilNFe / Focus NFe) ────────────────────────────────
function NFeProviderCard({
  tenantId,
  nome,
  descricao,
  bgColor,
  tokenField,
  testEndpoint,
  initialToken,
}: {
  tenantId:     string
  nome:         string
  descricao:    string
  bgColor:      string
  tokenField:   'token_brasilnfe' | 'token_focusnfe'
  testEndpoint: string
  initialToken: string | null
}) {
  const router = useRouter()
  const toast  = useToast()

  const [open,       setOpen]       = useState(false)
  const [token,      setToken]      = useState(initialToken ?? '')
  const [showToken,  setShowToken]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [testing,    setTesting]    = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const isConfigured = !!initialToken

  async function salvar() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('tenants')
      .update({ [tokenField]: token.trim() || null })
      .eq('id', tenantId)
    setSaving(false)
    if (error) { toast('Erro ao salvar', 'error'); return }
    toast(`${nome} salvo!`)
    router.refresh()
    setOpen(false)
  }

  async function testar() {
    if (!token.trim()) { setTestResult({ ok: false, msg: 'Informe o token antes de testar.' }); return }
    setTesting(true)
    setTestResult(null)
    try {
      const res  = await fetch(testEndpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      })
      const data = await res.json()
      setTestResult(data.ok
        ? { ok: true,  msg: data.status ?? 'Conexão bem-sucedida ✓' }
        : { ok: false, msg: data.error  ?? 'Falha na conexão' }
      )
    } catch {
      setTestResult({ ok: false, msg: 'Erro ao testar conexão' })
    }
    setTesting(false)
  }

  return (
    <Card expanded={open}>
      {/* Cabeçalho */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${bgColor}`}>
              📄
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{nome}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Emissor NF-e</p>
            </div>
          </div>
          <Badge status={isConfigured ? 'connected' : 'disconnected'} />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{descricao}</p>
        <button
          onClick={() => { setOpen(o => !o); setTestResult(null) }}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {open ? 'Fechar' : isConfigured ? 'Editar token' : 'Configurar'}
        </button>
      </div>

      {/* Formulário expandido */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <label className={labelCls}>Token da API</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Cole o token gerado no painel do provedor"
                className={inputCls + ' pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowToken(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${
              testResult.ok
                ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-600 dark:text-red-400'
            }`}>
              {testResult.ok
                ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                : <AlertCircle  size={13} className="mt-0.5 shrink-0" />}
              {testResult.msg}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={testar} disabled={testing}
              className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              {testing ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
              {testing ? 'Testando...' : 'Testar conexão'}
            </button>
            <button onClick={salvar} disabled={saving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <Save size={14} />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── View principal ────────────────────────────────────────────────────────────
export default function IntegracoesView({
  tenantId, evolution, waTemplate, emailAssunto, emailCorpo,
  emailConfigurado, resendApiKey, resendFromEmail,
  tokenBrasilNFe, tokenFocusNFe,
}: Props) {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Integrações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Conecte ferramentas externas ao Isyon CRM
        </p>
      </div>

      {/* columns = masonry: cada coluna cresce independente, sem afetar as outras */}
      <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
        <div className="break-inside-avoid mb-4">
          <WhatsAppCard tenantId={tenantId} initial={evolution} initialTemplate={waTemplate} />
        </div>
        <div className="break-inside-avoid mb-4">
          <EmailCard
            tenantId={tenantId}
            plataformaConfigurada={emailConfigurado}
            initialApiKey={resendApiKey}
            initialFromEmail={resendFromEmail}
            initialAssunto={emailAssunto}
            initialCorpo={emailCorpo}
          />
        </div>
        <div className="break-inside-avoid mb-4">
          <NFeProviderCard
            key="brasilnfe"
            tenantId={tenantId}
            nome="BrasilNFe"
            descricao="Emissão de NF-e via BrasilNFe. Configure o token do seu painel em brasilnfe.com.br."
            bgColor="bg-green-50 dark:bg-green-900/20"
            tokenField="token_brasilnfe"
            testEndpoint="/api/nfe/test/brasilnfe"
            initialToken={tokenBrasilNFe}
          />
        </div>
        <div className="break-inside-avoid mb-4">
          <NFeProviderCard
            key="focusnfe"
            tenantId={tenantId}
            nome="Focus NFe"
            descricao="Emissão de NF-e via Focus NFe. Configure o token do seu painel em focusnfe.com.br."
            bgColor="bg-blue-50 dark:bg-blue-900/20"
            tokenField="token_focusnfe"
            testEndpoint="/api/nfe/test/focusnfe"
            initialToken={tokenFocusNFe}
          />
        </div>
      </div>
    </>
  )
}
