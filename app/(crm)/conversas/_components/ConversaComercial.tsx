'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Send, FileText, Target, X, Loader2, ShoppingCart, TrendingUp, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
import { gerarShareToken, mensagemProposta } from '@/lib/proposta-share'

const ETAPAS = ['Prospecção', 'Qualificação', 'Proposta', 'Negociação']

interface PropRef { id: string; numero: string | null; titulo: string; valor: number | null; status: string; share_token: string | null }
interface Ctx {
  propostas: PropRef[]
  pedidosCount: number
  ultimaCompra: string | null
  totalComprado: number
  opsAbertas: number
}

const brl = (v: number | null) => v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v)
function diasDe(iso: string | null): string {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d <= 0) return 'hoje'
  if (d === 1) return 'ontem'
  if (d < 30) return `há ${d}d`
  const m = Math.floor(d / 30)
  return `há ${m} ${m === 1 ? 'mês' : 'meses'}`
}
const statusProp: Record<string, string> = { rascunho: 'Rascunho', enviada: 'Enviada', aprovada: 'Aceita', recusada: 'Recusada' }

interface Props {
  conversaId: string
  clienteId: string | null
  leadId: string | null
  contatoNome: string
  onSent: () => void
}

export default function ConversaComercial({ conversaId, clienteId, leadId, contatoNome, onSent }: Props) {
  const supabase = createClient()
  const toast = useToast()
  const tenantId = useTenantId()
  const [ctx, setCtx] = useState<Ctx | null>(null)
  const [propOpen, setPropOpen] = useState(false)
  const [opOpen, setOpOpen] = useState(false)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)

  // Form da oportunidade
  const [opTitulo, setOpTitulo] = useState('')
  const [opValor, setOpValor] = useState('')
  const [opEtapa, setOpEtapa] = useState('Prospecção')
  const [opSaving, setOpSaving] = useState(false)

  const carregar = useCallback(async () => {
    if (!clienteId && !leadId) { setCtx(null); return }
    const propsP = clienteId
      ? supabase.from('propostas').select('id, numero, titulo, valor, status, share_token').eq('cliente_id', clienteId).order('criado_em', { ascending: false })
      : Promise.resolve({ data: [] as PropRef[] })
    const pedsP = clienteId
      ? supabase.from('pedidos').select('valor, criado_em').eq('cliente_id', clienteId)
      : Promise.resolve({ data: [] as { valor: number | null; criado_em: string }[] })
    const opsP = supabase.from('oportunidades').select('id', { count: 'exact', head: true })
      .eq('status', 'aberto').eq(clienteId ? 'cliente_id' : 'lead_id', (clienteId ?? leadId) as string)

    const [{ data: props }, { data: peds }, { count: opsAbertas }] = await Promise.all([propsP, pedsP, opsP])
    const pedidos = (peds ?? []) as { valor: number | null; criado_em: string }[]
    const ultimaCompra = pedidos.reduce<string | null>((acc, p) => (!acc || p.criado_em > acc ? p.criado_em : acc), null)
    const totalComprado = pedidos.reduce((s, p) => s + (p.valor ?? 0), 0)
    setCtx({
      propostas: (props ?? []) as PropRef[],
      pedidosCount: pedidos.length,
      ultimaCompra,
      totalComprado,
      opsAbertas: opsAbertas ?? 0,
    })
  }, [clienteId, leadId, supabase])

  useEffect(() => { carregar() }, [carregar])

  // Envia o link público de uma proposta pela conversa atual
  async function enviarProposta(p: PropRef) {
    setEnviandoId(p.id)
    try {
      let token = p.share_token
      if (!token) {
        token = gerarShareToken(p.numero, contatoNome)
        const { error } = await supabase.from('propostas').update({ share_token: token }).eq('id', p.id)
        if (error) { toast('Não foi possível gerar o link.', 'error'); return }
      }
      const url = `${window.location.origin}/p/${token}`
      const texto = mensagemProposta({ clienteNome: contatoNome, numero: p.numero, url })
      const res = await fetch('/api/whatsapp/enviar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversa_id: conversaId, texto }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { toast(d.error ?? 'Falha ao enviar', 'error'); return }
      toast('Proposta enviada! 📄')
      setPropOpen(false)
      onSent()
    } finally {
      setEnviandoId(null)
    }
  }

  async function criarOportunidade() {
    if (!opTitulo.trim()) { toast('Informe um título.', 'error'); return }
    setOpSaving(true)
    try {
      const valorNum = opValor.trim() ? parseFloat(opValor.replace(',', '.')) : null
      const { error } = await supabase.from('oportunidades').insert({
        tenant_id: tenantId,
        titulo: opTitulo.trim(),
        etapa: opEtapa,
        valor: valorNum,
        status: 'aberto',
        cliente_id: clienteId || null,
        lead_id: clienteId ? null : (leadId || null),
      })
      if (error) { toast(error.message, 'error'); return }
      toast('Oportunidade criada! 🎯')
      setOpOpen(false)
      setOpValor('')
      carregar()
    } finally {
      setOpSaving(false)
    }
  }

  function abrirOp() {
    setOpTitulo(contatoNome ? `Oportunidade — ${contatoNome}` : '')
    setOpEtapa('Prospecção')
    setOpValor('')
    setOpOpen(true)
  }

  if (!clienteId && !leadId) return null

  return (
    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-x-3 gap-y-1.5 flex-wrap">
      {/* Contexto comercial */}
      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-gray-500 dark:text-gray-400 min-w-0">
        {ctx?.opsAbertas ? (
          <span className="inline-flex items-center gap-1"><Target size={12} className="text-blue-500" />{ctx.opsAbertas} oport. aberta{ctx.opsAbertas !== 1 ? 's' : ''}</span>
        ) : null}
        {ctx?.propostas.length ? (
          <span className="inline-flex items-center gap-1"><FileText size={12} className="text-indigo-500" />{ctx.propostas.length} proposta{ctx.propostas.length !== 1 ? 's' : ''}</span>
        ) : null}
        {ctx?.pedidosCount ? (
          <span className="inline-flex items-center gap-1"><ShoppingCart size={12} className="text-emerald-500" />{ctx.pedidosCount} pedido{ctx.pedidosCount !== 1 ? 's' : ''}{ctx.ultimaCompra ? ` · última ${diasDe(ctx.ultimaCompra)}` : ''}</span>
        ) : null}
        {ctx && ctx.totalComprado > 0 ? (
          <span className="inline-flex items-center gap-1"><TrendingUp size={12} className="text-emerald-500" />{brl(ctx.totalComprado)} comprado</span>
        ) : null}
        {ctx && !ctx.opsAbertas && !ctx.propostas.length && !ctx.pedidosCount ? (
          <span className="text-gray-400 dark:text-gray-500">Sem histórico comercial ainda</span>
        ) : null}
      </div>

      {/* Ações */}
      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        <button onClick={() => setPropOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 transition-colors">
          <FileText size={13} /> Enviar proposta
        </button>
        <button onClick={abrirOp}
          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 transition-colors">
          <Target size={13} /> Criar oportunidade
        </button>
      </div>

      {/* Modal: enviar proposta */}
      {propOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPropOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2"><FileText size={16} className="text-indigo-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Enviar proposta</h3>
              </div>
              <button onClick={() => setPropOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5">
              {!clienteId ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Vincule esta conversa a um <strong>cliente</strong> para enviar propostas.</p>
              ) : (ctx?.propostas.length ?? 0) === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Este cliente ainda não tem propostas.</p>
                  <Link href="/propostas?novo=1" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline">
                    <ExternalLink size={14} /> Criar uma proposta
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {ctx!.propostas.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.titulo}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {p.numero ? `${p.numero} · ` : ''}{statusProp[p.status] ?? p.status} · {brl(p.valor)}
                        </p>
                      </div>
                      <button onClick={() => enviarProposta(p)} disabled={enviandoId === p.id}
                        className="shrink-0 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                        {enviandoId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: criar oportunidade */}
      {opOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !opSaving && setOpOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2"><Target size={16} className="text-blue-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Nova oportunidade</h3>
              </div>
              <button onClick={() => setOpOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Título</label>
                <input value={opTitulo} onChange={(e) => setOpTitulo(e.target.value)} autoFocus
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Valor estimado</label>
                  <input value={opValor} onChange={(e) => setOpValor(e.target.value)} placeholder="0,00"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Etapa</label>
                  <select value={opEtapa} onChange={(e) => setOpEtapa(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ETAPAS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={criarOportunidade} disabled={opSaving}
                className="w-full mt-1 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
                {opSaving ? 'Criando...' : 'Criar oportunidade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
