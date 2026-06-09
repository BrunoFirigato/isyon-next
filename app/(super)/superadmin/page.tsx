import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SuperadminView from './_components/SuperadminView'

export default async function SuperadminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'sa@isyon.com.br') {
    redirect('/admin')
  }

  const admin = createAdminClient()

  const [
    { data: tenants },
    { data: usuarios },
    { data: ultimosAcessos },
    { data: configs },
    { data: waInst },
    { data: metrics },
  ] = await Promise.all([
    admin.from('tenants').select('id, nome, plano, status, criado_em, expiracao_contrato, wa_limite, limite_usuarios').order('nome'),
    admin.from('usuarios').select('tenant_id'),
    admin.from('usuarios').select('tenant_id, nome, ultimo_acesso').order('ultimo_acesso', { ascending: false }),
    admin.from('sistema_config').select('chave, valor, atualizado_em'),
    admin.from('wa_instancias').select('tenant_id'),
    admin.rpc('tenant_metrics'),
  ])

  /* ── Contagem de usuários por tenant ── */
  const contagem = (usuarios ?? []).reduce<Record<string, number>>((acc, u) => {
    if (u.tenant_id) acc[u.tenant_id] = (acc[u.tenant_id] ?? 0) + 1
    return acc
  }, {})

  /* ── Contagem de números de WhatsApp por tenant ── */
  const waCount = (waInst ?? []).reduce<Record<string, number>>((acc, r) => {
    const tid = (r as { tenant_id: string | null }).tenant_id
    if (tid) acc[tid] = (acc[tid] ?? 0) + 1
    return acc
  }, {})

  /* ── Volume de dados (registros) por tenant ── */
  const metricsMap = ((metrics ?? []) as Array<{ tenant_id: string; registros: number }>)
    .reduce<Record<string, number>>((acc, m) => {
      if (m.tenant_id) acc[m.tenant_id] = Number(m.registros) || 0
      return acc
    }, {})

  /* ── Último acesso por tenant ── */
  const acessoMap = (ultimosAcessos ?? []).reduce<Record<string, { nome: string; data: string }>>((acc, u) => {
    if (!u.ultimo_acesso) return acc
    if (!acc[u.tenant_id] || u.ultimo_acesso > acc[u.tenant_id].data) {
      acc[u.tenant_id] = { nome: u.nome, data: u.ultimo_acesso }
    }
    return acc
  }, {})

  const tenantsComContagem = (tenants ?? []).map((t) => ({
    ...t,
    expiracao_contrato: (t as Record<string, unknown>).expiracao_contrato as string | null ?? null,
    total_usuarios: contagem[t.id] ?? 0,
    limite_usuarios: ((t as Record<string, unknown>).limite_usuarios as number | null) ?? 0,
    wa_limite: ((t as Record<string, unknown>).wa_limite as number | null) ?? 1,
    wa_usados: waCount[t.id] ?? 0,
    registros: metricsMap[t.id] ?? 0,
    ultimo_acesso: acessoMap[t.id]?.data ?? null,
    ultimo_usuario: acessoMap[t.id]?.nome ?? null,
  }))

  const logsAcesso = tenantsComContagem
    .map((t) => ({
      tenant_id:    t.id,
      nome_tenant:  t.nome,
      status_tenant: t.status,
      ultimo_acesso: t.ultimo_acesso,
      nome_usuario:  t.ultimo_usuario,
    }))
    .sort((a, b) => {
      if (a.ultimo_acesso && b.ultimo_acesso) return b.ultimo_acesso.localeCompare(a.ultimo_acesso)
      if (a.ultimo_acesso) return -1
      if (b.ultimo_acesso) return 1
      return a.nome_tenant.localeCompare(b.nome_tenant)
    })

  /* ── Configs — mascara valores secretos ── */
  const configsSafe = (configs ?? []).map((row) => ({
    chave: row.chave,
    valor: row.chave.includes('key') || row.chave.includes('senha')
      ? row.valor ? '••••••••' + row.valor.slice(-4) : ''
      : row.valor ?? '',
    atualizado_em: row.atualizado_em,
  }))

  return (
    <SuperadminView
      tenants={tenantsComContagem}
      logsAcesso={logsAcesso}
      configs={configsSafe}
    />
  )
}
