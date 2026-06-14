import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createResend } from '@/lib/email/resend'
import {
  isEmailValido, isEmailDescartavel, isEmailPessoal, getClientIp, verifyTurnstile,
  emailConfirmacaoHtml, RATE_LIMIT_MAX, RATE_LIMIT_JANELA_MIN,
} from '@/lib/cadastro/guards'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nomeEmpresa, nome, email, senha, website } = body

  // Honeypot: campo invisível no formulário; só bots o preenchem.
  if (typeof website === 'string' && website.trim() !== '')
    return NextResponse.json({ error: 'Cadastro inválido.' }, { status: 400 })

  // Validações
  if (!nomeEmpresa?.trim())
    return NextResponse.json({ error: 'Nome da empresa é obrigatório' }, { status: 400 })
  if (!nome?.trim())
    return NextResponse.json({ error: 'Seu nome é obrigatório' }, { status: 400 })
  if (!email?.trim() || !isEmailValido(email))
    return NextResponse.json({ error: 'Informe um e-mail válido' }, { status: 400 })
  if (isEmailDescartavel(email))
    return NextResponse.json({ error: 'E-mails temporários não são aceitos. Use um e-mail válido.' }, { status: 400 })
  // Modo corporativo (gated): bloqueia provedores pessoais (Gmail, Hotmail…).
  if (process.env.CADASTRO_SOMENTE_CORPORATIVO === '1' && isEmailPessoal(email))
    return NextResponse.json({ error: 'Use um e-mail corporativo da sua empresa para criar a conta.' }, { status: 400 })
  if (!senha || senha.length < 8)
    return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 })

  const admin = createAdminClient()
  const emailLimpo = email.trim().toLowerCase()

  const ip = getClientIp(req)

  // Camada 2 — Turnstile (gated: só valida se a secret estiver configurada).
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
  if (turnstileSecret) {
    const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : ''
    if (!captchaToken)
      return NextResponse.json({ error: 'Confirme que você não é um robô.' }, { status: 400 })
    const okCaptcha = await verifyTurnstile(captchaToken, turnstileSecret, ip)
    if (!okCaptcha)
      return NextResponse.json({ error: 'Falha na verificação anti-robô. Tente novamente.' }, { status: 400 })
  }

  // Rate-limit por IP (best-effort: fail-open se a tabela ainda não existir).
  const desde = new Date(Date.now() - RATE_LIMIT_JANELA_MIN * 60_000).toISOString()
  const { count: tentativas, error: errRate } = await admin
    .from('signup_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('criado_em', desde)
  if (!errRate && (tentativas ?? 0) >= RATE_LIMIT_MAX)
    return NextResponse.json({ error: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' }, { status: 429 })
  // registra a tentativa (não bloqueia o fluxo se falhar)
  await admin.from('signup_attempts').insert({ ip, email: emailLimpo })

  // Verificar se e-mail já está em uso
  const { data: emailExistente } = await admin
    .from('usuarios')
    .select('id')
    .eq('email', emailLimpo)
    .maybeSingle()

  if (emailExistente)
    return NextResponse.json({ error: 'Este e-mail já está em uso.' }, { status: 409 })

  // 1. Criar tenant — trial: plano Profissional, 30 dias, limites de entrada
  const expiracaoTrial = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
  const { data: tenant, error: errTenant } = await admin
    .from('tenants')
    .insert({
      nome: nomeEmpresa.trim(),
      status: 'ativo',
      plano: 'Profissional',
      expiracao_contrato: expiracaoTrial,
      limite_usuarios: 5,
      wa_limite: 1,
    })
    .select('id')
    .single()

  if (errTenant || !tenant)
    return NextResponse.json({ error: errTenant?.message ?? 'Erro ao criar empresa' }, { status: 500 })

  // Camada 3 — verificação de e-mail (gated). Quando ligada, a conta nasce
  // NÃO confirmada e o usuário só loga após clicar no link enviado por e-mail.
  const exigirVerificacao = process.env.CADASTRO_EMAIL_VERIFICACAO === '1'
  const origin = req.headers.get('origin') || req.nextUrl.origin

  // 2. Criar usuário no Supabase Auth
  let authUserId: string
  let actionLink: string | null = null

  if (exigirVerificacao) {
    const { data: linkData, error: errLink } = await admin.auth.admin.generateLink({
      type: 'signup',
      email: emailLimpo,
      password: senha,
      options: { redirectTo: `${origin}/login?confirmado=1` },
    })
    if (errLink || !linkData.user) {
      await admin.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json({ error: errLink?.message ?? 'Erro ao criar usuário' }, { status: 500 })
    }
    authUserId = linkData.user.id
    actionLink = linkData.properties?.action_link ?? null
  } else {
    const { data: authData, error: errAuth } = await admin.auth.admin.createUser({
      email: emailLimpo,
      password: senha,
      email_confirm: true,
    })
    if (errAuth || !authData.user) {
      await admin.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json({ error: errAuth?.message ?? 'Erro ao criar usuário' }, { status: 500 })
    }
    authUserId = authData.user.id
  }

  // 3. Criar registro em usuarios
  const { error: errUsuario } = await admin.from('usuarios').insert({
    nome: nome.trim(),
    email: emailLimpo,
    perfil: 'admin',
    ativo: true,
    tenant_id: tenant.id,
    auth_id: authUserId,
  })

  if (errUsuario) {
    // Reverter os dois passos anteriores
    await admin.auth.admin.deleteUser(authUserId)
    await admin.from('tenants').delete().eq('id', tenant.id)
    return NextResponse.json({ error: errUsuario.message }, { status: 500 })
  }

  // 4. Modo verificação: envia o link de confirmação (Resend de plataforma).
  if (exigirVerificacao) {
    try {
      const { resend, fromEmail } = await createResend() // sem tenant → chave de plataforma
      const { error: errEmail } = await resend.emails.send({
        from: fromEmail,
        to: emailLimpo,
        subject: 'Confirme seu e-mail — Isyon CRM',
        html: emailConfirmacaoHtml(nome.trim(), actionLink ?? `${origin}/login`),
      })
      if (errEmail) throw new Error(errEmail.message)
    } catch {
      // Sem e-mail de plataforma configurado, o link não chega → desfaz tudo.
      await admin.auth.admin.deleteUser(authUserId)
      await admin.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json({ error: 'Não foi possível enviar o e-mail de confirmação. Tente novamente mais tarde.' }, { status: 500 })
    }
    return NextResponse.json({ pending: true })
  }

  return NextResponse.json({ ok: true })
}
