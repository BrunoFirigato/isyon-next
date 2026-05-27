import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getResend, FROM_EMAIL } from '@/lib/email/resend'
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

  // Busca nome da empresa (tenant)
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
  const resend = getResend()

  /* ── Enviar proposta por e-mail ── */
  if (action === 'proposta') {
    const { to, proposta } = body as {
      to: string
      proposta: PropostaEmailData
    }

    if (!to?.trim()) {
      return NextResponse.json({ error: 'Destinatário obrigatório' }, { status: 400 })
    }
    if (!proposta?.tituloProposta) {
      return NextResponse.json({ error: 'Dados da proposta inválidos' }, { status: 400 })
    }

    const { error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      [to.trim()],
      subject: propostaEmailSubject(proposta),
      html:    propostaEmailHtml({ ...proposta, remetenteNome: caller.nomeUsuario }),
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

    const { error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      [email.trim()],
      subject: conviteEmailSubject(caller.nomeEmpresa),
      html:    conviteEmailHtml(data),
    })

    if (error) {
      console.error('[email/convite]', error)
      // Não falha — e-mail é secundário ao cadastro
      return NextResponse.json({ ok: true, emailError: error.message })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
