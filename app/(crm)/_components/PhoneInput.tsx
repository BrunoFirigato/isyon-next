'use client'

import { useEffect, useState } from 'react'

/** Campo de telefone guiado: DDI (padrão Brasil) + máscara + validação de DDD.
 *  Guarda no formato "+55 (11) 99999-9999" — legível e compatível com o WhatsApp
 *  (a digitação dos números é extraída por digits() onde for preciso). */

const DDIS = [
  { code: '55',  flag: '🇧🇷' },
  { code: '1',   flag: '🇺🇸' },
  { code: '351', flag: '🇵🇹' },
  { code: '54',  flag: '🇦🇷' },
  { code: '595', flag: '🇵🇾' },
  { code: '598', flag: '🇺🇾' },
]

const onlyDigits = (s: string) => (s || '').replace(/\D/g, '')

/** Separa um valor armazenado em DDI + dígitos locais. Assume Brasil quando não reconhece o DDI. */
function splitStored(stored: string): { ddi: string; local: string } {
  const d = onlyDigits(stored)
  if (!d) return { ddi: '55', local: '' }
  for (const { code } of [...DDIS].sort((a, b) => b.code.length - a.code.length)) {
    if (d.startsWith(code) && d.length - code.length >= 10) return { ddi: code, local: d.slice(code.length) }
  }
  return { ddi: '55', local: d }
}

/** Máscara brasileira progressiva: (11) 99999-9999 / (11) 9999-9999. */
function maskBR(localDigits: string): string {
  const d = localDigits.replace(/\D/g, '').slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function compose(ddi: string, localDigits: string): string {
  if (!localDigits) return ''
  return `+${ddi} ${ddi === '55' ? maskBR(localDigits) : localDigits}`
}

/** True se o telefone tem DDD + número (10/11 dígitos no trecho local). Vazio = válido (campo opcional). */
export function phoneIsComplete(stored: string): boolean {
  if (!onlyDigits(stored)) return true
  const { ddi, local } = splitStored(stored)
  if (ddi === '55') return local.length === 10 || local.length === 11
  return local.length >= 8
}

export default function PhoneInput({
  value, onChange, className = '', id,
}: { value: string; onChange: (v: string) => void; className?: string; id?: string }) {
  const init = splitStored(value)
  const [ddi, setDdi] = useState(init.ddi)
  const [localDigits, setLocalDigits] = useState(init.local)

  // Re-sincroniza quando o valor externo muda (ex.: autofill por CNPJ no cadastro de cliente)
  useEffect(() => {
    if (onlyDigits(value) !== onlyDigits(compose(ddi, localDigits))) {
      const s = splitStored(value)
      setDdi(s.ddi); setLocalDigits(s.local)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function update(nextDdi: string, nextLocal: string) {
    setDdi(nextDdi); setLocalDigits(nextLocal)
    onChange(compose(nextDdi, nextLocal))
  }

  const incompleto = !!localDigits && !phoneIsComplete(compose(ddi, localDigits))
  const inputCls = className || 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div>
      <div className="flex gap-2">
        <select
          value={ddi}
          onChange={e => update(e.target.value, localDigits)}
          aria-label="Código do país (DDI)"
          className="shrink-0 border border-gray-300 dark:border-gray-600 rounded-lg px-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DDIS.map(d => <option key={d.code} value={d.code}>{d.flag} +{d.code}</option>)}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          value={ddi === '55' ? maskBR(localDigits) : localDigits}
          onChange={e => update(ddi, onlyDigits(e.target.value).slice(0, ddi === '55' ? 11 : 15))}
          placeholder={ddi === '55' ? '(11) 99999-9999' : 'Número'}
          className={inputCls}
        />
      </div>
      {incompleto && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">Inclua DDD + número (ex.: 11 99999-9999).</p>
      )}
    </div>
  )
}
