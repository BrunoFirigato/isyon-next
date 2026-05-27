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
  const [sendingEmail, setSendingEmail] = useState(false)

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
    setEmailModal(p)
    setEmailTo(clienteEmail(p.cliente_id) ?? '')
  }

  async function handleSendEmail() {
    if (!emailModal || !emailTo.trim()) return
    setSendingEmail(true)
    const itens = emailModal.itens ?? []
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'proposta',
          to: emailTo.trim(),
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
      if (!res.ok) { toast(data.error ?? 'Erro ao enviar e-mail', 'error') }
      else {
        toast('Proposta enviada por e-mail!')
        // Atualiza status para "enviada" se ainda for rascunho
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
          <h1 className="text-xl font-semibold text-gray-900">Propostas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
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
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista vazia */}
      {propostas.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-gray-400 text-sm">Nenhuma proposta encontrada.</p>
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
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Linha principal */}
                <div
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors group"
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                >
                  {/* Número */}
                  {p.numero && (
                    <span className="shrink-0 text-xs font-mono text-gray-400 w-20">{p.numero}</span>
                  )}

                  {/* Título + cliente */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {nomeCliente && (
                        <span className="text-xs text-gray-500 truncate">{nomeCliente}</span>
                      )}
                      {p.validade && (
                        <span className="text-xs text-gray-400 shrink-0">
                          válida até {formatDate(p.validade)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Valor */}
                  <span className="shrink-0 text-sm font-semibold text-gray-900">
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
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeletingId(p.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Chevron */}
                  <div className="shrink-0 text-gray-300 group-hover:text-gray-400 transition-colors">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Detalhe expansível */}
                {expanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    {/* Status mobile */}
                    <div className="sm:hidden px-4 pt-3">
                      <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg ${statusStyle(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                    </div>

                    {/* Itens */}
                    {itens.length > 0 ? (
                      <div className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Itens
                        </p>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Descrição</th>
                                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 w-16">Qtd</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-28">Vlr unit.</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-28">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {itens.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2 text-gray-700">{item.descricao || '—'}</td>
                                  <td className="px-3 py-2 text-center text-gray-600">{item.quantidade}</td>
                                  <td className="px-3 py-2 text-right text-gray-600">{brl(item.valorUnitario)}</td>
                                  <td className="px-3 py-2 text-right font-medium text-gray-900">
                                    {brl(item.quantidade * item.valorUnitario)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-gray-200 bg-gray-50">
                                <td colSpan={3} className="px-3 py-2.5 text-right text-sm font-semibold text-gray-700">
                                  Total
                                </td>
                                <td className="px-3 py-2.5 text-right text-sm font-bold text-gray-900">
                                  {brl(calcTotal(itens))}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="px-4 py-3 text-sm text-gray-400">Sem itens cadastrados.</p>
                    )}

                    {/* Obs */}
                    {p.obs && (
                      <div className="px-4 pb-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Observações
                        </p>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{p.obs}</p>
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
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Excluir proposta?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
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
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Enviar proposta por e-mail</h3>
              <button onClick={() => setEmailModal(null)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-1 truncate">
              <span className="font-medium text-gray-700">{emailModal.titulo}</span>
              {emailModal.numero && <span className="text-gray-400 font-mono ml-2">{emailModal.numero}</span>}
            </p>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Destinatário <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="email@cliente.com.br"
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {clienteEmail(emailModal.cliente_id) && emailTo !== clienteEmail(emailModal.cliente_id) && (
                <button
                  type="button"
                  onClick={() => setEmailTo(clienteEmail(emailModal.cliente_id) ?? '')}
                  className="mt-1 text-xs text-blue-600 hover:underline"
                >
                  Usar e-mail do cliente ({clienteEmail(emailModal.cliente_id)})
                </button>
              )}
            </div>
            {emailModal.status === 'rascunho' && (
              <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                O status da proposta será alterado para <strong>Enviada</strong> automaticamente.
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEmailModal(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailTo.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {sendingEmail ? (
                  <span>Enviando...</span>
                ) : (
                  <><Mail size={14} /> Enviar</>
                )}
              </button>
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
