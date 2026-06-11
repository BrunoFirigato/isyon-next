import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ItemProp {
  descricao: string
  quantidade: number
  valorUnitario: number
  produto_id?: string | null
  ncm?: string | null
  unidade?: string | null
}

/**
 * Aceite/recusa público de uma proposta, identificada por share_token.
 * Sem autenticação — usa admin client (service_role) e só toca a proposta do token.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token) return NextResponse.json({ error: 'Token ausente.' }, { status: 400 })

  let body: { action?: string; nome?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
  }
  const action = body.action
  const nome = (body.nome ?? '').trim().slice(0, 120) || null
  if (action !== 'aceitar' && action !== 'recusar') {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: p } = await admin
    .from('propostas')
    .select('id, numero, tenant_id, status, validade, valor, itens, cliente_id, vendedor_id, cond_pagamento_id, tabela_preco_id, empresa_id, segmento, oportunidade_id')
    .eq('share_token', token)
    .maybeSingle()

  if (!p) return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 })

  // Já respondida — idempotente, devolve o estado atual
  if (p.status === 'aprovada' || p.status === 'recusada') {
    return NextResponse.json({ ok: true, status: p.status, alreadyDone: true })
  }

  const hoje = new Date().toISOString().slice(0, 10)
  const vencida = !!p.validade && p.validade < hoje

  if (action === 'recusar') {
    await admin.from('propostas').update({
      status: 'recusada',
      aceite_em: new Date().toISOString(),
      aceite_por: nome,
    }).eq('id', p.id)
    return NextResponse.json({ ok: true, status: 'recusada' })
  }

  // action === 'aceitar'
  if (vencida) {
    return NextResponse.json({ error: 'Esta proposta está vencida. Solicite uma nova ao vendedor.' }, { status: 409 })
  }

  await admin.from('propostas').update({
    status: 'aprovada',
    aceite_em: new Date().toISOString(),
    aceite_por: nome,
  }).eq('id', p.id)

  // O tenant decide se o aceite já gera o pedido automaticamente
  const { data: tenant } = await admin
    .from('tenants').select('proposta_aceite_gera_pedido').eq('id', p.tenant_id).maybeSingle()
  const geraPedido = tenant?.proposta_aceite_gera_pedido === true

  let pedidoNumero: string | null = null

  if (geraPedido) {
    // Evita duplicar pedido da mesma proposta
    const { data: existente } = await admin
      .from('pedidos').select('numero').eq('proposta_id', p.id).limit(1).maybeSingle()

    if (!existente) {
      // Próximo número sequencial PED-XXXX (dentro do tenant)
      const { data: ultimas } = await admin
        .from('pedidos').select('numero').eq('tenant_id', p.tenant_id)
        .ilike('numero', 'PED-%').order('numero', { ascending: false }).limit(1)
      const ultimoNum = ultimas?.[0]?.numero
        ? parseInt(String(ultimas[0].numero).replace(/\D/g, ''), 10) || 0
        : 0
      pedidoNumero = `PED-${String(ultimoNum + 1).padStart(4, '0')}`

      const itens = ((p.itens as ItemProp[] | null) ?? []).map((it) => ({
        descricao: it.descricao,
        quantidade: it.quantidade,
        valorUnitario: it.valorUnitario,
        produto_id: it.produto_id ?? null,
        ncm: it.ncm ?? null,
        unidade: it.unidade ?? null,
      }))

      // Se o tenant exige aprovação, o pedido nasce pendente
      const { data: cfg } = await admin
        .from('tenants').select('aprovacao_pedido').eq('id', p.tenant_id).maybeSingle()
      const aprovacaoPedido = cfg?.aprovacao_pedido === true

      await admin.from('pedidos').insert({
        tenant_id: p.tenant_id,
        numero: pedidoNumero,
        cliente_id: p.cliente_id,
        vendedor_id: p.vendedor_id,
        cond_pagamento_id: p.cond_pagamento_id,
        tabela_preco_id: p.tabela_preco_id,
        empresa_id: p.empresa_id,
        proposta_id: p.id,
        segmento: p.segmento,
        valor: p.valor,
        itens,
        status: 'aguardando',
        aprovado: !aprovacaoPedido,
      })
    } else {
      pedidoNumero = existente.numero
    }
  }

  // Aceite = negócio ganho — vale nos DOIS modos (gerar pedido automático ou manual).
  // Fecha a oportunidade vinculada e promove o prospect a cliente ativo.
  if (p.oportunidade_id) {
    await admin.from('oportunidades').update({ status: 'ganho', valor: p.valor }).eq('id', p.oportunidade_id)
  }
  if (p.cliente_id) {
    await admin.from('clientes').update({ status: 'ativo' })
      .eq('id', p.cliente_id).eq('status', 'prospect')

    // Avisa o vendedor na própria conversa do WhatsApp (nota interna do sistema)
    const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor ?? 0)
    const aviso = `✅ Cliente aceitou a proposta${p.numero ? ` ${p.numero}` : ''} · ${valorFmt}`
        + (geraPedido && pedidoNumero ? `\nPedido ${pedidoNumero} gerado automaticamente.` : `\nDisponível para gerar o pedido.`)
    const { data: conv } = await admin.from('wa_conversas')
      .select('id, instancia_id, nao_lidas').eq('cliente_id', p.cliente_id)
      .order('ultima_em', { ascending: false }).limit(1).maybeSingle()
    if (conv) {
      const agora = new Date().toISOString()
      await admin.from('wa_mensagens').insert({
        tenant_id: p.tenant_id, conversa_id: conv.id, instancia_id: conv.instancia_id,
        direcao: 'in', texto: aviso, tipo: 'sistema', criado_em: agora,
      })
      await admin.from('wa_conversas').update({
        ultima_mensagem: aviso, ultima_em: agora, ultima_direcao: 'in',
        nao_lidas: (conv.nao_lidas ?? 0) + 1, atualizado_em: agora,
      }).eq('id', conv.id)
    }
  }

  return NextResponse.json({ ok: true, status: 'aprovada', pedidoNumero })
}
