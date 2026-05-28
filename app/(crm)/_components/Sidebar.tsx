'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
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
      { href: '/financeiro', label: 'Financeiro', icon: Wallet,    perfis: ['admin', 'gestor', 'financeiro'] },
      { href: '/relatorios', label: 'Relatórios', icon: BarChart3, perfis: ['admin', 'gestor', 'financeiro'] },
    ],
  },
  {
    label: 'Administração',
    items: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings2 },
      { href: '/vendedores',    label: 'Vendedores',    icon: Users2,    perfis: ['admin', 'gestor'] },
      { href: '/cadastros',     label: 'Cadastros',     icon: BookOpen,  perfis: ['admin', 'gestor'] },
      { href: '/usuarios',      label: 'Usuários',      icon: UserCog,   perfis: ['admin'] },
      { href: '/superadmin',    label: 'Superadmin',    icon: ShieldAlert, perfis: ['admin'] },
    ],
  },
]

export default function Sidebar({
  userEmail,
  perfil,
}: {
  userEmail: string
  perfil: Perfil
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

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

  function canSee(item: NavItem) {
    if (!item.perfis) return true
    // Superadmin só para o e-mail específico
    if (item.href === '/superadmin') return userEmail === 'sa@isyon.com.br'
    return item.perfis.includes(perfil)
  }

  return (
    <aside
      className={`
        hidden md:flex flex-col bg-white border-r border-gray-200 h-full shrink-0
        transition-all duration-200 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-56'}
      `}
    >
      {/* ── Brand + Toggle ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 h-14 border-b border-gray-100 shrink-0">
        {/* Logo sempre visível */}
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          I
        </div>
        {/* Texto só quando expandido */}
        {!collapsed && (
          <span className="font-bold text-gray-900 flex-1 truncate mx-2.5">Isyon CRM</span>
        )}
        {/* Toggle */}
        <button
          onClick={toggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
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
                        ${collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-2.5 px-2 py-2'}
                        ${isActive
                          ? 'bg-blue-600 text-white font-medium'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                      `}
                    >
                      <Icon
                        size={collapsed ? 18 : 15}
                        className={isActive ? 'text-white shrink-0' : 'text-gray-400 shrink-0'}
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
    </aside>
  )
}
