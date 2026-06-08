import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { obterIntegracao, salvarIntegracao, definirStatus } from '@/lib/integracoes/service'
import { testarOmie } from '@/lib/integracoes/omie'

/** Garante que o chamador é admin do seu tenant. */
async function assertTenantAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: usuario } = await supabase
    .from('usuarios').select('id, tenant_id, perfil').eq('auth_id', user.id).maybeSingle()
  if (!usuario || usuario.perfil !== 'admin' || !usuario.tenant_id) return null
  return { userId: usuario.id as string, tenantId: usuario.tenant_id as string }
}

export async function GET() {
  const caller = await assertTenantAdmin()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const admin = createAdminClient()
  const integ = await obterIntegracao(admin, caller.tenantId, 'omie')
  return NextResponse.json({
    conectado: !!integ && integ.status === 'conectado',
    conta_label: integ?.conta_label ?? null,
  })
}

export async function POST(req: NextRequest) {
  const caller = await assertTenantAdmin()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const admin = createAdminClient()
  const body = await req.json()
  const { action } = body

  if (action === 'conectar') {
    const app_key = String(body.app_key ?? '').trim()
    const app_secret = String(body.app_secret ?? '').trim()
    if (!app_key || !app_secret) return NextResponse.json({ error: 'Informe a App Key e a App Secret.' }, { status: 400 })
    const teste = await testarOmie(app_key, app_secret)
    if (!teste.ok) return NextResponse.json({ error: teste.error ?? 'Credenciais inválidas' }, { status: 400 })
    await salvarIntegracao(admin, {
      tenantId: caller.tenantId, provider: 'omie', categoria: 'erp',
      credenciais: { app_key, app_secret }, status: 'conectado', contaLabel: 'Omie', criadoPor: caller.userId,
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'testar') {
    const integ = await obterIntegracao(admin, caller.tenantId, 'omie')
    if (!integ?.credenciais?.app_key) return NextResponse.json({ error: 'Omie não está conectado.' }, { status: 400 })
    const teste = await testarOmie(integ.credenciais.app_key, integ.credenciais.app_secret)
    await definirStatus(admin, caller.tenantId, 'omie', teste.ok ? 'conectado' : 'erro')
    return NextResponse.json({ ok: teste.ok, error: teste.error })
  }

  if (action === 'desconectar') {
    await admin.from('integracoes').delete().eq('tenant_id', caller.tenantId).eq('provider', 'omie')
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
