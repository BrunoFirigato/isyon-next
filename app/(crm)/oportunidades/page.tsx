import { createClient } from '@/lib/supabase/server'
import OpsView from './_components/OpsView'

export default async function OportunidadesPage() {
  const supabase = await createClient()

  const { data: ops } = await supabase
    .from('oportunidades')
    .select(
      'id, titulo, status, valor, etapa, numero, segmento, lead_id, cliente_id, vendedor_id, prazo_fechamento, motivo_perda, criado_em, atualizado_em'
    )
    .order('criado_em', { ascending: false })

  return <OpsView ops={ops ?? []} />
}
