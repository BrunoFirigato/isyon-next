import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWebhookToken } from '@/lib/whatsapp/config'
import { ingestMensagem, digits } from '@/lib/whatsapp/ingest'

type AdminClient = ReturnType<typeof createAdminClient>

interface WaKey { remoteJid?: string; fromMe?: boolean; id?: string }
interface WaMsg { conversation?: string; extendedTextMessage?: { text?: string }; imageMessage?: { caption?: string }; audioMessage?: unknown; videoMessage?: unknown; documentMessage?: unknown; stickerMessage?: unknown }
interface WaData { key?: WaKey; message?: WaMsg; pushName?: string }

function extrairTexto(msg: WaMsg | undefined): string {
  if (!msg) return '[mensagem]'
  if (msg.conversation) return msg.conversation
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text
  if (msg.imageMessage) return msg.imageMessage.caption || '[imagem]'
  if (msg.audioMessage) return '[áudio]'
  if (msg.videoMessage) return '[vídeo]'
  if (msg.documentMessage) return '[documento]'
  if (msg.stickerMessage) return '[figurinha]'
  return '[mensagem]'
}

/** Registra cada chamada do webhook para diagnóstico (nunca quebra o fluxo). */
async function logWebhook(admin: AdminClient, row: Record<string, unknown>) {
  try { await admin.from('wa_webhook_log').insert(row) } catch { /* tabela pode não existir ainda */ }
}

export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  // Validação do token (a Evolution chama esta URL com ?token=...)
  const token = req.nextUrl.searchParams.get('token')
  const expected = await getWebhookToken(admin)
  if (!expected || token !== expected) {
    await logWebhook(admin, { resultado: 'token_invalido', token_ok: false })
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { event?: string; instance?: string; data?: WaData } = {}
  try { body = await req.json() } catch {
    await logWebhook(admin, { resultado: 'json_invalido', token_ok: true })
    return NextResponse.json({ ok: true })
  }

  const ev = String(body?.event ?? '').toLowerCase()
  const instanceName = body?.instance
  if (ev && !ev.includes('messages.upsert') && !ev.includes('messages_upsert')) {
    await logWebhook(admin, { resultado: 'evento_ignorado', event: ev, instance: instanceName ?? null, token_ok: true })
    return NextResponse.json({ ok: true })
  }

  // A Evolution pode mandar a mensagem direto em data ou em data.messages[0]
  const raw = body?.data as (WaData & { messages?: WaData[] }) | undefined
  const data: WaData | undefined = raw?.key ? raw : (Array.isArray(raw?.messages) ? raw.messages[0] : raw)
  if (!instanceName || !data?.key) {
    await logWebhook(admin, { resultado: 'sem_dados', event: ev, instance: instanceName ?? null, token_ok: true })
    return NextResponse.json({ ok: true })
  }

  const remoteJid = data.key.remoteJid ?? ''
  const fromMeEarly = !!data.key.fromMe
  if (!remoteJid || remoteJid.endsWith('@g.us')) {
    await logWebhook(admin, { resultado: 'grupo_ou_sem_jid', event: ev, instance: instanceName, remote_jid: remoteJid, from_me: fromMeEarly, token_ok: true })
    return NextResponse.json({ ok: true }) // ignora grupos
  }
  const telefone = digits(remoteJid.split('@')[0])
  if (!telefone) {
    await logWebhook(admin, { resultado: 'sem_telefone', event: ev, instance: instanceName, remote_jid: remoteJid, from_me: fromMeEarly, token_ok: true })
    return NextResponse.json({ ok: true })
  }

  // Instância → tenant (isolamento multi-tenant)
  const { data: inst } = await admin
    .from('wa_instancias').select('id, tenant_id').eq('instance_name', instanceName).maybeSingle()
  if (!inst) {
    await logWebhook(admin, { resultado: 'instancia_nao_encontrada', event: ev, instance: instanceName, remote_jid: remoteJid, from_me: fromMeEarly, telefone, token_ok: true })
    return NextResponse.json({ ok: true })
  }

  const fromMe = !!data.key.fromMe
  const resultado = await ingestMensagem(admin, { id: inst.id as string, tenant_id: inst.tenant_id as string }, {
    remoteJid,
    fromMe,
    waMsgId: data.key.id ?? null,
    texto: extrairTexto(data.message),
    pushName: data.pushName ?? null,
  })
  await logWebhook(admin, { resultado, event: ev, instance: instanceName, tenant_id: inst.tenant_id, remote_jid: remoteJid, from_me: fromMe, telefone, token_ok: true })

  return NextResponse.json({ ok: true })
}
