import crypto from 'crypto'

/**
 * Cofre de credenciais — cifra/decifra tokens das integrações (token-at-rest).
 *
 * Hoje os tokens (Resend, BrasilNFe, Focus NFe) ficam em TEXTO PURO no banco.
 * Este módulo guarda tudo cifrado com AES-256-GCM (mesmo padrão de bancos/governo):
 * sem a chave-mestra (env INTEGRACOES_SECRET_KEY) o conteúdo é ilegível, e qualquer
 * adulteração é detectada (o GCM tem verificação de integridade embutida).
 *
 * Formato do texto cifrado:  v1.<iv>.<authTag>.<ciphertext>   (tudo em base64)
 * O prefixo "v1." permite a transição suave: o que ainda estiver em texto puro
 * é detectado por isEncrypted() e cifrado na próxima gravação.
 */

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const raw = process.env.INTEGRACOES_SECRET_KEY
  if (!raw) throw new Error('INTEGRACOES_SECRET_KEY não configurada')
  // Aceita uma chave base64 de 32 bytes (recomendado) ou qualquer frase-secreta
  // (derivada para 32 bytes via scrypt).
  const b = Buffer.from(raw, 'base64')
  if (b.length === 32) return b
  return crypto.scryptSync(raw, 'isyon-integracoes', 32)
}

/** Tranca um texto no cofre. */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`
}

/** Destranca um texto do cofre (lança erro se a chave estiver errada ou o dado foi adulterado). */
export function decrypt(payload: string): string {
  const parts = payload.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Formato de cofre inválido')
  const [, ivb, tagb, encb] = parts
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivb, 'base64'))
  decipher.setAuthTag(Buffer.from(tagb, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(encb, 'base64')), decipher.final()]).toString('utf8')
}

/** True se o valor já está cifrado (começa com "v1."). Habilita a transição suave. */
export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith('v1.')
}

/** Lê um valor que pode estar cifrado OU em texto puro (compatibilidade durante a migração). */
export function readSecret(value: string | null | undefined): string | null {
  if (!value) return null
  return isEncrypted(value) ? decrypt(value) : value
}

/** Gera uma chave-mestra nova (base64, 32 bytes) — use uma vez para popular o env. */
export function generateMasterKey(): string {
  return crypto.randomBytes(32).toString('base64')
}
