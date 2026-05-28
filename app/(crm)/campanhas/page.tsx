import { createClient } from '@/lib/supabase/server'
import CampanhasView from './_components/CampanhasView'

export default async function CampanhasPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('campanhas')
    .select('id, titulo, tipo, status, publico_tipo, publico_segmento, publico_status, assunto, mensagem, total_destinatarios, total_enviados, total_erros, enviado_em, criado_em')
    .order('criado_em', { ascending: false })

  return <CampanhasView campanhas={data ?? []} />
}
