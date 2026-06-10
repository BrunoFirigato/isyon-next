import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export function digits(s?: string | null) { return (s || '').replace(/\D/g, '') }

/** Normaliza um nome para comparação: sem acento, minúsculo, só letras/números/espaço. */
function normNome(s?: string | null): string {
  return (s || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Tenta vincular um contato do WhatsApp a um lead/cliente, em duas camadas:
 *   1. Telefone (últimos 8 dígitos) — funciona para JIDs normais.
 *   2. Nome do WhatsApp (pushName) — resolve contatos que chegam via LID.
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

  const core = telefone.slice(-8)
  if (core.length === 8) {
    const cli = cls.find(c => digits(c.telefone as string).slice(-8) === core)
    if (cli) return { cliente_id: cli.id as string, lead_id: null }
    const lead = lds.find(l => digits(l.telefone as string).slice(-8) === core)
    if (lead) return { cliente_id: null, lead_id: lead.id as string }
  }

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

export interface MensagemEntrada {
  remoteJid: string
  fromMe: boolean
  waMsgId: string | null
  texto: string
  pushName: string | null
  /** ISO string; quando ausente usa o agora. */
  criadoEm?: string | null
}

export type IngestResultado = 'salva_in' | 'salva_out' | 'duplicada' | 'grupo_ou_sem_jid' | 'sem_telefone' | 'sem_conversa'

/**
 * Ingestão de uma mensagem do WhatsApp (webhook OU sync ativo):
 * cria/atualiza a conversa e grava a mensagem, com idempotência por wa_message_id.
 */
export async function ingestMensagem(
  admin: AdminClient,
  inst: { id: string; tenant_id: string },
  m: MensagemEntrada,
): Promise<IngestResultado> {
  if (!m.remoteJid || m.remoteJid.endsWith('@g.us')) return 'grupo_ou_sem_jid'
  const telefone = digits(m.remoteJid.split('@')[0])
  if (!telefone) return 'sem_telefone'

  const direcao = m.fromMe ? 'out' : 'in'
  // Em saída (fromMe), o pushName é o NOSSO nome — só confiamos quando é recebida.
  const contatoNome = direcao === 'in' ? (m.pushName ?? null) : null
  const agora = m.criadoEm ?? new Date().toISOString()

  // Idempotência: se já registramos esta mensagem, não faz nada
  if (m.waMsgId) {
    const { data: existe } = await admin.from('wa_mensagens').select('id').eq('wa_message_id', m.waMsgId).maybeSingle()
    if (existe) return 'duplicada'
  }

  // Conversa (por instância + telefone)
  const { data: conv } = await admin.from('wa_conversas')
    .select('id, contato_nome, nao_lidas, lead_id, cliente_id, ultima_em')
    .eq('instancia_id', inst.id).eq('telefone', telefone).maybeSingle()

  let conversaId = conv?.id as string | undefined

  if (!conversaId) {
    const vinc = await autoVincular(admin, inst.tenant_id, telefone, contatoNome)
    const { data: novo } = await admin.from('wa_conversas').insert({
      tenant_id: inst.tenant_id,
      instancia_id: inst.id,
      telefone,
      contato_nome: contatoNome,
      cliente_id: vinc.cliente_id,
      lead_id: vinc.lead_id,
      ultima_mensagem: m.texto,
      ultima_em: agora,
      ultima_direcao: direcao,
      nao_lidas: direcao === 'in' ? 1 : 0,
    }).select('id').single()
    conversaId = novo?.id
    // Corrida: se o índice único barrar, re-busca a conversa existente
    if (!conversaId) {
      const { data: re } = await admin.from('wa_conversas').select('id').eq('instancia_id', inst.id).eq('telefone', telefone).maybeSingle()
      conversaId = re?.id
    }
  } else {
    const semVinculo = !conv?.lead_id && !conv?.cliente_id
    const novoVinc = semVinculo ? await autoVincular(admin, inst.tenant_id, telefone, contatoNome) : null
    // No sync as mensagens podem chegar fora de ordem — só avança o "última" se for mais novo
    const maisNova = !conv?.ultima_em || agora >= (conv.ultima_em as string)
    await admin.from('wa_conversas').update({
      ...(maisNova ? { ultima_mensagem: m.texto, ultima_em: agora, ultima_direcao: direcao } : {}),
      atualizado_em: new Date().toISOString(),
      contato_nome: conv?.contato_nome ?? contatoNome,
      nao_lidas: direcao === 'in' ? (conv?.nao_lidas ?? 0) + 1 : (conv?.nao_lidas ?? 0),
      ...(novoVinc?.cliente_id ? { cliente_id: novoVinc.cliente_id } : {}),
      ...(novoVinc?.lead_id ? { lead_id: novoVinc.lead_id } : {}),
    }).eq('id', conversaId)
  }

  if (!conversaId) return 'sem_conversa'

  await admin.from('wa_mensagens').insert({
    tenant_id: inst.tenant_id,
    conversa_id: conversaId,
    instancia_id: inst.id,
    direcao,
    texto: m.texto,
    tipo: 'texto',
    wa_message_id: m.waMsgId,
    criado_em: agora,
  })
  return direcao === 'in' ? 'salva_in' : 'salva_out'
}
