import { createClient } from '@/lib/supabase/server'
import { getCarteiraScope } from '@/lib/carteira'
import OpsView from './_components/OpsView'

export default async function OportunidadesPage() {
  const supabase = await createClient()
  const { restrict, vendedorId } = await getCarteiraScope(supabase)

  let query = supabase
    .from('oportunidades')
    .select(
      'id, titulo, status, valor, etapa, numero, segmento, lead_id, cliente_id, vendedor_id, empresa_id, prazo_fechamento, motivo_perda, criado_em, atualizado_em'
    )
    .order('criado_em', { ascending: false })

  if (restrict && vendedorId) query = query.eq('vendedor_id', vendedorId)

  const { data: ops } = await query

  return <OpsView ops={ops ?? []} />
}
