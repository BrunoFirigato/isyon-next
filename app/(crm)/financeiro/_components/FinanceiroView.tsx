'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, Pencil, Trash2, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import LancamentoFormModal from './LancamentoFormModal'
import {
  type Lancamento, type Fatura, type Comissao,
  type ClienteRef, type VendedorRef,
  STATUS_FATURA, STATUS_COMISSAO,
  faturaStatusStyle, comissaoStatusStyle, statusLabel,
  brl, formatDate,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'

type Aba = 'lancamentos' | 'faturas' | 'comissoes'

interface Props {
  lancamentos: Lancamento[]
  faturas: Fatura[]
  comissoes: Comissao[]
  clientes: ClienteRef[]
  vendedores: VendedorRef[]
  currentAba: Aba
}

export default function FinanceiroView({
  lancamentos, faturas, comissoes, clientes, vendedores, currentAba,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const toast = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function setAba(aba: Aba) {
    startTransition(() => {
      router.push(pathname + (aba !== 'lancamentos' ? `?aba=${aba}` : ''))
    })
  }

  function clienteNome(id: string | null) {
    if (!id) return null
    const c = clientes.find((x) => x.id === id)
    return c ? (c.empresa ?? c.nome) : null
  }

  function vendedorNome(id: string | null) {
    if (!id) return null
    return vendedores.find((v) => v.id === id)?.nome ?? null
  }

  async function updateFaturaStatus(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('faturas').update({ status }).eq('id', id)
    toast(status === 'pago' ? 'Fatura marcada como paga!' : 'Status da fatura atualizado', 'info')
    router.refresh()
  }

  async function updateComissaoStatus(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('comissoes').update({ status }).eq('id', id)
    toast(status === 'pago' ? 'Comissão marcada como paga!' : 'Comissão aprovada!', 'info')
    router.refresh()
  }

  async function handleDeleteLancamento(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('lancamentos').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Erro ao excluir lançamento', 'error'); return }
    toast('Lançamento excluído', 'info')
    router.refresh()
  }

  // Totais de lançamentos
  const totalReceitas = lancamentos.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const totalDespesas = lancamentos.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
  const saldo = totalReceitas - totalDespesas

  const ABAS: { value: Aba; label: string }[] = [
    { value: 'lancamentos', label: 'Lançamentos' },
    { value: 'faturas', label: 'Faturas' },
    { value: 'comissoes', label: 'Comissões' },
  ]

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-500 mt-0.5">Controle financeiro do negócio</p>
        </div>
        {currentAba === 'lancamentos' && (
          <button
            onClick={() => { setEditingLancamento(null); setFormOpen(true) }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo lançamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        )}
      </div>

      {/* Cards de resumo (só na aba lançamentos) */}
      {currentAba === 'lancamentos' && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={15} className="text-green-500" />
              <span className="text-xs font-medium text-gray-500">Receitas</span>
            </div>
            <p className="text-base font-bold text-green-600">{brl(totalReceitas)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={15} className="text-red-500" />
              <span className="text-xs font-medium text-gray-500">Despesas</span>
            </div>
            <p className="text-base font-bold text-red-600">{brl(totalDespesas)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${saldo >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-xs font-medium text-gray-500 mb-1">Saldo</p>
            <p className={`text-base font-bold ${saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {brl(saldo)}
            </p>
          </div>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1.5 mb-5">
        {ABAS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setAba(value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentAba === value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── ABA LANÇAMENTOS ── */}
      {currentAba === 'lancamentos' && (
        <>
          {lancamentos.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
              <p className="text-gray-400 text-sm">Nenhum lançamento encontrado.</p>
              <button onClick={() => { setEditingLancamento(null); setFormOpen(true) }}
                className="mt-4 text-sm text-blue-600 hover:underline">
                Registrar primeiro lançamento
              </button>
            </div>
          )}

          {lancamentos.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Categoria</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Tipo</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lancamentos.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(l.data)}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{l.descricao}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{l.categoria ?? '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg ${
                          l.tipo === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {l.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${
                        l.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {l.tipo === 'despesa' ? '−' : '+'}{brl(l.valor)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingLancamento(l); setFormOpen(true) }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeletingId(l.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── ABA FATURAS ── */}
      {currentAba === 'faturas' && (
        <>
          {faturas.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
              <p className="text-gray-400 text-sm">Nenhuma fatura encontrada.</p>
            </div>
          )}

          {faturas.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Número</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {faturas.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-gray-500">{f.numero ?? '—'}</p>
                        {f.obs && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{f.obs}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {clienteNome(f.cliente_id) ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg ${faturaStatusStyle(f.status)}`}>
                          {statusLabel(STATUS_FATURA, f.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{brl(f.valor)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {f.status === 'pendente' && (
                            <button onClick={() => updateFaturaStatus(f.id, 'pago')} title="Marcar como pago"
                              className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
                              <CheckCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── ABA COMISSÕES ── */}
      {currentAba === 'comissoes' && (
        <>
          {comissoes.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
              <p className="text-gray-400 text-sm">Nenhuma comissão encontrada.</p>
            </div>
          )}

          {comissoes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendedor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Vlr pedido</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Comissão</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {comissoes.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {vendedorNome(c.vendedor_id) ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{brl(c.valor_pedido)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{brl(c.valor_comissao)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg ${comissaoStatusStyle(c.status)}`}>
                          {statusLabel(STATUS_COMISSAO, c.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {c.status === 'aprovada' && (
                            <button onClick={() => updateComissaoStatus(c.id, 'pago')} title="Marcar como pago"
                              className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
                              <CheckCircle size={14} />
                            </button>
                          )}
                          {c.status === 'pendente' && (
                            <button onClick={() => updateComissaoStatus(c.id, 'aprovada')} title="Aprovar comissão"
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                              <CheckCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Confirmar exclusão de lançamento */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Excluir lançamento?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDeleteLancamento(deletingId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <LancamentoFormModal
          lancamento={editingLancamento ?? undefined}
          onClose={() => { setFormOpen(false); setEditingLancamento(null) }}
        />
      )}
    </>
  )
}
