'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, Target, Briefcase, FileText, X, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Result {
  id: string
  label: string
  sublabel?: string
  href: string
  type: 'cliente' | 'lead' | 'oportunidade' | 'proposta'
}

const TYPE_META = {
  cliente:     { label: 'Clientes',     icon: Building2, color: 'text-blue-600',   bg: 'bg-blue-50'   },
  lead:        { label: 'Leads',        icon: Target,    color: 'text-violet-600', bg: 'bg-violet-50' },
  oportunidade:{ label: 'Oportunidades',icon: Briefcase, color: 'text-orange-600', bg: 'bg-orange-50' },
  proposta:    { label: 'Propostas',    icon: FileText,  color: 'text-green-600',  bg: 'bg-green-50'  },
}

interface Props {
  onClose: () => void
}

export default function GlobalSearch({ onClose }: Props) {
  const router  = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [active,  setActive]  = useState(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const supabase = createClient()
    const like = `%${q}%`

    const [{ data: clientes }, { data: leads }, { data: ops }, { data: props }] =
      await Promise.all([
        supabase.from('clientes').select('id, nome, empresa').or(`nome.ilike.${like},empresa.ilike.${like}`).limit(5),
        supabase.from('leads').select('id, nome, email').or(`nome.ilike.${like},email.ilike.${like}`).limit(5),
        supabase.from('oportunidades').select('id, titulo, numero').or(`titulo.ilike.${like},numero.ilike.${like}`).limit(5),
        supabase.from('propostas').select('id, titulo, numero').or(`titulo.ilike.${like},numero.ilike.${like}`).limit(5),
      ])

    const all: Result[] = [
      ...(clientes ?? []).map(c => ({
        id: c.id, type: 'cliente' as const,
        label: c.empresa ? `${c.empresa}` : c.nome,
        sublabel: c.empresa ? c.nome : undefined,
        href: `/clientes/${c.id}`,
      })),
      ...(leads ?? []).map(l => ({
        id: l.id, type: 'lead' as const,
        label: l.nome,
        sublabel: l.email ?? undefined,
        href: `/leads`,
      })),
      ...(ops ?? []).map(o => ({
        id: o.id, type: 'oportunidade' as const,
        label: o.titulo,
        sublabel: o.numero ?? undefined,
        href: `/oportunidades`,
      })),
      ...(props ?? []).map(p => ({
        id: p.id, type: 'proposta' as const,
        label: p.titulo,
        sublabel: p.numero ?? undefined,
        href: `/propostas`,
      })),
    ]

    setResults(all)
    setActive(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 250)
    return () => clearTimeout(t)
  }, [query, search])

  function navigate(href: string) {
    router.push(href)
    onClose()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && results[active]) navigate(results[active].href)
  }

  // Group results by type preserving order
  const grouped = (['cliente', 'lead', 'oportunidade', 'proposta'] as const)
    .map(type => ({ type, items: results.filter(r => r.type === type) }))
    .filter(g => g.items.length > 0)

  // Flat index for keyboard nav
  let flatIdx = 0

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Buscar clientes, leads, oportunidades..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8 text-sm text-gray-400">
              Buscando...
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-gray-400">
              <Search size={24} className="mb-2 text-gray-200" />
              Nenhum resultado para &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && grouped.map(({ type, items }) => {
            const meta = TYPE_META[type]
            const Icon = meta.icon
            return (
              <div key={type} className="py-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 mb-1">
                  {meta.label}
                </p>
                {items.map(item => {
                  const idx = flatIdx++
                  const isActive = idx === active
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => navigate(item.href)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                        isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                        <Icon size={13} className={meta.color} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>
                        {item.sublabel && (
                          <p className="text-xs text-gray-400 truncate">{item.sublabel}</p>
                        )}
                      </div>
                      {isActive && <ArrowRight size={13} className="text-blue-400 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )
          })}

          {!query && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-400">
                Digite para buscar em clientes, leads, oportunidades e propostas
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-gray-300">
                <kbd className="border border-gray-200 rounded px-1.5 py-0.5">↑↓</kbd>
                <span>navegar</span>
                <kbd className="border border-gray-200 rounded px-1.5 py-0.5 ml-2">↵</kbd>
                <span>abrir</span>
                <kbd className="border border-gray-200 rounded px-1.5 py-0.5 ml-2">ESC</kbd>
                <span>fechar</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
