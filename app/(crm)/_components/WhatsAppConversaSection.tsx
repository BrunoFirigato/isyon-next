'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import WhatsAppIcon from '@/app/(crm)/_components/WhatsAppIcon'
import { isWhatsappCapable } from '@/app/(crm)/_components/PhoneInput'

interface Conv { id: string; telefone: string; nao_lidas: number }
interface Msg { id: string; direcao: string; texto: string | null; criado_em: string }
interface Inst { id: string; nome: string }

/**
 * Seção "Conversa WhatsApp" no 360° do lead/cliente.
 * - Se já existe conversa: mostra prévia + "Abrir conversa".
 * - Se não existe mas o contato tem telefone: permite INICIAR a conversa direto daqui.
 * - Sem telefone (ou sem número conectado): some.
 */
export default function WhatsAppConversaSection({ leadId, clienteId }: { leadId?: string; clienteId?: string }) {
  const supabase = createClient()
  const router = useRouter()
  const toast = useToast()
  const [conv, setConv] = useState<Conv | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [telefone, setTelefone] = useState<string | null>(null)
  const [instancias, setInstancias] = useState<Inst[]>([])
  const [instId, setInstId] = useState('')
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const col = leadId ? 'lead_id' : 'cliente_id'
    const tbl = leadId ? 'leads' : 'clientes'
    const val = leadId ?? clienteId
    if (!val) { setLoaded(true); return }
    ;(async () => {
      const [{ data: convData }, { data: contato }, { data: insts }] = await Promise.all([
        supabase.from('wa_conversas').select('id, telefone, nao_lidas').eq(col, val).order('ultima_em', { ascending: false }).limit(1).maybeSingle(),
        supabase.from(tbl).select('telefone').eq('id', val).maybeSingle(),
        supabase.from('wa_instancias').select('id, nome').eq('ativo', true).order('nome'),
      ])
      setConv(convData as Conv | null)
      setTelefone((contato?.telefone as string) || null)
      const lista = (insts ?? []) as Inst[]
      setInstancias(lista)
      if (lista.length === 1) setInstId(lista[0].id)
      if (convData) {
        const { data: m } = await supabase.from('wa_mensagens').select('id, direcao, texto, criado_em').eq('conversa_id', convData.id).order('criado_em', { ascending: false }).limit(6)
        setMsgs(((m ?? []) as Msg[]).reverse())
      }
      setLoaded(true)
    })()
  }, [leadId, clienteId, supabase])

  async function iniciar() {
    if (!texto.trim()) return
    if (!instId) { toast('Selecione o número de WhatsApp.', 'error'); return }
    setSending(true)
    const res = await fetch('/api/whatsapp/enviar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instancia_id: instId, texto: texto.trim(), ...(leadId ? { lead_id: leadId } : { cliente_id: clienteId }) }),
    })
    const d = await res.json()
    setSending(false)
    if (!res.ok) { toast(d.error ?? 'Falha ao enviar', 'error'); return }
    router.push(`/conversas?c=${d.conversa_id}`)
  }

  // Enquanto carrega, não mostra nada (evita "pisca").
  // Sem conversa e sem número de WhatsApp (celular): some — não oferece iniciar.
  if (!loaded) return null
  if (!conv && !isWhatsappCapable(telefone)) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <WhatsAppIcon size={15} className="text-emerald-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Conversa WhatsApp</h2>
          {!!conv?.nao_lidas && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">{conv.nao_lidas}</span>
          )}
        </div>
        {conv && (
          <Link href={`/conversas?c=${conv.id}`} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
            Abrir conversa <ArrowRight size={12} />
          </Link>
        )}
      </div>

      {conv ? (
        <div className="px-5 py-3 space-y-1.5">
          {msgs.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-2 text-center">Conversa sem mensagens.</p>
          ) : (
            msgs.map(m => (
              <div key={m.id} className={`flex ${m.direcao === 'out' ? 'justify-end' : 'justify-start'}`}>
                <span className={`max-w-[80%] text-xs px-2.5 py-1.5 rounded-xl break-words ${m.direcao === 'out' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
                  {m.texto}
                </span>
              </div>
            ))
          )}
        </div>
      ) : instancias.length === 0 ? (
        <p className="px-5 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">
          Conecte um número em <Link href="/integracoes/whatsapp" className="text-blue-600 hover:underline">Integrações</Link> para conversar.
        </p>
      ) : (
        <div className="px-5 py-3 space-y-2">
          {instancias.length > 1 && (
            <select value={instId} onChange={e => setInstId(e.target.value)} className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 dark:bg-gray-700 dark:text-gray-100">
              <option value="">Enviar pelo número...</option>
              {instancias.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
            </select>
          )}
          <div className="flex items-end gap-2">
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); iniciar() } }}
              placeholder="Escreva a primeira mensagem..."
              className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-h-28" />
            <button onClick={iniciar} disabled={sending || !texto.trim()} title="Iniciar conversa no WhatsApp"
              className="p-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white shrink-0">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
