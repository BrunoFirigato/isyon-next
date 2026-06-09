import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEvolutionServer } from '@/lib/whatsapp/config'
import { listInstances } from '@/lib/whatsapp/evolution'

function mapEstado(state?: string | null): string {
  if (state === 'open') return 'conectado'
  if (state === 'connecting') return 'pareando'
  return 'desconectado'
}

/** Status de conexão (ao vivo) dos números ativos do tenant do usuário logado.
 *  Disponível para qualquer usuário do tenant (só leitura de status — sem segredos).
 *  De quebra, sincroniza o status armazenado em wa_instancias. */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data: usuario } = await supabase.from('usuarios').select('id, tenant_id').eq('auth_id', user.id).maybeSingle()
  if (!usuario?.tenant_id) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()
  // Só os números acessíveis ao usuário (dele ou compartilhados) — respeita a privacidade.
  const { data: insts } = await admin
    .from('wa_instancias').select('id, nome, instance_name, status')
    .eq('tenant_id', usuario.tenant_id).eq('ativo', true)
    .or(`usuario_id.is.null,usuario_id.eq.${usuario.id}`)

  const srv = await getEvolutionServer(admin, usuario.tenant_id)
  const estados = srv ? await listInstances(srv) : {}

  const numeros = await Promise.all((insts ?? []).map(async (i) => {
    const live = estados[i.instance_name as string]
    const status = live ? mapEstado(live) : (i.status as string)
    if (live && status !== i.status) {
      await admin.from('wa_instancias').update({ status }).eq('id', i.id)
    }
    return { nome: i.nome as string, status }
  }))

  return NextResponse.json({ numeros })
}
