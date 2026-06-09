import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { authorizeUrl, OAUTH_PROVIDERS } from '@/lib/integracoes/oauth'

/** Inicia o fluxo OAuth: gera state anti-CSRF (cookie) e redireciona ao provedor. Admin-only. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  if (!OAUTH_PROVIDERS[provider]) {
    return NextResponse.json({ error: 'Provedor inválido' }, { status: 404 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))
  const { data: usuario } = await supabase
    .from('usuarios').select('perfil, tenant_id').eq('auth_id', user.id).maybeSingle()
  if (!usuario || usuario.perfil !== 'admin' || !usuario.tenant_id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const state = crypto.randomBytes(16).toString('hex')
  const url = authorizeUrl(provider, state)
  if (!url) {
    const back = new URL('/integracoes', req.url)
    back.searchParams.set('erro', provider)
    back.searchParams.set('motivo', 'app_nao_configurado')
    return NextResponse.redirect(back)
  }

  const jar = await cookies()
  jar.set(`oauth_state_${provider}`, state, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/',
  })
  return NextResponse.redirect(url)
}
