import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** Verifica que o chamador é admin do seu tenant. Retorna { userId, tenantId } ou null. */
async function assertTenantAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, tenant_id, perfil')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!usuario || usuario.perfil !== 'admin' || !usuario.tenant_id) return null

  return { userId: usuario.id, tenantId: usuario.tenant_id }
}

export async function POST(req: NextRequest) {
  const caller = await assertTenantAdmin()
  if (!caller) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { action } = body
  const admin = createAdminClient()

  /* ── Convidar novo usuário ── */
  if (action === 'convidar') {
    const { nome, email, perfil, senha } = body

    if (!email?.trim() || !senha?.trim()) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }
    if (senha.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    // Verificar se já existe usuário com esse e-mail no tenant
    const { data: existente } = await admin
      .from('usuarios')
      .select('id')
      .eq('email', email.trim())
      .eq('tenant_id', caller.tenantId)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ error: 'Já existe um usuário com esse e-mail neste tenant' }, { status: 409 })
    }

    // Criar no Supabase Auth
    const { data: authData, error: errAuth } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: senha,
      email_confirm: true,
    })

    if (errAuth) return NextResponse.json({ error: errAuth.message }, { status: 500 })

    // Inserir em usuarios
    const { error: errInsert } = await admin.from('usuarios').insert({
      nome: nome?.trim() || email.trim(),
      email: email.trim(),
      perfil: perfil ?? 'vendedor',
      ativo: true,
      tenant_id: caller.tenantId,
      auth_id: authData.user.id,
    })

    if (errInsert) {
      // Reverter criação no auth
      await admin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: errInsert.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  /* ── Gerar link de reset de senha ── */
  if (action === 'reset_senha') {
    const { email, usuario_id } = body
    if (!email) return NextResponse.json({ error: 'e-mail obrigatório' }, { status: 400 })

    // Verificar que o usuário pertence ao mesmo tenant
    const { data: alvo } = await admin
      .from('usuarios')
      .select('id, tenant_id')
      .eq('id', usuario_id)
      .maybeSingle()

    if (!alvo || alvo.tenant_id !== caller.tenantId) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim(),
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, link: data.properties?.action_link ?? null })
  }

  /* ── Excluir usuário ── */
  if (action === 'excluir') {
    const { usuario_id } = body
    if (!usuario_id) return NextResponse.json({ error: 'usuario_id obrigatório' }, { status: 400 })

    // Verificar que pertence ao mesmo tenant e não é o próprio caller
    const { data: alvo } = await admin
      .from('usuarios')
      .select('id, auth_id, tenant_id')
      .eq('id', usuario_id)
      .maybeSingle()

    if (!alvo || alvo.tenant_id !== caller.tenantId) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    if (alvo.id === caller.userId) {
      return NextResponse.json({ error: 'Você não pode excluir sua própria conta' }, { status: 400 })
    }

    // Remover da tabela usuarios
    await admin.from('usuarios').delete().eq('id', usuario_id)

    // Remover do Supabase Auth (se tiver auth_id)
    if (alvo.auth_id) {
      await admin.auth.admin.deleteUser(alvo.auth_id)
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
