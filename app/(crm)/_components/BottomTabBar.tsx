'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Target,
  Briefcase,
  Building2,
  MoreHorizontal,
  Users2,
  FileText,
  ShoppingCart,
  Wallet,
  BarChart3,
  Settings2,
  UserCog,
  LogOut,
  X,
} from 'lucide-react'

type Perfil = 'admin' | 'gestor' | 'vendedor' | 'financeiro'

interface MoreItem {
  href: string
  label: string
  icon: React.ElementType
  perfis?: Perfil[]
}

const moreItems: MoreItem[] = [
  { href: '/parceiros', label: 'Parceiros', icon: Users2 },
  { href: '/propostas', label: 'Propostas', icon: FileText },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
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
  { href: '/configuracoes', label: 'Configurações', icon: Settings2 },
  {
    href: '/usuarios',
    label: 'Usuários',
    icon: UserCog,
    perfis: ['admin'],
  },
]

const tabItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Target },
  { href: '/oportunidades', label: 'Opor.', icon: Briefcase },
  { href: '/clientes', label: 'Clientes', icon: Building2 },
]

export default function BottomTabBar({ perfil }: { perfil: Perfil }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function canSee(item: MoreItem) {
    if (!item.perfis) return true
    return item.perfis.includes(perfil)
  }

  // Se a rota atual é um dos "Mais", o botão fica ativo
  const isMoreActive =
    !tabItems.some(
      (t) => pathname === t.href || pathname.startsWith(t.href + '/')
    ) && pathname !== '/dashboard'

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 flex h-16">
        {tabItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              {label}
            </Link>
          )
        })}
        <button
          onClick={() => setOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
            isMoreActive ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.5 : 1.75} />
          Mais
        </button>
      </nav>

      {/* Drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-sm font-semibold text-gray-900">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-3 pb-4 grid grid-cols-3 gap-2">
              {moreItems.filter(canSee).map(({ href, label, icon: Icon }) => {
                const isActive =
                  pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon
                      size={22}
                      className={isActive ? 'text-blue-600' : 'text-gray-500'}
                    />
                    {label}
                  </Link>
                )
              })}

              {/* Logout no drawer */}
              <button
                onClick={handleLogout}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium bg-gray-50 text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={22} />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
