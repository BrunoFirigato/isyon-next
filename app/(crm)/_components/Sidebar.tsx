'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
} from 'lucide-react'

type Perfil = 'admin' | 'gestor' | 'vendedor' | 'financeiro'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  perfis?: Perfil[]   // se omitido, visível para todos
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/leads', label: 'Leads', icon: Target },
      { href: '/oportunidades', label: 'Oportunidades', icon: Briefcase },
      { href: '/clientes', label: 'Clientes', icon: Building2 },
      { href: '/parceiros', label: 'Parceiros', icon: Users2 },
      { href: '/produtos', label: 'Produtos', icon: Package },
      { href: '/propostas', label: 'Propostas', icon: FileText },
      { href: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      {
        href: '/financeiro',
        label: 'Financeiro',
        icon: Wallet,
        perfis: ['admin', 'gestor', 'financeiro'],
      },
      {
        href: '/relatorios',
        label: 'Relatórios',
        icon: BarChart3,
        perfis: ['admin', 'gestor', 'financeiro'],
      },
    ],
  },
  {
    label: 'Administração',
    items: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings2 },
      {
        href: '/vendedores',
        label: 'Vendedores',
        icon: Users2,
        perfis: ['admin', 'gestor'],
      },
      {
        href: '/cadastros',
        label: 'Cadastros',
        icon: BookOpen,
        perfis: ['admin', 'gestor'],
      },
      {
        href: '/usuarios',
        label: 'Usuários',
        icon: UserCog,
        perfis: ['admin'],
      },
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
  const router = useRouter()

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

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 h-full shrink-0">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          I
        </div>
        <span className="font-bold text-gray-900">Isyon CRM</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(canSee)
          if (visibleItems.length === 0) return null
          return (
            <div key={group.label}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(({ href, label, icon: Icon }) => {
                  const isActive =
                    pathname === href || pathname.startsWith(href + '/')
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon
                        size={15}
                        className={isActive ? 'text-blue-600' : 'text-gray-400'}
                      />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        <p className="text-xs text-gray-400 truncate px-2">{userEmail}</p>
        {userEmail === 'sa@isyon.com.br' && (
          <Link
            href="/superadmin"
            className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
              pathname === '/superadmin'
                ? 'bg-purple-50 text-purple-700 font-medium'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <ShieldAlert
              size={15}
              className={pathname === '/superadmin' ? 'text-purple-600' : 'text-gray-400'}
            />
            Superadmin
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 w-full transition-colors"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </aside>
  )
}
