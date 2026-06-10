'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Send, Search, Plus, ArrowLeft, Building2, UserPlus, Smartphone, X, Loader2, Archive, ArchiveRestore, AlertTriangle, Clock, Users } from 'lucide-react'
import WhatsAppIcon from '@/app/(crm)/_components/WhatsAppIcon'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'

interface Conversa {
  id: string
  telefone: string
  contato_nome: string | null
  lead_id: string | null
  cliente_id: string | null
  instancia_id: string
  nao_lidas: number
  arquivada: boolean
  ultima_mensagem: string | null
  ultima_em: string | null
  ultima_direcao: string | null
  responsavel_id: string | null
  wa_instancias?: { nome: string } | null
  leads?: { nome: string } | null
  clientes?: { nome: string; empresa: string | null } | null
}
interface Mensagem { id: string; direcao: string; texto: string | null; criado_em: string }
interface Instancia { id: string; nome: string }
interface UsuarioRef { id: string; nome: string }

const SELECT = 'id,telefone,contato_nome,lead_id,cliente_id,instancia_id,nao_lidas,arquivada,ultima_mensagem,ultima_em,ultima_direcao,responsavel_id,wa_instancias(nome),leads(nome),clientes(nome,empresa)'

function nomeContato(c: Conversa) {
  if (c.clientes) return c.clientes.empresa || c.clientes.nome
  if (c.leads) return c.leads.nome
  return c.contato_nome || c.telefone
}
function horaMsg(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function ConversasView() {
  const toast = useToast()
  const supabase = createClient()
  const tenantId = useTenantId()
  const searchParams = useSearchParams()
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [instCarregado, setInstCarregado] = useState(false)
  const [ativaId, setAtivaId] = useState<string | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [busca, setBusca] = useState('')
  const [filtroInst, setFiltroInst] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [novaOpen, setNovaOpen] = useState(false)
  const [nvInst, setNvInst] = useState(''); const [nvTel, setNvTel] = useState(''); const [nvTexto, setNvTexto] = useState('')
  const [filtroSem, setFiltroSem] = useState(false)
  const [filtroSemResposta, setFiltroSemResposta] = useState(false)
  const [verArquivadas, setVerArquivadas] = useState(false)
  const [usuarios, setUsuarios] = useState<UsuarioRef[]>([])
  const [transfOpen, setTransfOpen] = useState(false)
  const [numerosOffline, setNumerosOffline] = useState<string[]>([])
  const [criarOpen, setCriarOpen] = useState(false); const [novoLeadNome, setNovoLeadNome] = useState('')
  const [vincOpen, setVincOpen] = useState(false); const [vincBusca, setVincBusca] = useState('')
  const [vincRes, setVincRes] = useState<{ tipo: 'lead' | 'cliente'; id: string; nome: string }[]>([])
  const [acaoBusy, setAcaoBusy] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)

  const ativa = conversas.find(c => c.id === ativaId) ?? null

  const carregarConversas = useCallback(async () => {
    const { data } = await supabase.from('wa_conversas').select(SELECT).order('ultima_em', { ascending: false, nullsFirst: false })
    if (data) setConversas(data as unknown as Conversa[])
    setLoading(false)
  }, [supabase])

  const carregarMensagens = useCallback(async (id: string) => {
    const { data } = await supabase.from('wa_mensagens').select('id, direcao, texto, criado_em').eq('conversa_id', id).order('criado_em', { ascending: true }).limit(500)
    if (data) setMensagens(data as Mensagem[])
  }, [supabase])

  useEffect(() => {
    carregarConversas()
    supabase.from('wa_instancias').select('id, nome').eq('ativo', true).order('nome').then(({ data }) => { if (data) { setInstancias(data); if (data.length === 1) setNvInst(data[0].id) } setInstCarregado(true) })
    supabase.from('usuarios').select('id, nome').order('nome').then(({ data }) => { if (data) setUsuarios(data) })
    const t = setInterval(carregarConversas, 6000)
    return () => clearInterval(t)
  }, [carregarConversas, supabase])

  // Sync ativo: puxa mensagens direto da Evolution (plano B do webhook).
  // Roda na abertura e a cada 15s enquanto a tela está aberta.
  useEffect(() => {
    let vivo = true
    const sync = async () => {
      try {
        const r = await fetch('/api/whatsapp/sync', { method: 'POST' })
        const d = await r.json().catch(() => ({}))
        if (vivo && r.ok && (d.novas ?? 0) > 0) carregarConversas()
      } catch { /* silencioso */ }
    }
    sync()
    const t = setInterval(sync, 15000)
    return () => { vivo = false; clearInterval(t) }
  }, [carregarConversas])

  // Status de conexão (ao vivo) dos números — avisa se algum caiu
  useEffect(() => {
    const checar = async () => {
      try {
        const r = await fetch('/api/whatsapp/status')
        const d = await r.json()
        if (r.ok) setNumerosOffline((d.numeros ?? []).filter((n: { status: string }) => n.status !== 'conectado').map((n: { nome: string }) => n.nome))
      } catch { /* silencioso */ }
    }
    checar()
    const t = setInterval(checar, 30000)
    return () => clearInterval(t)
  }, [])

  // Abre direto uma conversa quando vem do 360° (?c=conversaId)
  useEffect(() => {
    const c = searchParams.get('c')
    if (c) setAtivaId(c)
  }, [searchParams])

  // Deep-link da grid de leads/clientes (?lead= / ?cliente=): abre a conversa existente
  // ou já prepara uma nova com o telefone do contato preenchido.
  useEffect(() => {
    const leadId = searchParams.get('lead')
    const cliId  = searchParams.get('cliente')
    const txt    = searchParams.get('texto') // mensagem pré-pronta (ex.: envio de proposta)
    if (!leadId && !cliId) return
    ;(async () => {
      const col = leadId ? 'lead_id' : 'cliente_id'
      const val = (leadId ?? cliId) as string
      const { data: existente } = await supabase.from('wa_conversas')
        .select('id').eq(col, val).order('ultima_em', { ascending: false }).limit(1).maybeSingle()
      if (existente) { setAtivaId(existente.id); if (txt) setTexto(txt); return }
      const tbl = leadId ? 'leads' : 'clientes'
      const { data: ct } = await supabase.from(tbl).select('telefone').eq('id', val).maybeSingle()
      if (ct?.telefone) { setNvTel(String(ct.telefone)); if (txt) setNvTexto(txt); setNovaOpen(true) }
      else toast('Este contato não tem telefone cadastrado.', 'error')
    })()
  }, [searchParams, supabase, toast])

  // Ao abrir uma conversa: carrega mensagens, marca como lida e faz polling do thread
  useEffect(() => {
    if (!ativaId) return
    carregarMensagens(ativaId)
    supabase.from('wa_conversas').update({ nao_lidas: 0 }).eq('id', ativaId).then(() => {
      setConversas(prev => prev.map(c => c.id === ativaId ? { ...c, nao_lidas: 0 } : c))
    })
    const t = setInterval(() => carregarMensagens(ativaId), 4000)
    return () => clearInterval(t)
  }, [ativaId, carregarMensagens, supabase])

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensagens])

  async function enviar() {
    if (!ativa || !texto.trim()) return
    setEnviando(true)
    const corpo = texto.trim()
    setTexto('')
    const res = await fetch('/api/whatsapp/enviar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversa_id: ativa.id, texto: corpo }) })
    setEnviando(false)
    if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Falha ao enviar', 'error'); setTexto(corpo); return }
    carregarMensagens(ativa.id); carregarConversas()
  }

  async function iniciar() {
    if (!nvInst || !nvTel.trim() || !nvTexto.trim()) { toast('Preencha número, telefone e mensagem.', 'error'); return }
    setEnviando(true)
    const res = await fetch('/api/whatsapp/enviar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instancia_id: nvInst, telefone: nvTel, texto: nvTexto }) })
    const d = await res.json()
    setEnviando(false)
    if (!res.ok) { toast(d.error ?? 'Falha ao iniciar', 'error'); return }
    setNovaOpen(false); setNvTel(''); setNvTexto('')
    await carregarConversas()
    setAtivaId(d.conversa_id)
  }

  async function criarLead() {
    if (!ativa) return
    setAcaoBusy(true)
    const nome = novoLeadNome.trim() || ativa.contato_nome || ativa.telefone
    const { data: lead, error } = await supabase.from('leads')
      .insert({ tenant_id: tenantId, nome, telefone: ativa.telefone, status: 'novo', origem: 'WhatsApp' })
      .select('id').single()
    if (error || !lead) { setAcaoBusy(false); toast('Erro ao criar lead', 'error'); return }
    await supabase.from('wa_conversas').update({ lead_id: lead.id }).eq('id', ativa.id)
    setAcaoBusy(false); setCriarOpen(false)
    toast('Lead criado e vinculado! 🎯')
    carregarConversas()
  }

  async function buscarVinculo(termo: string) {
    setVincBusca(termo)
    const t = termo.replace(/[,()]/g, '').trim()
    if (t.length < 2) { setVincRes([]); return }
    const [{ data: lds }, { data: cls }] = await Promise.all([
      supabase.from('leads').select('id, nome').or(`nome.ilike.%${t}%,telefone.ilike.%${t}%`).limit(6),
      supabase.from('clientes').select('id, nome, empresa').or(`nome.ilike.%${t}%,empresa.ilike.%${t}%,telefone.ilike.%${t}%`).limit(6),
    ])
    setVincRes([
      ...(lds ?? []).map(l => ({ tipo: 'lead' as const, id: l.id, nome: l.nome })),
      ...(cls ?? []).map(c => ({ tipo: 'cliente' as const, id: c.id, nome: c.empresa || c.nome })),
    ])
  }

  async function vincular(tipo: 'lead' | 'cliente', id: string) {
    if (!ativa) return
    const patch = tipo === 'lead' ? { lead_id: id, cliente_id: null } : { cliente_id: id, lead_id: null }
    await supabase.from('wa_conversas').update(patch).eq('id', ativa.id)
    setVincOpen(false); setVincBusca(''); setVincRes([])
    toast('Conversa vinculada!')
    carregarConversas()
  }

  async function arquivar(conv: Conversa, valor: boolean) {
    await supabase.from('wa_conversas')
      .update(valor ? { arquivada: true, nao_lidas: 0 } : { arquivada: false })
      .eq('id', conv.id)
    toast(valor ? 'Conversa arquivada' : 'Conversa desarquivada')
    if (valor && ativaId === conv.id) setAtivaId(null)
    carregarConversas()
  }

  async function transferir(usuarioId: string) {
    if (!ativa) return
    setAcaoBusy(true)
    const res = await fetch('/api/whatsapp/transferir', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversa_id: ativa.id, usuario_id: usuarioId || null }),
    })
    const d = await res.json().catch(() => ({}))
    setAcaoBusy(false); setTransfOpen(false)
    if (!res.ok) { toast(d.error ?? 'Falha ao transferir', 'error'); return }
    toast('Conversa transferida!')
    setAtivaId(null)
    carregarConversas()
  }

  const q = busca.trim().toLowerCase()
  const lista = conversas.filter(c => {
    if (verArquivadas ? !c.arquivada : c.arquivada) return false
    if (filtroInst && c.instancia_id !== filtroInst) return false
    if (filtroSem && (c.lead_id || c.cliente_id)) return false
    if (filtroSemResposta && c.ultima_direcao !== 'in') return false
    if (!q) return true
    return [nomeContato(c), c.telefone, c.ultima_mensagem].filter(Boolean).join(' ').toLowerCase().includes(q)
  })

  const semNumero = instCarregado && instancias.length === 0
  const semCadastro = !!ativa && !ativa.lead_id && !ativa.cliente_id
  const link360 = ativa?.cliente_id ? `/clientes/${ativa.cliente_id}` : ativa?.lead_id ? `/leads/${ativa.lead_id}` : null

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 6rem)' }}>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><WhatsAppIcon size={18} className="text-emerald-500" /> Conversas</h1>
        {!semNumero && (
          <button onClick={() => setNovaOpen(true)} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg"><Plus size={15} /> Nova conversa</button>
        )}
      </div>

      {numerosOffline.length > 0 && (
        <div className="mb-3 flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-lg px-3 py-2">
          <AlertTriangle size={15} className="shrink-0" />
          <span className="flex-1 min-w-0">
            {numerosOffline.length === 1
              ? <>O número <strong>{numerosOffline[0]}</strong> está desconectado.</>
              : <><strong>{numerosOffline.length} números</strong> estão desconectados.</>}
            {' '}As mensagens não serão enviadas nem recebidas até reconectar.
          </span>
          <Link href="/integracoes/whatsapp" className="font-medium underline shrink-0 whitespace-nowrap">Reconectar</Link>
        </div>
      )}

      {semNumero ? (
        /* Onboarding — nenhum número de WhatsApp conectado ainda */
        <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
              <WhatsAppIcon size={34} className="text-emerald-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Conecte seu WhatsApp</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Você ainda não tem nenhum número conectado. Conecte um WhatsApp para receber e responder
              as mensagens dos seus clientes aqui dentro do CRM — cada conversa vinculada ao lead, cliente
              e responsável.
            </p>
            <Link href="/integracoes/whatsapp"
              className="mt-5 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
              <Smartphone size={16} /> Conectar número
            </Link>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              É rápido: leia o QR Code com o celular, como no WhatsApp Web.
            </p>
          </div>
        </div>
      ) : (
      <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex overflow-hidden">
        {/* Lista */}
        <div className={`${ativa ? 'hidden md:flex' : 'flex'} w-full md:w-80 shrink-0 border-r border-gray-100 dark:border-gray-700 flex-col`}>
          <div className="p-3 border-b border-gray-100 dark:border-gray-700 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar conversa..." className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {instancias.length > 1 && (
              <select value={filtroInst} onChange={e => setFiltroInst(e.target.value)} className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 dark:bg-gray-700 dark:text-gray-100">
                <option value="">Todos os números</option>
                {instancias.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            )}
            <button onClick={() => { setFiltroSemResposta(v => !v); setFiltroSem(false); setVerArquivadas(false) }}
              className={`w-full text-xs px-2 py-1.5 rounded-lg border transition-colors inline-flex items-center justify-center gap-1.5 ${filtroSemResposta ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-medium' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <Clock size={12} /> Aguardando resposta
            </button>
            <div className="flex gap-2">
              <button onClick={() => { setFiltroSem(v => !v); setFiltroSemResposta(false); setVerArquivadas(false) }}
                className={`flex-1 text-xs px-2 py-1.5 rounded-lg border transition-colors ${filtroSem ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-medium' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                {filtroSem ? '● Só sem cadastro' : 'Sem cadastro'}
              </button>
              <button onClick={() => { setVerArquivadas(v => !v); setFiltroSem(false); setFiltroSemResposta(false) }}
                className={`flex-1 text-xs px-2 py-1.5 rounded-lg border transition-colors inline-flex items-center justify-center gap-1 ${verArquivadas ? 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 font-medium' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <Archive size={12} /> Arquivadas
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="py-10 text-center"><Loader2 size={20} className="animate-spin mx-auto text-gray-300" /></div>
            : lista.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">Nenhuma conversa.</p>
            : lista.map(c => (
              <div key={c.id}
                className={`group relative border-b border-gray-50 dark:border-gray-700/50 ${ativaId === c.id ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''}`}>
                <button onClick={() => setAtivaId(c.id)}
                  className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                      {c.clientes ? <Building2 size={12} className="text-blue-500 shrink-0" /> : c.leads ? <UserPlus size={12} className="text-amber-500 shrink-0" /> : null}
                      {nomeContato(c)}
                    </span>
                    {c.ultima_direcao === 'in' && c.nao_lidas === 0 && <Clock size={12} className="text-amber-500 shrink-0" />}
                    {c.nao_lidas > 0 && <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center group-hover:opacity-0 transition-opacity">{c.nao_lidas}</span>}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5 pr-6">{c.ultima_mensagem ?? c.telefone}</p>
                </button>
                <button onClick={() => arquivar(c, !c.arquivada)} title={c.arquivada ? 'Desarquivar' : 'Arquivar / ignorar'}
                  className="absolute right-2 top-2.5 p-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-600 text-gray-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  {c.arquivada ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className={`${ativa ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
          {!ativa ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500">
              <WhatsAppIcon size={36} className="mb-2 text-gray-200 dark:text-gray-600" />
              <p className="text-sm">Selecione uma conversa</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <button onClick={() => setAtivaId(null)} className="md:hidden p-1 text-gray-400"><ArrowLeft size={18} /></button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{nomeContato(ativa)}</p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1"><Smartphone size={10} /> {ativa.wa_instancias?.nome ?? ''} · {ativa.telefone}</p>
                </div>
                {link360 && <Link href={link360} className="text-xs font-medium text-blue-600 hover:underline shrink-0">Ver 360°</Link>}
                <button onClick={() => setTransfOpen(true)} title="Transferir conversa para outro responsável"
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <Users size={16} />
                </button>
                <button onClick={() => arquivar(ativa, !ativa.arquivada)} title={ativa.arquivada ? 'Desarquivar' : 'Arquivar / ignorar'}
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  {ativa.arquivada ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                </button>
              </div>

              {semCadastro && (
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex items-center justify-between gap-2">
                  <span className="text-xs text-amber-700 dark:text-amber-300 truncate">📇 Contato sem cadastro no CRM</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => { setNovoLeadNome(ativa?.contato_nome ?? ''); setCriarOpen(true) }} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">Criar lead</button>
                    <button onClick={() => { setVincBusca(''); setVincRes([]); setVincOpen(true) }} className="text-xs font-medium px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40">Vincular</button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50/50 dark:bg-gray-900/30">
                {mensagens.map(m => (
                  <div key={m.id} className={`flex ${m.direcao === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.direcao === 'out' ? 'bg-emerald-500 text-white rounded-br-sm' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 rounded-bl-sm'}`}>
                      <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                      <p className={`text-[10px] mt-1 ${m.direcao === 'out' ? 'text-emerald-50/80' : 'text-gray-400'}`}>{horaMsg(m.criado_em)}</p>
                    </div>
                  </div>
                ))}
                <div ref={fimRef} />
              </div>

              <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex items-end gap-2">
                <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={1}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                  placeholder="Digite uma mensagem..." className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32" />
                <button onClick={enviar} disabled={enviando || !texto.trim()} className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white shrink-0">
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* Nova conversa */}
      {novaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNovaOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Nova conversa</h2>
              <button onClick={() => setNovaOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <select value={nvInst} onChange={e => setNvInst(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100">
                <option value="">Enviar pelo número...</option>
                {instancias.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
              <input value={nvTel} onChange={e => setNvTel(e.target.value)} placeholder="Telefone (ex: 5511999999999)" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100" />
              <textarea value={nvTexto} onChange={e => setNvTexto(e.target.value)} rows={3} placeholder="Mensagem..." className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 resize-none" />
            </div>
            <button onClick={iniciar} disabled={enviando} className="w-full mt-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">{enviando ? 'Enviando...' : 'Enviar'}</button>
          </div>
        </div>
      )}

      {/* Criar lead a partir da conversa */}
      {criarOpen && ativa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !acaoBusy && setCriarOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Criar lead deste contato</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nome</label>
                <input value={novoLeadNome} onChange={e => setNovoLeadNome(e.target.value)} autoFocus placeholder="Nome do lead"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Telefone</label>
                <input value={ativa.telefone} disabled className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/40 text-gray-500" />
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button onClick={() => setCriarOpen(false)} disabled={acaoBusy} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 disabled:opacity-60">Cancelar</button>
              <button onClick={criarLead} disabled={acaoBusy} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60">{acaoBusy ? 'Criando...' : 'Criar e vincular'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Vincular a lead/cliente existente */}
      {vincOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setVincOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Vincular a um cadastro</h2>
              <button onClick={() => setVincOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <input value={vincBusca} onChange={e => buscarVinculo(e.target.value)} autoFocus placeholder="Buscar lead ou cliente..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100" />
            <div className="mt-3 max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
              {vincRes.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">Digite para buscar.</p>
              ) : vincRes.map(r => (
                <button key={`${r.tipo}_${r.id}`} onClick={() => vincular(r.tipo, r.id)}
                  className="w-full flex items-center gap-2 px-1 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded">
                  {r.tipo === 'cliente' ? <Building2 size={13} className="text-blue-500 shrink-0" /> : <UserPlus size={13} className="text-amber-500 shrink-0" />}
                  <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{r.nome}</span>
                  <span className="ml-auto text-[10px] text-gray-400 uppercase">{r.tipo}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transferir conversa */}
      {transfOpen && ativa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !acaoBusy && setTransfOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Transferir conversa</h2>
              <button onClick={() => setTransfOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Escolha o novo responsável. Se não for você, esta conversa sairá da sua lista.
            </p>
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
              <button onClick={() => transferir('')} disabled={acaoBusy}
                className="w-full flex items-center gap-2 px-1 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded disabled:opacity-60">
                <Smartphone size={13} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Seguir o responsável do número</span>
              </button>
              {usuarios.map(u => (
                <button key={u.id} onClick={() => transferir(u.id)} disabled={acaoBusy}
                  className="w-full flex items-center gap-2 px-1 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded disabled:opacity-60">
                  <Users size={13} className="text-blue-500 shrink-0" />
                  <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{u.nome}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
