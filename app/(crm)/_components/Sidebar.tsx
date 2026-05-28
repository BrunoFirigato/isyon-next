'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Target,
  Briefcase,
  Building2,
  Users2,
  FileText,
  ShoppingCart,
  Wallet,
  BarChart3,
  Settings2,
  UserCog,
  LogOut,
  ShieldAlert,
  BookOpen,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

type Perfil = 'admin' | 'gestor' | 'vendedor' | 'financeiro'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  perfis?: Perfil[]
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/leads',         label: 'Leads',         icon: Target },
      { href: '/oportunidades', label: 'Oportunidades', icon: Briefcase },
      { href: '/clientes',      label: 'Clientes',      icon: Building2 },
      { href: '/parceiros',     label: 'Parceiros',     icon: Users2 },
      { href: '/produtos',      label: 'Produtos',      icon: Package },
      { href: '/propostas',     label: 'Propostas',     icon: FileText },
      { href: '/pedidos',       label: 'Pedidos',       icon: ShoppingCart },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/financeiro', label: 'Financeiro', icon: Wallet,   perfis: ['admin', 'gestor', 'financeiro'] },
      { href: '/relatorios', label: 'Relatórios', icon: BarChart3, perfis: ['admin', 'gestor', 'financeiro'] },
    ],
  },
  {
    label: 'Administração',
    items: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings2 },
      { href: '/vendedores',    label: 'Vendedores',    icon: Users2,   perfis: ['admin', 'gestor'] },
      { href: '/cadastros',     label: 'Cadastros',     icon: BookOpen, perfis: ['admin', 'gestor'] },
      { href: '/usuarios',      label: 'Usuários',      icon: UserCog,  perfis: ['admin'] },
    ],
  },
]

function avatarInitials(email: string) {
  const name = email.split('@')[0]
  return name.slice(0, 2).toUpperCase()
}

export default function Sidebar({
  userEmail,
  perfil,
}: {
  userEmail: string
  perfil: Perfil
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  // Persiste o estado entre navegações
  useEffect(() => {
    const stored = localStorage.getItem('sidebar_collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed((c) => {
      localStorage.setItem('sidebar_collapsed', String(!c))
      return !c
    })
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function canSee(item: NavItem) {
    if (!item.perfis) return true
    return item.perfis.includes(perfil)
  }

  const initials = avatarInitials(userEmail)
  const userName = userEmail.split('@')[0]

  return (
    <aside
      className={`
        hidden md:flex flex-col bg-white border-r border-gray-200 h-full shrink-0
        transition-all duration-200 ease-in-out
        ${collapsed ? 'w-[60px]' : 'w-56'}
      `}
    >
      {/* ── Brand + Toggle ─────────────────────────────────────────────── */}
      <div className={`flex items-center border-b border-gray-100 h-14 shrink-0 ${collapsed ? 'justify-center px-0' : 'px-4 gap-2.5'}`}>
        {!collapsed && (
          <>
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              I
            </div>
            <span className="font-bold text-gray-900 flex-1 truncate">Isyon CRM</span>
          </>
        )}
        <button
          onClick={toggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={`
            flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors
            ${collapsed ? 'w-9 h-9' : 'w-7 h-7 shrink-0'}
          `}
        >
          {collapsed
            ? <ChevronRight size={15} />
            : <ChevronLeft  size={15} />
          }
        </button>
      </div>

      {/* ── Usuário ────────────────────────────────────────────────────── */}
      <div className={`border-b border-gray-100 shrink-0 ${collapsed ? 'py-3 flex justify-center' : 'px-4 py-3'}`}>
        {collapsed ? (
          <div
            title={userEmail}
            className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs cursor-default"
          >
            {initials}
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{userName}</p>
              <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Navegação ──────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(canSee)
          if (visibleItems.length === 0) return null
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(href + '/')
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      className={`
                        flex items-center rounded-lg text-sm transition-colors
                        ${collapsed ? 'justify-center w-9 h-9 mx-auto' : 'gap-2.5 px-2 py-2'}
                        ${isActive
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                      `}
                    >
                      <Icon
                        size={15}
                        className={isActive ? 'text-blue-600 shrink-0' : 'text-gray-400 shrink-0'}
                      />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* ── Rodapé (ações) ─────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 py-2 px-2 space-y-0.5 shrink-0">
        {userEmail === 'sa@isyon.com.br' && (
          <Link
            href="/superadmin"
            title={collapsed ? 'Superadmin' : undefined}
            className={`
              flex items-center rounded-lg text-sm transition-colors
              ${collapsed ? 'justify-center w-9 h-9 mx-auto' : 'gap-2.5 px-2 py-2'}
              ${pathname === '/superadmin'
                ? 'bg-purple-50 text-purple-700 font-medium'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}
            `}
          >
            <ShieldAlert size={15} className={pathname === '/superadmin' ? 'text-purple-600 shrink-0' : 'text-gray-400 shrink-0'} />
            {!collapsed && 'Superadmin'}
          </Link>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          className={`
            flex items-center rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 w-full transition-colors
            ${collapsed ? 'justify-center w-9 h-9 mx-auto' : 'gap-2.5 px-2 py-2'}
          `}
        >
          <LogOut size={15} className="shrink-0" />
          {!collapsed && 'Sair'}
        </button>
      </div>
    </aside>
  )
}
