import { createClient } from '@/lib/supabase/server'
import FinanceiroView from './_components/FinanceiroView'

type Aba = 'lancamentos' | 'faturas' | 'comissoes'

interface Props {
  searchParams: Promise<{ aba?: string }>
}

export default async function FinanceiroPage({ searchParams }: Props) {
  const { aba } = await searchParams
  const currentAba: Aba =
    aba === 'faturas' || aba === 'comissoes' ? aba : 'lancamentos'

  const supabase = await createClient()

  const [
    { data: lancamentos },
    { data: faturas },
    { data: comissoes },
    { data: clientes },
    { data: vendedores },
  ] = await Promise.all([
    supabase
      .from('lancamentos')
      .select('id, tipo, descricao, valor, data, categoria, criado_em')
      .order('data', { ascending: false }),
    supabase
      .from('faturas')
      .select('id, numero, status, valor, cliente_id, pedido_id, obs, criado_em')
      .order('criado_em', { ascending: false }),
    supabase
      .from('comissoes')
      .select('id, vendedor_id, pedido_id, status, valor_pedido, valor_comissao, criado_em')
      .order('criado_em', { ascending: false }),
    supabase.from('clientes').select('id, nome, empresa').order('nome'),
    supabase.from('vendedores').select('id, nome').order('nome'),
  ])

  return (
    <FinanceiroView
      lancamentos={lancamentos ?? []}
      faturas={faturas ?? []}
      comissoes={comissoes ?? []}
      clientes={clientes ?? []}
      vendedores={vendedores ?? []}
      currentAba={currentAba}
    />
  )
}
