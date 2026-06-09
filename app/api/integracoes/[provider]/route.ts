import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { obterIntegracao } from '@/lib/integracoes/service'
import { OAUTH_PROVIDERS, oauthConfigurado } from '@/lib/integracoes/oauth'

async function assertTenantAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: usuario } = await supabase
    .from('usuarios').select('id, tenant_id, perfil').eq('auth_id', user.id).maybeSingle()
  if (!usuario || usuario.perfil !== 'admin' || !usuario.tenant_id) return null
  return { userId: usuario.id as string, tenantId: usuario.tenant_id as string }
}

/** Status da integração OAuth (conectado? + app configurado na plataforma?). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  if (!OAUTH_PROVIDERS[provider]) return NextResponse.json({ error: 'Provedor inválido' }, { status: 404 })
  const caller = await assertTenantAdmin()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()
  const integ = await obterIntegracao(admin, caller.tenantId, provider)
  return NextResponse.json({
    conectado: !!integ && integ.status === 'conectado',
    appConfigurado: oauthConfigurado(provider),
    conta_label: integ?.conta_label ?? null,
  })
}

/** Ações: desconectar. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  if (!OAUTH_PROVIDERS[provider]) return NextResponse.json({ error: 'Provedor inválido' }, { status: 404 })
  const caller = await assertTenantAdmin()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  if (body.action === 'desconectar') {
    const admin = createAdminClient()
    await admin.from('integracoes').delete().eq('tenant_id', caller.tenantId).eq('provider', provider)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
