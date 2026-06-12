// lib/cadastro/guards.ts
// Guard-rails do autocadastro público (Camada 1 — sem dependência externa):
// validação de e-mail, bloqueio de domínios descartáveis, honeypot anti-bot e
// extração de IP para rate-limit. Usado por app/api/cadastro/route.ts.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Validação simples de formato de e-mail (a confirmação real vem na Camada 3). */
export function isEmailValido(email: string): boolean {
  return EMAIL_RE.test(email.trim().toLowerCase())
}

// Domínios de e-mail descartável/temporário mais comuns. Não é exaustivo —
// é a primeira linha contra abuso óbvio (bots de teste, throwaway).
const DOMINIOS_DESCARTAVEIS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'sharklasers.com',
  '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org',
  'yopmail.com', 'trashmail.com', 'getnada.com', 'nada.email', 'dispostable.com',
  'maildrop.cc', 'mailnesia.com', 'fakeinbox.com', 'throwawaymail.com',
  'mintemail.com', 'mohmal.com', 'emailondeck.com', 'tempinbox.com',
  'spamgourmet.com', 'trbvm.com', 'mailcatch.com', 'inboxbear.com',
  'tempr.email', 'discard.email', 'maileater.com', 'spam4.me', 'grr.la',
  'guerrillamailblock.com', 'pokemail.net', 'tmail.ws', 'moakt.com',
])

/** true se o e-mail usa um domínio descartável/temporário conhecido. */
export function isEmailDescartavel(email: string): boolean {
  const dominio = email.trim().toLowerCase().split('@')[1] ?? ''
  return DOMINIOS_DESCARTAVEIS.has(dominio)
}

/** IP do cliente a partir dos headers (Vercel popula x-forwarded-for). */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip')?.trim() || 'desconhecido'
}

// Rate-limit por IP: nº máximo de tentativas dentro da janela.
export const RATE_LIMIT_MAX = 5
export const RATE_LIMIT_JANELA_MIN = 60

/**
 * Valida o token do Cloudflare Turnstile (Camada 2). Gated: o chamador só
 * invoca se TURNSTILE_SECRET_KEY estiver definida. Fail-closed em erro de rede
 * (retorna false) — quem chama decide se isso bloqueia.
 */
export async function verifyTurnstile(token: string, secret: string, ip?: string): Promise<boolean> {
  try {
    const form = new URLSearchParams()
    form.append('secret', secret)
    form.append('response', token)
    if (ip && ip !== 'desconhecido') form.append('remoteip', ip)
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    })
    const j = await r.json()
    return !!j.success
  } catch {
    return false
  }
}
