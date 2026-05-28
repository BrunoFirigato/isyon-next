import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createResend } from '@/lib/email/resend'
import {
  propostaEmailHtml, propostaEmailSubject,
  conviteEmailHtml, conviteEmailSubject,
  type PropostaEmailData, type ConviteEmailData,
} from '@/lib/email/templates'

/** Verifica que o chamador está autenticado no CRM (qualquer perfil). */
async function assertAuthenticated() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, tenant_id, perfil')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!usuario?.tenant_id) return null

  const { data: tenant } = await supabase
    .from('tenants')
    .select('nome')
    .eq('id', usuario.tenant_id)
    .maybeSingle()

  return {
    userId:      usuario.id,
    nomeUsuario: usuario.nome,
    tenantId:    usuario.tenant_id,
    nomeEmpresa: tenant?.nome ?? 'Isyon CRM',
  }
}

export async function POST(req: NextRequest) {
  const caller = await assertAuthenticated()
  if (!caller) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { action } = body

  let resend: Awaited<ReturnType<typeof createResend>>
  try {
    resend = await createResend()
  } catch {
    return NextResponse.json(
      { error: 'email_not_configured', message: 'Integração de e-mail não configurada.' },
      { status: 503 }
    )
  }

  /* ── Enviar proposta por e-mail ── */
  if (action === 'proposta') {
    const { to, proposta, assunto, mensagemAbertura } = body as {
      to: string
      proposta: PropostaEmailData
      assunto?: string
      mensagemAbertura?: string
    }

    if (!to?.trim()) {
      return NextResponse.json({ error: 'Destinatário obrigatório' }, { status: 400 })
    }

    const subject = assunto?.trim() || propostaEmailSubject(proposta)

    const { error } = await resend.resend.emails.send({
      from:    resend.fromEmail,
      to:      [to.trim()],
      subject,
      html:    propostaEmailHtml({ ...proposta, remetenteNome: caller.nomeUsuario, mensagemAbertura: mensagemAbertura || null }),
    })

    if (error) {
      console.error('[email/proposta]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  /* ── Enviar e-mail de convite/boas-vindas ── */
  if (action === 'convite') {
    const { nomeUsuario, email, senha } = body as ConviteEmailData

    if (!email?.trim() || !senha?.trim()) {
      return NextResponse.json({ error: 'e-mail e senha obrigatórios' }, { status: 400 })
    }

    const urlApp = process.env.NEXT_PUBLIC_APP_URL ?? 'https://isyon-next.vercel.app'
    const data: ConviteEmailData = {
      nomeUsuario: nomeUsuario ?? email,
      email:       email.trim(),
      senha,
      nomeEmpresa: caller.nomeEmpresa,
      urlApp,
    }

    const { error } = await resend.resend.emails.send({
      from:    resend.fromEmail,
      to:      [email.trim()],
      subject: conviteEmailSubject(caller.nomeEmpresa),
      html:    conviteEmailHtml(data),
    })

    if (error) {
      console.error('[email/convite]', error)
      return NextResponse.json({ ok: true, emailError: error.message })
    }

    return NextResponse.json({ ok: true })
  }

  /* ── Testar configuração de e-mail ── */
  if (action === 'testar') {
    const { destinatario } = body as { destinatario: string }

    if (!destinatario?.trim()) {
      return NextResponse.json({ error: 'Destinatário obrigatório' }, { status: 400 })
    }

    const { error } = await resend.resend.emails.send({
      from:    resend.fromEmail,
      to:      [destinatario.trim()],
      subject: 'Teste de e-mail — Isyon CRM',
      html:    `<p>A integração de e-mail está funcionando corretamente. ✅</p>
                <p style="color:#6b7280;font-size:13px;">Enviado por: ${resend.fromEmail}</p>`,
    })

    if (error) {
      console.error('[email/testar]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
