import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Cliente360View from './_components/Cliente360View'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Cliente360Page({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: cliente },
    { data: oportunidades },
    { data: propostas },
    { data: pedidos },
    { data: faturasData, error: errFaturas },
    { data: historicoData, error: errHistorico },
    { data: notasData, error: errNotas },
  ] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nome, empresa, email, telefone, cpf_cnpj, cep, rua, numero, complemento, bairro, cidade, estado, tipo, segmento, status, valor_total, origem, lead_id, vendedor_maq_id, vendedor_pec_id, parceiro_id, criado_em, atualizado_em')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('oportunidades')
      .select('id, titulo, numero, status, etapa, valor, criado_em')
      .eq('cliente_id', id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('propostas')
      .select('id, titulo, numero, status, valor, validade, criado_em')
      .eq('cliente_id', id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('pedidos')
      .select('id, numero, status, valor, criado_em')
      .eq('cliente_id', id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('faturas')
      .select('id, numero, status, valor, pedido_id, obs, criado_em')
      .eq('cliente_id', id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('historico')
      .select('id, tipo, texto, valor, usuario_nome, criado_em')
      .eq('cliente_id', id)
      .order('criado_em', { ascending: false })
      .limit(30),
    supabase
      .from('notas_fiscais')
      .select('id, numero, status, valor, data_emissao, obs, criado_em')
      .eq('cliente_id', id)
      .order('data_emissao', { ascending: false }),
  ])

  if (!cliente) notFound()

  return (
    <Cliente360View
      cliente={cliente}
      oportunidades={oportunidades ?? []}
      propostas={propostas ?? []}
      pedidos={pedidos ?? []}
      faturas={errFaturas ? [] : (faturasData ?? [])}
      historico={errHistorico ? [] : (historicoData ?? [])}
      notas={errNotas ? [] : (notasData ?? [])}
    />
  )
}
