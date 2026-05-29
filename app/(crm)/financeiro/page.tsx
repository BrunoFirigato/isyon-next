import { createClient } from '@/lib/supabase/server'
import FinanceiroView from './_components/FinanceiroView'

type Aba = 'lancamentos' | 'faturas' | 'comissoes'

interface Props {
  searchParams: Promise<{
    aba?: string
    mes?: string
    ano?: string
  }>
}

export default async function FinanceiroPage({ searchParams }: Props) {
  const params = await searchParams
  const currentAba: Aba =
    params.aba === 'faturas' || params.aba === 'comissoes' ? params.aba : 'lancamentos'

  const now = new Date()
  const currentMes = params.mes ? parseInt(params.mes) : now.getMonth() + 1
  const currentAno = params.ano ? parseInt(params.ano) : now.getFullYear()

  const supabase = await createClient()

  // Período: primeiro e último dia do mês selecionado
  const from = `${currentAno}-${String(currentMes).padStart(2, '0')}-01`
  const to   = new Date(currentAno, currentMes, 0).toISOString().slice(0, 10)

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
      .gte('data', from)
      .lte('data', to)
      .order('data', { ascending: false }),
    supabase
      .from('faturas')
      .select('id, numero, status, valor, cliente_id, pedido_id, empresa_id, obs, criado_em')
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
      currentMes={currentMes}
      currentAno={currentAno}
    />
  )
}
