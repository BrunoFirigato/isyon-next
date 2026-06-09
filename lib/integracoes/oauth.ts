import type { SupabaseClient } from '@supabase/supabase-js'
import { obterIntegracao, salvarIntegracao, type Categoria } from './service'

/**
 * Framework OAuth2 genérico das Integrações (peça 0.3 da Fundação).
 * Cada provedor é uma config no registry. Tokens são guardados CIFRADOS (cofre)
 * via service.salvarIntegracao; expira_em fica no config (não secreto).
 * client_id/secret são da PLATAFORMA (env) — o Isyon registra 1 app por provedor.
 */

type AuthStyle = 'basic' | 'body'

interface OAuthProvider {
  authUrl: string
  tokenUrl: string
  scopes?: string
  categoria: Categoria
  authStyle: AuthStyle            // como mandar client_id/secret no /token
  label: string
  clientId: () => string | undefined
  clientSecret: () => string | undefined
  extraAuthParams?: Record<string, string>
}

export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  bling: {
    authUrl:  'https://www.bling.com.br/Api/v3/oauth/authorize',
    tokenUrl: 'https://www.bling.com.br/Api/v3/oauth/token',
    categoria: 'erp',
    authStyle: 'basic',
    label: 'Bling',
    clientId:     () => process.env.BLING_CLIENT_ID,
    clientSecret: () => process.env.BLING_CLIENT_SECRET,
  },
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://crm.isyon.com.br').replace(/\/+$/, '')
}
export function redirectUri(provider: string) {
  return `${appUrl()}/api/integracoes/${provider}/callback`
}

/** True se o provedor existe E tem credenciais de app configuradas (env). */
export function oauthConfigurado(provider: string): boolean {
  const p = OAUTH_PROVIDERS[provider]
  return !!p && !!p.clientId() && !!p.clientSecret()
}

/** Monta a URL de autorização (ou null se provedor/credenciais ausentes). */
export function authorizeUrl(provider: string, state: string): string | null {
  const p = OAUTH_PROVIDERS[provider]
  const cid = p?.clientId()
  if (!p || !cid) return null
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cid,
    state,
    redirect_uri: redirectUri(provider),
    ...(p.scopes ? { scope: p.scopes } : {}),
    ...(p.extraAuthParams ?? {}),
  })
  return `${p.authUrl}?${params.toString()}`
}

interface TokenResp {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  error?: string
  error_description?: string
}

async function postToken(provider: string, body: Record<string, string>): Promise<TokenResp> {
  const p = OAUTH_PROVIDERS[provider]
  const cid = p.clientId()!, secret = p.clientSecret()!
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  }
  const form = new URLSearchParams(body)
  if (p.authStyle === 'basic') {
    headers.Authorization = 'Basic ' + Buffer.from(`${cid}:${secret}`).toString('base64')
  } else {
    form.set('client_id', cid); form.set('client_secret', secret)
  }
  try {
    const res = await fetch(p.tokenUrl, { method: 'POST', headers, body: form.toString() })
    return await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro de conexão' }
  }
}

export function exchangeCode(provider: string, code: string): Promise<TokenResp> {
  return postToken(provider, { grant_type: 'authorization_code', code, redirect_uri: redirectUri(provider) })
}
export function refreshAccess(provider: string, refreshToken: string): Promise<TokenResp> {
  return postToken(provider, { grant_type: 'refresh_token', refresh_token: refreshToken })
}

/** Persiste os tokens (cifrados) + expira_em no config. */
export async function salvarTokens(
  admin: SupabaseClient, tenantId: string, provider: string, tok: TokenResp, criadoPor?: string | null,
) {
  const p = OAUTH_PROVIDERS[provider]
  const expiresAt = tok.expires_in ? new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString() : null
  await salvarIntegracao(admin, {
    tenantId, provider, categoria: p.categoria,
    credenciais: { access_token: tok.access_token ?? '', refresh_token: tok.refresh_token ?? '' },
    config: { expires_at: expiresAt },
    status: 'conectado', contaLabel: p.label, criadoPor,
  })
}

/** Access token válido — renova via refresh_token se expirado. null se não der. */
export async function getValidAccessToken(
  admin: SupabaseClient, tenantId: string, provider: string,
): Promise<string | null> {
  const integ = await obterIntegracao(admin, tenantId, provider)
  if (!integ?.credenciais?.access_token) return null
  const expiresAt = integ.config?.expires_at as string | undefined
  const expirado = !expiresAt || new Date(expiresAt).getTime() < Date.now()
  if (!expirado) return integ.credenciais.access_token

  const rt = integ.credenciais.refresh_token
  if (!rt) return integ.credenciais.access_token
  const tok = await refreshAccess(provider, rt)
  if (!tok.access_token) {
    await salvarIntegracao(admin, { tenantId, provider, status: 'expirado' })
    return null
  }
  await salvarTokens(admin, tenantId, provider, { ...tok, refresh_token: tok.refresh_token ?? rt })
  return tok.access_token
}
