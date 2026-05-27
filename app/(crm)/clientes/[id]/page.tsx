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
  ] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nome, empresa, email, telefone, cpf_cnpj, cep, rua, numero, complemento, bairro, cidade, estado, tipo, segmento, status, valor_total, criado_em, atualizado_em')
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
  ])

  if (!cliente) notFound()

  return (
    <Cliente360View
      cliente={cliente}
      oportunidades={oportunidades ?? []}
      propostas={propostas ?? []}
      pedidos={pedidos ?? []}
    />
  )
}
