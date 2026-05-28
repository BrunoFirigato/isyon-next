'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Send, Mail, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PropostaFormModal from './PropostaFormModal'
import {
  type Proposta, type ClienteRef, STATUS_PROPOSTA,
  statusStyle, statusLabel, brl, formatDate, calcTotal,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'

interface Props {
  propostas: Proposta[]
  clientes: ClienteRef[]
  currentStatus: string
}

export default function PropostasView({ propostas, clientes, currentStatus }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editingProposta, setEditingProposta] = useState<Proposta | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [emailModal, setEmailModal] = useState<Proposta | null>(null)
  const [emailTo, setEmailTo] = useState('')
  const [emailAssunto, setEmailAssunto] = useState('')
  const [emailMensagem, setEmailMensagem] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailError, setEmailError] = useState<'not_configured' | 'generic' | null>(null)

  function clienteNome(id: string | null) {
    if (!id) return null
    const c = clientes.find((x) => x.id === id)
    return c ? (c.empresa ?? c.nome) : null
  }

  function clienteEmail(id: string | null) {
    if (!id) return ''
    return clientes.find((x) => x.id === id)?.email ?? ''
  }

  function openEmailModal(p: Proposta) {
    const nomeCliente = clienteNome(p.cliente_id) ?? ''
    const nomeEmpresa = clientes.find((c) => c.id === p.cliente_id)?.empresa ?? null
    const num = p.numero ? `[${p.numero}] ` : ''
    const empresa = nomeEmpresa ? ` — ${nomeEmpresa}` : ''
    setEmailModal(p)
    setEmailTo(clienteEmail(p.cliente_id) ?? '')
    setEmailAssunto(`${num}${p.titulo}${empresa}`)
    setEmailMensagem(`Olá${nomeCliente ? ` ${nomeCliente}` : ''},\n\nSegue em anexo nossa proposta comercial. Estamos à disposição para esclarecer qualquer dúvida.\n\nAtenciosamente.`)
    setEmailError(null)
  }

  async function handleSendEmail() {
    if (!emailModal || !emailTo.trim()) return
    setSendingEmail(true)
    const itens = emailModal.itens ?? []
    try {
      setEmailError(null)
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'proposta',
          to: emailTo.trim(),
          assunto: emailAssunto.trim() || undefined,
          mensagemAbertura: emailMensagem.trim() || undefined,
          proposta: {
            numeroProposta: emailModal.numero,
            tituloProposta: emailModal.titulo,
            nomeCliente: clienteNome(emailModal.cliente_id) ?? '',
            nomeEmpresa: clientes.find((c) => c.id === emailModal.cliente_id)?.empresa ?? null,
            valor: emailModal.valor,
            validade: emailModal.validade,
            obs: emailModal.obs,
            itens: itens.map((i) => ({
              descricao: i.descricao,
              quantidade: i.quantidade,
              valorUnitario: i.valorUnitario,
            })),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEmailError(data.error === 'email_not_configured' ? 'not_configured' : 'generic')
      } else {
        toast('Proposta enviada por e-mail!')
        if (emailModal.status === 'rascunho') {
          const supabase = createClient()
          await supabase.from('propostas').update({ status: 'enviada' }).eq('id', emailModal.id)
          router.refresh()
        }
        setEmailModal(null)
      }
    } finally {
      setSendingEmail(false)
    }
  }

  function setStatusFilter(s: string) {
    const sp = new URLSearchParams()
    if (s !== 'todos') sp.set('status', s)
    startTransition(() => {
      router.push(pathname + (sp.toString() ? '?' + sp.toString() : ''))
    })
  }

  const STATUS_LABEL: Record<string, string> = {
    enviada: 'Enviada', aprovada: 'Aprovada', rejeitada: 'Rejeitada',
    rascunho: 'Rascunho', cancelada: 'Cancelada',
  }

  async function updateStatus(id: string, novoStatus: string) {
    const supabase = createClient()
    await supabase.from('propostas').update({ status: novoStatus }).eq('id', id)
    toast(`Status alterado para ${STATUS_LABEL[novoStatus] ?? novoStatus}`, 'info')
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('propostas').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Erro ao excluir proposta', 'error'); return }
    toast('Proposta excluída', 'info')
    router.refresh()
  }

  const totalFiltrado = propostas.reduce((s, p) => s + (p.valor ?? 0), 0)

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Propostas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {propostas.length} proposta{propostas.length !== 1 ? 's' : ''}
            {totalFiltrado > 0 && ` · ${brl(totalFiltrado)}`}
          </p>
        </div>
        <button
          onClick={() => { setEditingProposta(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nova proposta</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
        {STATUS_PROPOSTA.map(({ value, label }) => (
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
      {propostas.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm py-16 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhuma proposta encontrada.</p>
          <button
            onClick={() => { setEditingProposta(null); setFormOpen(true) }}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Criar a primeira proposta
          </button>
        </div>
      )}

      {/* Lista de propostas */}
      {propostas.length > 0 && (
        <div className="space-y-2">
          {propostas.map((p) => {
            const expanded = expandedId === p.id
            const itens = p.itens ?? []
            const nomeCliente = clienteNome(p.cliente_id)

            return (
              <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Linha principal */}
                <div
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                >
                  {/* Número */}
                  {p.numero && (
                    <span className="shrink-0 text-xs font-mono text-gray-400 dark:text-gray-500 w-20">{p.numero}</span>
                  )}

                  {/* Título + cliente */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {nomeCliente && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{nomeCliente}</span>
                      )}
                      {p.validade && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                          válida até {formatDate(p.validade)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Valor */}
                  <span className="shrink-0 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {brl(p.valor)}
                  </span>

                  {/* Status */}
                  <span className={`shrink-0 hidden sm:inline-block text-xs font-medium px-2 py-1 rounded-lg ${statusStyle(p.status)}`}>
                    {statusLabel(p.status)}
                  </span>

                  {/* Ações (hover) */}
                  <div
                    className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {p.status === 'rascunho' && (
                      <button onClick={() => updateStatus(p.id, 'enviada')} title="Marcar como enviada"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                        <Send size={14} />
                      </button>
                    )}
                    {p.status === 'enviada' && (
                      <>
                        <button onClick={() => updateStatus(p.id, 'aprovada')} title="Aprovar"
                          className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
                          <CheckCircle size={14} />
                        </button>
                        <button onClick={() => updateStatus(p.id, 'recusada')} title="Recusar"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => openEmailModal(p)}
                      title="Enviar por e-mail"
                      className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <Mail size={14} />
                    </button>
                    <button onClick={() => { setEditingProposta(p); setFormOpen(true) }}
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

                    {/* Itens */}
                    {itens.length > 0 ? (
                      <div className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Itens
                        </p>
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
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Observações
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{p.obs}</p>
                      </div>
                    )}
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
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir proposta?</h3>
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

      {/* ── Modal: Enviar por e-mail ──────────────────────────────────────── */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEmailModal(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-blue-500 shrink-0" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Enviar proposta por e-mail</h3>
              </div>
              <button onClick={() => setEmailModal(null)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Proposta em destaque */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{emailModal.titulo}</p>
                {emailModal.numero && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{emailModal.numero}</p>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Destinatário */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Destinatário <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="email@cliente.com.br"
                  autoFocus
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {clienteEmail(emailModal.cliente_id) && emailTo !== clienteEmail(emailModal.cliente_id) && (
                  <button
                    type="button"
                    onClick={() => setEmailTo(clienteEmail(emailModal.cliente_id) ?? '')}
                    className="mt-1.5 text-xs text-blue-600 hover:underline"
                  >
                    Usar e-mail do cliente ({clienteEmail(emailModal.cliente_id)})
                  </button>
                )}
              </div>

              {/* Assunto */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Assunto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={emailAssunto}
                  onChange={(e) => setEmailAssunto(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Mensagem */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Mensagem</label>
                <textarea
                  value={emailMensagem}
                  onChange={(e) => setEmailMensagem(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Aparece no topo do e-mail, antes dos detalhes da proposta.</p>
              </div>

              {/* Aviso de status */}
              {emailModal.status === 'rascunho' && !emailError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                  ✓ O status da proposta será alterado para <strong>Enviada</strong> automaticamente.
                </div>
              )}

              {/* Erros */}
              {emailError === 'not_configured' && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3.5">
                  <p className="text-sm font-semibold text-orange-800 mb-1">Envio de e-mail não habilitado</p>
                  <p className="text-xs text-orange-700 leading-relaxed">
                    A integração de e-mail ainda não foi configurada neste sistema.
                    Entre em contato com o suporte para ativar essa funcionalidade.
                  </p>
                  <a href="mailto:suporte@isyon.com.br"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-800 underline underline-offset-2">
                    <Mail size={11} /> suporte@isyon.com.br
                  </a>
                </div>
              )}
              {emailError === 'generic' && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
                  <p className="text-sm font-semibold text-red-800 mb-1">Falha ao enviar e-mail</p>
                  <p className="text-xs text-red-700 leading-relaxed">
                    Ocorreu um erro ao processar o envio. Tente novamente em instantes.
                    Se o problema persistir, acione o suporte.
                  </p>
                  <a href="mailto:suporte@isyon.com.br"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-800 underline underline-offset-2">
                    <Mail size={11} /> suporte@isyon.com.br
                  </a>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setEmailModal(null)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !emailTo.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  {sendingEmail ? <span>Enviando...</span> : <><Send size={13} /> Enviar proposta</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <PropostaFormModal
          proposta={editingProposta ?? undefined}
          onClose={() => { setFormOpen(false); setEditingProposta(null) }}
        />
      )}
    </>
  )
}
