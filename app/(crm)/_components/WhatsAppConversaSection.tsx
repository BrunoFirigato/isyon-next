'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MessageCircle, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Conv { id: string; telefone: string; nao_lidas: number }
interface Msg { id: string; direcao: string; texto: string | null; criado_em: string }

/** Seção "Conversa WhatsApp" no 360° do lead/cliente. Some se não houver conversa. */
export default function WhatsAppConversaSection({ leadId, clienteId }: { leadId?: string; clienteId?: string }) {
  const supabase = createClient()
  const [conv, setConv] = useState<Conv | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const col = leadId ? 'lead_id' : 'cliente_id'
    const val = leadId ?? clienteId
    if (!val) { setLoaded(true); return }
    supabase.from('wa_conversas').select('id, telefone, nao_lidas').eq(col, val).order('ultima_em', { ascending: false }).limit(1).maybeSingle()
      .then(async ({ data }) => {
        setConv(data as Conv | null)
        if (data) {
          const { data: m } = await supabase.from('wa_mensagens').select('id, direcao, texto, criado_em').eq('conversa_id', data.id).order('criado_em', { ascending: false }).limit(6)
          setMsgs(((m ?? []) as Msg[]).reverse())
        }
        setLoaded(true)
      })
  }, [leadId, clienteId, supabase])

  if (loaded && !conv) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MessageCircle size={15} className="text-emerald-500" />
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
      <div className="px-5 py-3 space-y-1.5">
        {!loaded ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-2">Carregando...</p>
        ) : msgs.length === 0 ? (
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
    </div>
  )
}
