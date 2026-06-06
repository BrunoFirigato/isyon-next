import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsApp } from '@/lib/whatsapp/evolution'
import { getEvolutionServer } from '@/lib/whatsapp/config'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data: usuario } = await supabase.from('usuarios').select('tenant_id').eq('auth_id', user.id).maybeSingle()
  if (!usuario?.tenant_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const tenantId = usuario.tenant_id

  const { conversa_id, texto } = await req.json()
  if (!conversa_id || !texto?.trim()) return NextResponse.json({ error: 'conversa_id e texto são obrigatórios' }, { status: 400 })

  const admin = createAdminClient()
  const { data: conv } = await admin
    .from('wa_conversas').select('id, telefone, instancia_id')
    .eq('id', conversa_id).eq('tenant_id', tenantId).maybeSingle()
  if (!conv) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const { data: inst } = await admin.from('wa_instancias').select('instance_name').eq('id', conv.instancia_id).maybeSingle()
  if (!inst) return NextResponse.json({ error: 'Número não disponível' }, { status: 400 })

  const srv = await getEvolutionServer(admin, tenantId)
  if (!srv) return NextResponse.json({ error: 'WhatsApp indisponível' }, { status: 400 })

  const r = await sendWhatsApp({ url: srv.url, key: srv.key, instance: inst.instance_name as string }, conv.telefone as string, texto.trim())
  if (!r.ok) return NextResponse.json({ error: r.error ?? 'Falha ao enviar' }, { status: 502 })

  const agora = new Date().toISOString()
  await admin.from('wa_mensagens').insert({
    tenant_id: tenantId,
    conversa_id: conv.id,
    instancia_id: conv.instancia_id,
    direcao: 'out',
    texto: texto.trim(),
    tipo: 'texto',
    status_envio: 'enviada',
    wa_message_id: r.id ?? null,
    criado_em: agora,
  })
  await admin.from('wa_conversas').update({
    ultima_mensagem: texto.trim(), ultima_em: agora, atualizado_em: agora,
  }).eq('id', conv.id)

  return NextResponse.json({ ok: true, id: r.id })
}
