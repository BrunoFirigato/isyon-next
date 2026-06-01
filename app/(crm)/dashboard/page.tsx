import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Target, TrendingUp, FileText, DollarSign, Calendar,
  ChevronRight, CheckCircle2, Clock, ArrowRight, Plus,
  Building2, Package, Rocket, Lightbulb, BarChart3,
} from 'lucide-react'
import DispensarOnboarding from './_components/DispensarOnboarding'

// ─── Helpers ────────────────────────────────────────────────────────────────
function brl(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value)
}
function inicioDeMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}
function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}
function horaDe(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function serieContagem(dates: string[], dias = 14): number[] {
  const b = new Array(dias).fill(0)
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (dias - 1))
  for (const d of dates) {
    const idx = Math.floor((new Date(d).getTime() - start.getTime()) / 864e5)
    if (idx >= 0 && idx < dias) b[idx]++
  }
  return b
}
function serieSoma(rows: { criado_em: string; valor: number | null }[], dias = 14): number[] {
  const b = new Array(dias).fill(0)
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (dias - 1))
  for (const r of rows) {
    const idx = Math.floor((new Date(r.criado_em).getTime() - start.getTime()) / 864e5)
    if (idx >= 0 && idx < dias) b[idx] += r.valor ?? 0
  }
  return b
}

const ETAPAS_PIPELINE = ['Prospecção', 'Qualificação', 'Proposta', 'Negociação']

const DICAS = [
  'Leads respondidos em até 1h convertem muito mais. Priorize os "sem contato".',
  'Oportunidade parada é dinheiro parado. Revise as que estão há dias sem mexer.',
  'Proposta enviada? Faça o follow-up antes de vencer a validade.',
  'Cadastre o custo dos produtos — assim você acompanha a margem em cada venda.',
]

// ─── Sparkline (SVG leve, sem lib) ────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 96, h = 32
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ')
  const temDado = data.some(v => v > 0)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={temDado ? 1 : 0.35} />
    </svg>
  )
}

const TIPO_COMP: Record<string, { icon: string }> = {
  reuniao: { icon: '🤝' }, ligacao: { icon: '📞' }, visita: { icon: '📍' },
  email: { icon: '✉️' }, whatsapp: { icon: '💬' }, tarefa: { icon: '✅' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const inicio = inicioDeMes()
  const ha14 = new Date(Date.now() - 14 * 864e5).toISOString()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase.from('usuarios').select('id, nome').eq('auth_id', user?.id ?? '').maybeSingle()
  const primeiroNome = (usuario?.nome ?? user?.email?.split('@')[0] ?? '').split(' ')[0]

  const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0)
  const hojeFim = new Date(); hojeFim.setHours(23, 59, 59, 999)

  const [
    { data: config },
    { count: leadsNovo },
    { data: ops },
    { data: props },
    { data: comps },
    { data: pedidos },
    { count: totalLeads },
    { count: totalProdutos },
    { count: totalFiliais },
    { data: leads14 },
    { data: pedidos14 },
  ] = await Promise.all([
    supabase.from('config_usuario').select('chave, valor').eq('usuario_id', usuario?.id ?? ''),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'novo'),
    supabase.from('oportunidades').select('id, titulo, status, valor, etapa, criado_em, atualizado_em').order('criado_em', { ascending: false }),
    supabase.from('propostas').select('id, status, validade'),
    supabase.from('compromissos').select('id, titulo, tipo, data_hora, status').gte('data_hora', hoje0.toISOString()).lte('data_hora', hojeFim.toISOString()).order('data_hora'),
    supabase.from('pedidos').select('valor').gte('criado_em', inicio),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('produtos').select('*', { count: 'exact', head: true }),
    supabase.from('empresas').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('criado_em').gte('criado_em', ha14),
    supabase.from('pedidos').select('criado_em, valor').gte('criado_em', ha14),
  ])

  const cfg = Object.fromEntries((config ?? []).map(c => [c.chave, c.valor]))
  const diasOpParada = parseInt(cfg['dias_op_parada'] ?? '14') || 14
  const metaGlobal = parseFloat(cfg['meta_global'] ?? '0') || 0

  const opList = ops ?? []
  const opDoMes = opList.filter(o => o.criado_em >= inicio)
  const opAbertas = opList.filter(o => o.status === 'aberto')
  const opGanhasDoMes = opDoMes.filter(o => o.status === 'ganho')
  const taxaConversao = opDoMes.length > 0 ? Math.round((opGanhasDoMes.length / opDoMes.length) * 100) : 0
  const valorPipeline = opAbertas.reduce((s, o) => s + (o.valor ?? 0), 0)
  const receitaMes = (pedidos ?? []).reduce((s, p) => s + (p.valor ?? 0), 0)

  // Onboarding
  const passos = [
    { ok: (totalFiliais ?? 0) > 0,  Icon: Building2,  label: 'Cadastrar sua empresa (filial)', href: '/empresas' },
    { ok: (totalProdutos ?? 0) > 0, Icon: Package,    label: 'Cadastrar produtos ou serviços', href: '/produtos' },
    { ok: (totalLeads ?? 0) > 0,    Icon: Target,     label: 'Criar seu primeiro lead',        href: '/leads' },
    { ok: opList.length > 0,        Icon: TrendingUp, label: 'Abrir uma oportunidade',         href: '/oportunidades' },
  ]
  const setupCompleto = passos.every(p => p.ok)
  const passosFeitos = passos.filter(p => p.ok).length
  const onboardingDispensado = cfg['onboarding_dispensado'] === 'true'
  const mostrarOnboarding = !setupCompleto && !onboardingDispensado

  // Pendências
  const limiteParada = Date.now() - diasOpParada * 864e5
  const opsParadas = opAbertas.filter(o => new Date(o.atualizado_em ?? o.criado_em).getTime() < limiteParada)
  const em7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  const propsAVencer = (props ?? []).filter(p => p.status === 'enviada' && p.validade && p.validade <= em7)
  const compromissosHoje = (comps ?? []).filter(c => c.status !== 'concluido' && c.status !== 'cancelado')

  const acoes = [
    { on: (leadsNovo ?? 0) > 0, cor: 'red', Icon: Target, n: leadsNovo ?? 0, sing: 'lead', label: 'sem contato', href: '/leads?status=novo', cta: 'Contatar agora' },
    { on: opsParadas.length > 0, cor: 'amber', Icon: TrendingUp, n: opsParadas.length, sing: 'oportunidade', label: `parada(s) +${diasOpParada}d`, href: '/oportunidades', cta: 'Revisar' },
    { on: propsAVencer.length > 0, cor: 'orange', Icon: FileText, n: propsAVencer.length, sing: 'proposta', label: 'a vencer', href: '/propostas?status=enviada', cta: 'Acompanhar' },
    { on: compromissosHoje.length > 0, cor: 'blue', Icon: Calendar, n: compromissosHoje.length, sing: 'compromisso', label: 'hoje', href: '/agenda', cta: 'Ver agenda' },
  ].filter(a => a.on)

  const cores: Record<string, { bg: string; text: string; dot: string }> = {
    red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  }

  const resumo: string[] = []
  if (compromissosHoje.length) resumo.push(`${compromissosHoje.length} compromisso${compromissosHoje.length > 1 ? 's' : ''} hoje`)
  if (propsAVencer.length) resumo.push(`${propsAVencer.length} proposta${propsAVencer.length > 1 ? 's' : ''} vencendo`)
  if ((leadsNovo ?? 0) > 0) resumo.push(`${leadsNovo} lead${(leadsNovo ?? 0) > 1 ? 's' : ''} sem contato`)

  const subline = mostrarOnboarding
    ? 'Vamos montar sua operação? Siga os primeiros passos abaixo. 🚀'
    : resumo.length ? `Você tem ${resumo.join(', ')}.`
    : 'Pipeline em dia! Ótimo momento pra prospectar novos clientes. 💪'

  // Pipeline (sempre mostra os estágios)
  const pipelineMap = opAbertas.reduce((acc, o) => {
    const e = o.etapa ?? 'Prospecção'
    if (!acc[e]) acc[e] = { count: 0, valor: 0 }
    acc[e].count++; acc[e].valor += o.valor ?? 0
    return acc
  }, {} as Record<string, { count: number; valor: number }>)
  const pipeline = ETAPAS_PIPELINE.map(e => ({ etapa: e, count: pipelineMap[e]?.count ?? 0, valor: pipelineMap[e]?.valor ?? 0 }))

  const metaPct = metaGlobal > 0 ? Math.min(Math.round((receitaMes / metaGlobal) * 100), 100) : 0
  const dica = DICAS[new Date().getDate() % DICAS.length]

  // Séries dos sparklines
  const serieLeads = serieContagem((leads14 ?? []).map(l => l.criado_em))
  const serieReceita = serieSoma(pedidos14 ?? [])

  const acaoBtn = 'inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors'

  return (
    <div className="space-y-5">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{saudacao()}{primeiroNome ? `, ${primeiroNome}` : ''} 👋</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subline}</p>
      </div>

      {/* Atalhos rápidos (launchpad) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Novo lead', Icon: Target, href: '/leads', from: 'from-blue-500 to-blue-600' },
          { label: 'Oportunidade', Icon: TrendingUp, href: '/oportunidades', from: 'from-purple-500 to-purple-600' },
          { label: 'Proposta', Icon: FileText, href: '/propostas', from: 'from-orange-500 to-orange-600' },
          { label: 'Agendar', Icon: Calendar, href: '/agenda', from: 'from-emerald-500 to-emerald-600' },
        ].map((q, i) => (
          <Link key={i} href={q.href}
            className={`group relative overflow-hidden bg-gradient-to-br ${q.from} text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all`}>
            <q.Icon size={20} className="mb-6 opacity-90" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{q.label}</span>
              <Plus size={16} className="opacity-80 group-hover:rotate-90 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Primeiros passos (onboarding) */}
      {mostrarOnboarding && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-blue-900/40 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"><Rocket size={18} /></div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Primeiros passos</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{passosFeitos} de {passos.length} concluídos — deixe seu sistema pronto pra vender</p>
            </div>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{Math.round((passosFeitos / passos.length) * 100)}%</span>
            <DispensarOnboarding usuarioId={usuario?.id ?? ''} />
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {passos.map((p, i) => (
              <Link key={i} href={p.href} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group">
                {p.ok
                  ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                  : <span className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0" />}
                <span className={`flex-1 text-sm ${p.ok ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>{p.label}</span>
                {!p.ok && <ArrowRight size={15} className="text-gray-300 group-hover:text-blue-500 transition-colors" />}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Cards de ação (pendências) */}
      {acoes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {acoes.map((a, i) => {
            const c = cores[a.cor]
            return (
              <Link key={i} href={a.href} className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className={`inline-flex p-2 rounded-lg ${c.bg} ${c.text}`}><a.Icon size={18} /></div>
                  <span className={`w-2 h-2 rounded-full ${c.dot} mt-1`} />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{a.n}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{a.sing}{a.n > 1 ? 's' : ''} {a.label}</p>
                <p className={`flex items-center gap-1 text-xs font-medium mt-3 ${c.text} group-hover:gap-2 transition-all`}>{a.cta} <ArrowRight size={13} /></p>
              </Link>
            )
          })}
        </div>
      )}

      {/* KPIs com sparkline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiSpark label="Leads no mês" value={String(opDoMes.length === 0 ? (totalLeads ?? 0) : (totalLeads ?? 0))} icon={<Target size={16} />} serie={serieLeads} color="#3b82f6" />
        <KpiSpark label="Pipeline aberto" value={brl(valorPipeline)} sub={`${opAbertas.length} oport.`} icon={<TrendingUp size={16} />} serie={pipeline.map(p => p.valor)} color="#8b5cf6" />
        <KpiSpark label="Conversão mês" value={`${taxaConversao}%`} sub={`${opGanhasDoMes.length}/${opDoMes.length}`} icon={<CheckCircle2 size={16} />} serie={[taxaConversao]} color="#f59e0b" flat />
        <KpiSpark label="Receita no mês" value={brl(receitaMes)} icon={<DollarSign size={16} />} serie={serieReceita} color="#10b981" />
      </div>

      {/* Meta do mês */}
      {metaGlobal > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Meta do mês</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{brl(receitaMes)} <span className="text-sm font-normal text-gray-400">/ {brl(metaGlobal)}</span></p>
            </div>
            <p className={`text-2xl font-bold ${metaPct >= 100 ? 'text-emerald-500' : metaPct >= 60 ? 'text-blue-500' : 'text-orange-500'}`}>{metaPct}%</p>
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${metaPct >= 100 ? 'bg-emerald-500' : metaPct >= 60 ? 'bg-blue-500' : 'bg-orange-400'}`} style={{ width: `${Math.max(metaPct, 2)}%` }} />
          </div>
          {metaGlobal > receitaMes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Faltam {brl(metaGlobal - receitaMes)} para bater a meta. Bora! 💪</p>}
        </div>
      )}

      {/* Hoje + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agenda hoje */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5"><Calendar size={15} className="text-gray-400" /> Hoje</h2>
            <Link href="/agenda" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">Ver agenda <ChevronRight size={13} /></Link>
          </div>
          {compromissosHoje.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-5 py-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-2xl mb-3">📅</div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nenhum compromisso hoje</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">Agenda livre — aproveite para prospectar!</p>
              <Link href="/agenda" className={acaoBtn}><Plus size={15} /> Nova atividade</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-80 overflow-y-auto">
              {compromissosHoje.map(c => (
                <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-lg shrink-0">{(TIPO_COMP[c.tipo ?? '']?.icon) ?? '📌'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{c.titulo}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={10} /> {horaDe(c.data_hora)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pipeline por etapa</h2>
            <Link href="/oportunidades" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">Ver tudo <ChevronRight size={13} /></Link>
          </div>
          <div className="p-5">
            {/* Estágios sempre visíveis */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {pipeline.map(p => (
                <Link key={p.etapa} href="/oportunidades" className="rounded-lg border border-gray-100 dark:border-gray-700 p-3 hover:border-blue-200 dark:hover:border-blue-700 transition-colors">
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">{p.etapa}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">{p.count}</p>
                  <p className="text-[11px] text-gray-400">{brl(p.valor)}</p>
                </Link>
              ))}
            </div>
            {opAbertas.length === 0 && (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-2xl mb-3 mx-auto">🎯</div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nenhuma oportunidade aberta</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">Que tal adicionar a primeira ao seu funil?</p>
                <Link href="/oportunidades" className={acaoBtn}><Plus size={15} /> Nova oportunidade</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dica de vendas */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/70 dark:bg-gray-800 text-indigo-500 shrink-0"><Lightbulb size={18} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Dica para vender mais</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{dica}</p>
        </div>
        <Link href="/relatorios" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:gap-2 transition-all shrink-0">
          <BarChart3 size={14} /> Relatórios
        </Link>
      </div>
    </div>
  )
}

// ─── KPI com sparkline ────────────────────────────────────────────────────────
function KpiSpark({ label, value, sub, icon, serie, color, flat }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; serie: number[]; color: string; flat?: boolean
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500">{icon}</div>
        {!flat && serie.length > 1 && <Sparkline data={serie} color={color} />}
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">{value}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{label}{sub ? ` · ${sub}` : ''}</p>
    </div>
  )
}
