'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Save, Wifi, Loader2, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Eye, EyeOff, Info, Smartphone, ArrowRight,
  MessageSquare, Receipt, Workflow, Download,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'

const DEFAULT_EMAIL_ASSUNTO  = 'Olá {nome}, seguem informações conforme nosso contato.'
const DEFAULT_EMAIL_CORPO    = 'Olá {nome},\n\nFico à disposição para qualquer dúvida.\n\nAtenciosamente.'

interface Props {
  tenantId: string
  whatsappDisponivel: boolean
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
    <div className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden transition-all flex flex-col ${
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
// Logo real das parceiras, num "chip" branco estilo app-icon (visível em light/dark)
function LogoBox({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 ring-1 ring-black/5 dark:ring-white/10 p-1.5 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain" />
    </div>
  )
}

function WhatsAppCard({ disponivel }: { disponivel: boolean }) {
  return (
    <Card>
      {/* Cabeçalho */}
      <div className="p-5 flex flex-col min-h-[188px]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <LogoBox src="/integracoes/whatsapp.svg" alt="WhatsApp" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">WhatsApp</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Evolution API</p>
            </div>
          </div>
          <Badge status={disponivel ? 'connected' : 'disconnected'} />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Conecte seus números e dispare mensagens individuais e campanhas pelo WhatsApp.
        </p>
        <div className="mt-auto flex items-center gap-4 flex-wrap">
          <Link href="/integracoes/whatsapp" className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
            <Smartphone size={15} /> Conectar / gerenciar números <ArrowRight size={13} />
          </Link>
        </div>
      </div>
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
      <div className="p-5 flex flex-col min-h-[188px]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <LogoBox src="/integracoes/resend.svg" alt="Resend" />
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
          className="mt-auto flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
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
  logo,
  tokenField,
  testEndpoint,
  initialToken,
}: {
  tenantId:     string
  nome:         string
  descricao:    string
  logo:         string
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
      <div className="p-5 flex flex-col min-h-[188px]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <LogoBox src={logo} alt={nome} />
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
          className="mt-auto flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
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
// ── Omie (ERP) card ─────────────────────────────────────────────────────────
function OmieCard() {
  const toast = useToast()
  const [conectado, setConectado] = useState(false)
  const [open,      setOpen]      = useState(false)
  const [appKey,    setAppKey]    = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [busy,      setBusy]      = useState(false)
  const [importando, setImportando] = useState<'' | 'produtos' | 'clientes'>('')
  const [result,    setResult]    = useState<{ ok: boolean; msg: string } | null>(null)

  async function carregar() {
    const r = await fetch('/api/integracoes/omie')
    const d = await r.json().catch(() => ({}))
    if (r.ok) setConectado(!!d.conectado)
  }
  useEffect(() => { carregar() }, [])

  async function conectar() {
    if (!appKey.trim() || !appSecret.trim()) { setResult({ ok: false, msg: 'Informe a App Key e a App Secret.' }); return }
    setBusy(true); setResult(null)
    const r = await fetch('/api/integracoes/omie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'conectar', app_key: appKey, app_secret: appSecret }) })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setResult({ ok: false, msg: d.error ?? 'Falha ao conectar' }); return }
    setAppKey(''); setAppSecret(''); setConectado(true); setResult(null); toast('Omie conectado! 🎉')
  }
  async function testar() {
    setBusy(true); setResult(null)
    const r = await fetch('/api/integracoes/omie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'testar' }) })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    setResult(d.ok ? { ok: true, msg: 'Conexão OK!' } : { ok: false, msg: d.error ?? 'Falha no teste' })
  }
  async function desconectar() {
    setBusy(true)
    await fetch('/api/integracoes/omie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'desconectar' }) })
    setBusy(false); setConectado(false); setResult(null); setOpen(false); toast('Omie desconectado', 'info')
  }
  async function importarProdutos() {
    setImportando('produtos'); setResult(null)
    const r = await fetch('/api/integracoes/omie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'importar_produtos' }) })
    const d = await r.json().catch(() => ({}))
    setImportando('')
    if (!r.ok) { setResult({ ok: false, msg: d.error ?? 'Falha na importação' }); return }
    setResult({ ok: true, msg: `${d.importados} produto(s) importado(s) · ${d.atualizados} atualizado(s).` })
    toast('Produtos importados do Omie! 🛒')
  }
  async function importarClientes() {
    setImportando('clientes'); setResult(null)
    const r = await fetch('/api/integracoes/omie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'importar_clientes' }) })
    const d = await r.json().catch(() => ({}))
    setImportando('')
    if (!r.ok) { setResult({ ok: false, msg: d.error ?? 'Falha na importação' }); return }
    setResult({ ok: true, msg: `${d.importados} cliente(s) importado(s) · ${d.ignorados} já existia(m).` })
    toast('Clientes importados do Omie! 👥')
  }

  return (
    <Card expanded={open}>
      <div className="p-5 flex flex-col min-h-[188px]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <LogoBox src="/integracoes/omie.svg" alt="Omie" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Omie</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">ERP</p>
            </div>
          </div>
          <Badge status={conectado ? 'connected' : 'disconnected'} />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Conecte seu ERP Omie. Pegue a App Key e a App Secret no painel do Omie (Configurações → API).
        </p>
        <button onClick={() => { setOpen(o => !o); setResult(null) }}
          className="mt-auto flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {open ? 'Fechar' : (conectado ? 'Gerenciar' : 'Conectar')}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-5 py-4 space-y-3">
          {conectado ? (
            <>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={14} /> Conectado ao Omie.</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={importarProdutos} disabled={!!importando || busy}
                  className="flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60">
                  {importando === 'produtos' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Produtos
                </button>
                <button onClick={importarClientes} disabled={!!importando || busy}
                  className="flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60">
                  {importando === 'clientes' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Clientes
                </button>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Importa do Omie para o Isyon (não altera nada no Omie).</p>
              <div className="flex gap-2">
                <button onClick={testar} disabled={busy || !!importando} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 disabled:opacity-60">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />} Testar conexão
                </button>
                <button onClick={desconectar} disabled={busy || !!importando} className="text-sm font-medium px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-60">
                  Desconectar
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">App Key</label>
                <input value={appKey} onChange={e => setAppKey(e.target.value)} placeholder="App Key do Omie"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">App Secret</label>
                <input value={appSecret} onChange={e => setAppSecret(e.target.value)} type="password" placeholder="App Secret do Omie"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={conectar} disabled={busy}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {busy ? 'Conectando...' : 'Conectar'}
              </button>
            </>
          )}
          {result && (
            <p className={`text-xs flex items-center gap-1.5 ${result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {result.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {result.msg}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

// ── Bling (ERP via OAuth) card ───────────────────────────────────────────────
function BlingCard() {
  const toast = useToast()
  const searchParams = useSearchParams()
  const [conectado, setConectado] = useState(false)
  const [appConfigurado, setAppConfigurado] = useState(true)
  const [busy, setBusy] = useState(false)

  async function carregar() {
    const r = await fetch('/api/integracoes/bling')
    const d = await r.json().catch(() => ({}))
    if (r.ok) { setConectado(!!d.conectado); setAppConfigurado(!!d.appConfigurado) }
  }
  useEffect(() => { carregar() }, [])
  useEffect(() => {
    if (searchParams.get('ok') === 'bling') toast('Bling conectado! 🎉')
    else if (searchParams.get('erro') === 'bling') toast('Não foi possível conectar o Bling.', 'error')
  }, [searchParams, toast])

  async function desconectar() {
    setBusy(true)
    await fetch('/api/integracoes/bling', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'desconectar' }) })
    setBusy(false); setConectado(false); toast('Bling desconectado', 'info')
  }

  return (
    <Card>
      <div className="p-5 flex flex-col min-h-[188px]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <LogoBox src="/integracoes/bling.png" alt="Bling" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bling</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">ERP</p>
            </div>
          </div>
          <Badge status={conectado ? 'connected' : 'disconnected'} />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Conecte seu ERP Bling com login seguro (OAuth) — sem colar tokens.
        </p>
        <div className="mt-auto">
          {!appConfigurado ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Integração Bling ainda não liberada para a sua conta. Fale com o suporte do Isyon.
            </p>
          ) : conectado ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={14} /> Conectado</span>
              <button onClick={desconectar} disabled={busy} className="text-sm font-medium px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-60">Desconectar</button>
            </div>
          ) : (
            <a href="/api/integracoes/bling/connect" className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
              Conectar com o Bling <ArrowRight size={14} />
            </a>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function IntegracoesView({
  tenantId, whatsappDisponivel, emailAssunto, emailCorpo,
  emailConfigurado, resendApiKey, resendFromEmail,
  tokenBrasilNFe, tokenFocusNFe,
}: Props) {
  const [aba, setAba] = useState<'comerciais' | 'erp' | 'automacoes'>('comerciais')

  const abas = [
    { id: 'comerciais' as const, label: 'Comerciais',        icon: MessageSquare },
    { id: 'erp'        as const, label: 'ERP / Faturamento',  icon: Receipt },
    { id: 'automacoes' as const, label: 'Automações',         icon: Workflow },
  ]

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Integrações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Conecte ferramentas externas ao Isyon CRM
        </p>
      </div>

      {/* Abas */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {abas.map(({ id, label, icon: Icon }) => {
          const ativa = aba === id
          return (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                ativa
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={15} /> {label}
              {ativa && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
            </button>
          )
        })}
      </div>

      {/* columns = masonry: cada coluna cresce independente, sem afetar as outras */}
      {aba === 'comerciais' && (
        <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
          <div className="break-inside-avoid mb-4">
            <WhatsAppCard disponivel={whatsappDisponivel} />
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
        </div>
      )}

      {aba === 'erp' && (
        <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
          <div className="break-inside-avoid mb-4">
            <OmieCard />
          </div>
          <div className="break-inside-avoid mb-4">
            <BlingCard />
          </div>
          <div className="break-inside-avoid mb-4">
            <NFeProviderCard
              key="brasilnfe"
              tenantId={tenantId}
              nome="BrasilNFe"
              descricao="Emissão de NF-e via BrasilNFe. Configure o token do seu painel em brasilnfe.com.br."
              logo="/integracoes/brasilnfe.png"
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
              logo="/integracoes/focusnfe.png"
              tokenField="token_focusnfe"
              testEndpoint="/api/nfe/test/focusnfe"
              initialToken={tokenFocusNFe}
            />
          </div>
        </div>
      )}

      {aba === 'automacoes' && (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
            <Workflow size={24} className="text-blue-500" />
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Automações chegando em breve</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 max-w-sm">
            Aqui você vai conectar o Isyon a outras ferramentas e criar fluxos automáticos
            entre sistemas. Estamos preparando essa área.
          </p>
        </div>
      )}
    </>
  )
}
