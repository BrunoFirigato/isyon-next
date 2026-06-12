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

/** HTML do e-mail de confirmação de cadastro (Camada 3). */
export function emailConfirmacaoHtml(nome: string, link: string): string {
  const primeiroNome = (nome || '').split(' ')[0] || 'olá'
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;text-align:center">
      <h1 style="font-size:20px;margin:0 0 8px">Confirme seu e-mail</h1>
      <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6">
        Olá, ${primeiroNome}! Falta só um passo para ativar sua conta no <strong>Isyon CRM</strong>.
        Clique no botão abaixo para confirmar seu e-mail e acessar o sistema.
      </p>
      <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px">
        Confirmar e-mail
      </a>
      <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;line-height:1.6">
        Se você não criou esta conta, ignore este e-mail.
      </p>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin:16px 0 0">Isyon CRM</p>
  </div>
  </body></html>`
}

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
