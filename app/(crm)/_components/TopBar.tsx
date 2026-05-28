'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

function avatarInitials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

const PAGE_LABELS: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/leads':         'Leads',
  '/oportunidades': 'Oportunidades',
  '/clientes':      'Clientes',
  '/parceiros':     'Parceiros Comerciais',
  '/produtos':      'Produtos',
  '/propostas':     'Propostas',
  '/pedidos':       'Pedidos',
  '/agenda':        'Agenda',
  '/campanhas':     'Campanhas',
  '/financeiro':    'Financeiro',
  '/relatorios':    'Relatórios',
  '/configuracoes': 'Configurações',
  '/vendedores':    'Vendedores',
  '/cadastros':     'Cadastros',
  '/usuarios':      'Usuários',
  '/superadmin':    'Superadmin',
}

function getPageLabel(pathname: string): string {
  // Exact match first
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname]
  // Match by prefix (e.g. /leads/123 → "Leads")
  const match = Object.keys(PAGE_LABELS).find(
    (key) => key !== '/dashboard' && pathname.startsWith(key + '/')
  )
  return match ? PAGE_LABELS[match] : ''
}

export default function TopBar({ userEmail }: { userEmail: string }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const pageLabel = getPageLabel(pathname)

  // Fecha ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = avatarInitials(userEmail)
  const userName = userEmail.split('@')[0]

  return (
    <header className="hidden md:flex items-center justify-between h-14 px-6 bg-white border-b border-gray-200 shrink-0">
      {/* Page title */}
      <h1 className="text-sm font-semibold text-gray-800 truncate">
        {pageLabel}
      </h1>

      <div ref={ref} className="relative">
        {/* Avatar — botão de abertura */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm hover:bg-blue-200 transition-colors focus:outline-none"
        >
          {initials}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-11 w-56 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-50">
            {/* Info do usuário */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">{userName}</p>
              <p className="text-xs text-gray-400 truncate">{userEmail}</p>
            </div>
            {/* Sair */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <LogOut size={14} className="text-gray-400" />
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
