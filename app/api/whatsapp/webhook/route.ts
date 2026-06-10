import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWebhookToken } from '@/lib/whatsapp/config'

function digits(s?: string | null) { return (s || '').replace(/\D/g, '') }

/** Normaliza um nome para comparação: sem acento, minúsculo, só letras/números/espaço. */
function normNome(s?: string | null): string {
  return (s || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Tenta vincular um contato do WhatsApp a um lead/cliente, em duas camadas:
 *   1. Telefone (últimos 8 dígitos) — funciona para JIDs normais.
 *   2. Nome do WhatsApp (pushName) — resolve contatos que chegam via LID, onde a
 *      Evolution 1.8.6 NÃO expõe o telefone. Exige nome com 2+ palavras e
 *      correspondência ÚNICA (evita vincular ao lead/cliente errado).
 * Cliente tem prioridade sobre lead.
 */
async function autoVincular(
  admin: AdminClient,
  tenantId: string,
  telefone: string,
  pushName: string | null,
): Promise<{ cliente_id: string | null; lead_id: string | null }> {
  const [{ data: clientes }, { data: leads }] = await Promise.all([
    admin.from('clientes').select('id, telefone, nome').eq('tenant_id', tenantId).limit(5000),
    admin.from('leads').select('id, telefone, nome').eq('tenant_id', tenantId).limit(5000),
  ])
  const cls = clientes ?? []
  const lds = leads ?? []

  // Camada 1 — telefone (últimos 8 dígitos)
  const core = telefone.slice(-8)
  if (core.length === 8) {
    const cli = cls.find(c => digits(c.telefone as string).slice(-8) === core)
    if (cli) return { cliente_id: cli.id as string, lead_id: null }
    const lead = lds.find(l => digits(l.telefone as string).slice(-8) === core)
    if (lead) return { cliente_id: null, lead_id: lead.id as string }
  }

  // Camada 2 — nome do WhatsApp (pushName), único e com 2+ palavras
  const np = normNome(pushName)
  if (np && np.includes(' ')) {
    const cliMatches = cls.filter(c => normNome(c.nome as string) === np)
    if (cliMatches.length === 1) return { cliente_id: cliMatches[0].id as string, lead_id: null }
    if (cliMatches.length === 0) {
      const leadMatches = lds.filter(l => normNome(l.nome as string) === np)
      if (leadMatches.length === 1) return { cliente_id: null, lead_id: leadMatches[0].id as string }
    }
  }

  return { cliente_id: null, lead_id: null }
}

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
  const direcao = fromMe ? 'out' : 'in'
  const waMsgId = data.key.id ?? null
  const texto = extrairTexto(data.message)
  const pushName = data.pushName ?? null
  // Em mensagens de saída (fromMe), o pushName é o NOSSO nome (o do número conectado),
  // não o do contato. Só confiamos no pushName quando a mensagem é recebida.
  const contatoNome = direcao === 'in' ? pushName : null
  const agora = new Date().toISOString()

  // Idempotência: se já registramos esta mensagem, não faz nada
  if (waMsgId) {
    const { data: existe } = await admin.from('wa_mensagens').select('id').eq('wa_message_id', waMsgId).maybeSingle()
    if (existe) {
      await logWebhook(admin, { resultado: 'duplicada', event: ev, instance: instanceName, tenant_id: inst.tenant_id, remote_jid: remoteJid, from_me: fromMe, telefone, token_ok: true })
      return NextResponse.json({ ok: true })
    }
  }

  // Conversa (por instância + telefone)
  const { data: conv } = await admin.from('wa_conversas')
    .select('id, contato_nome, nao_lidas, lead_id, cliente_id')
    .eq('instancia_id', inst.id).eq('telefone', telefone).maybeSingle()

  let conversaId = conv?.id as string | undefined

  if (!conversaId) {
    // Primeiro contato → vínculo automático (telefone OU nome do WhatsApp)
    const vinc = await autoVincular(admin, inst.tenant_id, telefone, contatoNome)

    const { data: novo } = await admin.from('wa_conversas').insert({
      tenant_id: inst.tenant_id,
      instancia_id: inst.id,
      telefone,
      contato_nome: contatoNome,
      cliente_id: vinc.cliente_id,
      lead_id: vinc.lead_id,
      ultima_mensagem: texto,
      ultima_em: agora,
      ultima_direcao: direcao,
      nao_lidas: direcao === 'in' ? 1 : 0,
    }).select('id').single()
    conversaId = novo?.id
    // Corrida: se o índice único barrar, re-busca a conversa existente
    if (!conversaId) {
      const { data: re } = await admin.from('wa_conversas').select('id, nao_lidas').eq('instancia_id', inst.id).eq('telefone', telefone).maybeSingle()
      conversaId = re?.id
    }
  } else {
    // Conversa já existe — se ainda está sem vínculo, tenta vincular de novo
    // (pega contatos LID criados antes de termos o nome cadastrado).
    const semVinculo = !conv?.lead_id && !conv?.cliente_id
    const novoVinc = semVinculo ? await autoVincular(admin, inst.tenant_id, telefone, contatoNome) : null

    await admin.from('wa_conversas').update({
      ultima_mensagem: texto,
      ultima_em: agora,
      ultima_direcao: direcao,
      atualizado_em: agora,
      contato_nome: conv?.contato_nome ?? contatoNome,
      nao_lidas: direcao === 'in' ? (conv?.nao_lidas ?? 0) + 1 : (conv?.nao_lidas ?? 0),
      ...(novoVinc?.cliente_id ? { cliente_id: novoVinc.cliente_id } : {}),
      ...(novoVinc?.lead_id ? { lead_id: novoVinc.lead_id } : {}),
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
    await logWebhook(admin, { resultado: `salva_${direcao}`, event: ev, instance: instanceName, tenant_id: inst.tenant_id, remote_jid: remoteJid, from_me: fromMe, telefone, token_ok: true })
  } else {
    await logWebhook(admin, { resultado: 'sem_conversa', event: ev, instance: instanceName, tenant_id: inst.tenant_id, remote_jid: remoteJid, from_me: fromMe, telefone, token_ok: true })
  }

  return NextResponse.json({ ok: true })
}
