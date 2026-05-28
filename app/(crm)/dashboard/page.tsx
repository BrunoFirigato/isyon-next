import { createClient } from '@/lib/supabase/server'
import { Target, TrendingUp, FileText, DollarSign } from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────

function brl(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value)
}

function inicioDeMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

function nomeMesAno() {
  return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// ─── Sub-components ─────────────────────────────────────────────────────────

type KpiColor = 'blue' | 'purple' | 'orange' | 'green'

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  color: KpiColor
}) {
  const bg: Record<KpiColor, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${bg[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{value}</p>
      <p className="text-xs text-gray-500">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ganho:   'bg-green-100 text-green-700',
    perdido: 'bg-red-100 text-red-700',
    aberto:  'bg-blue-100 text-blue-700',
  }
  return (
    <span
      className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${
        map[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status}
    </span>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const inicio = inicioDeMes()

  const [
    { count: leadsDoMes },
    { data: ops },
    { count: propostasDoMes },
    { data: pedidos },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('criado_em', inicio),
    supabase
      .from('oportunidades')
      .select('id, titulo, status, valor, etapa, criado_em')
      .order('criado_em', { ascending: false }),
    supabase
      .from('propostas')
      .select('*', { count: 'exact', head: true })
      .gte('criado_em', inicio),
    supabase
      .from('pedidos')
      .select('valor')
      .gte('criado_em', inicio),
  ])

  const opList = ops ?? []
  const opDoMes = opList.filter((o) => o.criado_em >= inicio)
  const opAbertas = opList.filter((o) => o.status === 'aberto')
  const opGanhasDoMes = opDoMes.filter((o) => o.status === 'ganho')
  const taxaConversao =
    opDoMes.length > 0 ? Math.round((opGanhasDoMes.length / opDoMes.length) * 100) : 0

  const valorPipeline = opAbertas.reduce((s, o) => s + (o.valor ?? 0), 0)
  const receitaMes = (pedidos ?? []).reduce((s, p) => s + (p.valor ?? 0), 0)

  // Agrupar oportunidades abertas por etapa
  const pipelineMap = opAbertas.reduce(
    (acc, o) => {
      const etapa = o.etapa ?? o.status ?? 'sem etapa'
      if (!acc[etapa]) acc[etapa] = { count: 0, valor: 0 }
      acc[etapa].count++
      acc[etapa].valor += o.valor ?? 0
      return acc
    },
    {} as Record<string, { count: number; valor: number }>
  )

  const pipeline = Object.entries(pipelineMap)
    .map(([etapa, d]) => ({ etapa, ...d }))
    .sort((a, b) => b.valor - a.valor)

  const maxValor = Math.max(...pipeline.map((e) => e.valor), 1)
  const recentes = opList.slice(0, 6)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 capitalize">{nomeMesAno()}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Leads no mês"
          value={String(leadsDoMes ?? 0)}
          icon={<Target size={18} />}
          color="blue"
        />
        <KpiCard
          title="Pipeline aberto"
          value={brl(valorPipeline)}
          subtitle={`${opAbertas.length} oportunidade${opAbertas.length !== 1 ? 's' : ''}`}
          icon={<TrendingUp size={18} />}
          color="purple"
        />
        <KpiCard
          title="Propostas no mês"
          value={String(propostasDoMes ?? 0)}
          icon={<FileText size={18} />}
          color="orange"
        />
        <KpiCard
          title="Receita no mês"
          value={brl(receitaMes)}
          icon={<DollarSign size={18} />}
          color="green"
        />
      </div>

      {/* Conversão + Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Taxa de conversão */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Conversão do mês
          </p>
          <p className="text-5xl font-bold text-gray-900">{taxaConversao}%</p>
          <p className="text-xs text-gray-400 mt-2">
            {opGanhasDoMes.length} ganha{opGanhasDoMes.length !== 1 ? 's' : ''} de{' '}
            {opDoMes.length} no mês
          </p>
          <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${taxaConversao}%` }}
            />
          </div>
        </div>

        {/* Pipeline por etapa */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Pipeline por etapa
          </p>
          {pipeline.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma oportunidade aberta.</p>
          ) : (
            <div className="space-y-3">
              {pipeline.map(({ etapa, count, valor }) => (
                <div key={etapa}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm text-gray-700 capitalize">{etapa}</span>
                    <span className="text-xs text-gray-500">
                      {count} · {brl(valor)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(valor / maxValor) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Oportunidades recentes */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Oportunidades recentes</h2>
        </div>
        {recentes.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            Nenhuma oportunidade cadastrada ainda.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentes.map((op) => (
              <div key={op.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{op.titulo ?? '—'}</p>
                  <p className="text-xs text-gray-400 capitalize mt-0.5">
                    {op.etapa ?? '—'}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-semibold text-gray-900">
                    {op.valor != null ? brl(op.valor) : '—'}
                  </p>
                  <StatusBadge status={op.status ?? ''} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
