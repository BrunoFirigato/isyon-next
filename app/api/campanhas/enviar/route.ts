import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createResend } from '@/lib/email/resend'

export async function POST(req: NextRequest) {
  try {
    const { campanhaId } = await req.json()
    if (!campanhaId) {
      return NextResponse.json({ error: 'campanhaId é obrigatório' }, { status: 400 })
    }

    // Auth: the user must be logged in
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Load campaign
    const { data: campanha, error: campErr } = await admin
      .from('campanhas')
      .select('*')
      .eq('id', campanhaId)
      .single()

    if (campErr || !campanha) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    if (campanha.status !== 'rascunho' && campanha.status !== 'agendada') {
      return NextResponse.json({ error: 'Campanha já foi enviada ou está em processo de envio' }, { status: 400 })
    }

    const tenantId = campanha.tenant_id

    // Mark as sending
    await admin.from('campanhas').update({ status: 'enviando' }).eq('id', campanhaId)

    // Build recipient list
    type Recipient = { nome: string; email: string | null; empresa: string | null }
    let destinatarios: Recipient[] = []

    if (campanha.publico_tipo === 'clientes' || campanha.publico_tipo === 'ambos') {
      let q = admin
        .from('clientes')
        .select('nome, email, empresa')
        .eq('tenant_id', tenantId)
        .not('email', 'is', null)

      if (campanha.publico_status) {
        q = q.eq('status', campanha.publico_status)
      }
      if (campanha.publico_segmento) {
        q = q.eq('segmento', campanha.publico_segmento)
      }

      const { data } = await q
      if (data) destinatarios = [...destinatarios, ...data]
    }

    if (campanha.publico_tipo === 'leads' || campanha.publico_tipo === 'ambos') {
      let q = admin
        .from('leads')
        .select('nome, email, empresa:nome')
        .eq('tenant_id', tenantId)
        .not('email', 'is', null)

      if (campanha.publico_status) {
        q = q.eq('status', campanha.publico_status)
      }

      const { data } = await q
      if (data) {
        destinatarios = [
          ...destinatarios,
          ...data.map((l: { nome: string; email: string | null; empresa: string | null }) => ({
            nome: l.nome,
            email: l.email,
            empresa: null,
          })),
        ]
      }
    }

    // Remove duplicates by email
    const seen = new Set<string>()
    destinatarios = destinatarios.filter(d => {
      if (!d.email) return false
      if (seen.has(d.email)) return false
      seen.add(d.email)
      return true
    })

    const totalDestinatarios = destinatarios.length

    if (totalDestinatarios === 0) {
      await admin.from('campanhas').update({
        status: 'enviada',
        total_destinatarios: 0,
        total_enviados: 0,
        total_erros: 0,
        enviado_em: new Date().toISOString(),
      }).eq('id', campanhaId)

      return NextResponse.json({
        success: true,
        total_destinatarios: 0,
        total_enviados: 0,
        total_erros: 0,
      })
    }

    // Send emails
    let totalEnviados = 0
    let totalErros    = 0

    if (campanha.tipo === 'email') {
      let resendClient: Awaited<ReturnType<typeof createResend>> | null = null
      try {
        resendClient = await createResend()
      } catch {
        await admin.from('campanhas').update({ status: 'rascunho' }).eq('id', campanhaId)
        return NextResponse.json({ error: 'E-mail não configurado. Configure a chave Resend nas configurações.' }, { status: 400 })
      }

      const { resend, fromEmail } = resendClient

      // Send in batches of 10 to avoid rate-limiting
      const BATCH = 10
      for (let i = 0; i < destinatarios.length; i += BATCH) {
        const batch = destinatarios.slice(i, i + BATCH)
        await Promise.all(batch.map(async (d) => {
          const nome    = d.nome ?? 'cliente'
          const empresa = d.empresa ?? ''
          const html    = campanha.mensagem
            .replace(/\{nome\}/g, nome)
            .replace(/\{empresa\}/g, empresa)
            .replace(/\n/g, '<br>')

          const { error } = await resend.emails.send({
            from: fromEmail,
            to:   d.email!,
            subject: campanha.assunto ?? campanha.titulo,
            html,
          })

          if (error) {
            totalErros++
          } else {
            totalEnviados++
          }
        }))
      }
    } else {
      // WhatsApp — not yet integrated, count as errors
      totalErros = totalDestinatarios
    }

    // Mark as sent
    await admin.from('campanhas').update({
      status: 'enviada',
      total_destinatarios: totalDestinatarios,
      total_enviados: totalEnviados,
      total_erros: totalErros,
      enviado_em: new Date().toISOString(),
    }).eq('id', campanhaId)

    return NextResponse.json({
      success: true,
      total_destinatarios: totalDestinatarios,
      total_enviados: totalEnviados,
      total_erros: totalErros,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
