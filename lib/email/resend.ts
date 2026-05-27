import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_FROM = 'Isyon CRM <onboarding@resend.dev>'

/**
 * Lê a configuração de e-mail do banco (sistema_config).
 * Fallback para variáveis de ambiente se não houver registro.
 * Lança 'email_not_configured' se nenhuma chave for encontrada.
 */
export async function getEmailConfig(): Promise<{ apiKey: string; fromEmail: string }> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('sistema_config')
    .select('chave, valor')
    .in('chave', ['resend_api_key', 'resend_from_email'])

  const map = Object.fromEntries(
    (data ?? [])
      .filter((r) => r.valor)
      .map((r) => [r.chave, r.valor as string])
  )

  const apiKey = map['resend_api_key'] ?? process.env.RESEND_API_KEY ?? ''
  const fromEmail = map['resend_from_email'] ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM

  if (!apiKey) throw new Error('email_not_configured')

  return { apiKey, fromEmail }
}

/** Cria uma instância do Resend com a config do banco. */
export async function createResend(): Promise<{ resend: Resend; fromEmail: string }> {
  const { apiKey, fromEmail } = await getEmailConfig()
  return { resend: new Resend(apiKey), fromEmail }
}
