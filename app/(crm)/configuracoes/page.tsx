import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConfiguracoesView from './_components/ConfiguracoesView'
import { DEFAULT_SEGMENTOS } from '@/app/(crm)/_components/SegmentosContext'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: usuario }, { data: configs }] = await Promise.all([
    supabase.from('usuarios').select('id, tenant_id').eq('auth_id', user.id).limit(1).maybeSingle(),
    supabase.from('config_usuario').select('id, usuario_id, chave, valor'),
  ])

  const tenantId = usuario?.tenant_id
  if (!tenantId) redirect('/dashboard')

  let { data: tenantData, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, nome, plano, status, criado_em, segmentos, divisao_carteira, aprovacao_pedido')
    .eq('id', tenantId)
    .maybeSingle()

  // Fallback: se a query falhar (ex: coluna nova ainda não migrada no banco),
  // refaz com as colunas essenciais em vez de expulsar o usuário para o dashboard.
  if (tenantErr) {
    console.error('[configuracoes] select completo falhou, usando fallback:', tenantErr.message)
    const fb = await supabase
      .from('tenants')
      .select('id, nome, plano, status, criado_em, segmentos')
      .eq('id', tenantId)
      .maybeSingle()
    tenantData = fb.data ? { ...fb.data, divisao_carteira: false, aprovacao_pedido: false } : null
  }

  if (!tenantData) redirect('/dashboard')

  const segmentosIniciais = (tenantData.segmentos as typeof DEFAULT_SEGMENTOS | null) ?? DEFAULT_SEGMENTOS

  return (
    <ConfiguracoesView
      tenant={tenantData}
      configs={configs ?? []}
      usuarioId={usuario?.id ?? ''}
      segmentosIniciais={segmentosIniciais}
    />
  )
}
