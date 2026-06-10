/** Slug legível: remove acentos, baixa caixa, troca não-alfanuméricos por hífen. */
export function slugifyShare(s: string, max = 40): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max)
}

/**
 * Token de compartilhamento da proposta — profissional e seguro:
 * número da proposta + nome do cliente + sufixo aleatório (8 hex).
 */
export function gerarShareToken(numero: string | null, clienteNome: string | null): string {
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  const numPart = slugifyShare(numero ?? 'proposta', 20)
  const nomePart = slugifyShare(clienteNome ?? '', 30)
  return [numPart, nomePart, rand].filter(Boolean).join('-')
}

/** Mensagem padrão de envio da proposta (WhatsApp / link). */
export function mensagemProposta(opts: { clienteNome?: string | null; numero?: string | null; url: string }): string {
  const nome = opts.clienteNome ? ` ${opts.clienteNome}` : ''
  const num = opts.numero ? ` ${opts.numero}` : ''
  return `Olá${nome}! Segue nossa proposta${num} para sua avaliação. Você pode visualizar e responder pelo link:\n${opts.url}`
}
