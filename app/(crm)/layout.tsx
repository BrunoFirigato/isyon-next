import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from './_components/Sidebar'
import TopBar from './_components/TopBar'
import BottomTabBar from './_components/BottomTabBar'
import { ToastProvider } from './_components/Toast'
import { TenantProvider } from './_components/TenantContext'
import { SegmentosProvider, DEFAULT_SEGMENTOS } from './_components/SegmentosContext'

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

  // Busca perfil e tenant_id do usuário
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('perfil, tenant_id')
    .eq('auth_id', user.id)
    .maybeSingle()

  const perfil = usuario?.perfil ?? 'vendedor'
  const tenantId = usuario?.tenant_id ?? ''

  if (!tenantId) redirect('/login')

  // Busca segmentos configurados pelo tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('segmentos, whatsapp_template, email_template_assunto, email_template_corpo')
    .eq('id', tenantId)
    .maybeSingle()

  const segmentos = (tenant?.segmentos as typeof DEFAULT_SEGMENTOS | null) ?? DEFAULT_SEGMENTOS
  const whatsappTemplate      = (tenant?.whatsapp_template       as string | null) ?? null
  const emailTemplateAssunto  = (tenant?.email_template_assunto  as string | null) ?? null
  const emailTemplateCorpo    = (tenant?.email_template_corpo    as string | null) ?? null

  return (
    <TenantProvider
      tenantId={tenantId}
      whatsappTemplate={whatsappTemplate}
      emailTemplateAssunto={emailTemplateAssunto}
      emailTemplateCorpo={emailTemplateCorpo}
    >
      <SegmentosProvider segmentos={segmentos}>
        <ToastProvider>
          <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar userEmail={user.email ?? ''} perfil={perfil} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <TopBar userEmail={user.email ?? ''} />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
                {children}
              </main>
            </div>
            <BottomTabBar perfil={perfil} />
          </div>
        </ToastProvider>
      </SegmentosProvider>
    </TenantProvider>
  )
}
