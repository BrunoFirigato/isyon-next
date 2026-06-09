import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** Transfere uma conversa para outro responsável (define wa_conversas.responsavel_id).
 *  Pode transferir: quem hoje tem acesso à conversa (responsável atual / número dele) OU admin. */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data: usuario } = await supabase
    .from('usuarios').select('id, tenant_id, perfil').eq('auth_id', user.id).maybeSingle()
  if (!usuario?.tenant_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const meId = usuario.id as string
  const ehAdmin = usuario.perfil === 'admin'

  const { conversa_id, usuario_id } = await req.json().catch(() => ({}))
  if (!conversa_id) return NextResponse.json({ error: 'Conversa não informada.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: conv } = await admin
    .from('wa_conversas').select('id, instancia_id, responsavel_id')
    .eq('id', conversa_id).eq('tenant_id', usuario.tenant_id).maybeSingle()
  if (!conv) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })

  // Acesso: admin sempre pode; senão, precisa ser o responsável atual (ou número dele/compartilhado)
  let pode = ehAdmin
  if (!pode) {
    if (conv.responsavel_id) pode = conv.responsavel_id === meId
    else {
      const { data: inst } = await admin.from('wa_instancias').select('usuario_id').eq('id', conv.instancia_id).maybeSingle()
      const owner = inst?.usuario_id as string | null | undefined
      pode = !owner || owner === meId
    }
  }
  if (!pode) return NextResponse.json({ error: 'Você não pode transferir esta conversa.' }, { status: 403 })

  // usuario_id vazio/null → volta a herdar o responsável do número
  let novoResp: string | null = null
  if (usuario_id) {
    const { data: dest } = await admin
      .from('usuarios').select('id').eq('id', usuario_id).eq('tenant_id', usuario.tenant_id).maybeSingle()
    if (!dest) return NextResponse.json({ error: 'Usuário de destino inválido.' }, { status: 400 })
    novoResp = dest.id as string
  }

  await admin.from('wa_conversas')
    .update({ responsavel_id: novoResp, atualizado_em: new Date().toISOString() })
    .eq('id', conversa_id).eq('tenant_id', usuario.tenant_id)

  return NextResponse.json({ ok: true })
}
