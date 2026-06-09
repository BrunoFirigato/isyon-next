import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_FROM = 'Isyon CRM <onboarding@resend.dev>'

/** Garante um remetente válido. Vazio/malformado → cai no padrão (formato 'email' ou 'Nome <email>'). */
function normalizeFrom(v?: string | null): string {
  const s = (v ?? '').trim()
  return s && /@.+\..+/.test(s) ? s : DEFAULT_FROM
}

/**
 * Lê a configuração de e-mail com prioridade:
 * 1. Chave do tenant (tenants.resend_api_key)
 * 2. Global (sistema_config)
 * 3. Variável de ambiente
 *
 * Lança 'email_not_configured' se nenhuma chave for encontrada.
 */
export async function getEmailConfig(tenantId?: string): Promise<{ apiKey: string; fromEmail: string }> {
  const admin = createAdminClient()

  // 1. Chave específica do tenant
  if (tenantId) {
    const { data: tenant } = await admin
      .from('tenants')
      .select('resend_api_key, resend_from_email')
      .eq('id', tenantId)
      .maybeSingle()

    if (tenant?.resend_api_key) {
      return {
        apiKey:    tenant.resend_api_key,
        fromEmail: normalizeFrom(tenant.resend_from_email),
      }
    }
  }

  // 2. Chave global (sistema_config — configurada pelo superadmin)
  const { data } = await admin
    .from('sistema_config')
    .select('chave, valor')
    .in('chave', ['resend_api_key', 'resend_from_email'])

  const map = Object.fromEntries(
    (data ?? [])
      .filter((r) => r.valor)
      .map((r) => [r.chave, r.valor as string])
  )

  const apiKey    = map['resend_api_key']    ?? process.env.RESEND_API_KEY    ?? ''
  const fromEmail = normalizeFrom(map['resend_from_email'] ?? process.env.RESEND_FROM_EMAIL)

  if (!apiKey) throw new Error('email_not_configured')

  return { apiKey, fromEmail }
}

/** Cria uma instância do Resend com a config do tenant (ou plataforma como fallback). */
export async function createResend(tenantId?: string): Promise<{ resend: Resend; fromEmail: string }> {
  const { apiKey, fromEmail } = await getEmailConfig(tenantId)
  return { resend: new Resend(apiKey), fromEmail }
}
