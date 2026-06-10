'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown } from 'lucide-react'

export interface ClienteOpt { id: string; nome: string; empresa: string | null; cpf_cnpj?: string | null }

/** Seletor de cliente com busca por nome, empresa/razão social ou CPF/CNPJ. */
export default function ClienteCombo({ clientes, value, onChange, className }: {
  clientes: ClienteOpt[]
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const sel = clientes.find(c => c.id === value)
  const label = sel ? (sel.empresa ? `${sel.empresa} — ${sel.nome}` : sel.nome) : ''

  const term = q.trim().toLowerCase()
  const digits = term.replace(/\D/g, '')
  const filtered = (term
    ? clientes.filter(c =>
        c.nome.toLowerCase().includes(term) ||
        (c.empresa ?? '').toLowerCase().includes(term) ||
        (digits !== '' && (c.cpf_cnpj ?? '').replace(/\D/g, '').includes(digits)))
    : clientes
  ).slice(0, 50)

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen(o => !o); setQ('') }}
        className={`${className ?? ''} flex items-center justify-between gap-2 text-left`}>
        <span className={`truncate ${label ? '' : 'text-gray-400 dark:text-gray-500'}`}>{label || 'Selecione o cliente...'}</span>
        <ChevronDown size={15} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                placeholder="Nome, empresa ou CPF/CNPJ..."
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {value && (
              <button type="button" onClick={() => { onChange(''); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                Limpar seleção
              </button>
            )}
            {filtered.map(c => (
              <button key={c.id} type="button" onClick={() => { onChange(c.id); setOpen(false) }}
                className={`w-full text-left px-3 py-2 transition-colors hover:bg-blue-50 dark:hover:bg-gray-700 ${c.id === value ? 'bg-blue-50 dark:bg-gray-700' : ''}`}>
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{c.empresa || c.nome}</p>
                {(c.empresa || c.cpf_cnpj) && (
                  <p className="text-[11px] text-gray-400 truncate">
                    {c.empresa ? c.nome : ''}{c.cpf_cnpj ? `${c.empresa ? ' · ' : ''}${c.cpf_cnpj}` : ''}
                  </p>
                )}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-3 text-xs text-gray-400 text-center">Nenhum cliente encontrado.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
