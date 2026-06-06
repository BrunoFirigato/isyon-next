import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createResend } from '@/lib/email/resend'
import { sendWhatsApp } from '@/lib/whatsapp/evolution'
import { getEvolutionServer } from '@/lib/whatsapp/config'

export async function POST(req: NextRequest) {
  try {
    const { campanhaId } = await req.json()
    if (!campanhaId) {
      return NextResponse.json({ error: 'campanhaId é obrigatório' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const admin = createAdminClient()

    // Carregar campanha
    const { data: campanha, error: campErr } = await admin
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single()

    if (campErr || !campanha)
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })

    if (campanha.status !== 'rascunho' && campanha.status !== 'agendada')
      return NextResponse.json({ error: 'Campanha já foi enviada ou está em processo de envio' }, { status: 400 })

    const tenantId  = campanha.tenant_id
    const isWpp     = campanha.tipo === 'whatsapp'
    const needField = isWpp ? 'telefone' : 'email'

    // Marcar como enviando
    await admin.from('campanhas').update({ status: 'enviando' }).eq('id', campanhaId)

    // ── Montar lista de destinatários ────────────────────────────────────────
    type Recipient = { nome: string; email: string | null; empresa: string | null; telefone: string | null }
    let destinatarios: Recipient[] = []

    if (campanha.publico_tipo === 'clientes' || campanha.publico_tipo === 'ambos') {
      let q = admin
        .from('clientes')
        .select('nome, email, empresa, telefone')
        .eq('tenant_id', tenantId)
        .not(needField, 'is', null)

      if (campanha.publico_status)   q = q.eq('status',   campanha.publico_status)
      if (campanha.publico_segmento) q = q.eq('segmento', campanha.publico_segmento)

      const { data } = await q
      if (data) destinatarios = [...destinatarios, ...data]
    }

    if (campanha.publico_tipo === 'leads' || campanha.publico_tipo === 'ambos') {
      let q = admin
        .from('leads')
        .select('nome, email, telefone')
        .eq('tenant_id', tenantId)
        .not(needField, 'is', null)

      if (campanha.publico_status) q = q.eq('status', campanha.publico_status)

      const { data } = await q
      if (data) {
        destinatarios = [
          ...destinatarios,
          ...data.map((l: { nome: string; email: string | null; telefone: string | null }) => ({
            nome:     l.nome,
            email:    l.email,
            empresa:  null,
            telefone: l.telefone,
          })),
        ]
      }
    }

    // Deduplicar pelo campo de contato relevante
    const seen = new Set<string>()
    destinatarios = destinatarios.filter(d => {
      const key = isWpp ? d.telefone : d.email
      if (!key) return false
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const totalDestinatarios = destinatarios.length

    if (totalDestinatarios === 0) {
      await admin.from('campanhas').update({
        status:             'enviada',
        total_destinatarios: 0,
        total_enviados:      0,
        total_erros:         0,
        enviado_em:          new Date().toISOString(),
      }).eq('id', campanhaId)

      return NextResponse.json({ success: true, total_destinatarios: 0, total_enviados: 0, total_erros: 0 })
    }

    let totalEnviados = 0
    let totalErros    = 0

    // ── E-mail ────────────────────────────────────────────────────────────────
    if (campanha.tipo === 'email') {
      let resendClient: Awaited<ReturnType<typeof createResend>> | null = null
      try {
        resendClient = await createResend(tenantId)
      } catch {
        await admin.from('campanhas').update({ status: 'rascunho' }).eq('id', campanhaId)
        return NextResponse.json({ error: 'E-mail não configurado. Configure a chave Resend nas configurações.' }, { status: 400 })
      }

      const { resend, fromEmail } = resendClient
      const BATCH = 10
      for (let i = 0; i < destinatarios.length; i += BATCH) {
        const batch = destinatarios.slice(i, i + BATCH)
        await Promise.all(batch.map(async (d) => {
          const html = campanha.mensagem
            .replace(/\{nome\}/g,    d.nome    ?? '')
            .replace(/\{empresa\}/g, d.empresa ?? '')
            .replace(/\n/g, '<br>')

          const { error } = await resend.emails.send({
            from:    fromEmail,
            to:      d.email!,
            subject: campanha.assunto ?? campanha.titulo,
            html,
          })

          if (error) totalErros++
          else       totalEnviados++
        }))
      }
    }

    // ── WhatsApp via Evolution API ────────────────────────────────────────────
    else if (campanha.tipo === 'whatsapp') {
      // Servidor Evolution (plataforma) + um número conectado do tenant
      const srv = await getEvolutionServer(admin, tenantId)
      const { data: numero } = await admin
        .from('wa_instancias')
        .select('instance_name')
        .eq('tenant_id', tenantId).eq('ativo', true)
        .order('criado_em').limit(1).maybeSingle()
      // Fallback: instância legada do tenant
      const { data: legacy } = numero ? { data: null } : await admin
        .from('tenants').select('evolution_instance').eq('id', tenantId).maybeSingle()
      const instanceName = numero?.instance_name ?? legacy?.evolution_instance

      if (!srv || !instanceName) {
        await admin.from('campanhas').update({ status: 'rascunho' }).eq('id', campanhaId)
        return NextResponse.json({
          error: 'WhatsApp não configurado. Conecte um número em Integrações → Gerenciar números.',
        }, { status: 400 })
      }

      const evolConfig = { url: srv.url, key: srv.key, instance: instanceName as string }

      const BATCH = 5
      for (let i = 0; i < destinatarios.length; i += BATCH) {
        const batch = destinatarios.slice(i, i + BATCH)
        await Promise.all(batch.map(async (d) => {
          if (!d.telefone) { totalErros++; return }

          const texto = campanha.mensagem
            .replace(/\{nome\}/g,    d.nome    ?? '')
            .replace(/\{empresa\}/g, d.empresa ?? '')

          const result = await sendWhatsApp(evolConfig, d.telefone, texto)
          if (result.ok) totalEnviados++
          else           totalErros++
        }))

        // Pausa entre lotes para não sobrecarregar a API
        if (i + BATCH < destinatarios.length) {
          await new Promise(r => setTimeout(r, 1000))
        }
      }
    }

    // Marcar como enviada
    await admin.from('campanhas').update({
      status:              'enviada',
      total_destinatarios: totalDestinatarios,
      total_enviados:      totalEnviados,
      total_erros:         totalErros,
      enviado_em:          new Date().toISOString(),
    }).eq('id', campanhaId)

    return NextResponse.json({
      success:             true,
      total_destinatarios: totalDestinatarios,
      total_enviados:      totalEnviados,
      total_erros:         totalErros,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
