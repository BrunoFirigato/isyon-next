import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/** Verifica se a requisição vem de um superadmin autenticado */
async function assertSuperadmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'sa@isyon.com.br') {
    return null
  }
  return user
}

/* ─── GET: lista todos os tenants com contagem de usuários ─── */
export async function GET() {
  const user = await assertSuperadmin()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()

  const [{ data: tenants, error: errT }, { data: usuarios }] = await Promise.all([
    admin.from('tenants').select('id, nome, plano, status, criado_em').order('nome'),
    admin.from('usuarios').select('tenant_id'),
  ])

  if (errT) return NextResponse.json({ error: errT.message }, { status: 500 })

  const contagem = (usuarios ?? []).reduce<Record<string, number>>((acc, u) => {
    if (u.tenant_id) acc[u.tenant_id] = (acc[u.tenant_id] ?? 0) + 1
    return acc
  }, {})

  const resultado = (tenants ?? []).map((t) => ({
    ...t,
    total_usuarios: contagem[t.id] ?? 0,
  }))

  return NextResponse.json({ tenants: resultado })
}

/* ─── POST: ações de gestão ─── */
export async function POST(req: NextRequest) {
  const user = await assertSuperadmin()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { action } = body
  const admin = createAdminClient()

  /* ── Criar tenant + usuário admin ── */
  if (action === 'criar_tenant') {
    const { nome, plano, email, senha, nomeAdmin, expiracao_contrato, wa_limite } = body

    if (!nome?.trim() || !email?.trim() || !senha?.trim()) {
      return NextResponse.json({ error: 'nome, email e senha são obrigatórios' }, { status: 400 })
    }

    const waLimite = Math.max(0, Number.parseInt(String(wa_limite ?? ''), 10) || 1)

    // 1. Criar tenant
    const { data: tenant, error: errTenant } = await admin
      .from('tenants')
      .insert({ nome: nome.trim(), plano: plano ?? 'Básico', status: 'ativo', expiracao_contrato: expiracao_contrato || null, wa_limite: waLimite })
      .select('id, nome, plano, status, criado_em')
      .single()

    if (errTenant) return NextResponse.json({ error: errTenant.message }, { status: 500 })

    // 2. Criar usuário no Supabase Auth
    const { data: authData, error: errAuth } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: senha,
      email_confirm: true,
    })

    if (errAuth) {
      // Reverter criação do tenant
      await admin.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json({ error: errAuth.message }, { status: 500 })
    }

    // 3. Criar registro em usuarios
    await admin.from('usuarios').insert({
      nome: nomeAdmin?.trim() || nome.trim(),
      email: email.trim(),
      perfil: 'admin',
      ativo: true,
      tenant_id: tenant.id,
      auth_id: authData.user.id,
    })

    return NextResponse.json({ ok: true, tenant })
  }

  /* ── Atualizar dados do tenant ── */
  if (action === 'atualizar_tenant') {
    const { id, nome, plano, expiracao_contrato, wa_limite } = body

    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    const patch: Record<string, unknown> = {
      nome: nome?.trim(), plano, expiracao_contrato: expiracao_contrato || null,
    }
    if (wa_limite !== undefined) patch.wa_limite = Math.max(0, Number.parseInt(String(wa_limite), 10) || 0)

    const { error } = await admin
      .from('tenants')
      .update(patch)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  /* ── Ativar / desativar tenant ── */
  if (action === 'toggle_status') {
    const { id, status } = body

    if (!id || !status) return NextResponse.json({ error: 'id e status obrigatórios' }, { status: 400 })

    const { error } = await admin
      .from('tenants')
      .update({ status })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  /* ── Reset de senha (gera link) ── */
  if (action === 'reset_senha') {
    const { email } = body

    if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim(),
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, link: data.properties?.action_link ?? null })
  }

  /* ── Criar usuário adicional para um tenant ── */
  if (action === 'criar_usuario') {
    const { tenant_id, nome, email, senha, perfil } = body

    if (!tenant_id || !email?.trim() || !senha?.trim()) {
      return NextResponse.json({ error: 'tenant_id, email e senha são obrigatórios' }, { status: 400 })
    }

    const { data: authData, error: errAuth } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: senha,
      email_confirm: true,
    })

    if (errAuth) return NextResponse.json({ error: errAuth.message }, { status: 500 })

    await admin.from('usuarios').insert({
      nome: nome?.trim() || email.trim(),
      email: email.trim(),
      perfil: perfil ?? 'vendedor',
      ativo: true,
      tenant_id,
      auth_id: authData.user.id,
    })

    return NextResponse.json({ ok: true })
  }

  /* ── Ler configurações do sistema ── */
  if (action === 'get_config') {
    const { data } = await admin
      .from('sistema_config')
      .select('chave, valor, atualizado_em')

    // Mascara valores de chaves secretas
    const resultado = (data ?? []).map((row) => ({
      chave: row.chave,
      valor: row.chave.includes('key') || row.chave.includes('senha')
        ? row.valor ? '••••••••' + row.valor.slice(-4) : ''
        : row.valor ?? '',
      atualizado_em: row.atualizado_em,
    }))

    return NextResponse.json({ configs: resultado })
  }

  /* ── Salvar configuração do sistema ── */
  if (action === 'set_config') {
    const { chave, valor } = body

    if (!chave) return NextResponse.json({ error: 'chave obrigatória' }, { status: 400 })

    const { error } = await admin
      .from('sistema_config')
      .upsert({ chave, valor: valor ?? null, atualizado_em: new Date().toISOString() })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
