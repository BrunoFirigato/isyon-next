'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

const OPTIONS = [
  { value: 'light',  label: 'Claro',    icon: Sun     },
  { value: 'dark',   label: 'Escuro',   icon: Moon    },
  { value: 'system', label: 'Sistema',  icon: Monitor },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Aparência</p>
      <div className="flex gap-1">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              theme === value
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Ícone do tema atual — para exibir no TopBar */
export function ThemeIcon() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <Monitor size={15} className="text-gray-400" />
  return resolvedTheme === 'dark'
    ? <Moon size={15} className="text-gray-400" />
    : <Sun  size={15} className="text-gray-400" />
}
