import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeCode, salvarTokens, OAUTH_PROVIDERS } from '@/lib/integracoes/oauth'

/** Retorno do provedor OAuth: valida state, troca code por token e guarda (cifrado). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const back = new URL('/integracoes', req.url)

  const jar = await cookies()
  const saved = jar.get(`oauth_state_${provider}`)?.value
  jar.delete(`oauth_state_${provider}`)

  if (!OAUTH_PROVIDERS[provider] || !code || !state || !saved || state !== saved) {
    back.searchParams.set('erro', provider)
    return NextResponse.redirect(back)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))
  const { data: usuario } = await supabase
    .from('usuarios').select('id, perfil, tenant_id').eq('auth_id', user.id).maybeSingle()
  if (!usuario?.tenant_id || usuario.perfil !== 'admin') {
    back.searchParams.set('erro', provider)
    return NextResponse.redirect(back)
  }

  const tok = await exchangeCode(provider, code)
  if (!tok.access_token) {
    back.searchParams.set('erro', provider)
    return NextResponse.redirect(back)
  }

  const admin = createAdminClient()
  await salvarTokens(admin, usuario.tenant_id, provider, tok, usuario.id as string)

  back.searchParams.set('ok', provider)
  return NextResponse.redirect(back)
}
