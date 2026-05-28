'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LogOut, User, Search, ChevronRight } from 'lucide-react'
import { useBreadcrumb } from './BreadcrumbContext'
import NotificationBell from './NotificationBell'
import PerfilModal from './PerfilModal'
import GlobalSearch from './GlobalSearch'
import { ThemeToggle } from './ThemeToggle'

function avatarInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
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
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname]
  const match = Object.keys(PAGE_LABELS).find(
    (key) => key !== '/dashboard' && pathname.startsWith(key + '/')
  )
  return match ? PAGE_LABELS[match] : ''
}

export default function TopBar({ userEmail, userName: userNameProp }: { userEmail: string; userName: string }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [perfilOpen, setPerfilOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { breadcrumb } = useBreadcrumb()

  const pageLabel  = getPageLabel(pathname)
  const userName   = userNameProp || userEmail.split('@')[0]
  const initials   = avatarInitials(userName)

  // Fecha menu ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Cmd+K / Ctrl+K abre busca
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="flex items-center justify-between h-14 px-4 md:px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">

        {/* Breadcrumb / Page title */}
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          {breadcrumb ? (
            <>
              <Link
                href={breadcrumb.parentHref}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
              >
                {breadcrumb.parentLabel}
              </Link>
              <ChevronRight size={13} className="text-gray-300 dark:text-gray-600 shrink-0" />
              <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">{breadcrumb.currentLabel}</span>
            </>
          ) : (
            <span className="font-semibold text-gray-800 dark:text-gray-100">{pageLabel}</span>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* Search trigger — visível só no desktop */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            <Search size={13} />
            <span className="text-xs hidden lg:inline">Buscar</span>
            <kbd className="hidden lg:inline-flex items-center text-[10px] text-gray-300 border border-gray-200 rounded px-1 py-0.5 ml-1">
              ⌘K
            </kbd>
          </button>

          {/* Notification bell */}
          <NotificationBell />

          {/* Avatar */}
          <div ref={ref} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm hover:bg-blue-200 transition-colors focus:outline-none"
            >
              {initials}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 w-56 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{userName}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{userEmail}</p>
                </div>
                <button
                  onClick={() => { setPerfilOpen(true); setMenuOpen(false) }}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <User size={14} className="text-gray-400" />
                  Meu perfil
                </button>
                <ThemeToggle />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800"
                >
                  <LogOut size={14} className="text-gray-400" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Busca global */}
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}

      {/* Modal perfil */}
      {perfilOpen && (
        <PerfilModal
          userEmail={userEmail}
          userName={userName}
          onClose={() => setPerfilOpen(false)}
        />
      )}
    </>
  )
}
