import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  createInstance, connectInstance, connectionState,
  logoutInstance, deleteInstance, listInstances, setWebhook, findWebhook,
} from '@/lib/whatsapp/evolution'
import { getEvolutionServer, getWebhookToken, buildWebhookUrl } from '@/lib/whatsapp/config'

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

  const [{ data: rows }, { data: usuarios }, { data: convs }, { data: tenantRow }] = await Promise.all([
    admin.from('wa_instancias').select('*').eq('tenant_id', caller.tenantId).order('criado_em'),
    admin.from('usuarios').select('id, nome').eq('tenant_id', caller.tenantId),
    admin.from('wa_conversas')
      .select('instancia_id, nao_lidas, ultima_em, ultima_direcao, arquivada, responsavel_id')
      .eq('tenant_id', caller.tenantId),
    admin.from('tenants').select('wa_limite').eq('id', caller.tenantId).maybeSingle(),
  ])

  const limite = (tenantRow?.wa_limite as number | null) ?? 1
  const usados = (rows ?? []).length

  const srv = await getEvolutionServer(admin, caller.tenantId)
  const estados = srv ? await listInstances(srv) : {}

  const nomePorUsuario = new Map((usuarios ?? []).map(u => [u.id as string, u.nome as string]))
  const ownerByInst = new Map((rows ?? []).map(r => [r.id as string, (r.usuario_id as string | null) ?? null]))

  // Agregados por número
  type Agg = { n_conversas: number; nao_lidas: number; sem_resposta: number; ultima_atividade: string | null }
  const aggInst = new Map<string, Agg>()
  // Carga por responsável (efetivo = responsavel_id da conversa OU dono do número; null = compartilhado)
  type Carga = { usuario_id: string | null; nome: string; n_conversas: number; nao_lidas: number; sem_resposta: number }
  const cargaMap = new Map<string, Carga>()

  for (const c of convs ?? []) {
    if (c.arquivada) continue
    const inst = c.instancia_id as string
    const a = aggInst.get(inst) ?? { n_conversas: 0, nao_lidas: 0, sem_resposta: 0, ultima_atividade: null }
    a.n_conversas++
    a.nao_lidas += (c.nao_lidas as number) ?? 0
    if (c.ultima_direcao === 'in') a.sem_resposta++
    const ue = c.ultima_em as string | null
    if (ue && (!a.ultima_atividade || ue > a.ultima_atividade)) a.ultima_atividade = ue
    aggInst.set(inst, a)

    const resp = (c.responsavel_id as string | null) ?? ownerByInst.get(inst) ?? null
    const key = resp ?? '__none__'
    const cg = cargaMap.get(key) ?? {
      usuario_id: resp,
      nome: resp ? (nomePorUsuario.get(resp) ?? '—') : 'Compartilhado / sem responsável',
      n_conversas: 0, nao_lidas: 0, sem_resposta: 0,
    }
    cg.n_conversas++
    cg.nao_lidas += (c.nao_lidas as number) ?? 0
    if (c.ultima_direcao === 'in') cg.sem_resposta++
    cargaMap.set(key, cg)
  }

  const numeros = (rows ?? []).map(r => {
    const a = aggInst.get(r.id as string) ?? { n_conversas: 0, nao_lidas: 0, sem_resposta: 0, ultima_atividade: null }
    return {
      ...r,
      estado: estados[r.instance_name as string] ?? null,
      status: estados[r.instance_name as string] ? mapEstado(estados[r.instance_name as string]) : r.status,
      responsavel_nome: r.usuario_id ? (nomePorUsuario.get(r.usuario_id as string) ?? null) : null,
      ...a,
    }
  })

  const carga = [...cargaMap.values()].sort((x, y) => y.n_conversas - x.n_conversas)

  return NextResponse.json({ numeros, carga, evolutionConfigurada: !!srv, limite, usados })
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
    const { nome, numero, usuario_id } = body
    if (!nome?.trim()) return NextResponse.json({ error: 'Informe um nome para o número.' }, { status: 400 })

    // Trava de licenças por plano: nº atual de instâncias < limite do tenant
    const [{ count }, { data: tRow }] = await Promise.all([
      admin.from('wa_instancias').select('id', { count: 'exact', head: true }).eq('tenant_id', caller.tenantId),
      admin.from('tenants').select('wa_limite').eq('id', caller.tenantId).maybeSingle(),
    ])
    const limite = (tRow?.wa_limite as number | null) ?? 1
    if ((count ?? 0) >= limite) {
      return NextResponse.json({
        error: `Você atingiu o limite do seu plano (${limite} número${limite !== 1 ? 's' : ''} de WhatsApp). `
          + 'Remova um número existente ou fale com o suporte para aumentar o limite.',
      }, { status: 400 })
    }

    const instanceName = `isyon-${caller.tenantId.slice(0, 8)}-${Date.now().toString(36)}`
    const r = await createInstance(srv, instanceName)
    if (!r.ok) return NextResponse.json({ error: r.error ?? 'Falha ao criar instância' }, { status: 502 })
    // Configura o webhook para receber as mensagens
    const tk = await getWebhookToken(admin)
    if (tk) await setWebhook(srv, instanceName, buildWebhookUrl(tk))
    const { data: row, error } = await admin.from('wa_instancias').insert({
      tenant_id: caller.tenantId,
      nome: nome.trim(),
      numero: numero?.trim() || null,
      instance_name: instanceName,
      status: 'pareando',
      usuario_id: usuario_id || null,
      ativo: true,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: row.id, qrBase64: r.qrBase64 })
  }

  if (action === 'conectar') {
    const { id } = body
    const { data: row } = await admin.from('wa_instancias').select('instance_name').eq('id', id).eq('tenant_id', caller.tenantId).maybeSingle()
    if (!row) return NextResponse.json({ error: 'Número não encontrado' }, { status: 404 })
    const tk = await getWebhookToken(admin)
    if (tk) await setWebhook(srv, row.instance_name as string, buildWebhookUrl(tk))
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

  if (action === 'diagnostico') {
    // Reaplica o webhook e lê de volta a config — diagnostica recebimento de mensagens
    const { id } = body
    const { data: row } = await admin.from('wa_instancias').select('instance_name').eq('id', id).eq('tenant_id', caller.tenantId).maybeSingle()
    if (!row) return NextResponse.json({ error: 'Número não encontrado' }, { status: 404 })

    const tk = await getWebhookToken(admin)
    if (!tk) {
      return NextResponse.json({ error: 'O token do webhook não está configurado no servidor. Fale com o suporte do Isyon.' }, { status: 400 })
    }
    const expectedUrl = buildWebhookUrl(tk)
    const applied = await setWebhook(srv, row.instance_name as string, expectedUrl)
    const found = await findWebhook(srv, row.instance_name as string)

    const bare = (u?: string | null) => (u ?? '').split('?')[0]
    const urlOk = !!found.url && bare(found.url) === bare(expectedUrl)
    const enabledOk = found.enabled !== false
    const eventsOk = !found.events || found.events.some(e => String(e).toUpperCase().includes('MESSAGES_UPSERT'))
    const ok = applied.ok && found.ok && urlOk && enabledOk && eventsOk

    // Últimas chamadas que a Evolution fez ao webhook (se a tabela existir)
    let recentLogs: unknown[] = []
    try {
      const { data: logs } = await admin
        .from('wa_webhook_log')
        .select('criado_em, resultado, event, from_me, telefone, remote_jid')
        .or(`tenant_id.eq.${caller.tenantId},instance.eq.${row.instance_name}`)
        .order('criado_em', { ascending: false })
        .limit(12)
      recentLogs = logs ?? []
    } catch { /* tabela ainda não criada */ }

    return NextResponse.json({
      ok,
      applied,
      found,
      expectedUrl,
      checks: { urlOk, enabledOk, eventsOk },
      recentLogs,
    })
  }

  if (action === 'atualizar') {
    const { id, nome, numero, usuario_id, ativo } = body
    const patch: Record<string, unknown> = {}
    if (nome !== undefined) patch.nome = nome
    if (numero !== undefined) patch.numero = numero || null
    if (usuario_id !== undefined) patch.usuario_id = usuario_id || null
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
