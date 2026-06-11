import { createClient } from '@/lib/supabase/server'
import RelatoriosView, {
  type FunilData, type VendasMes,
} from './_components/RelatoriosView'

type Aba = 'funil' | 'vendas'

interface Props {
  searchParams: Promise<{ aba?: string }>
}

function mesLabel(yyyyMM: string) {
  const [year, month] = yyyyMM.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[Number(month) - 1]}/${year.slice(2)}`
}

function ultimos6Meses(): string[] {
  const meses: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    meses.push(`${d.getFullYear()}-${mm}`)
  }
  return meses
}

export default async function RelatoriosPage({ searchParams }: Props) {
  const { aba } = await searchParams
  const currentAba: Aba = aba === 'vendas' ? 'vendas' : 'funil'

  const supabase = await createClient()

  const [
    { data: leads },
    { data: oportunidades },
    { data: propostas },
    { data: pedidos },
  ] = await Promise.all([
    supabase.from('leads').select('status'),
    supabase.from('oportunidades').select('status, etapa'),
    supabase.from('propostas').select('status'),
    supabase.from('pedidos').select('status, valor, criado_em'),
  ])

  /* ── Funil ── */
  function contarPor<T extends Record<string, unknown>>(arr: T[], key: keyof T): Record<string, number> {
    return (arr ?? []).reduce((acc, item) => {
      const v = String(item[key] ?? 'desconhecido')
      acc[v] = (acc[v] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  const funil: FunilData = {
    leads: contarPor(leads ?? [], 'status'),
    oportunidades: contarPor(
      (oportunidades ?? []).filter((o) => o.status === 'aberto'),
      'etapa'
    ),
    propostas: contarPor(propostas ?? [], 'status'),
    pedidos: contarPor(pedidos ?? [], 'status'),
  }

  /* ── Vendas por mês ── */
  const meses = ultimos6Meses()
  const vendasMap = new Map<string, { total: number; quantidade: number }>()
  meses.forEach((m) => vendasMap.set(m, { total: 0, quantidade: 0 }))

  ;(pedidos ?? []).forEach((p) => {
    if (!p.criado_em) return
    const mes = p.criado_em.slice(0, 7)
    if (!vendasMap.has(mes)) return
    const curr = vendasMap.get(mes)!
    vendasMap.set(mes, {
      total: curr.total + (p.valor ?? 0),
      quantidade: curr.quantidade + 1,
    })
  })

  const vendas: VendasMes[] = meses.map((mes) => ({
    mes,
    label: mesLabel(mes),
    total: vendasMap.get(mes)?.total ?? 0,
    quantidade: vendasMap.get(mes)?.quantidade ?? 0,
  }))

  return (
    <RelatoriosView
      funil={funil}
      vendas={vendas}
      currentAba={currentAba}
    />
  )
}
