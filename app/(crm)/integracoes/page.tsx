import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import IntegracoesView from './_components/IntegracoesView'

export default async function IntegracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!usuario?.tenant_id) redirect('/dashboard')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, evolution_url, evolution_key, evolution_instance')
    .eq('id', usuario.tenant_id)
    .maybeSingle()

  // Verifica se e-mail está configurado (sistema_config é global)
  const admin = createAdminClient()
  const { data: emailCfg } = await admin
    .from('sistema_config')
    .select('chave, valor')
    .in('chave', ['resend_api_key', 'resend_from_email'])

  const emailMap = Object.fromEntries(
    (emailCfg ?? []).filter(r => r.valor).map(r => [r.chave, r.valor as string])
  )
  const emailConfigurado = !!(emailMap['resend_api_key'] || process.env.RESEND_API_KEY)

  return (
    <IntegracoesView
      tenantId={usuario.tenant_id}
      evolution={{
        url:      (tenant?.evolution_url      as string | null) ?? null,
        key:      (tenant?.evolution_key      as string | null) ?? null,
        instance: (tenant?.evolution_instance as string | null) ?? null,
      }}
      emailConfigurado={emailConfigurado}
    />
  )
}
