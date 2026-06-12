import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  isEmailValido, isEmailDescartavel, getClientIp,
  RATE_LIMIT_MAX, RATE_LIMIT_JANELA_MIN,
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
  if (!senha || senha.length < 8)
    return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 })

  const admin = createAdminClient()
  const emailLimpo = email.trim().toLowerCase()

  // Rate-limit por IP (best-effort: fail-open se a tabela ainda não existir).
  const ip = getClientIp(req)
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

  // 1. Criar tenant
  const { data: tenant, error: errTenant } = await admin
    .from('tenants')
    .insert({ nome: nomeEmpresa.trim(), status: 'ativo' })
    .select('id')
    .single()

  if (errTenant || !tenant)
    return NextResponse.json({ error: errTenant?.message ?? 'Erro ao criar empresa' }, { status: 500 })

  // 2. Criar usuário no Supabase Auth
  const { data: authData, error: errAuth } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password: senha,
    email_confirm: true,
  })

  if (errAuth || !authData.user) {
    await admin.from('tenants').delete().eq('id', tenant.id)
    return NextResponse.json({ error: errAuth?.message ?? 'Erro ao criar usuário' }, { status: 500 })
  }

  // 3. Criar registro em usuarios
  const { error: errUsuario } = await admin.from('usuarios').insert({
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    perfil: 'admin',
    ativo: true,
    tenant_id: tenant.id,
    auth_id: authData.user.id,
  })

  if (errUsuario) {
    // Reverter os dois passos anteriores
    await admin.auth.admin.deleteUser(authData.user.id)
    await admin.from('tenants').delete().eq('id', tenant.id)
    return NextResponse.json({ error: errUsuario.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
