import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Target, Briefcase, FileText, DollarSign,
  ChevronRight, CheckCircle2, ArrowRight, Plus,
  Building2, Package, Rocket, Lightbulb, BarChart3,
} from 'lucide-react'
import DispensarOnboarding from './_components/DispensarOnboarding'
import AgendaHojeCard from '@/app/(crm)/_components/AgendaHojeCard'
import { type Compromisso } from '@/app/(crm)/agenda/_components/types'

// ─── Helpers ────────────────────────────────────────────────────────────────
function brl(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value)
}
function inicioDeMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}
function saudacao() {
  // Hora no fuso do Brasil (o servidor roda em UTC — sem isso, "bom dia" às 21h)
  const h = parseInt(
    new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date()),
    10,
  ) % 24
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}
const ETAPAS_PIPELINE = ['Prospecção', 'Qualificação', 'Proposta', 'Negociação']
const PIPE_CORES = ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb'] // azul monocromático (claro → escuro por etapa)

const DICAS = [
  'Leads respondidos em até 1h convertem muito mais. Priorize os "sem contato".',
  'Oportunidade parada é dinheiro parado. Revise as que estão há dias sem mexer.',
  'Proposta enviada? Faça o follow-up antes de vencer a validade.',
  'Cadastre o custo dos produtos — assim você acompanha a margem em cada venda.',
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const inicio = inicioDeMes()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase.from('usuarios').select('id, nome').eq('auth_id', user?.id ?? '').maybeSingle()
  const primeiroNome = (usuario?.nome ?? user?.email?.split('@')[0] ?? '').split(' ')[0]

  // Limites do dia no fuso de São Paulo (Brasil não tem horário de verão desde 2019 → UTC-3 fixo)
  const spHoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()) // 'YYYY-MM-DD'
  const hojeFimISO = new Date(`${spHoje}T23:59:59.999-03:00`).toISOString()

  const [
    { data: config },
    { count: leadsNovo },
    { data: ops },
    { data: props },
    { data: comps },
    { data: pedidos },
    { count: totalLeads },
    { count: leadsDoMes },
    { count: totalProdutos },
    { count: totalFiliais },
  ] = await Promise.all([
    supabase.from('config_usuario').select('chave, valor').eq('usuario_id', usuario?.id ?? ''),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'novo'),
    supabase.from('oportunidades').select('id, titulo, status, valor, etapa, criado_em, atualizado_em').order('criado_em', { ascending: false }),
    supabase.from('propostas').select('id, status, validade'),
    supabase.from('compromissos').select('id, titulo, tipo, data_hora, duracao_min, descricao, cliente_id, lead_id, op_id, status, criado_em').eq('status', 'pendente').lte('data_hora', hojeFimISO).order('data_hora'),
    supabase.from('pedidos').select('valor, status, omie_pedido_id').gte('criado_em', inicio),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('criado_em', inicio),
    supabase.from('produtos').select('*', { count: 'exact', head: true }),
    supabase.from('empresas').select('*', { count: 'exact', head: true }),
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

  // Receita = pedidos enviados ao ERP (onde são faturados); os demais são provisão
  const faturado = (p: { omie_pedido_id?: string | null }) => !!p?.omie_pedido_id
  const pedidosMes = (pedidos ?? []).filter(p => p.status !== 'cancelado')
  const receitaMes  = pedidosMes.filter(faturado).reduce((s, p) => s + (p.valor ?? 0), 0)
  const provisaoMes = pedidosMes.filter(p => !faturado(p)).reduce((s, p) => s + (p.valor ?? 0), 0)

  // Onboarding
  const passos = [
    { ok: (totalFiliais ?? 0) > 0,  Icon: Building2,  label: 'Cadastrar sua empresa', href: '/empresas' },
    { ok: (totalProdutos ?? 0) > 0, Icon: Package,    label: 'Cadastrar produtos ou serviços', href: '/produtos' },
    { ok: (totalLeads ?? 0) > 0,    Icon: Target,     label: 'Criar seu primeiro lead',        href: '/leads' },
    { ok: opList.length > 0,        Icon: Briefcase, label: 'Abrir uma oportunidade',         href: '/oportunidades' },
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
  const compsRaw = (comps ?? []).filter(c => c.status !== 'cancelado')
  const compCliIds = [...new Set(compsRaw.filter(c => c.cliente_id).map(c => c.cliente_id as string))]
  const compLeadIds = [...new Set(compsRaw.filter(c => c.lead_id).map(c => c.lead_id as string))]
  const compOpIds = [...new Set(compsRaw.filter(c => c.op_id).map(c => c.op_id as string))]
  const [{ data: compCli }, { data: compLead }, { data: compOp }] = await Promise.all([
    compCliIds.length ? supabase.from('clientes').select('id, nome, empresa').in('id', compCliIds) : Promise.resolve({ data: [] as { id: string; nome: string; empresa: string | null }[] }),
    compLeadIds.length ? supabase.from('leads').select('id, nome').in('id', compLeadIds) : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    compOpIds.length ? supabase.from('oportunidades').select('id, titulo, numero').in('id', compOpIds) : Promise.resolve({ data: [] as { id: string; titulo: string; numero: string | null }[] }),
  ])
  const compCliMap = new Map((compCli ?? []).map(c => [c.id, c]))
  const compLeadMap = new Map((compLead ?? []).map(l => [l.id, l]))
  const compOpMap = new Map((compOp ?? []).map(o => [o.id, o]))
  const compromissosHoje: Compromisso[] = compsRaw.map(c => ({
    ...c,
    cliente: c.cliente_id ? (compCliMap.get(c.cliente_id) ?? null) : null,
    lead:    c.lead_id    ? (compLeadMap.get(c.lead_id)   ?? null) : null,
    op:      c.op_id      ? (compOpMap.get(c.op_id)       ?? null) : null,
  }))
  const totalPropostas = (props ?? []).length

  // Os números das pendências já aparecem nos cards — aqui a saudação fica contextual, sem repetir
  const temPendencias = (leadsNovo ?? 0) > 0 || opsParadas.length > 0 || propsAVencer.length > 0 || compromissosHoje.length > 0
  const subline = mostrarOnboarding
    ? 'Vamos montar sua operação? Siga os primeiros passos abaixo. 🚀'
    : temPendencias
      ? 'Tem trabalho te esperando hoje — bora fazer acontecer! 💪'
      : 'Tudo em dia por aqui! Ótimo momento pra prospectar novos clientes. 🚀'

  // Pipeline por etapa
  const pipelineMap = opAbertas.reduce((acc, o) => {
    const e = o.etapa ?? 'Prospecção'
    if (!acc[e]) acc[e] = { count: 0, valor: 0 }
    acc[e].count++; acc[e].valor += o.valor ?? 0
    return acc
  }, {} as Record<string, { count: number; valor: number }>)
  const pipeline = ETAPAS_PIPELINE.map(e => ({ etapa: e, count: pipelineMap[e]?.count ?? 0, valor: pipelineMap[e]?.valor ?? 0 }))
  const ticketMedioPipeline = opAbertas.length ? valorPipeline / opAbertas.length : 0

  const metaPct = metaGlobal > 0 ? Math.min(Math.round((receitaMes / metaGlobal) * 100), 100) : 0
  const dica = DICAS[new Date().getDate() % DICAS.length]

  const acaoBtn = 'inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors'

  return (
    <div className="space-y-5">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{saudacao()}{primeiroNome ? `, ${primeiroNome}` : ''} 👋</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subline}</p>
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

      {/* Cards unificados por entidade: métrica + alerta + criar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardEntidade
          tone="blue" icon={<Target size={16} />} title="Leads"
          criarHref="/leads?novo=1" criarLabel="Novo"
          valor={String(leadsDoMes ?? 0)} label="leads no mês"
          alerta={(leadsNovo ?? 0) > 0 ? { texto: `${leadsNovo} sem contato`, href: '/leads?status=novo', cor: 'red' } : undefined}
          link={{ texto: 'Ver todos os leads', href: '/leads' }}
        />
        <CardEntidade
          tone="purple" icon={<Briefcase size={16} />} title="Oportunidades"
          criarHref="/oportunidades?novo=1" criarLabel="Nova"
          valor={brl(valorPipeline)} label={`${opAbertas.length} abertas · conv. ${taxaConversao}%`}
          alerta={opsParadas.length > 0 ? { texto: `${opsParadas.length} parada${opsParadas.length > 1 ? 's' : ''} +${diasOpParada}d`, href: '/oportunidades', cor: 'amber' } : undefined}
          link={{ texto: `${opGanhasDoMes.length} ganha${opGanhasDoMes.length !== 1 ? 's' : ''} no mês`, href: '/oportunidades?tab=ganhas' }}
        />
        <CardEntidade
          tone="orange" icon={<FileText size={16} />} title="Propostas"
          criarHref="/propostas?novo=1" criarLabel="Nova"
          valor={String(totalPropostas)} label="no total"
          alerta={propsAVencer.length > 0 ? { texto: `${propsAVencer.length} a vencer`, href: '/propostas?status=enviada', cor: 'orange' } : undefined}
          link={{ texto: 'Ver propostas', href: '/propostas' }}
        />
        <CardEntidade
          tone="emerald" icon={<DollarSign size={16} />} title="Receita"
          valor={brl(receitaMes)} label="faturada no mês"
          alerta={provisaoMes > 0 ? { texto: `${brl(provisaoMes)} a faturar`, href: '/pedidos', cor: 'amber' } : undefined}
          link={{ texto: 'Ver pedidos', href: '/pedidos' }}
        />
      </div>

      {/* Meta do mês */}
      {metaGlobal > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Meta do mês (faturada)</p>
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
        {/* Agenda hoje — interativa. Wrapper relative: o card preenche a altura do pipeline. */}
        <div className="lg:relative">
          <AgendaHojeCard compromissos={compromissosHoje} />
        </div>

        {/* Pipeline por etapa */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pipeline por etapa</h2>
            <Link href="/oportunidades" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">Ver tudo <ChevronRight size={13} /></Link>
          </div>
          <div className="p-5">
            {opAbertas.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {pipeline.map((p, i) => {
                    const cor = PIPE_CORES[i % PIPE_CORES.length]
                    return (
                      <Link key={p.etapa} href="/oportunidades"
                        className="rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">{p.etapa}</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1.5 leading-none">{p.count}</p>
                        <p className="text-[11px] text-gray-400 mt-1.5 tabular-nums">{brl(p.valor)}</p>
                      </Link>
                    )
                  })}
                </div>

                {/* Rodapé complementar — preenche o espaço com os números do funil */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700">
                  <div className="text-center px-2">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">Valor no funil</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums">{brl(valorPipeline)}</p>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">Ticket médio</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums">{brl(ticketMedioPipeline)}</p>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">Conversão</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{taxaConversao}%</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-2xl mb-3 mx-auto">🎯</div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nenhuma oportunidade aberta</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">Que tal adicionar a primeira ao seu funil?</p>
                <Link href="/oportunidades?novo=1" className={acaoBtn}><Plus size={15} /> Nova oportunidade</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dica de vendas */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 shrink-0"><Lightbulb size={18} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Dica para vender mais</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{dica}</p>
        </div>
        <Link href="/relatorios" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:gap-2 transition-all shrink-0">
          <BarChart3 size={14} /> Relatórios
        </Link>
      </div>
    </div>
  )
}

// ─── Card unificado de entidade (métrica + alerta + criar) ────────────────────
// Visual calmo: ícone em tom neutro único + azul de marca nas ações/links (cor só onde importa).
const TONE_CALMO = { iconBg: 'bg-gray-100 dark:bg-gray-700/60', iconText: 'text-gray-500 dark:text-gray-400', link: 'text-blue-600 hover:text-blue-700' }
const TONES: Record<string, { iconBg: string; iconText: string; link: string }> = {
  blue: TONE_CALMO, purple: TONE_CALMO, orange: TONE_CALMO, emerald: TONE_CALMO,
}
const ALERTA_COR: Record<string, string> = {
  red:    'text-red-600 dark:text-red-400',
  amber:  'text-amber-600 dark:text-amber-400',
  orange: 'text-orange-600 dark:text-orange-400',
}

function CardEntidade({ tone, icon, title, criarHref, criarLabel, valor, label, alerta, link }: {
  tone: 'blue' | 'purple' | 'orange' | 'emerald'
  icon: React.ReactNode
  title: string
  criarHref?: string
  criarLabel?: string
  valor: string
  label: string
  alerta?: { texto: string; href: string; cor: 'red' | 'amber' | 'orange' }
  link?: { texto: string; href: string }
}) {
  const t = TONES[tone]
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex p-1.5 rounded-lg shrink-0 ${t.iconBg} ${t.iconText}`}>{icon}</span>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{title}</span>
        </div>
        {criarHref && (
          <Link href={criarHref} className={`inline-flex items-center gap-0.5 text-xs font-medium shrink-0 ${t.link}`}>
            <Plus size={13} /> {criarLabel ?? 'Novo'}
          </Link>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{valor}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      {alerta ? (
        <Link href={alerta.href} className={`mt-2.5 inline-flex items-center gap-1 text-xs font-medium hover:gap-1.5 transition-all ${ALERTA_COR[alerta.cor]}`}>
          {alerta.texto} <ArrowRight size={12} />
        </Link>
      ) : link ? (
        <Link href={link.href} className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:gap-1.5 transition-all">
          {link.texto} <ArrowRight size={12} />
        </Link>
      ) : null}
    </div>
  )
}
