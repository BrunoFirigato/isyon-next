import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from './_components/Sidebar'
import TopBar from './_components/TopBar'
import BottomTabBar from './_components/BottomTabBar'
import { ToastProvider } from './_components/Toast'
import { TenantProvider } from './_components/TenantContext'
import { SegmentosProvider, DEFAULT_SEGMENTOS } from './_components/SegmentosContext'
import { BreadcrumbProvider } from './_components/BreadcrumbContext'

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Superadmin não tem tenant próprio — não pode ser barrado pela trava de tenant abaixo
  const isSuperadmin = user.email === 'sa@isyon.com.br'

  // Busca perfil e tenant_id do usuário
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('perfil, tenant_id')
    .eq('auth_id', user.id)
    .maybeSingle()

  const perfil = usuario?.perfil ?? (isSuperadmin ? 'admin' : 'vendedor')
  const tenantId = usuario?.tenant_id ?? ''

  if (!tenantId && !isSuperadmin) redirect('/login')

  // Busca segmentos configurados pelo tenant (superadmin sem tenant usa os padrões)
  const { data: tenant } = tenantId
    ? await supabase
        .from('tenants')
        .select('segmentos, whatsapp_template, email_template_assunto, email_template_corpo, divisao_carteira, aprovacao_pedido')
        .eq('id', tenantId)
        .maybeSingle()
    : { data: null }

  const segmentos = (tenant?.segmentos as typeof DEFAULT_SEGMENTOS | null) ?? DEFAULT_SEGMENTOS
  const whatsappTemplate      = (tenant?.whatsapp_template       as string | null) ?? null
  const emailTemplateAssunto  = (tenant?.email_template_assunto  as string | null) ?? null
  const emailTemplateCorpo    = (tenant?.email_template_corpo    as string | null) ?? null
  const divisaoCarteira       = (tenant?.divisao_carteira        as boolean | null) ?? false
  const aprovacaoPedido       = (tenant?.aprovacao_pedido        as boolean | null) ?? false

  return (
    <TenantProvider
      tenantId={tenantId}
      perfil={perfil}
      divisaoCarteira={divisaoCarteira}
      aprovacaoPedido={aprovacaoPedido}
      whatsappTemplate={whatsappTemplate}
      emailTemplateAssunto={emailTemplateAssunto}
      emailTemplateCorpo={emailTemplateCorpo}
    >
      <SegmentosProvider segmentos={segmentos}>
        <BreadcrumbProvider>
        <ToastProvider>
          <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
            <Sidebar userEmail={user.email ?? ''} perfil={perfil} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <TopBar
                userEmail={user.email ?? ''}
                userName={(user.user_metadata?.name as string | undefined) ?? user.email?.split('@')[0] ?? ''}
              />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
                {children}
              </main>
            </div>
            <BottomTabBar perfil={perfil} />
          </div>
        </ToastProvider>
        </BreadcrumbProvider>
      </SegmentosProvider>
    </TenantProvider>
  )
}
