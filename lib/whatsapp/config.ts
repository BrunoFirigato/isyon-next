import type { SupabaseClient } from '@supabase/supabase-js'
import type { EvolutionServer } from './evolution'

/**
 * Credenciais do servidor Evolution — nível de PLATAFORMA (Isyon gerencia um
 * servidor para todos os tenants). Ordem de resolução:
 *   1. Variáveis de ambiente EVOLUTION_API_URL / EVOLUTION_API_KEY (recomendado)
 *   2. sistema_config (global, editável pelo superadmin)
 *   3. Fallback: config legada no tenant (compatibilidade durante a transição)
 */
export async function getEvolutionServer(
  admin: SupabaseClient,
  tenantId?: string,
): Promise<EvolutionServer | null> {
  const envUrl = process.env.EVOLUTION_API_URL
  const envKey = process.env.EVOLUTION_API_KEY
  if (envUrl && envKey) return { url: envUrl, key: envKey }

  const { data } = await admin.from('sistema_config').select('chave, valor').in('chave', ['evolution_url', 'evolution_key'])
  const m = Object.fromEntries((data ?? []).filter(r => r.valor).map(r => [r.chave, r.valor as string]))
  if (m.evolution_url && m.evolution_key) return { url: m.evolution_url, key: m.evolution_key }

  if (tenantId) {
    const { data: t } = await admin.from('tenants').select('evolution_url, evolution_key').eq('id', tenantId).maybeSingle()
    if (t?.evolution_url && t?.evolution_key) return { url: t.evolution_url as string, key: t.evolution_key as string }
  }
  return null
}

/** URL pública do webhook (com token). Null se o token não estiver configurado. */
export function webhookUrl(): string | null {
  const token = process.env.WHATSAPP_WEBHOOK_TOKEN
  if (!token) return null
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://crm.isyon.com.br').replace(/\/+$/, '')
  return `${appUrl}/api/whatsapp/webhook?token=${encodeURIComponent(token)}`
}
