'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Trash2, Lock, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  type Proposta, type ItemProposta, type ClienteRef,
  brl, calcTotal, novoItem,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantConfig } from '@/app/(crm)/_components/TenantContext'
import { useSegmentos } from '@/app/(crm)/_components/SegmentosContext'

interface ProdutoRef       { id: string; nome: string; preco: number | null; ncm: string | null; unidade: string | null; tipo: string | null }
interface CondPagamentoRef { id: string; nome: string }
interface VendedorRef      { id: string; nome: string }

export interface PrefillProposta {
  titulo?:     string
  clienteId?:  string
  empresaId?:  string
  segmento?:   string
  vendedorId?: string
}

interface Props {
  proposta?: Proposta
  prefill?:  PrefillProposta
  onClose: () => void
}

export default function PropostaFormModal({ proposta, prefill, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const { tenantId, perfil, divisaoCarteira } = useTenantConfig()
  const segmentos = useSegmentos()
  const isEditing = !!proposta

  // Status só é editável pelo fluxo (botões na lista). No modal, nasce sempre rascunho.
  const status = proposta?.status ?? 'rascunho'
  // Cliente e filial travados quando herdados da oportunidade
  const clienteTravado = !!prefill?.clienteId
  const filialTravada  = !!prefill?.empresaId

  const [titulo, setTitulo] = useState(proposta?.titulo ?? prefill?.titulo ?? '')
  const [clienteId, setClienteId] = useState(proposta?.cliente_id ?? prefill?.clienteId ?? '')
  const [empresaId, setEmpresaId] = useState(proposta?.empresa_id ?? prefill?.empresaId ?? '')
  const [validade, setValidade] = useState(proposta?.validade?.slice(0, 10) ?? '')
  const [segmento, setSegmento] = useState(proposta?.segmento ?? prefill?.segmento ?? '')
  const [condPagamentoId, setCondPagamentoId] = useState(proposta?.cond_pagamento_id ?? '')
  // vendedor: proposta (edição) → oportunidade (prefill) → usuário logado (auto)
  const [vendedorId, setVendedorId] = useState(proposta?.vendedor_id ?? prefill?.vendedorId ?? '')
  const [obs, setObs] = useState(proposta?.obs ?? '')
  const [itens, setItens] = useState<ItemProposta[]>(
    proposta?.itens?.length ? proposta.itens : [novoItem()]
  )

  const [clientes, setClientes] = useState<ClienteRef[]>([])
  const [filiais,  setFiliais]  = useState<{ id: string; nome: string; sigla: string }[]>([])
  const [produtos, setProdutos] = useState<ProdutoRef[]>([])
  const [condPagamentos, setCondPagamentos] = useState<CondPagamentoRef[]>([])
  const [vendedores, setVendedores] = useState<VendedorRef[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const [{ data: cls }, { data: emps }, { data: prods }, { data: conds }, { data: vends }, { data: { user } }] = await Promise.all([
        supabase.from('clientes').select('id, nome, empresa').order('nome'),
        supabase.from('empresas').select('id, nome, sigla').order('nome'),
        supabase.from('produtos').select('id, nome, preco, ncm, unidade, tipo').eq('ativo', true).order('nome'),
        supabase.from('cond_pagamentos').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('vendedores').select('id, nome').eq('status', 'ativo').order('nome'),
        supabase.auth.getUser(),
      ])

      if (cls)   setClientes(cls)
      if (prods) setProdutos(prods)
      if (conds) setCondPagamentos(conds)
      if (vends) setVendedores(vends)
      if (emps) {
        setFiliais(emps)
        if (emps.length === 1 && !proposta?.empresa_id && !prefill?.empresaId) setEmpresaId(emps[0].id)
      }

      // Auto-preenche vendedor pelo e-mail do usuário logado (proposta avulsa)
      if (!proposta?.vendedor_id && !prefill?.vendedorId && user?.email) {
        const { data: meu } = await supabase
          .from('vendedores').select('id').eq('email', user.email).eq('status', 'ativo').limit(1).maybeSingle()
        if (meu) setVendedorId(meu.id)
      }
    }

    init()
  }, [])

  // Vendedor travado: herdado da oportunidade ou sob divisão de carteira (perfil vendedor)
  const vendedorTravado = !!prefill?.vendedorId || (divisaoCarteira && perfil === 'vendedor')

  function setItem(id: string, field: keyof ItemProposta, value: string | number) {
    setItens((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it
        const updated = { ...it, [field]: value }
        return updated
      })
    )
  }

  function removeItem(id: string) {
    setItens((prev) => {
      const filtrado = prev.filter((it) => it.id !== id)
      // Nunca deixa a tabela vazia — reseta para um item em branco
      return filtrado.length ? filtrado : [novoItem()]
    })
  }

  // Descrição com autocomplete: se o texto casar com um produto cadastrado,
  // vincula automaticamente (NCM, unidade e valor). Senão, vira item livre.
  function onDescricaoChange(itemId: string, value: string) {
    const prod = produtos.find((p) => p.nome.trim().toLowerCase() === value.trim().toLowerCase())
    setItens((prev) => prev.map((it) => {
      if (it.id !== itemId) return it
      if (prod) {
        return {
          ...it,
          descricao:     value,
          produto_id:    prod.id,
          ncm:           prod.ncm,
          unidade:       prod.unidade,
          // preenche o valor só se ainda estiver zerado (não sobrescreve o que o usuário digitou)
          valorUnitario: it.valorUnitario || (prod.preco ?? 0),
        }
      }
      return { ...it, descricao: value, produto_id: null, ncm: null, unidade: null }
    }))
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
      titulo:            titulo.trim(),
      cliente_id:        clienteId  || null,
      empresa_id:        empresaId  || null,
      vendedor_id:       vendedorId || null,
      cond_pagamento_id: condPagamentoId || null,
      validade:          validade   || null,
      segmento:          segmento   || null,
      status,
      obs:   obs.trim() || null,
      itens: itensLimpos,
      valor: total,
    }

    if (isEditing) {
      const { error: err } = await supabase.from('propostas').update(payload).eq('id', proposta!.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      // Gera número sequencial PROP-XXXX
      const { data: ultimas } = await supabase
        .from('propostas').select('numero').eq('tenant_id', tenantId)
        .ilike('numero', 'PROP-%').order('numero', { ascending: false }).limit(1)
      const ultimoNum = ultimas?.[0]?.numero
        ? parseInt(String(ultimas[0].numero).replace(/\D/g, ''), 10) || 0
        : 0
      const numero = `PROP-${String(ultimoNum + 1).padStart(4, '0')}`

      const { error: err } = await supabase.from('propostas').insert({ ...payload, numero, tenant_id: tenantId })
      if (err) { setError(err.message); setSaving(false); return }
    }

    toast(isEditing ? 'Proposta atualizada!' : 'Proposta criada!')
    router.refresh()
    onClose()
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
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
            {isEditing ? 'Editar proposta' : 'Nova proposta'}
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
                <label className={labelCls}>
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                  required placeholder="Ex: Proposta de manutenção preventiva"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={`${labelCls} flex items-center gap-1`}>
                  Cliente
                  {clienteTravado && <Lock size={11} className="text-gray-400" />}
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  disabled={clienteTravado}
                  className={`${selectCls} ${clienteTravado ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <option value="">Selecione...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.empresa ? `${c.empresa} — ${c.nome}` : c.nome}
                    </option>
                  ))}
                </select>
                {clienteTravado && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Herdado da oportunidade.</p>
                )}
              </div>

              {filiais.length > 0 && (
                <div>
                  <label className={`${labelCls} flex items-center gap-1`}>
                    Filial emissora
                    {filialTravada && <Lock size={11} className="text-gray-400" />}
                  </label>
                  <select
                    value={empresaId}
                    onChange={(e) => setEmpresaId(e.target.value)}
                    disabled={filialTravada}
                    className={`${selectCls} ${filialTravada ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Selecione...</option>
                    {filiais.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome} ({f.sigla})</option>
                    ))}
                  </select>
                  {filialTravada && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Herdada da oportunidade.</p>
                  )}
                </div>
              )}

              <div>
                <label className={labelCls}>Validade</label>
                <input type="date" value={validade} onChange={(e) => setValidade(e.target.value)}
                  className={inputCls} />
              </div>

              {segmentos.length > 0 && (
                <div>
                  <label className={labelCls}>Segmento</label>
                  <select value={segmento} onChange={(e) => setSegmento(e.target.value)} className={selectCls}>
                    <option value="">Selecione...</option>
                    {segmentos.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>Condição de pagamento</label>
                <select value={condPagamentoId} onChange={(e) => setCondPagamentoId(e.target.value)} className={selectCls}>
                  <option value="">Selecione...</option>
                  {condPagamentos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`${labelCls} flex items-center gap-1`}>
                  Vendedor
                  {vendedorTravado && <Lock size={11} className="text-gray-400" />}
                </label>
                <select
                  value={vendedorId}
                  onChange={(e) => setVendedorId(e.target.value)}
                  disabled={vendedorTravado}
                  className={`${selectCls} ${vendedorTravado ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <option value="">Selecione...</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>{v.nome}</option>
                  ))}
                </select>
                {prefill?.vendedorId && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Herdado da oportunidade.</p>
                )}
              </div>
            </div>

            {/* Itens */}
            <div>
              {/* Catálogo de produtos para autocomplete da descrição */}
              {produtos.length > 0 && (
                <datalist id="produtos-datalist">
                  {produtos.map((p) => (
                    <option key={p.id} value={p.nome}>
                      {p.tipo === 'servico' ? 'Serviço' : 'Produto'}
                      {p.preco != null ? ` · ${brl(p.preco)}` : ''}
                    </option>
                  ))}
                </datalist>
              )}

              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Itens da proposta
                </label>
                <button type="button" onClick={() => setItens((p) => [...p, novoItem()])}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Plus size={13} /> Adicionar item
                </button>
              </div>

              <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                {/* Header da tabela */}
                <div className="hidden md:grid grid-cols-[1fr_80px_120px_100px_36px] gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Descrição</span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center">Qtd</span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Vlr unit.</span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Total</span>
                  <span />
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-600">
                  {itens.map((item, idx) => (
                    <div key={item.id} className="px-3 py-2">
                      {/* Linha principal — alinhada num único nível */}
                      <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_80px_120px_100px_36px] gap-2 items-center">
                        {/* Descrição com autocomplete de produtos */}
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) => onDescricaoChange(item.id, e.target.value)}
                          list={produtos.length > 0 ? 'produtos-datalist' : undefined}
                          placeholder={`Buscar produto ou digitar item ${idx + 1}`}
                          className={`w-full ${itemInputCls}`}
                        />

                        {/* Desktop: qtd */}
                        <input type="number" min="1" value={item.quantidade}
                          onChange={(e) => setItem(item.id, 'quantidade', Number(e.target.value))}
                          className={`hidden md:block ${itemInputCls} text-center`} />

                        {/* Desktop: valor unit */}
                        <input type="number" min="0" step="0.01" value={item.valorUnitario || ''}
                          onChange={(e) => setItem(item.id, 'valorUnitario', Number(e.target.value))}
                          placeholder="0,00"
                          className={`hidden md:block ${itemInputCls} text-right`} />

                        {/* Desktop: total */}
                        <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300 text-right pr-1">
                          {brl(item.quantidade * item.valorUnitario)}
                        </span>

                        {/* Remover (sempre habilitado) */}
                        <button type="button" onClick={() => removeItem(item.id)}
                          title="Remover item"
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Mobile: qtd + valor + total */}
                      <div className="flex gap-2 mt-2 md:hidden">
                        <input type="number" min="1" value={item.quantidade}
                          onChange={(e) => setItem(item.id, 'quantidade', Number(e.target.value))}
                          className={`w-16 ${itemInputCls} text-center`} />
                        <input type="number" min="0" step="0.01" value={item.valorUnitario || ''}
                          onChange={(e) => setItem(item.id, 'valorUnitario', Number(e.target.value))}
                          placeholder="R$ 0,00"
                          className={`flex-1 ${itemInputCls}`} />
                        <span className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {brl(item.quantidade * item.valorUnitario)}
                        </span>
                      </div>

                      {/* Selo de vínculo — abaixo da linha, sem quebrar o alinhamento */}
                      {item.produto_id && (
                        <p className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 mt-1.5">
                          <Package size={10} />
                          Produto vinculado{item.ncm ? ` · NCM ${item.ncm}` : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-end items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{brl(total)}</span>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className={labelCls}>Observações</label>
              <textarea value={obs} onChange={(e) => setObs(e.target.value)}
                rows={3} placeholder="Condições de pagamento, prazo de entrega..."
                className={`${inputCls} resize-none`} />
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
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar proposta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
