import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { obterIntegracao, salvarIntegracao, definirStatus, logIntegracao } from '@/lib/integracoes/service'
import { testarOmie, listarProdutosOmie } from '@/lib/integracoes/omie'

/** Garante que o chamador é admin do seu tenant. */
async function assertTenantAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: usuario } = await supabase
    .from('usuarios').select('id, tenant_id, perfil').eq('auth_id', user.id).maybeSingle()
  if (!usuario || usuario.perfil !== 'admin' || !usuario.tenant_id) return null
  return { userId: usuario.id as string, tenantId: usuario.tenant_id as string }
}

export async function GET() {
  const caller = await assertTenantAdmin()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const admin = createAdminClient()
  const integ = await obterIntegracao(admin, caller.tenantId, 'omie')
  return NextResponse.json({
    conectado: !!integ && integ.status === 'conectado',
    conta_label: integ?.conta_label ?? null,
  })
}

export async function POST(req: NextRequest) {
  const caller = await assertTenantAdmin()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const admin = createAdminClient()
  const body = await req.json()
  const { action } = body

  if (action === 'conectar') {
    const app_key = String(body.app_key ?? '').trim()
    const app_secret = String(body.app_secret ?? '').trim()
    if (!app_key || !app_secret) return NextResponse.json({ error: 'Informe a App Key e a App Secret.' }, { status: 400 })
    const teste = await testarOmie(app_key, app_secret)
    if (!teste.ok) return NextResponse.json({ error: teste.error ?? 'Credenciais inválidas' }, { status: 400 })
    await salvarIntegracao(admin, {
      tenantId: caller.tenantId, provider: 'omie', categoria: 'erp',
      credenciais: { app_key, app_secret }, status: 'conectado', contaLabel: 'Omie', criadoPor: caller.userId,
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'testar') {
    const integ = await obterIntegracao(admin, caller.tenantId, 'omie')
    if (!integ?.credenciais?.app_key) return NextResponse.json({ error: 'Omie não está conectado.' }, { status: 400 })
    const teste = await testarOmie(integ.credenciais.app_key, integ.credenciais.app_secret)
    await definirStatus(admin, caller.tenantId, 'omie', teste.ok ? 'conectado' : 'erro')
    return NextResponse.json({ ok: teste.ok, error: teste.error })
  }

  if (action === 'importar_produtos') {
    const integ = await obterIntegracao(admin, caller.tenantId, 'omie')
    if (!integ?.credenciais?.app_key) return NextResponse.json({ error: 'Omie não está conectado.' }, { status: 400 })
    const res = await listarProdutosOmie(integ.credenciais.app_key, integ.credenciais.app_secret)
    if (!res.ok) return NextResponse.json({ error: res.error ?? 'Falha ao buscar produtos no Omie' }, { status: 400 })
    const produtos = res.produtos ?? []

    // Produtos já existentes (por código) para não duplicar na reimportação
    const { data: existentes } = await admin.from('produtos')
      .select('id, codigo').eq('tenant_id', caller.tenantId).not('codigo', 'is', null)
    const mapa = new Map((existentes ?? []).map(p => [String(p.codigo), p.id as string]))

    let importados = 0, atualizados = 0
    const novos: Record<string, unknown>[] = []
    const agora = new Date().toISOString()
    for (const p of produtos) {
      if (!p.descricao) continue
      const existeId = p.codigo ? mapa.get(p.codigo) : undefined
      if (existeId) {
        await admin.from('produtos').update({
          nome: p.descricao, preco: p.valor_unitario, unidade: p.unidade,
          ncm: p.ncm, descricao: p.descr_detalhada, atualizado_em: agora,
        }).eq('id', existeId)
        atualizados++
      } else {
        novos.push({
          tenant_id: caller.tenantId, codigo: p.codigo || null, nome: p.descricao, tipo: 'produto',
          unidade: p.unidade, preco: p.valor_unitario, ncm: p.ncm, descricao: p.descr_detalhada,
          origem: 0, ativo: true,
        })
        importados++
      }
    }
    if (novos.length) await admin.from('produtos').insert(novos)
    await logIntegracao(admin, { tenantId: caller.tenantId, integracaoId: integ.id, evento: 'importar_produtos', mensagem: `${importados} novos, ${atualizados} atualizados` })
    return NextResponse.json({ ok: true, importados, atualizados, total: produtos.length })
  }

  if (action === 'desconectar') {
    await admin.from('integracoes').delete().eq('tenant_id', caller.tenantId).eq('provider', 'omie')
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
