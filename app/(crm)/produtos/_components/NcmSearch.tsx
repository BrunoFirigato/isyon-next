'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'

interface NcmResult { codigo: string; descricao: string }

interface Props {
  value: string
  onChange: (codigo: string) => void
  inputCls: string
  labelCls: string
}

/**
 * Campo de NCM com busca na tabela oficial (BrasilAPI) por código ou descrição.
 * Aceita digitação livre do código e sugere resultados conforme o texto.
 */
export default function NcmSearch({ value, onChange, inputCls, labelCls }: Props) {
  const [query,   setQuery]   = useState(value)
  const [results, setResults] = useState<NcmResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)
  const [desc,    setDesc]    = useState('')
  const boxRef     = useRef<HTMLDivElement>(null)
  const lastPicked = useRef<string>('')

  // Sincroniza quando o valor muda externamente (ex: ao abrir para editar)
  useEffect(() => { setQuery(value) }, [value])

  // Ao montar com um código já preenchido, busca a descrição
  useEffect(() => {
    const code = value.replace(/\D/g, '')
    if (code.length !== 8) return
    lastPicked.current = code
    fetch(`https://brasilapi.com.br/api/ncm/v1/${code}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.descricao) setDesc(d.descricao) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Busca com debounce
  useEffect(() => {
    const term = query.trim()
    if (term.length < 2 || term === lastPicked.current) { setResults([]); setLoading(false); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res  = await fetch(`https://brasilapi.com.br/api/ncm/v1?search=${encodeURIComponent(term)}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data.slice(0, 25) : [])
      } catch { setResults([]) }
      setLoading(false)
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  // Fecha ao clicar fora
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function pick(r: NcmResult) {
    lastPicked.current = r.codigo
    setQuery(r.codigo)
    setDesc(r.descricao)
    onChange(r.codigo)
    setOpen(false)
  }

  return (
    <div className="relative" ref={boxRef}>
      <label className={labelCls}>NCM</label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Código ou descrição (ex: notebook)"
          className={inputCls + ' pr-8'}
        />
        {loading
          ? <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
          : <Search  size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />}
      </div>

      {desc && !open && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">{desc}</p>
      )}

      {open && (results.length > 0 || loading) && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          {loading && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">Buscando...</p>
          )}
          {results.map((r) => (
            <button
              key={r.codigo}
              type="button"
              onClick={() => pick(r)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 border-b border-gray-50 dark:border-gray-600 last:border-0"
            >
              <span className="text-xs font-mono font-medium text-gray-900 dark:text-gray-100">{r.codigo}</span>
              <span className="block text-[11px] text-gray-500 dark:text-gray-400 truncate">{r.descricao}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
