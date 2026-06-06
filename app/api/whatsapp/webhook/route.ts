import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function digits(s?: string | null) { return (s || '').replace(/\D/g, '') }

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

export async function POST(req: NextRequest) {
  // Validação do token (a Evolution chama esta URL com ?token=...)
  const token = req.nextUrl.searchParams.get('token')
  const expected = process.env.WHATSAPP_WEBHOOK_TOKEN
  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { event?: string; instance?: string; data?: WaData } = {}
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const ev = String(body?.event ?? '').toLowerCase()
  if (ev && !ev.includes('messages.upsert') && !ev.includes('messages_upsert')) {
    return NextResponse.json({ ok: true })
  }

  const instanceName = body?.instance
  const data = body?.data
  if (!instanceName || !data?.key) return NextResponse.json({ ok: true })

  const remoteJid = data.key.remoteJid ?? ''
  if (!remoteJid || remoteJid.endsWith('@g.us')) return NextResponse.json({ ok: true }) // ignora grupos
  const telefone = digits(remoteJid.split('@')[0])
  if (!telefone) return NextResponse.json({ ok: true })

  const admin = createAdminClient()

  // Instância → tenant (isolamento multi-tenant)
  const { data: inst } = await admin
    .from('wa_instancias').select('id, tenant_id').eq('instance_name', instanceName).maybeSingle()
  if (!inst) return NextResponse.json({ ok: true })

  const fromMe = !!data.key.fromMe
  const direcao = fromMe ? 'out' : 'in'
  const waMsgId = data.key.id ?? null
  const texto = extrairTexto(data.message)
  const pushName = data.pushName ?? null
  const agora = new Date().toISOString()

  // Idempotência: se já registramos esta mensagem, não faz nada
  if (waMsgId) {
    const { data: existe } = await admin.from('wa_mensagens').select('id').eq('wa_message_id', waMsgId).maybeSingle()
    if (existe) return NextResponse.json({ ok: true })
  }

  // Conversa (por instância + telefone)
  const { data: conv } = await admin.from('wa_conversas')
    .select('id, contato_nome, nao_lidas')
    .eq('instancia_id', inst.id).eq('telefone', telefone).maybeSingle()

  let conversaId = conv?.id as string | undefined

  if (!conversaId) {
    // Primeiro contato → casa com lead/cliente pelos últimos 8 dígitos
    const core = telefone.slice(-8)
    const [{ data: clientes }, { data: leads }] = await Promise.all([
      admin.from('clientes').select('id, telefone').eq('tenant_id', inst.tenant_id).not('telefone', 'is', null).limit(5000),
      admin.from('leads').select('id, telefone').eq('tenant_id', inst.tenant_id).not('telefone', 'is', null).limit(5000),
    ])
    const cli = (clientes ?? []).find(c => digits(c.telefone as string).slice(-8) === core)
    const lead = cli ? null : (leads ?? []).find(l => digits(l.telefone as string).slice(-8) === core)

    const { data: novo } = await admin.from('wa_conversas').insert({
      tenant_id: inst.tenant_id,
      instancia_id: inst.id,
      telefone,
      contato_nome: pushName,
      cliente_id: cli?.id ?? null,
      lead_id: lead?.id ?? null,
      ultima_mensagem: texto,
      ultima_em: agora,
      nao_lidas: direcao === 'in' ? 1 : 0,
    }).select('id').single()
    conversaId = novo?.id
    // Corrida: se o índice único barrar, re-busca a conversa existente
    if (!conversaId) {
      const { data: re } = await admin.from('wa_conversas').select('id, nao_lidas').eq('instancia_id', inst.id).eq('telefone', telefone).maybeSingle()
      conversaId = re?.id
    }
  } else {
    await admin.from('wa_conversas').update({
      ultima_mensagem: texto,
      ultima_em: agora,
      atualizado_em: agora,
      contato_nome: conv?.contato_nome ?? pushName,
      nao_lidas: direcao === 'in' ? (conv?.nao_lidas ?? 0) + 1 : (conv?.nao_lidas ?? 0),
    }).eq('id', conversaId)
  }

  if (conversaId) {
    await admin.from('wa_mensagens').insert({
      tenant_id: inst.tenant_id,
      conversa_id: conversaId,
      instancia_id: inst.id,
      direcao,
      texto,
      tipo: 'texto',
      wa_message_id: waMsgId,
      criado_em: agora,
    })
  }

  return NextResponse.json({ ok: true })
}
