'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTenantConfig } from './TenantContext'
import WhatsAppIcon from './WhatsAppIcon'
import {
  LayoutDashboard,
  Target,
  Briefcase,
  Building2,
  Users2,
  FileText,
  ShoppingCart,
  BarChart3,
  Settings2,
  UserCog,
  ShieldAlert,
  Truck,
  CreditCard,
  Package,
  Tag,
  Calendar,
  Megaphone,
  Plug,
  Store,
  Handshake,
  Database,
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

const navGroups: { label: string; icon: React.ElementType; items: NavItem[] }[] = [
  {
    label: 'Comercial',
    icon: Store,
    items: [
      { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/leads',         label: 'Leads',        icon: Target },
      { href: '/oportunidades', label: 'Oportunidades',icon: Briefcase },
      { href: '/clientes',      label: 'Clientes',     icon: Building2 },
      { href: '/agenda',        label: 'Agenda',       icon: Calendar },
      { href: '/conversas',     label: 'WhatsApp',     icon: WhatsAppIcon },
      { href: '/campanhas',     label: 'Campanhas',    icon: Megaphone },
    ],
  },
  {
    label: 'Vendas',
    icon: Handshake,
    items: [
      { href: '/propostas', label: 'Propostas', icon: FileText },
      { href: '/pedidos',   label: 'Pedidos',   icon: ShoppingCart },
    ],
  },
  {
    label: 'Cadastros',
    icon: Database,
    items: [
      { href: '/produtos',   label: 'Produtos',   icon: Package },
      { href: '/tabelas-preco', label: 'Tabelas de preço', icon: Tag, perfis: ['admin', 'gestor'] },
      { href: '/vendedores', label: 'Vendedores', icon: UserCog,  perfis: ['admin', 'gestor'] },
      { href: '/parceiros',  label: 'Parc. Comerciais', icon: Users2 },
      { href: '/transportadoras',     label: 'Transportadoras', icon: Truck,      perfis: ['admin', 'gestor'] },
      { href: '/condicoes-pagamento', label: 'Cond. Pagamento', icon: CreditCard, perfis: ['admin', 'gestor'] },
    ],
  },
  {
    label: 'Análises',
    icon: BarChart3,
    items: [
      { href: '/relatorios', label: 'Relatórios', icon: BarChart3, perfis: ['admin', 'gestor', 'financeiro'] },
    ],
  },
  {
    label: 'Integrações',
    icon: Plug,
    items: [
      { href: '/integracoes', label: 'Integrações', icon: Plug, perfis: ['admin'] },
    ],
  },
  {
    label: 'Administração',
    icon: Settings2,
    items: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings2 },
      { href: '/usuarios',      label: 'Usuários',      icon: Users2,      perfis: ['admin'] },
      { href: '/empresas',      label: 'Empresas',      icon: Building2,   perfis: ['admin'] },
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
  const { usaParceiros } = useTenantConfig()
  const [collapsed,       setCollapsed]       = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [waUnread,        setWaUnread]        = useState(0)

  // Nº de CONVERSAS de WhatsApp com mensagem não lida (não arquivadas) — não o total de mensagens.
  // Atualiza ao montar, ao trocar de tela e quando a aba volta ao foco.
  useEffect(() => {
    const supabase = createClient()
    let alive = true
    const load = async () => {
      const { count } = await supabase
        .from('wa_conversas')
        .select('id', { count: 'exact', head: true })
        .eq('arquivada', false)
        .gt('nao_lidas', 0)
      if (!alive) return
      setWaUnread(count ?? 0)
    }
    load()
    const t = setInterval(load, 10000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { alive = false; clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [pathname])

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
    // Parceiros comerciais é recurso opcional por tenant
    if (item.href === '/parceiros') return usaParceiros
    if (!item.perfis) return true
    // Superadmin só para o e-mail específico
    if (item.href === '/superadmin') return userEmail === 'sa@isyon.com.br'
    return item.perfis.includes(perfil)
  }

  // Item com rótulo — usado no menu expandido E no flyout do menu colapsado
  function renderItem({ href, label, icon: Icon }: NavItem) {
    const isActive = pathname === href || pathname.startsWith(href + '/')
    const badge = href === '/conversas' ? waUnread : 0
    return (
      <Link
        key={href}
        href={href}
        className={`
          relative flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors
          ${isActive
            ? 'bg-blue-600 text-white font-medium'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}
        `}
      >
        <Icon size={15} className={isActive ? 'text-white shrink-0' : 'text-gray-400 dark:text-gray-500 shrink-0'} />
        <span className="truncate">{label}</span>
        {badge > 0 && (
          <span className="ml-auto shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside
      className={`
        relative hidden md:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full shrink-0
        transition-all duration-200 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-56'}
      `}
    >
      {/* ── Marca (mesma altura do topbar) ─────────────────────────────── */}
      <div className="h-14 flex items-center px-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.svg" alt="Isyon" className={collapsed ? 'w-10 h-10 mx-auto' : 'w-8 h-8 shrink-0'} />
        {!collapsed && (
          <span className="font-bold text-gray-900 dark:text-gray-100 truncate ml-2.5">Isyon CRM</span>
        )}
      </div>

      {/* Recolher/expandir — botão flutuante na borda lateral */}
      <button
        onClick={toggle}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className="absolute top-4 -right-3 z-20 w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      {/* ── Navegação ──────────────────────────────────────────────────── */}
      {/* Colapsada não rola (6 ícones de grupo cabem) — e overflow visível deixa o flyout aparecer */}
      <nav className={`sidebar-nav flex-1 py-3 space-y-4 px-2 ${collapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(canSee)
          if (visibleItems.length === 0) return null

          // Se a rota ativa está neste grupo, destacamos (e, expandida, forçamos expansão)
          const hasActive = visibleItems.some(
            ({ href }) => pathname === href || pathname.startsWith(href + '/')
          )

          // ── Menu COLAPSADO: 1 ícone por grupo + flyout dos itens no hover ──
          if (collapsed) {
            const GroupIcon = group.icon
            const groupBadge = visibleItems.some((i) => i.href === '/conversas') ? waUnread : 0
            return (
              <div key={group.label} className="relative group/fly flex justify-center">
                <Link
                  href={visibleItems[0].href}
                  title={group.label}
                  className={`relative flex items-center justify-center w-11 h-11 rounded-lg transition-colors ${
                    hasActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                      : 'text-gray-400 dark:text-gray-500 group-hover/fly:bg-gray-100 dark:group-hover/fly:bg-gray-800 group-hover/fly:text-gray-600 dark:group-hover/fly:text-gray-300'
                  }`}
                >
                  <GroupIcon size={19} className="shrink-0" />
                  {groupBadge > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                      {groupBadge > 99 ? '99+' : groupBadge}
                    </span>
                  )}
                </Link>

                {/* Flyout — pl-2 cria a "ponte" de hover sem buraco entre ícone e painel */}
                <div className="absolute left-full top-0 z-30 hidden group-hover/fly:block pl-2">
                  <div className="w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-2 max-h-[80vh] overflow-y-auto">
                    <p className="px-2 pb-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {visibleItems.map((item) => renderItem(item))}
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          // ── Menu EXPANDIDO: cabeçalho recolhível + itens ──
          const groupCollapsed = !!collapsedGroups[group.label] && !hasActive
          return (
            <div key={group.label}>
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

              {!groupCollapsed && (
                <div className="space-y-0.5">
                  {visibleItems.map((item) => renderItem(item))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
