'use client'

import { useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'

type Aba = 'funil' | 'vendas' | 'financeiro'

/* ── tipos de dados agregados ── */
export interface FunilData {
  leads: Record<string, number>
  oportunidades: Record<string, number>
  propostas: Record<string, number>
  pedidos: Record<string, number>
}

export interface VendasMes {
  mes: string   // 'YYYY-MM'
  label: string // 'Jan/25'
  total: number
  quantidade: number
}

export interface CategoriaFinanceiro {
  categoria: string
  valor: number
}

export interface FinanceiroData {
  totalReceitas: number
  totalDespesas: number
  receitasPorCategoria: CategoriaFinanceiro[]
  despesasPorCategoria: CategoriaFinanceiro[]
}

interface Props {
  funil: FunilData
  vendas: VendasMes[]
  financeiro: FinanceiroData
  currentAba: Aba
}

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v)
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right shrink-0">{value}</span>
    </div>
  )
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function RelatoriosView({ funil, vendas, financeiro, currentAba }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  function setAba(aba: Aba) {
    startTransition(() => {
      router.push(pathname + (aba !== 'funil' ? `?aba=${aba}` : ''))
    })
  }

  const ABAS: { value: Aba; label: string }[] = [
    { value: 'funil', label: 'Funil de vendas' },
    { value: 'vendas', label: 'Vendas' },
    { value: 'financeiro', label: 'Financeiro' },
  ]

  /* ── cálculos funil ── */
  const totalLeads = Object.values(funil.leads).reduce((s, v) => s + v, 0)
  const totalOps   = Object.values(funil.oportunidades).reduce((s, v) => s + v, 0)
  const totalProps = Object.values(funil.propostas).reduce((s, v) => s + v, 0)
  const totalPeds  = Object.values(funil.pedidos).reduce((s, v) => s + v, 0)

  /* ── cálculos vendas ── */
  const maxVenda = Math.max(...vendas.map((v) => v.total), 1)
  const totalVendido = vendas.reduce((s, v) => s + v.total, 0)
  const totalPedidos = vendas.reduce((s, v) => s + v.quantidade, 0)

  /* ── cálculos financeiro ── */
  const saldo = financeiro.totalReceitas - financeiro.totalDespesas
  const maxRec = Math.max(...financeiro.receitasPorCategoria.map((c) => c.valor), 1)
  const maxDes = Math.max(...financeiro.despesasPorCategoria.map((c) => c.valor), 1)

  return (
    <>
      {/* Cabeçalho */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Relatórios</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Visão analítica do negócio</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1.5 mb-6">
        {ABAS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setAba(value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentAba === value
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── ABA FUNIL ── */}
      {currentAba === 'funil' && (
        <div className="space-y-5">
          {/* KPIs do funil */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Leads" value={String(totalLeads)} />
            <KpiCard label="Oportunidades" value={String(totalOps)} />
            <KpiCard label="Propostas" value={String(totalProps)} />
            <KpiCard label="Pedidos" value={String(totalPeds)} />
          </div>

          {/* Leads por status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Leads por status</h3>
            <div className="space-y-3">
              {Object.entries(funil.leads).map(([status, count]) => (
                <BarRow key={status} label={status} value={count} max={totalLeads} color="bg-blue-400" />
              ))}
              {totalLeads === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">Sem dados.</p>}
            </div>
          </div>

          {/* Oportunidades por etapa */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Oportunidades por etapa</h3>
            <div className="space-y-3">
              {Object.entries(funil.oportunidades).map(([etapa, count]) => (
                <BarRow key={etapa} label={etapa} value={count} max={totalOps} color="bg-purple-400" />
              ))}
              {totalOps === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">Sem dados.</p>}
            </div>
          </div>

          {/* Grid propostas + pedidos */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Propostas por status</h3>
              <div className="space-y-3">
                {Object.entries(funil.propostas).map(([status, count]) => (
                  <BarRow key={status} label={status} value={count} max={totalProps} color="bg-amber-400" />
                ))}
                {totalProps === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">Sem dados.</p>}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Pedidos por status</h3>
              <div className="space-y-3">
                {Object.entries(funil.pedidos).map(([status, count]) => (
                  <BarRow key={status} label={status} value={count} max={totalPeds} color="bg-green-400" />
                ))}
                {totalPeds === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">Sem dados.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA VENDAS ── */}
      {currentAba === 'vendas' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard label="Total vendido (6 meses)" value={brl(totalVendido)} />
            <KpiCard label="Pedidos (6 meses)" value={String(totalPedidos)} />
            <KpiCard
              label="Ticket médio"
              value={totalPedidos > 0 ? brl(totalVendido / totalPedidos) : '—'}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-5">Vendas por mês (últimos 6 meses)</h3>
            {vendas.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">Sem dados.</p>}
            <div className="space-y-3">
              {vendas.map((v) => (
                <div key={v.mes} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-14 shrink-0">{v.label}</span>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-lg flex items-center px-2 transition-all"
                      style={{ width: `${Math.max((v.total / maxVenda) * 100, v.total > 0 ? 4 : 0)}%` }}
                    >
                      {v.total > 0 && (
                        <span className="text-xs font-medium text-white whitespace-nowrap">
                          {brl(v.total)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 w-8 text-right shrink-0">{v.quantidade}x</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ABA FINANCEIRO ── */}
      {currentAba === 'financeiro' && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label="Receitas" value={brl(financeiro.totalReceitas)} />
            <KpiCard label="Despesas" value={brl(financeiro.totalDespesas)} />
            <KpiCard
              label="Saldo"
              value={brl(saldo)}
              sub={saldo >= 0 ? 'positivo' : 'negativo'}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Receitas por categoria</h3>
              <div className="space-y-3">
                {financeiro.receitasPorCategoria.map((c) => (
                  <BarRow key={c.categoria} label={c.categoria} value={c.valor} max={maxRec} color="bg-green-400" />
                ))}
                {financeiro.receitasPorCategoria.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Sem dados.</p>
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Despesas por categoria</h3>
              <div className="space-y-3">
                {financeiro.despesasPorCategoria.map((c) => (
                  <BarRow key={c.categoria} label={c.categoria} value={c.valor} max={maxDes} color="bg-red-400" />
                ))}
                {financeiro.despesasPorCategoria.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Sem dados.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
