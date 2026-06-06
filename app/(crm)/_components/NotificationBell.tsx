'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, Clock, FileText, Calendar, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import VinculoBadge from './VinculoBadge'

interface Vinc {
  cliente?: { nome: string; empresa: string | null } | null
  lead?: { nome: string } | null
  op?: { titulo: string; numero: string | null } | null
}

interface Notificacao {
  id: string
  tipo: 'compromisso' | 'proposta'
  titulo: string
  subtitulo: string
  href: string
  urgente: boolean
  vinculo?: Vinc
}

export default function NotificationBell() {
  const router = useRouter()
  const ref    = useRef<HTMLDivElement>(null)
  const [open,   setOpen]   = useState(false)
  const [items,  setItems]  = useState<Notificacao[]>([])
  const [loaded, setLoaded] = useState(false)
  const pathname = usePathname()

  const load = useCallback(async () => {
      const supabase = createClient()
      const now = new Date()
      const hoje = now.toISOString()
      // Fim do dia de hoje — pega TODAS as atividades de hoje (não só as já vencidas) + atrasadas
      const fimHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()
      const em7dias = new Date(now.getTime() + 7 * 86_400_000).toISOString()

      const [{ data: compromissos }, { data: propostas }] = await Promise.all([
        // Compromissos pendentes atrasados OU com horário ainda hoje
        supabase
          .from('compromissos')
          .select('id, titulo, tipo, data_hora, status, cliente_id, lead_id, op_id')
          .eq('status', 'pendente')
          .lte('data_hora', fimHoje)
          .order('data_hora', { ascending: true })
          .limit(10),
        // Propostas próximas de vencer (dentro de 7 dias)
        supabase
          .from('propostas')
          .select('id, titulo, numero, validade, status')
          .in('status', ['enviada', 'em_analise', 'aguardando'])
          .not('validade', 'is', null)
          .lte('validade', em7dias)
          .gte('validade', hoje)
          .order('validade', { ascending: true })
          .limit(10),
      ])

      // Resolve os vínculos dos compromissos para identificar o tipo (op/cliente/lead)
      const compsArr = compromissos ?? []
      const cIds = [...new Set(compsArr.filter(c => c.cliente_id).map(c => c.cliente_id as string))]
      const lIds = [...new Set(compsArr.filter(c => c.lead_id).map(c => c.lead_id as string))]
      const oIds = [...new Set(compsArr.filter(c => c.op_id).map(c => c.op_id as string))]
      const [{ data: cD }, { data: lD }, { data: oD }] = await Promise.all([
        cIds.length ? supabase.from('clientes').select('id, nome, empresa').in('id', cIds) : Promise.resolve({ data: [] as { id: string; nome: string; empresa: string | null }[] }),
        lIds.length ? supabase.from('leads').select('id, nome').in('id', lIds) : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
        oIds.length ? supabase.from('oportunidades').select('id, titulo, numero').in('id', oIds) : Promise.resolve({ data: [] as { id: string; titulo: string; numero: string | null }[] }),
      ])
      const cMap = new Map((cD ?? []).map(x => [x.id, x]))
      const lMap = new Map((lD ?? []).map(x => [x.id, x]))
      const oMap = new Map((oD ?? []).map(x => [x.id, x]))

      const notifs: Notificacao[] = [
        ...compsArr.map(c => {
          const d = new Date(c.data_hora)
          const atrasada = d.getTime() < now.getTime()
          const isToday = d.toDateString() === now.toDateString()
          const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          const diffMin = Math.round((now.getTime() - d.getTime()) / 60_000)
          const haQuanto = diffMin < 60 ? `${diffMin}min` : diffMin < 1440 ? `${Math.floor(diffMin / 60)}h` : `${Math.floor(diffMin / 1440)}d`
          return {
            id: `comp_${c.id}`,
            tipo: 'compromisso' as const,
            titulo: c.titulo,
            subtitulo: atrasada
              ? `Atrasada · há ${haQuanto}`
              : isToday ? `Hoje às ${hora}` : hora,
            href: '/agenda',
            urgente: atrasada,
            vinculo: {
              cliente: c.cliente_id ? (cMap.get(c.cliente_id) ?? null) : null,
              lead:    c.lead_id    ? (lMap.get(c.lead_id)   ?? null) : null,
              op:      c.op_id      ? (oMap.get(c.op_id)     ?? null) : null,
            },
          }
        }),
        ...(propostas ?? []).map(p => {
          const validade = new Date(p.validade!)
          const diffDays = Math.round((validade.getTime() - now.getTime()) / 86_400_000)
          return {
            id: `prop_${p.id}`,
            tipo: 'proposta' as const,
            titulo: p.titulo,
            subtitulo: diffDays === 0
              ? 'Vence hoje!'
              : `Vence em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`,
            href: '/propostas?status=enviada',
            urgente: diffDays <= 1,
          }
        }),
      ]

      setItems(notifs)
      setLoaded(true)
  }, [])

  // Recarrega ao montar, ao navegar entre páginas e quando a aba volta ao foco
  useEffect(() => {
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [pathname, load])

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function navegar(href: string) {
    router.push(href)
    setOpen(false)
  }

  const urgentes = items.filter(i => i.urgente).length
  const count    = items.length
  const temCompromissos = items.some(i => i.tipo === 'compromisso')
  const temPropostas    = items.some(i => i.tipo === 'proposta')

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Notificações"
      >
        <Bell size={18} strokeWidth={1.75} />
        {loaded && count > 0 && (
          <span className={`absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center ${
            urgentes > 0 ? 'bg-red-500' : 'bg-blue-500'
          }`}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificações</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={14} />
            </button>
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto">
            {!loaded && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Carregando...</p>
            )}
            {loaded && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Bell size={24} className="text-gray-200 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma notificação</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">Tudo em dia! 🎉</p>
              </div>
            )}
            {loaded && items.map(item => {
              const Icon = item.tipo === 'compromisso' ? Calendar : FileText
              return (
                <button
                  key={item.id}
                  onClick={() => navegar(item.href)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left border-b border-gray-50 dark:border-gray-700 last:border-0"
                >
                  <span className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    item.urgente ? 'bg-red-50' : 'bg-blue-50'
                  }`}>
                    <Icon size={13} className={item.urgente ? 'text-red-500' : 'text-blue-500'} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.titulo}</p>
                    <p className={`text-xs mt-0.5 ${item.urgente ? 'text-red-500 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                      <Clock size={10} className="inline mr-1" />
                      {item.subtitulo}
                    </p>
                    {item.vinculo && (item.vinculo.op || item.vinculo.cliente || item.vinculo.lead) && (
                      <div className="mt-1">
                        <VinculoBadge cliente={item.vinculo.cliente} lead={item.vinculo.lead} op={item.vinculo.op} />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {loaded && items.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4">
              {temCompromissos && (
                <button
                  onClick={() => navegar('/agenda')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ver agenda →
                </button>
              )}
              {temPropostas && (
                <button
                  onClick={() => navegar('/propostas?status=enviada')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ver propostas →
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
