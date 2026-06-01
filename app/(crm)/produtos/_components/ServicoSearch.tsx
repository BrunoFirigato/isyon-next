'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search } from 'lucide-react'
import { LC116 } from '@/lib/lc116'

interface Props {
  value: string
  onChange: (codigo: string) => void
  inputCls: string
  labelCls: string
  required?: boolean
}

/**
 * Campo de Código de Serviço (LC116) com busca local por código ou descrição.
 */
export default function ServicoSearch({ value, onChange, inputCls, labelCls, required }: Props) {
  const [query, setQuery] = useState(value)
  const [open,  setOpen]  = useState(false)
  const [desc,  setDesc]  = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  // Mostra a descrição do código já selecionado ao abrir
  useEffect(() => {
    const found = LC116.find(s => s.codigo === value.trim())
    if (found) setDesc(found.descricao)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resultados = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return LC116.slice(0, 30)
    return LC116.filter(s =>
      s.codigo.toLowerCase().includes(term) || s.descricao.toLowerCase().includes(term)
    ).slice(0, 30)
  }, [query])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function pick(s: { codigo: string; descricao: string }) {
    setQuery(s.codigo)
    setDesc(s.descricao)
    onChange(s.codigo)
    setOpen(false)
  }

  return (
    <div className="relative" ref={boxRef}>
      <label className={labelCls}>Cód. Serviço (LC116) {required && <span className="text-red-500">*</span>}</label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Código ou descrição (ex: consultoria)"
          className={inputCls + ' pr-8'}
        />
        <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>

      {desc && !open && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">{desc}</p>
      )}

      {open && resultados.length > 0 && (
        <div className="absolute z-20 mt-1 w-full min-w-[320px] max-h-72 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          {resultados.map((s) => (
            <button
              key={s.codigo}
              type="button"
              onClick={() => pick(s)}
              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-600 border-b border-gray-50 dark:border-gray-600 last:border-0"
            >
              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">{s.codigo}</span>
              <span className="block text-[11px] text-gray-600 dark:text-gray-300 leading-snug mt-0.5">{s.descricao}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
