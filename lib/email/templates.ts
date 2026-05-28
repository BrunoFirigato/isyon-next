/* ──────────────────────────────────────────────────────────────────────────
   Templates de e-mail HTML simples — sem dependência de react-email.
   Use funções puras que retornam string de HTML.
   ────────────────────────────────────────────────────────────────────────── */

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <!-- header -->
        <tr>
          <td style="background:#2563eb;padding:24px 32px;">
            <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Isyon CRM</span>
          </td>
        </tr>
        <!-- body -->
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Este e-mail foi enviado pelo Isyon CRM. Não responda a esta mensagem.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/* ── Proposta ──────────────────────────────────────────────────────────────── */
export interface PropostaEmailData {
  numeroProposta: string | null
  tituloProposta: string
  nomeCliente: string
  nomeEmpresa: string | null
  valor: number | null
  validade: string | null
  obs: string | null
  itens: { descricao: string; quantidade: number; valorUnitario: number }[]
  remetenteNome: string
  mensagemAbertura?: string | null
}

export function propostaEmailHtml(d: PropostaEmailData): string {
  const valorTotal = d.itens.length > 0
    ? d.itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0)
    : (d.valor ?? 0)

  const itensHtml = d.itens.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-weight:600;">Descrição</th>
          <th style="text-align:center;padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-weight:600;">Qtd</th>
          <th style="text-align:right;padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-weight:600;">Valor unit.</th>
          <th style="text-align:right;padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-weight:600;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${d.itens.map((i) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;">${i.descricao || '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;text-align:center;">${i.quantidade}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;text-align:right;">${brl(i.valorUnitario)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;text-align:right;">${brl(i.quantidade * i.valorUnitario)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:#111827;font-size:14px;">Total</td>
          <td style="padding:12px;text-align:right;font-weight:700;color:#2563eb;font-size:14px;">${brl(valorTotal)}</td>
        </tr>
      </tfoot>
    </table>
  ` : `
    <p style="margin:16px 0;">
      <strong style="font-size:20px;color:#2563eb;">${valorTotal > 0 ? brl(valorTotal) : '—'}</strong>
    </p>
  `

  const body = `
    ${d.mensagemAbertura ? `
    <p style="margin:0 0 24px;font-size:14px;color:#374151;white-space:pre-line;line-height:1.6;">
      ${d.mensagemAbertura.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />
    ` : ''}
    <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">
      ${d.nomeEmpresa ? `${d.nomeEmpresa} — ` : ''}${d.nomeCliente}
    </p>
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#111827;">
      ${d.tituloProposta}
    </h2>
    ${d.numeroProposta ? `<p style="margin:0 0 20px;font-size:13px;color:#9ca3af;font-family:monospace;">${d.numeroProposta}</p>` : '<p style="margin:0 0 20px;"></p>'}

    ${itensHtml}

    ${d.validade ? `
      <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">
        ⏳ <strong>Válida até:</strong> ${new Date(d.validade).toLocaleDateString('pt-BR')}
      </p>
    ` : ''}

    ${d.obs ? `
      <div style="margin:20px 0 0;padding:16px;background:#f9fafb;border-radius:8px;font-size:13px;color:#374151;white-space:pre-line;">
        ${d.obs}
      </div>
    ` : ''}

    <p style="margin:28px 0 0;font-size:13px;color:#6b7280;">
      Atenciosamente,<br/>
      <strong>${d.remetenteNome}</strong>
    </p>
  `

  return layout(`Proposta ${d.numeroProposta ?? d.tituloProposta}`, body)
}

export function propostaEmailSubject(d: Pick<PropostaEmailData, 'numeroProposta' | 'tituloProposta' | 'nomeEmpresa'>): string {
  const num = d.numeroProposta ? `[${d.numeroProposta}] ` : ''
  const empresa = d.nomeEmpresa ? ` — ${d.nomeEmpresa}` : ''
  return `${num}${d.tituloProposta}${empresa}`
}

/* ── Convite de usuário ────────────────────────────────────────────────────── */
export interface ConviteEmailData {
  nomeUsuario: string
  email: string
  senha: string
  nomeEmpresa: string
  urlApp: string
}

export function conviteEmailHtml(d: ConviteEmailData): string {
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
      Bem-vindo ao Isyon CRM, ${d.nomeUsuario}! 👋
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">
      Você foi adicionado à empresa <strong>${d.nomeEmpresa}</strong>.
      Use as credenciais abaixo para acessar o sistema.
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:0 0 24px;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 16px 4px 0;font-size:13px;color:#6b7280;font-weight:600;">E-mail</td>
          <td style="padding:4px 0;font-size:13px;color:#111827;font-family:monospace;">${d.email}</td>
        </tr>
        <tr>
          <td style="padding:4px 16px 4px 0;font-size:13px;color:#6b7280;font-weight:600;">Senha</td>
          <td style="padding:4px 0;font-size:13px;color:#111827;font-family:monospace;">${d.senha}</td>
        </tr>
      </table>
    </div>

    <a href="${d.urlApp}"
       style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Acessar o sistema →
    </a>

    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
      Por segurança, altere sua senha no primeiro acesso em <strong>Configurações</strong>.
    </p>
  `

  return layout('Bem-vindo ao Isyon CRM', body)
}

export function conviteEmailSubject(nomeEmpresa: string): string {
  return `Bem-vindo ao Isyon CRM — ${nomeEmpresa}`
}
