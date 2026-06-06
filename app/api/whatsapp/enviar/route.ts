import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsApp } from '@/lib/whatsapp/evolution'
import { getEvolutionServer } from '@/lib/whatsapp/config'

function digits(s?: string | null) { return (s || '').replace(/\D/g, '') }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data: usuario } = await supabase.from('usuarios').select('tenant_id').eq('auth_id', user.id).maybeSingle()
  if (!usuario?.tenant_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const tenantId = usuario.tenant_id

  const body = await req.json()
  const { conversa_id, instancia_id, lead_id, cliente_id, texto } = body
  if (!texto?.trim()) return NextResponse.json({ error: 'texto é obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  // Conversa existente (responder) ou nova (iniciar)
  type ConvRef = { id: string; telefone: string; instancia_id: string }
  let conv: ConvRef | null = null

  if (conversa_id) {
    const { data } = await admin.from('wa_conversas')
      .select('id, telefone, instancia_id').eq('id', conversa_id).eq('tenant_id', tenantId).maybeSingle()
    conv = data as ConvRef | null
  } else {
    // Iniciar: precisa de uma instância + um telefone (direto ou do lead/cliente)
    if (!instancia_id) return NextResponse.json({ error: 'Selecione o número (instância).' }, { status: 400 })
    let telefone = digits(body.telefone)
    let contatoNome: string | null = null
    if (!telefone && (lead_id || cliente_id)) {
      const tbl = lead_id ? 'leads' : 'clientes'
      const { data } = await admin.from(tbl).select('telefone, nome').eq('id', lead_id || cliente_id).eq('tenant_id', tenantId).maybeSingle()
      telefone = digits(data?.telefone as string)
      contatoNome = (data?.nome as string) ?? null
    }
    if (!telefone) return NextResponse.json({ error: 'Contato sem telefone válido.' }, { status: 400 })

    const { data: existente } = await admin.from('wa_conversas')
      .select('id, telefone, instancia_id').eq('instancia_id', instancia_id).eq('telefone', telefone).maybeSingle()
    if (existente) {
      conv = existente as ConvRef
    } else {
      // Auto-vínculo por telefone (últimos 8 dígitos) se não veio explícito
      let linkLead: string | null = lead_id || null
      let linkCli: string | null = cliente_id || null
      if (!linkLead && !linkCli) {
        const core = telefone.slice(-8)
        const [{ data: cls }, { data: lds }] = await Promise.all([
          admin.from('clientes').select('id, telefone, nome').eq('tenant_id', tenantId).not('telefone', 'is', null).limit(5000),
          admin.from('leads').select('id, telefone, nome').eq('tenant_id', tenantId).not('telefone', 'is', null).limit(5000),
        ])
        const cli = (cls ?? []).find(c => digits(c.telefone as string).slice(-8) === core)
        if (cli) { linkCli = cli.id; contatoNome = contatoNome ?? (cli.nome as string) }
        else { const ld = (lds ?? []).find(l => digits(l.telefone as string).slice(-8) === core); if (ld) { linkLead = ld.id; contatoNome = contatoNome ?? (ld.nome as string) } }
      }
      const { data: novo } = await admin.from('wa_conversas').insert({
        tenant_id: tenantId, instancia_id, telefone, contato_nome: contatoNome,
        lead_id: linkLead, cliente_id: linkCli,
      }).select('id, telefone, instancia_id').single()
      conv = novo as ConvRef
    }
  }

  if (!conv) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const { data: inst } = await admin.from('wa_instancias').select('instance_name, status').eq('id', conv.instancia_id).maybeSingle()
  if (!inst) return NextResponse.json({ error: 'Número não disponível' }, { status: 400 })

  const srv = await getEvolutionServer(admin, tenantId)
  if (!srv) return NextResponse.json({ error: 'WhatsApp indisponível' }, { status: 400 })

  // Destino: prefere o telefone do lead/cliente vinculado.
  // Resolve o caso de contatos que chegam via LID (WhatsApp não expõe o número):
  // a Evolution não envia para um LID, mas envia para o telefone do cadastro.
  let destino = conv.telefone
  const { data: vinc } = await admin.from('wa_conversas').select('lead_id, cliente_id').eq('id', conv.id).maybeSingle()
  if (vinc?.cliente_id) {
    const { data: cli } = await admin.from('clientes').select('telefone').eq('id', vinc.cliente_id).maybeSingle()
    if (cli?.telefone) destino = digits(cli.telefone as string)
  } else if (vinc?.lead_id) {
    const { data: ld } = await admin.from('leads').select('telefone').eq('id', vinc.lead_id).maybeSingle()
    if (ld?.telefone) destino = digits(ld.telefone as string)
  }
  // Sem vínculo e número longo demais → provavelmente um LID (não enviável)
  if (!vinc?.lead_id && !vinc?.cliente_id && destino.length > 13) {
    return NextResponse.json({ error: 'Este contato chegou via WhatsApp sem expor o número (LID). Vincule a um lead/cliente com telefone para conseguir responder.' }, { status: 400 })
  }

  const r = await sendWhatsApp({ url: srv.url, key: srv.key, instance: inst.instance_name as string }, destino, texto.trim())
  if (!r.ok) return NextResponse.json({ error: r.error ?? 'Falha ao enviar' }, { status: 502 })

  const agora = new Date().toISOString()
  await admin.from('wa_mensagens').insert({
    tenant_id: tenantId, conversa_id: conv.id, instancia_id: conv.instancia_id,
    direcao: 'out', texto: texto.trim(), tipo: 'texto', status_envio: 'enviada',
    wa_message_id: r.id ?? null, criado_em: agora,
  })
  await admin.from('wa_conversas').update({
    ultima_mensagem: texto.trim(), ultima_em: agora, atualizado_em: agora,
  }).eq('id', conv.id)

  return NextResponse.json({ ok: true, conversa_id: conv.id })
}
