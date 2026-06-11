'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  CheckCircle, XCircle, PackageCheck, Clock, ShieldCheck, Printer,
  Send, Loader2, Check,
} from 'lucide-react'
import ExportButton from '@/app/(crm)/_components/ExportButton'
import { createClient } from '@/lib/supabase/client'
import { vinculosPedido, mensagemBloqueio } from '@/lib/exclusao'
import PedidoFormModal from './PedidoFormModal'
import {
  type Pedido, type ClienteRef, STATUS_PEDIDO,
  statusStyle, statusLabel, brl, formatDate, calcTotal,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantConfig } from '@/app/(crm)/_components/TenantContext'
import { useSegmentos, segmentoLabel } from '@/app/(crm)/_components/SegmentosContext'

interface VendedorRef { id: string; nome: string }
interface EmpresaRef  { id: string; nome: string; sigla: string }
interface PropostaLink { id: string; numero: string | null }

interface Props {
  pedidos: Pedido[]
  clientes: ClienteRef[]
  vendedores: VendedorRef[]
  empresas: EmpresaRef[]
  propostaLinks: PropostaLink[]
  currentStatus: string
  omieConectado: boolean
}

export default function PedidosView({ pedidos, clientes, vendedores, empresas, propostaLinks, currentStatus, omieConectado }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const toast = useToast()
  const segmentos = useSegmentos()
  const { perfil } = useTenantConfig()
  const podeAprovar = perfil === 'admin' || perfil === 'gestor'

  // Lookups de rastreabilidade
  const vendedorMap = Object.fromEntries(vendedores.map(v => [v.id, v.nome]))
  const empresaMap  = Object.fromEntries(empresas.map(e => [e.id, e]))
  const propostaMap = Object.fromEntries(propostaLinks.map(p => [p.id, p.numero]))

  const [formOpen, setFormOpen] = useState(false)
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [enviandoOmie, setEnviandoOmie] = useState<string | null>(null)

  function clienteNome(id: string | null) {
    if (!id) return null
    const c = clientes.find((x) => x.id === id)
    return c ? (c.empresa ?? c.nome) : null
  }

  function setStatusFilter(s: string) {
    const sp = new URLSearchParams()
    if (s !== 'todos') sp.set('status', s)
    startTransition(() => {
      router.push(pathname + (sp.toString() ? '?' + sp.toString() : ''))
    })
  }

  const STATUS_LABEL: Record<string, string> = {
    aguardando: 'Aberto', em_producao: 'Em produção',
    entregue: 'Entregue', cancelado: 'Cancelado',
  }

  async function updateStatus(id: string, novoStatus: string) {
    const supabase = createClient()
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', id)
    toast(`Status alterado para ${STATUS_LABEL[novoStatus] ?? novoStatus}`, 'info')
    router.refresh()
  }

  async function aprovarPedido(id: string) {
    const supabase = createClient()
    await supabase.from('pedidos').update({ aprovado: true }).eq('id', id)
    toast('Pedido aprovado e liberado para faturamento. ✅')
    router.refresh()
  }

  async function enviarAoOmie(p: Pedido) {
    setEnviandoOmie(p.id)
    try {
      const res = await fetch('/api/integracoes/omie/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido_id: p.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast(data.error ?? 'Falha ao enviar ao Omie', 'error'); return }
      if (data.jaEnviado) toast('Este pedido já foi enviado ao Omie.', 'info')
      else toast(`Pedido enviado ao Omie${data.numero ? ` · nº ${data.numero}` : ''} ✅`)
      router.refresh()
    } catch {
      toast('Erro de conexão ao enviar ao Omie', 'error')
    } finally {
      setEnviandoOmie(null)
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const vinc = await vinculosPedido(supabase, id)
    if (vinc.length) { setDeletingId(null); toast(mensagemBloqueio(vinc), 'error'); return }
    const { error } = await supabase.from('pedidos').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Não foi possível excluir — há registros vinculados.', 'error'); return }
    toast('Pedido excluído', 'info')
    router.refresh()
  }

  const totalFiltrado = pedidos.reduce((s, p) => s + (p.valor ?? 0), 0)

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Pedidos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
            {totalFiltrado > 0 && ` · ${brl(totalFiltrado)}`}
            {isPending && <Loader2 size={13} className="animate-spin text-blue-500" />}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton href="/api/exportar/pedidos" label="Exportar" filename="pedidos.xlsx" />
          <button
            onClick={() => { setEditingPedido(null); setFormOpen(true) }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo pedido</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
        {STATUS_PEDIDO.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentStatus === value
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista vazia */}
      {pedidos.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm py-16 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum pedido encontrado.</p>
          <button
            onClick={() => { setEditingPedido(null); setFormOpen(true) }}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Criar o primeiro pedido
          </button>
        </div>
      )}

      {/* Lista de pedidos */}
      {pedidos.length > 0 && (
        <div className={`space-y-2 transition-opacity ${isPending ? 'opacity-50' : ''}`}>
          {pedidos.map((p) => {
            const expanded = expandedId === p.id
            const itens = p.itens ?? []
            const nomeCliente = clienteNome(p.cliente_id)
            const vend = p.vendedor_id ? (vendedorMap[p.vendedor_id] ?? null) : null
            const emp = p.empresa_id ? empresaMap[p.empresa_id] : null
            const propNum = p.proposta_id ? (propostaMap[p.proposta_id] ?? null) : null

            return (
              <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Linha principal */}
                <div
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                >
                  {/* Número */}
                  {p.numero && (
                    <span className="shrink-0 text-xs font-mono text-gray-400 dark:text-gray-500 w-24">{p.numero}</span>
                  )}

                  {/* Cliente */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {nomeCliente ?? <span className="text-gray-400 dark:text-gray-500 font-normal">Sem cliente</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.segmento && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{segmentoLabel(p.segmento, segmentos)}</span>
                      )}
                      {p.criado_em && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                          {formatDate(p.criado_em)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Valor */}
                  <span className="shrink-0 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {brl(p.valor)}
                  </span>

                  {/* Aguardando aprovação do gestor */}
                  {!p.aprovado && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      <Clock size={11} /> <span className="hidden sm:inline">Aguardando aprovação</span>
                    </span>
                  )}

                  {/* Liberar (gestor/admin) */}
                  {!p.aprovado && podeAprovar && (
                    <button
                      onClick={(e) => { e.stopPropagation(); aprovarPedido(p.id) }}
                      title="Liberar pedido para faturamento"
                      className="shrink-0 inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <ShieldCheck size={13} /> <span className="hidden sm:inline">Liberar</span>
                    </button>
                  )}

                  {/* Status */}
                  <span className={`shrink-0 hidden sm:inline-block text-xs font-medium px-2 py-1 rounded-lg ${statusStyle(p.status)}`}>
                    {statusLabel(p.status)}
                  </span>

                  {/* Ações (sempre visíveis, como na proposta) */}
                  <div
                    className="shrink-0 flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {p.status === 'aguardando' && (
                      <button onClick={() => updateStatus(p.id, 'em_producao')} title="Iniciar produção"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                        <PackageCheck size={14} />
                      </button>
                    )}
                    {p.status === 'em_producao' && (
                      <>
                        <button onClick={() => updateStatus(p.id, 'entregue')} title="Marcar como entregue"
                          className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
                          <CheckCircle size={14} />
                        </button>
                        <button onClick={() => updateStatus(p.id, 'cancelado')} title="Cancelar"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
                    <a
                      href={`/imprimir/pedido/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Imprimir / Salvar PDF"
                      className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <Printer size={14} />
                    </a>
                    <button onClick={() => { setEditingPedido(p); setFormOpen(true) }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeletingId(p.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Chevron */}
                  <div className="shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Detalhe expansível */}
                {expanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
                    {/* Status mobile */}
                    <div className="sm:hidden px-4 pt-3">
                      <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg ${statusStyle(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                    </div>

                    {/* Rastreabilidade / metadados (mesma estrutura da proposta) */}
                    <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 border-b border-gray-100 dark:border-gray-700">
                      <Meta label="Origem" value={propNum ? `Proposta ${propNum}` : 'Cadastro manual'} destaque={!!propNum} />
                      <Meta label="Vendedor" value={vend ?? '—'} />
                      <Meta label="Empresa emissora" value={emp ? `${emp.nome} (${emp.sigla})` : '—'} />
                      <Meta label="Criado em" value={formatDate(p.criado_em)} />
                    </div>

                    {/* Itens */}
                    {itens.length > 0 ? (
                      <div className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Itens</p>
                        <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/80">
                                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Descrição</th>
                                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 w-16">Qtd</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 w-28">Vlr unit.</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 w-28">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-600">
                              {itens.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.descricao || '—'}</td>
                                  <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">{item.quantidade}</td>
                                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{brl(item.valorUnitario)}</td>
                                  <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                    {brl(item.quantidade * item.valorUnitario)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/80">
                                <td colSpan={3} className="px-3 py-2.5 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Total
                                </td>
                                <td className="px-3 py-2.5 text-right text-sm font-bold text-gray-900 dark:text-gray-100">
                                  {brl(calcTotal(itens))}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">Sem itens cadastrados.</p>
                    )}

                    {/* Obs */}
                    {p.obs && (
                      <div className="px-4 pb-3">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Observações</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{p.obs}</p>
                      </div>
                    )}

                    {/* Ações fiscais */}
                    <div className="px-4 pb-4 pt-1 flex flex-wrap justify-end items-center gap-2">
                      {/* Enviar ao Omie (só se conectado) */}
                      {omieConectado && (
                        p.omie_pedido_id ? (
                          <span
                            title={p.omie_enviado_em ? `Enviado em ${formatDate(p.omie_enviado_em)}` : 'Enviado ao Omie'}
                            className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-3 py-2 rounded-lg"
                          >
                            <Check size={14} /> Enviado ao Omie{p.omie_numero ? ` · nº ${p.omie_numero}` : ''}
                          </span>
                        ) : p.aprovado ? (
                          <button
                            onClick={() => enviarAoOmie(p)}
                            disabled={enviandoOmie === p.id}
                            className="flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors disabled:opacity-60"
                          >
                            {enviandoOmie === p.id
                              ? <Loader2 size={15} className="animate-spin" />
                              : <Send size={15} />}
                            {enviandoOmie === p.id ? 'Enviando…' : 'Enviar ao Omie'}
                          </button>
                        ) : null
                      )}

                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmar exclusão */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir pedido?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deletingId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <PedidoFormModal
          pedido={editingPedido ?? undefined}
          onClose={() => { setFormOpen(false); setEditingPedido(null) }}
        />
      )}

    </>
  )
}

// Campo de metadado auto-rotulado (rótulo em cima, valor embaixo)
function Meta({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-sm truncate ${destaque ? 'font-semibold text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
        {value}
      </p>
    </div>
  )
}
