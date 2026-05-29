'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  type Pedido, type ItemPedido, type ClienteRef,
  STATUS_PEDIDO, brl, calcTotal, novoItem,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
import { useSegmentos } from '@/app/(crm)/_components/SegmentosContext'

interface Props {
  pedido?: Pedido
  onClose: () => void
}

export default function PedidoFormModal({ pedido, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const segmentos = useSegmentos()
  const isEditing = !!pedido

  const [clienteId, setClienteId] = useState(pedido?.cliente_id ?? '')
  const [empresaId, setEmpresaId] = useState(pedido?.empresa_id ?? '')
  const [segmento, setSegmento] = useState(pedido?.segmento ?? '')
  const [status, setStatus] = useState(pedido?.status ?? 'aguardando')
  const [obs, setObs] = useState(pedido?.obs ?? '')
  const [itens, setItens] = useState<ItemPedido[]>(
    pedido?.itens?.length ? pedido.itens : [novoItem()]
  )

  const [clientes, setClientes] = useState<ClienteRef[]>([])
  const [filiais,  setFiliais]  = useState<{ id: string; nome: string; sigla: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('clientes').select('id, nome, empresa').order('nome'),
      supabase.from('empresas').select('id, nome, sigla').order('nome'),
    ]).then(([{ data: cls }, { data: emps }]) => {
      if (cls)  setClientes(cls)
      if (emps) {
        setFiliais(emps)
        if (emps.length === 1 && !pedido?.empresa_id) setEmpresaId(emps[0].id)
      }
    })
  }, [])

  function setItem(id: string, field: keyof ItemPedido, value: string | number) {
    setItens((prev) =>
      prev.map((it) => (it.id !== id ? it : { ...it, [field]: value }))
    )
  }

  function removeItem(id: string) {
    setItens((prev) => prev.filter((it) => it.id !== id))
  }

  const total = calcTotal(itens)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (itens.some((it) => !it.descricao.trim())) {
      setError('Preencha a descrição de todos os itens.')
      return
    }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const itensLimpos = itens.map(({ id: _id, ...rest }) => rest)

    const payload = {
      cliente_id: clienteId  || null,
      empresa_id: empresaId  || null,
      segmento:   segmento   || null,
      status,
      obs:   obs.trim() || null,
      itens: itensLimpos,
      valor: total,
    }

    const { error: err } = isEditing
      ? await supabase.from('pedidos').update(payload).eq('id', pedido!.id)
      : await supabase.from('pedidos').insert({ ...payload, tenant_id: tenantId })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    toast(isEditing ? 'Pedido atualizado!' : 'Pedido criado!')
    router.refresh()
    onClose()
  }

  const selectCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5'
  const itemInputCls = 'border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl max-h-[94vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar pedido' : 'Novo pedido'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-5">
            {/* Campos principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Cliente</label>
                <select
                  value={clienteId} onChange={(e) => setClienteId(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Selecione...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.empresa ? `${c.empresa} — ${c.nome}` : c.nome}
                    </option>
                  ))}
                </select>
              </div>

              {filiais.length > 0 && (
                <div>
                  <label className={labelCls}>Filial emissora</label>
                  <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className={selectCls}>
                    <option value="">Selecione...</option>
                    {filiais.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome} ({f.sigla})</option>
                    ))}
                  </select>
                </div>
              )}

              {segmentos.length > 0 && (
                <div>
                  <label className={labelCls}>Segmento</label>
                  <select
                    value={segmento} onChange={(e) => setSegmento(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Selecione...</option>
                    {segmentos.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>Status</label>
                <select
                  value={status} onChange={(e) => setStatus(e.target.value)}
                  className={selectCls}
                >
                  {STATUS_PEDIDO.filter((s) => s.value !== 'todos').map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Itens */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Itens do pedido
                </label>
                <button
                  type="button" onClick={() => setItens((p) => [...p, novoItem()])}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus size={13} /> Adicionar item
                </button>
              </div>

              <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                <div className="hidden md:grid grid-cols-[1fr_80px_120px_100px_36px] gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Descrição</span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center">Qtd</span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Vlr unit.</span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Total</span>
                  <span />
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-600">
                  {itens.map((item, idx) => (
                    <div key={item.id}
                      className="grid grid-cols-[1fr_36px] md:grid-cols-[1fr_80px_120px_100px_36px] gap-2 items-center px-3 py-2"
                    >
                      <div>
                        <input
                          type="text" value={item.descricao}
                          onChange={(e) => setItem(item.id, 'descricao', e.target.value)}
                          placeholder={`Item ${idx + 1}`}
                          className={`w-full ${itemInputCls}`}
                        />
                        <div className="flex gap-2 mt-1.5 md:hidden">
                          <input
                            type="number" min="1" value={item.quantidade}
                            onChange={(e) => setItem(item.id, 'quantidade', Number(e.target.value))}
                            className={`w-16 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center`}
                          />
                          <input
                            type="number" min="0" step="0.01" value={item.valorUnitario || ''}
                            onChange={(e) => setItem(item.id, 'valorUnitario', Number(e.target.value))}
                            placeholder="R$ 0,00"
                            className={`flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          />
                          <span className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {brl(item.quantidade * item.valorUnitario)}
                          </span>
                        </div>
                      </div>

                      <input
                        type="number" min="1" value={item.quantidade}
                        onChange={(e) => setItem(item.id, 'quantidade', Number(e.target.value))}
                        className={`hidden md:block border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center`}
                      />
                      <input
                        type="number" min="0" step="0.01" value={item.valorUnitario || ''}
                        onChange={(e) => setItem(item.id, 'valorUnitario', Number(e.target.value))}
                        placeholder="0,00"
                        className={`hidden md:block border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right`}
                      />
                      <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300 text-right pr-1">
                        {brl(item.quantidade * item.valorUnitario)}
                      </span>

                      <button
                        type="button" onClick={() => removeItem(item.id)}
                        disabled={itens.length === 1}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{brl(total)}</span>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className={labelCls}>Observações</label>
              <textarea
                value={obs} onChange={(e) => setObs(e.target.value)}
                rows={3} placeholder="Condições de entrega, prazo, instruções..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex gap-3 shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
