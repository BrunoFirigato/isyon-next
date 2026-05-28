import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Lead360View from './_components/Lead360View'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LeadPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: lead },
    { data: oportunidades },
    { data: historicoData, error: errHistorico },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('id, nome, empresa, email, telefone, status, origem, obs, criado_em, atualizado_em')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('oportunidades')
      .select('id, titulo, numero, status, etapa, valor, criado_em')
      .eq('lead_id', id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('historico')
      .select('id, tipo, texto, valor, usuario_nome, criado_em')
      .eq('lead_id', id)
      .order('criado_em', { ascending: false })
      .limit(50),
  ])

  if (!lead) notFound()

  return (
    <Lead360View
      lead={lead}
      oportunidades={oportunidades ?? []}
      historico={errHistorico ? [] : (historicoData ?? [])}
    />
  )
}
