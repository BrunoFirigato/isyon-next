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
  Calendar,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
    label: 'Comercial',
    items: [
      { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/leads',         label: 'Leads',        icon: Target },
      { href: '/oportunidades', label: 'Oportunidades',icon: Briefcase },
      { href: '/clientes',      label: 'Clientes',     icon: Building2 },
      { href: '/agenda',        label: 'Agenda',       icon: Calendar },
      { href: '/campanhas',     label: 'Campanhas',    icon: Megaphone },
    ],
  },
  {
    label: 'Vendas',
    items: [
      { href: '/propostas', label: 'Propostas', icon: FileText },
      { href: '/pedidos',   label: 'Pedidos',   icon: ShoppingCart },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { href: '/produtos',   label: 'Produtos',   icon: Package },
      { href: '/vendedores', label: 'Vendedores', icon: UserCog,  perfis: ['admin', 'gestor'] },
      { href: '/parceiros',  label: 'Parc. Comerciais', icon: Users2 },
      { href: '/cadastros',  label: 'Outros',     icon: BookOpen, perfis: ['admin', 'gestor'] },
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
      { href: '/usuarios',      label: 'Usuários',      icon: Users2,     perfis: ['admin'] },
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
  const [collapsed,       setCollapsed]       = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const stored = localStorage.getItem('sidebar_collapsed')
    if (stored === 'true') setCollapsed(true)

    const storedGroups = localStorage.getItem('sidebar_groups')
    if (storedGroups) {
      try { setCollapsedGroups(JSON.parse(storedGroups)) } catch { /* ignore */ }
    }
  }, [])

  function toggle() {
    setCollapsed((c) => {
      localStorage.setItem('sidebar_collapsed', String(!c))
      return !c
    })
  }

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] }
      localStorage.setItem('sidebar_groups', JSON.stringify(next))
      return next
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
        hidden md:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full shrink-0
        transition-all duration-200 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-56'}
      `}
    >
      {/* ── Brand + Toggle ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 h-14 border-b border-gray-100 dark:border-gray-800 shrink-0">
        {/* Logo sempre visível */}
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          I
        </div>
        {/* Texto só quando expandido */}
        {!collapsed && (
          <span className="font-bold text-gray-900 dark:text-gray-100 flex-1 truncate mx-2.5">Isyon CRM</span>
        )}
        {/* Toggle */}
        <button
          onClick={toggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── Navegação ──────────────────────────────────────────────────── */}
      <nav className="sidebar-nav flex-1 overflow-y-auto py-3 space-y-4 px-2">
        {navGroups.map((group) => {
          const visibleItems  = group.items.filter(canSee)
          if (visibleItems.length === 0) return null

          // Se a rota ativa está neste grupo, forçamos expansão
          const hasActive = visibleItems.some(
            ({ href }) => pathname === href || pathname.startsWith(href + '/')
          )
          const groupCollapsed = !collapsed && !!collapsedGroups[group.label] && !hasActive

          return (
            <div key={group.label}>
              {/* Cabeçalho do grupo — clicável quando sidebar expandida */}
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  title={groupCollapsed ? `Expandir ${group.label}` : `Recolher ${group.label}`}
                  className="w-full flex items-center justify-between px-2 mb-1 group/gh cursor-pointer"
                >
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {group.label}
                  </span>
                  <ChevronDown
                    size={11}
                    className={`text-gray-300 dark:text-gray-600 group-hover/gh:text-gray-500 dark:group-hover/gh:text-gray-400 transition-all duration-200 ${
                      groupCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                </button>
              )}

              {/* Itens — ocultos quando grupo recolhido */}
              {!groupCollapsed && (
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
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}
                        `}
                      >
                        <Icon
                          size={collapsed ? 18 : 15}
                          className={isActive ? 'text-white shrink-0' : 'text-gray-400 dark:text-gray-500 shrink-0'}
                        />
                        {!collapsed && <span className="truncate">{label}</span>}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
