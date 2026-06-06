import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  createInstance, connectInstance, connectionState,
  logoutInstance, deleteInstance, listInstances, setWebhook,
} from '@/lib/whatsapp/evolution'
import { getEvolutionServer, webhookUrl } from '@/lib/whatsapp/config'

/** Garante que o chamador é admin do seu tenant. */
async function assertTenantAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: usuario } = await supabase
    .from('usuarios').select('id, tenant_id, perfil').eq('auth_id', user.id).maybeSingle()
  if (!usuario || usuario.perfil !== 'admin' || !usuario.tenant_id) return null
  return { userId: usuario.id, tenantId: usuario.tenant_id }
}

function mapEstado(state?: string | null): string {
  if (state === 'open') return 'conectado'
  if (state === 'connecting') return 'pareando'
  return 'desconectado'
}

export async function GET() {
  const caller = await assertTenantAdmin()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('wa_instancias').select('*').eq('tenant_id', caller.tenantId).order('criado_em')

  const srv = await getEvolutionServer(admin, caller.tenantId)
  const estados = srv ? await listInstances(srv) : {}

  const numeros = (rows ?? []).map(r => ({
    ...r,
    estado: estados[r.instance_name as string] ?? null,
    status: estados[r.instance_name as string] ? mapEstado(estados[r.instance_name as string]) : r.status,
  }))
  return NextResponse.json({ numeros, evolutionConfigurada: !!srv })
}

export async function POST(req: NextRequest) {
  const caller = await assertTenantAdmin()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const admin = createAdminClient()
  const srv = await getEvolutionServer(admin, caller.tenantId)
  if (!srv) return NextResponse.json({ error: 'Configure a Evolution API em Integrações antes de adicionar números.' }, { status: 400 })

  const body = await req.json()
  const { action } = body

  if (action === 'criar') {
    const { nome, numero, vendedor_id } = body
    if (!nome?.trim()) return NextResponse.json({ error: 'Informe um nome para o número.' }, { status: 400 })
    const instanceName = `isyon-${caller.tenantId.slice(0, 8)}-${Date.now().toString(36)}`
    const r = await createInstance(srv, instanceName)
    if (!r.ok) return NextResponse.json({ error: r.error ?? 'Falha ao criar instância' }, { status: 502 })
    // Configura o webhook para receber as mensagens
    const wh = webhookUrl()
    if (wh) await setWebhook(srv, instanceName, wh)
    const { data: row, error } = await admin.from('wa_instancias').insert({
      tenant_id: caller.tenantId,
      nome: nome.trim(),
      numero: numero?.trim() || null,
      instance_name: instanceName,
      status: 'pareando',
      vendedor_id: vendedor_id || null,
      ativo: true,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: row.id, qrBase64: r.qrBase64 })
  }

  if (action === 'conectar') {
    const { id } = body
    const { data: row } = await admin.from('wa_instancias').select('instance_name').eq('id', id).eq('tenant_id', caller.tenantId).maybeSingle()
    if (!row) return NextResponse.json({ error: 'Número não encontrado' }, { status: 404 })
    const wh = webhookUrl()
    if (wh) await setWebhook(srv, row.instance_name as string, wh)
    const r = await connectInstance(srv, row.instance_name as string)
    return NextResponse.json({ ok: r.ok, qrBase64: r.qrBase64, code: r.code, error: r.error })
  }

  if (action === 'status') {
    const { id } = body
    const { data: row } = await admin.from('wa_instancias').select('instance_name').eq('id', id).eq('tenant_id', caller.tenantId).maybeSingle()
    if (!row) return NextResponse.json({ error: 'Número não encontrado' }, { status: 404 })
    const r = await connectionState(srv, row.instance_name as string)
    const status = mapEstado(r.state)
    await admin.from('wa_instancias').update({ status }).eq('id', id)
    return NextResponse.json({ ok: true, estado: r.state, status })
  }

  if (action === 'atualizar') {
    const { id, nome, numero, vendedor_id, ativo } = body
    const patch: Record<string, unknown> = {}
    if (nome !== undefined) patch.nome = nome
    if (numero !== undefined) patch.numero = numero || null
    if (vendedor_id !== undefined) patch.vendedor_id = vendedor_id || null
    if (ativo !== undefined) patch.ativo = ativo
    await admin.from('wa_instancias').update(patch).eq('id', id).eq('tenant_id', caller.tenantId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'remover') {
    const { id } = body
    const { data: row } = await admin.from('wa_instancias').select('instance_name').eq('id', id).eq('tenant_id', caller.tenantId).maybeSingle()
    if (row) {
      await logoutInstance(srv, row.instance_name as string)
      await deleteInstance(srv, row.instance_name as string)
    }
    await admin.from('wa_instancias').delete().eq('id', id).eq('tenant_id', caller.tenantId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
