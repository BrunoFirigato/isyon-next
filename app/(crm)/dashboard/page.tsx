import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Target, TrendingUp, FileText, DollarSign, Calendar,
  ChevronRight, CheckCircle2, Clock, ArrowRight,
} from 'lucide-react'

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

const TIPO_COMP: Record<string, { icon: string; label: string }> = {
  reuniao:   { icon: '🤝', label: 'Reunião' },
  ligacao:   { icon: '📞', label: 'Ligação' },
  visita:    { icon: '📍', label: 'Visita' },
  email:     { icon: '✉️', label: 'E-mail' },
  whatsapp:  { icon: '💬', label: 'WhatsApp' },
  tarefa:    { icon: '✅', label: 'Tarefa' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const inicio = inicioDeMes()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase.from('usuarios').select('id, nome').eq('auth_id', user?.id ?? '').maybeSingle()
  const primeiroNome = (usuario?.nome ?? user?.email?.split('@')[0] ?? '').split(' ')[0]

  const hoje0   = new Date(); hoje0.setHours(0, 0, 0, 0)
  const hojeFim = new Date(); hojeFim.setHours(23, 59, 59, 999)

  const [
    { data: config },
    { count: leadsNovo },
    { data: ops },
    { data: props },
    { data: comps },
    { data: pedidos },
  ] = await Promise.all([
    supabase.from('config_usuario').select('chave, valor').eq('usuario_id', usuario?.id ?? ''),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'novo'),
    supabase.from('oportunidades').select('id, titulo, status, valor, etapa, criado_em, atualizado_em').order('criado_em', { ascending: false }),
    supabase.from('propostas').select('id, titulo, status, validade'),
    supabase.from('compromissos').select('id, titulo, tipo, data_hora, status').gte('data_hora', hoje0.toISOString()).lte('data_hora', hojeFim.toISOString()).order('data_hora'),
    supabase.from('pedidos').select('valor').gte('criado_em', inicio),
  ])

  // Parâmetros comerciais (com defaults)
  const cfg = Object.fromEntries((config ?? []).map(c => [c.chave, c.valor]))
  const diasOpParada = parseInt(cfg['dias_op_parada'] ?? '14') || 14
  const metaGlobal   = parseFloat(cfg['meta_global'] ?? '0') || 0

  const opList   = ops ?? []
  const opDoMes  = opList.filter(o => o.criado_em >= inicio)
  const opAbertas = opList.filter(o => o.status === 'aberto')
  const opGanhasDoMes = opDoMes.filter(o => o.status === 'ganho')
  const taxaConversao = opDoMes.length > 0 ? Math.round((opGanhasDoMes.length / opDoMes.length) * 100) : 0
  const valorPipeline = opAbertas.reduce((s, o) => s + (o.valor ?? 0), 0)
  const receitaMes = (pedidos ?? []).reduce((s, p) => s + (p.valor ?? 0), 0)

  // ── Pendências (cards de ação) ──────────────────────────────────────────────
  const limiteParada = Date.now() - diasOpParada * 864e5
  const opsParadas = opAbertas.filter(o => new Date(o.atualizado_em ?? o.criado_em).getTime() < limiteParada)

  const em7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  const propsAVencer = (props ?? []).filter(p => p.status === 'enviada' && p.validade && p.validade <= em7)

  const compromissosHoje = (comps ?? []).filter(c => c.status !== 'concluido' && c.status !== 'cancelado')

  const acoes = [
    { on: (leadsNovo ?? 0) > 0, cor: 'red',    Icon: Target,     n: leadsNovo ?? 0,       label: 'sem contato',     sing: 'lead',         href: '/leads?status=novo',        cta: 'Contatar agora' },
    { on: opsParadas.length > 0, cor: 'amber',  Icon: TrendingUp, n: opsParadas.length,    label: `parada(s) +${diasOpParada}d`, sing: 'oportunidade', href: '/oportunidades',  cta: 'Revisar' },
    { on: propsAVencer.length > 0, cor: 'orange', Icon: FileText, n: propsAVencer.length,  label: 'a vencer',        sing: 'proposta',     href: '/propostas?status=enviada', cta: 'Acompanhar' },
    { on: compromissosHoje.length > 0, cor: 'blue', Icon: Calendar, n: compromissosHoje.length, label: 'hoje',       sing: 'compromisso',  href: '/agenda',         cta: 'Ver agenda' },
  ].filter(a => a.on)

  const cores: Record<string, { bg: string; text: string; dot: string }> = {
    red:    { bg: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-600 dark:text-red-400',       dot: 'bg-red-500' },
    amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-600 dark:text-amber-400',   dot: 'bg-amber-500' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-600 dark:text-blue-400',     dot: 'bg-blue-500' },
  }

  // Resumo do dia
  const resumo: string[] = []
  if (compromissosHoje.length) resumo.push(`${compromissosHoje.length} compromisso${compromissosHoje.length > 1 ? 's' : ''} hoje`)
  if (propsAVencer.length)     resumo.push(`${propsAVencer.length} proposta${propsAVencer.length > 1 ? 's' : ''} vencendo`)
  if ((leadsNovo ?? 0) > 0)    resumo.push(`${leadsNovo} lead${(leadsNovo ?? 0) > 1 ? 's' : ''} sem contato`)

  // Pipeline por etapa
  const pipelineMap = opAbertas.reduce((acc, o) => {
    const etapa = o.etapa ?? o.status ?? 'sem etapa'
    if (!acc[etapa]) acc[etapa] = { count: 0, valor: 0 }
    acc[etapa].count++; acc[etapa].valor += o.valor ?? 0
    return acc
  }, {} as Record<string, { count: number; valor: number }>)
  const pipeline = Object.entries(pipelineMap).map(([etapa, d]) => ({ etapa, ...d })).sort((a, b) => b.valor - a.valor)
  const maxValor = Math.max(...pipeline.map(e => e.valor), 1)

  const metaPct = metaGlobal > 0 ? Math.min(Math.round((receitaMes / metaGlobal) * 100), 100) : 0

  return (
    <div className="space-y-6">
      {/* Saudação + foco do dia */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{saudacao()}{primeiroNome ? `, ${primeiroNome}` : ''} 👋</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {resumo.length ? `Você tem ${resumo.join(', ')}.` : 'Tudo em dia por aqui — sem pendências. 🎉'}
        </p>
      </div>

      {/* Cards de ação */}
      {acoes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {acoes.map((a, i) => {
            const c = cores[a.cor]
            return (
              <Link key={i} href={a.href}
                className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className={`inline-flex p-2 rounded-lg ${c.bg} ${c.text}`}><a.Icon size={18} /></div>
                  <span className={`w-2 h-2 rounded-full ${c.dot} mt-1`} />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{a.n}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{a.sing}{a.n > 1 ? 's' : ''} {a.label}</p>
                <p className={`flex items-center gap-1 text-xs font-medium mt-3 ${c.text} group-hover:gap-2 transition-all`}>
                  {a.cta} <ArrowRight size={13} />
                </p>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-5 flex items-center gap-3">
          <CheckCircle2 size={22} className="text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Nenhuma pendência no momento. Bom trabalho!</p>
        </div>
      )}

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
          {metaGlobal > receitaMes && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Faltam {brl(metaGlobal - receitaMes)} para a meta.</p>
          )}
        </div>
      )}

      {/* KPIs de contexto */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Leads no mês', value: String(opDoMes.length === 0 ? 0 : opDoMes.length), icon: <Target size={16} />, sub: '' },
          { label: 'Pipeline aberto', value: brl(valorPipeline), icon: <TrendingUp size={16} />, sub: `${opAbertas.length} oport.` },
          { label: 'Conversão do mês', value: `${taxaConversao}%`, icon: <CheckCircle2 size={16} />, sub: `${opGanhasDoMes.length}/${opDoMes.length}` },
          { label: 'Receita no mês', value: brl(receitaMes), icon: <DollarSign size={16} />, sub: '' },
        ].map((k, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <div className="inline-flex p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 mb-2">{k.icon}</div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">{k.value}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{k.label}{k.sub ? ` · ${k.sub}` : ''}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agenda de hoje */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5"><Calendar size={15} className="text-gray-400" /> Hoje</h2>
            <Link href="/agenda" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">Agenda <ChevronRight size={13} /></Link>
          </div>
          {compromissosHoje.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">Nenhum compromisso hoje.</p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-72 overflow-y-auto">
              {compromissosHoje.map(c => {
                const t = TIPO_COMP[c.tipo ?? ''] ?? { icon: '📌', label: c.tipo ?? '' }
                return (
                  <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-lg shrink-0">{t.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{c.titulo}</p>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={10} /> {horaDe(c.data_hora)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pipeline por etapa */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pipeline por etapa</h2>
            <Link href="/oportunidades" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">Ver tudo <ChevronRight size={13} /></Link>
          </div>
          <div className="p-5">
            {pipeline.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Nenhuma oportunidade aberta.</p>
            ) : (
              <div className="space-y-4">
                {pipeline.map(({ etapa, count, valor }) => (
                  <Link key={etapa} href="/oportunidades" className="block group">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize group-hover:text-blue-600 transition-colors">{etapa}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{count} · {brl(valor)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(valor / maxValor) * 100}%` }} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
