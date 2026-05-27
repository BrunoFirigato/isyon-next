import { Resend } from 'resend'

let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY não configurada')
    _resend = new Resend(key)
  }
  return _resend
}

/** Remetente padrão — configure RESEND_FROM_EMAIL para usar seu domínio verificado. */
export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'Isyon CRM <onboarding@resend.dev>'
