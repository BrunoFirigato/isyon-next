'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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
  X,
  BookOpen,
  Package,
  Tag,
  Calendar,
  Megaphone,
  Plug,
} from 'lucide-react'

type Perfil = 'admin' | 'gestor' | 'vendedor' | 'financeiro'

interface MoreItem {
  href: string
  label: string
  icon: React.ElementType
  perfis?: Perfil[]
}

interface MoreGroup {
  label: string
  items: MoreItem[]
}

const moreGroups: MoreGroup[] = [
  {
    label: 'Comercial',
    items: [
      { href: '/agenda',    label: 'Agenda',    icon: Calendar },
      { href: '/campanhas', label: 'Campanhas', icon: Megaphone },
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
      { href: '/tabelas-preco', label: 'Tab. preço', icon: Tag, perfis: ['admin', 'gestor'] },
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
    label: 'Integrações',
    items: [
      { href: '/integracoes', label: 'Integrações', icon: Plug, perfis: ['admin'] },
    ],
  },
  {
    label: 'Administração',
    items: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings2 },
      { href: '/usuarios',      label: 'Usuários',      icon: Users2,    perfis: ['admin'] },
      { href: '/empresas',      label: 'Empresas',      icon: Building2, perfis: ['admin'] },
    ],
  },
]

const tabItems = [
  { href: '/dashboard',     label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads',         label: 'Leads',     icon: Target },
  { href: '/oportunidades', label: 'Opor.',     icon: Briefcase },
  { href: '/clientes',      label: 'Clientes',  icon: Building2 },
]

export default function BottomTabBar({ perfil }: { perfil: Perfil }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function canSee(item: MoreItem) {
    if (!item.perfis) return true
    return item.perfis.includes(perfil)
  }

  // Se a rota atual não está nos tabs fixos, o botão "Mais" fica ativo
  const isMoreActive = !tabItems.some(
    (t) => pathname === t.href || pathname.startsWith(t.href + '/')
  )

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex"
        style={{ height: 'calc(4rem + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative ${
                isActive ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
              <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50' : ''}`}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} />
              </div>
              {label}
            </Link>
          )
        })}
        <button
          onClick={() => setOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative ${
            isMoreActive ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {isMoreActive && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
          )}
          <div className={`p-1.5 rounded-xl transition-colors ${isMoreActive ? 'bg-blue-50' : ''}`}>
            <MoreHorizontal size={18} strokeWidth={isMoreActive ? 2.5 : 1.75} />
          </div>
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
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-3 pb-4 space-y-3">
              {moreGroups.map((group) => {
                const visibleItems = group.items.filter(canSee)
                if (visibleItems.length === 0) return null
                return (
                  <div key={group.label}>
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-1.5">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {visibleItems.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href || pathname.startsWith(href + '/')
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors ${
                              isActive
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Icon size={22} className={isActive ? 'text-white' : 'text-gray-500'} />
                            {label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
