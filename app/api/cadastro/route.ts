import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nomeEmpresa, nome, email, senha } = body

  // Validações
  if (!nomeEmpresa?.trim())
    return NextResponse.json({ error: 'Nome da empresa é obrigatório' }, { status: 400 })
  if (!nome?.trim())
    return NextResponse.json({ error: 'Seu nome é obrigatório' }, { status: 400 })
  if (!email?.trim())
    return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 })
  if (!senha || senha.length < 6)
    return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })

  const admin = createAdminClient()

  // Verificar se e-mail já está em uso
  const { data: emailExistente } = await admin
    .from('usuarios')
    .select('id')
    .eq('email', email.trim().toLowerCase())
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
