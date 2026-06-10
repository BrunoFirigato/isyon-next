import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findMessages } from '@/lib/whatsapp/evolution'
import { getEvolutionServer } from '@/lib/whatsapp/config'
import { ingestMensagem } from '@/lib/whatsapp/ingest'

/**
 * Sync ativo de mensagens: puxa as últimas mensagens de cada instância do tenant
 * direto do banco da Evolution e ingere as que faltam (idempotente).
 * Plano B do webhook — garante o recebimento mesmo quando a Evolution não
 * consegue entregar webhooks para fora.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data: usuario } = await supabase.from('usuarios').select('tenant_id').eq('auth_id', user.id).maybeSingle()
  if (!usuario?.tenant_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()
  const srv = await getEvolutionServer(admin, usuario.tenant_id)
  if (!srv) return NextResponse.json({ ok: true, novas: 0 })

  const { data: insts } = await admin
    .from('wa_instancias').select('id, tenant_id, instance_name')
    .eq('tenant_id', usuario.tenant_id).eq('ativo', true)

  let novas = 0
  for (const inst of insts ?? []) {
    const msgs = await findMessages(srv, inst.instance_name as string, 30)
    // Ordena por timestamp ascendente para o "última mensagem" da conversa ficar correto
    msgs.sort((a, b) => (a.criadoEm ?? '').localeCompare(b.criadoEm ?? ''))
    for (const m of msgs) {
      const r = await ingestMensagem(admin, { id: inst.id as string, tenant_id: inst.tenant_id as string }, {
        remoteJid: m.remoteJid,
        fromMe: m.fromMe,
        waMsgId: m.id,
        texto: m.texto,
        pushName: m.pushName,
        criadoEm: m.criadoEm,
      })
      if (r === 'salva_in' || r === 'salva_out') novas++
    }
  }

  return NextResponse.json({ ok: true, novas })
}
