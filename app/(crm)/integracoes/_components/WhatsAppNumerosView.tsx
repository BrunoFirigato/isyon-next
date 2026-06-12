'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Smartphone, Trash2, QrCode, RefreshCw, X, Loader2, Webhook, CheckCircle2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'

interface Numero {
  id: string
  nome: string
  numero: string | null
  instance_name: string
  status: string
  usuario_id: string | null
  ativo: boolean
  estado: string | null
  responsavel_nome: string | null
  n_conversas: number
  nao_lidas: number
  sem_resposta: number
  ultima_atividade: string | null
}
interface UsuarioRef { id: string; nome: string }
interface Carga { usuario_id: string | null; nome: string; n_conversas: number; nao_lidas: number; sem_resposta: number }
interface DiagResult {
  nome: string
  ok: boolean
  expectedUrl: string
  found: { ok: boolean; url?: string | null; enabled?: boolean | null; events?: string[] | null; error?: string }
  applied: { ok: boolean; status?: number; detail?: string }
  checks: { urlOk: boolean; enabledOk: boolean; eventsOk: boolean }
  recentLogs?: WebhookLog[]
}
interface WebhookLog { criado_em: string; resultado: string; event: string | null; from_me: boolean | null; telefone: string | null; remote_jid: string | null }

const DIAS_PARADO = 3 // sem atividade há 3+ dias = "parado"

function tempoRelativo(iso: string | null): string {
  if (!iso) return 'sem atividade'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d} dia${d > 1 ? 's' : ''}`
}
/** Em atividade = teve mensagem nos últimos DIAS_PARADO dias. */
function emAtividade(iso: string | null): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < DIAS_PARADO * 86400000
}

const STATUS_INFO: Record<string, { label: string; cls: string; dot: string }> = {
  conectado:    { label: 'Conectado',    cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500' },
  pareando:     { label: 'Aguardando',   cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',         dot: 'bg-amber-500' },
  desconectado: { label: 'Desconectado', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',                dot: 'bg-gray-400' },
}

export default function WhatsAppNumerosView({ isSuperadmin = false }: { isSuperadmin?: boolean }) {
  const toast = useToast()
  const [numeros, setNumeros] = useState<Numero[]>([])
  const [carga, setCarga] = useState<Carga[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioRef[]>([])
  const [loading, setLoading] = useState(true)
  const [evolutionOk, setEvolutionOk] = useState(true)
  const [limite, setLimite] = useState(0)
  const [usados, setUsados] = useState(0)

  const [addOpen, setAddOpen] = useState(false)
  const [addNome, setAddNome] = useState('')
  const [addNumero, setAddNumero] = useState('')
  const [addUsuario, setAddUsuario] = useState('')
  const [adding, setAdding] = useState(false)

  const [qr, setQr] = useState<{ id: string; base64: string | null } | null>(null)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [diagBusy, setDiagBusy] = useState<string | null>(null)
  const [diag, setDiag] = useState<DiagResult | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const carregar = useCallback(async () => {
    const res = await fetch('/api/whatsapp/instancias')
    const data = await res.json()
    if (res.ok) { setNumeros(data.numeros ?? []); setCarga(data.carga ?? []); setEvolutionOk(data.evolutionConfigurada); setLimite(data.limite ?? 0); setUsados(data.usados ?? 0) }
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
    const supabase = createClient()
    supabase.from('usuarios').select('id, nome').order('nome')
      .then(({ data }) => { if (data) setUsuarios(data) })
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [carregar])

  function pararPoll() { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }

  // Enquanto o QR está aberto, verifica a conexão a cada 3s
  function iniciarPoll(id: string) {
    pararPoll()
    let tentativas = 0
    pollRef.current = setInterval(async () => {
      tentativas++
      const res = await fetch('/api/whatsapp/instancias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status', id }) })
      const d = await res.json()
      if (d.status === 'conectado') {
        pararPoll(); setQr(null); toast('Número conectado! 🎉'); carregar()
      } else if (tentativas > 40) { // ~2 min
        pararPoll()
      }
    }, 3000)
  }

  async function adicionar() {
    if (!addNome.trim()) { toast('Informe um nome.', 'error'); return }
    setAdding(true)
    const res = await fetch('/api/whatsapp/instancias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'criar', nome: addNome, numero: addNumero, usuario_id: addUsuario }) })
    const d = await res.json()
    setAdding(false)
    if (!res.ok) { toast(d.error ?? 'Erro ao criar número', 'error'); return }
    setAddOpen(false); setAddNome(''); setAddNumero(''); setAddUsuario('')
    await carregar()
    setQr({ id: d.id, base64: d.qrBase64 ?? null })
    iniciarPoll(d.id)
  }

  async function reconectar(id: string) {
    setQr({ id, base64: null })
    const res = await fetch('/api/whatsapp/instancias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'conectar', id }) })
    const d = await res.json()
    if (!res.ok || !d.qrBase64) { toast(d.error ?? 'Não foi possível gerar o QR.', 'error'); setQr(null); return }
    setQr({ id, base64: d.qrBase64 })
    iniciarPoll(id)
  }

  async function testarRecebimento(id: string, nome: string) {
    setDiagBusy(id)
    try {
      const res = await fetch('/api/whatsapp/instancias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'diagnostico', id }) })
      const d = await res.json()
      if (!res.ok) { toast(d.error ?? 'Falha no diagnóstico', 'error'); return }
      setDiag({ nome, ...d })
    } finally {
      setDiagBusy(null)
    }
  }

  async function atualizar(id: string, patch: Record<string, unknown>) {
    setNumeros(prev => prev.map(n => n.id === id ? { ...n, ...patch } as Numero : n))
    await fetch('/api/whatsapp/instancias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'atualizar', id, ...patch }) })
  }

  async function remover(id: string) {
    setRemovendo(null)
    await fetch('/api/whatsapp/instancias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remover', id }) })
    toast('Número removido', 'info')
    carregar()
  }

  const qrSrc = qr?.base64 ? (qr.base64.startsWith('data:') ? qr.base64 : `data:image/png;base64,${qr.base64}`) : null

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Link href="/integracoes" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Números de WhatsApp</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 ml-7">Conecte e gerencie vários números pelo WhatsApp (Evolution API).</p>

      {!evolutionOk && (
        <div className="mb-4 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg px-4 py-3">
          O WhatsApp ainda não está disponível para a sua conta. Fale com o suporte do Isyon para liberar.
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-3">
        {!loading && limite > 0 && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
            usados >= limite
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {usados} de {limite} número{limite !== 1 ? 's' : ''} usado{usados !== 1 ? 's' : ''}
          </span>
        )}
        <button onClick={() => setAddOpen(true)} disabled={!evolutionOk || (limite > 0 && usados >= limite)}
          title={limite > 0 && usados >= limite ? 'Limite do plano atingido — remova um número ou fale com o suporte.' : undefined}
          className="ml-auto inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
          <Plus size={15} /> Adicionar número
        </button>
      </div>

      {!loading && carga.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Carga por responsável</p>
          <div className="space-y-1.5">
            {carga.map(c => (
              <div key={c.usuario_id ?? 'none'} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-700 dark:text-gray-300 truncate">{c.nome}</span>
                <span className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  <span>{c.n_conversas} conversa{c.n_conversas !== 1 ? 's' : ''}</span>
                  {c.nao_lidas > 0 && <span className="text-blue-600 dark:text-blue-300 font-medium">{c.nao_lidas} não lidas</span>}
                  {c.sem_resposta > 0 && <span className="text-amber-600 dark:text-amber-300 font-medium">{c.sem_resposta} sem resposta</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400"><Loader2 size={22} className="animate-spin mx-auto" /></div>
      ) : numeros.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm py-14 text-center">
          <Smartphone size={30} className="mx-auto text-gray-200 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum número conectado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {numeros.map(n => {
            const st = STATUS_INFO[n.status] ?? STATUS_INFO.desconectado
            return (
              <div key={n.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 shrink-0">
                      <Smartphone size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{n.nome}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{n.numero || 'sem número informado'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${st.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
                    </span>
                    {n.status === 'conectado' && (
                      emAtividade(n.ultima_atividade)
                        ? <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">Em atividade</span>
                        : <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Parado</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-x-3 gap-y-1 mt-2.5 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                  <span>{n.n_conversas} conversa{n.n_conversas !== 1 ? 's' : ''}</span>
                  {n.nao_lidas > 0 && <span className="text-blue-600 dark:text-blue-300 font-medium">{n.nao_lidas} não lida{n.nao_lidas !== 1 ? 's' : ''}</span>}
                  {n.sem_resposta > 0 && <span className="text-amber-600 dark:text-amber-300 font-medium">{n.sem_resposta} sem resposta</span>}
                  <span className="text-gray-400 dark:text-gray-500">· última atividade {tempoRelativo(n.ultima_atividade)}</span>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <select
                    value={n.usuario_id ?? ''}
                    onChange={(e) => atualizar(n.id, { usuario_id: e.target.value || null })}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sem responsável (compartilhado — todos veem)</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>

                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={n.ativo} onChange={(e) => atualizar(n.id, { ativo: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    Ativo
                  </label>

                  <div className="ml-auto flex items-center gap-1">
                    {isSuperadmin && (
                      <button onClick={() => testarRecebimento(n.id, n.nome)} disabled={diagBusy === n.id}
                        title="Diagnóstico técnico do webhook (suporte Isyon)"
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-60">
                        {diagBusy === n.id ? <Loader2 size={13} className="animate-spin" /> : <Webhook size={13} />}
                        <span className="hidden sm:inline">Testar recebimento</span>
                      </button>
                    )}
                    <button onClick={() => reconectar(n.id)} title={n.status === 'conectado' ? 'Reconectar' : 'Conectar (QR)'}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 transition-colors">
                      {n.status === 'conectado' ? <RefreshCw size={13} /> : <QrCode size={13} />}
                      {n.status === 'conectado' ? 'Reconectar' : 'Conectar'}
                    </button>
                    <button onClick={() => setRemovendo(n.id)} title="Remover"
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal adicionar */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !adding && setAddOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Adicionar número</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nome / apelido <span className="text-red-500">*</span></label>
                <input value={addNome} onChange={e => setAddNome(e.target.value)} autoFocus placeholder="Ex: Comercial, João, Suporte"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Telefone (opcional)</label>
                <input value={addNumero} onChange={e => setAddNumero(e.target.value)} placeholder="Ex: 5511999999999"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Responsável (opcional)</label>
                <select value={addUsuario} onChange={e => setAddUsuario(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sem responsável (compartilhado — todos veem)</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button onClick={() => setAddOpen(false)} disabled={adding} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 disabled:opacity-60">Cancelar</button>
              <button onClick={adicionar} disabled={adding} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">{adding ? 'Criando...' : 'Criar e conectar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR */}
      {qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { pararPoll(); setQr(null) }} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-xs shadow-xl text-center">
            <button onClick={() => { pararPoll(); setQr(null) }} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Conectar WhatsApp</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">No celular: WhatsApp → Aparelhos conectados → Conectar um aparelho → escaneie o código.</p>
            <div className="bg-white rounded-xl p-3 inline-block border border-gray-100">
              {qrSrc
                ? <img src={qrSrc} alt="QR Code" className="w-52 h-52" />  // eslint-disable-line @next/next/no-img-element
                : <div className="w-52 h-52 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-gray-300" /></div>}
            </div>
            <p className="text-xs text-gray-400 mt-4 flex items-center justify-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Aguardando leitura...</p>
          </div>
        </div>
      )}

      {/* Resultado do diagnóstico de recebimento */}
      {diag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDiag(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <button onClick={() => setDiag(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            <div className="flex items-center gap-2 mb-3">
              {diag.ok
                ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                : <AlertTriangle size={20} className="text-amber-500 shrink-0" />}
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {diag.ok ? 'Recebimento configurado ✓' : 'Atenção no recebimento'}
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {diag.ok
                ? <>O webhook de <strong>{diag.nome}</strong> está ativo e apontando para o Isyon. As mensagens recebidas dos clientes vão aparecer na tela WhatsApp. Se ainda não aparecerem, peça para o contato enviar uma nova mensagem.</>
                : <>Reaplicamos o webhook de <strong>{diag.nome}</strong>, mas algo ainda não bateu (veja abaixo). Mensagens enviadas a partir de agora devem começar a chegar — teste pedindo uma nova mensagem ao contato.</>}
            </p>

            <div className="space-y-2 text-sm">
              <DiagRow ok={diag.applied.ok} label="Webhook aplicado na instância"
                detail={diag.applied.ok ? undefined : (diag.applied.detail || `HTTP ${diag.applied.status ?? '—'}`)} />
              <DiagRow ok={diag.checks.urlOk} label="Apontando para o endereço do Isyon"
                detail={diag.found.url ? undefined : 'nenhuma URL configurada'} />
              <DiagRow ok={diag.checks.enabledOk} label="Webhook habilitado" />
              <DiagRow ok={diag.checks.eventsOk} label="Evento de mensagens (MESSAGES_UPSERT)" />
            </div>

            {diag.found.url && (
              <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 break-all">
                Configurado: {diag.found.url.split('?')[0]}
              </p>
            )}

            {/* Últimas chamadas recebidas da Evolution */}
            <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Últimas chamadas recebidas da Evolution</p>
              {(diag.recentLogs?.length ?? 0) === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Nenhuma chamada registrada ainda. Peça ao contato para enviar uma mensagem nova e clique em &quot;Testar recebimento&quot; de novo — se continuar zerado, a Evolution não está conseguindo chamar o Isyon.
                </p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {diag.recentLogs!.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono text-gray-500 dark:text-gray-400 shrink-0">{new Date(l.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      <span className={`flex-1 truncate ${l.resultado.startsWith('salva') ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                        {l.resultado}{l.from_me === false ? ' · recebida' : l.from_me === true ? ' · enviada' : ''}
                      </span>
                      {l.telefone && <span className="font-mono text-gray-400 shrink-0">{l.telefone.slice(-4)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setDiag(null)}
              className="w-full mt-5 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Confirmar remoção */}
      {removendo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRemovendo(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Remover número?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">A instância será desconectada e removida do servidor. As conversas já registradas permanecem.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setRemovendo(null)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200">Cancelar</button>
              <button onClick={() => remover(removendo)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DiagRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-start gap-2">
      {ok
        ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
        : <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
      <div className="min-w-0">
        <p className="text-gray-700 dark:text-gray-300">{label}</p>
        {!ok && detail && <p className="text-xs text-amber-600 dark:text-amber-400 break-all">{detail}</p>}
      </div>
    </div>
  )
}
