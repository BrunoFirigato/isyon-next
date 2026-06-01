'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Produto, UNIDADES, ORIGENS } from './types'
import NcmSearch from './NcmSearch'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
import { useSegmentos } from '@/app/(crm)/_components/SegmentosContext'

interface Props {
  produto?: Produto
  onClose: () => void
}

export default function ProdutoFormModal({ produto, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const segmentos = useSegmentos()
  const isEditing = !!produto

  const [form, setForm] = useState({
    codigo:      produto?.codigo ?? '',
    nome:        produto?.nome ?? '',
    tipo:        produto?.tipo ?? 'produto',
    unidade:     produto?.unidade ?? 'un',
    custo:       produto?.custo != null ? String(produto.custo) : '',
    // margem derivada de custo/preço quando ambos existem
    margem:      (produto?.custo != null && produto.custo > 0 && produto?.preco != null)
                   ? String(Math.round((produto.preco / produto.custo - 1) * 10000) / 100)
                   : '',
    preco:       produto?.preco != null ? String(produto.preco) : '',
    descricao:   produto?.descricao ?? '',
    ncm:         produto?.ncm ?? '',
    cod_servico: produto?.cod_servico ?? '',
    cest:        produto?.cest ?? '',
    origem:      produto?.origem != null ? String(produto.origem) : '0',
    segmento:    produto?.segmento ?? '',
    ativo:       produto?.ativo ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function parseNum(v: string) {
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) ? null : n
  }

  // ── Precificação (cálculo de mão dupla: custo × margem ↔ preço) ──────────────
  function setCusto(v: string) {
    setForm(f => {
      const custo = parseNum(v), margem = parseNum(f.margem)
      const next = { ...f, custo: v }
      // mantém a margem e recalcula o preço
      if (custo != null && custo > 0 && margem != null) next.preco = (custo * (1 + margem / 100)).toFixed(2)
      return next
    })
  }
  function setMargem(v: string) {
    setForm(f => {
      const custo = parseNum(f.custo), margem = parseNum(v)
      const next = { ...f, margem: v }
      if (custo != null && custo > 0 && margem != null) next.preco = (custo * (1 + margem / 100)).toFixed(2)
      return next
    })
  }
  function setPreco(v: string) {
    setForm(f => {
      const custo = parseNum(f.custo), preco = parseNum(v)
      const next = { ...f, preco: v }
      // recalcula a margem a partir do preço informado
      if (custo != null && custo > 0 && preco != null) next.margem = (((preco / custo) - 1) * 100).toFixed(2)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }

    // Identificador fiscal obrigatório conforme o tipo
    if (form.tipo === 'servico') {
      if (!form.cod_servico.trim()) { setError('Serviço exige o Código de Serviço (LC116).'); return }
    } else {
      if (form.ncm.replace(/\D/g, '').length !== 8) { setError('Produto exige um NCM válido de 8 dígitos.'); return }
    }

    setSaving(true)
    setError('')

    const supabase = createClient()
    const payload = {
      codigo:      form.codigo.trim() || null,
      nome:        form.nome.trim(),
      tipo:        form.tipo,
      unidade:     form.unidade || null,
      preco:       parseNum(form.preco),
      custo:       parseNum(form.custo),
      descricao:   form.descricao.trim() || null,
      ncm:         form.ncm.trim() || null,
      cod_servico: form.cod_servico.trim() || null,
      cest:        form.cest.trim() || null,
      origem:      form.origem !== '' ? parseInt(form.origem) : 0,
      segmento:    form.segmento || null,
      ativo:       form.ativo,
    }

    const { error: err } = isEditing
      ? await supabase.from('produtos').update(payload).eq('id', produto!.id)
      : await supabase.from('produtos').insert({ ...payload, tenant_id: tenantId })

    if (err) { setError(err.message); setSaving(false); return }

    toast(isEditing ? 'Produto atualizado!' : 'Produto criado!')
    router.refresh()
    onClose()
  }

  const isServico = form.tipo === 'servico'

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const selectCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'
  const smallInputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const smallSelectCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const smallLabelCls = 'block text-xs text-gray-600 dark:text-gray-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl shadow-xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar produto' : 'Novo produto'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Tabs de tipo */}
        <div className="flex gap-1 px-5 pt-4">
          {(['produto', 'servico'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('tipo', t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                form.tipo === t
                  ? t === 'servico' ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t === 'produto' ? 'Produto' : 'Serviço'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Código + Nome */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Código</label>
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => set('codigo', e.target.value)}
                placeholder="001"
                className={inputCls}
              />
            </div>
            <div className="col-span-3">
              <label className={labelCls}>
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Nome do produto ou serviço"
                autoFocus
                className={inputCls}
              />
            </div>
          </div>

          {/* Precificação: Custo → Margem → Preço de venda */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Precificação</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Custo (R$)</label>
                <input type="text" value={form.custo} onChange={(e) => setCusto(e.target.value)}
                  placeholder="0,00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Margem (%)</label>
                <input type="text" value={form.margem} onChange={(e) => setMargem(e.target.value)}
                  placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Preço de venda (R$)</label>
                <input type="text" value={form.preco} onChange={(e) => setPreco(e.target.value)}
                  placeholder="0,00" className={`${inputCls} font-medium`} />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
              Informe custo + margem para calcular o preço, ou digite o preço para ver a margem.
            </p>
          </div>

          {/* Unidade + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Unidade</label>
              <select value={form.unidade} onChange={(e) => set('unidade', e.target.value)} className={selectCls}>
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.ativo ? 'true' : 'false'} onChange={(e) => set('ativo', e.target.value === 'true')} className={selectCls}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className={labelCls}>Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
              placeholder="Descrição complementar..."
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Campos fiscais */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Dados fiscais</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {!isServico ? (
                <>
                  <NcmSearch
                    value={form.ncm}
                    onChange={(codigo) => set('ncm', codigo)}
                    inputCls={smallInputCls}
                    labelCls={smallLabelCls}
                    required
                  />
                  <div>
                    <label className={smallLabelCls}>CEST</label>
                    <input
                      type="text"
                      value={form.cest}
                      onChange={(e) => set('cest', e.target.value)}
                      placeholder="Ex: 2800300"
                      className={smallInputCls}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className={smallLabelCls}>Cód. Serviço (LC116) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.cod_servico}
                    onChange={(e) => set('cod_servico', e.target.value)}
                    placeholder="Ex: 01.01"
                    className={smallInputCls}
                  />
                </div>
              )}
              <div>
                <label className={smallLabelCls}>Origem</label>
                <select
                  value={form.origem}
                  onChange={(e) => set('origem', e.target.value)}
                  className={smallSelectCls}
                >
                  {ORIGENS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {segmentos.length > 0 && (
                <div>
                  <label className={smallLabelCls}>Segmento <span className="text-gray-400 dark:text-gray-500 font-normal">(margem)</span></label>
                  <select
                    value={form.segmento}
                    onChange={(e) => set('segmento', e.target.value)}
                    className={smallSelectCls}
                  >
                    <option value="">—</option>
                    {segmentos.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
            {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar produto'}
          </button>
        </div>
      </div>
    </div>
  )
}
