'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Produto, UNIDADES, ORIGENS } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'

interface Props {
  produto?: Produto
  onClose: () => void
}

export default function ProdutoFormModal({ produto, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const isEditing = !!produto

  const [form, setForm] = useState({
    codigo:      produto?.codigo ?? '',
    nome:        produto?.nome ?? '',
    tipo:        produto?.tipo ?? 'produto',
    unidade:     produto?.unidade ?? 'un',
    preco:       produto?.preco != null ? String(produto.preco) : '',
    custo:       produto?.custo != null ? String(produto.custo) : '',
    descricao:   produto?.descricao ?? '',
    ncm:         produto?.ncm ?? '',
    cod_servico: produto?.cod_servico ?? '',
    cest:        produto?.cest ?? '',
    origem:      produto?.origem != null ? String(produto.origem) : '0',
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }

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

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl shadow-xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar produto' : 'Novo produto'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
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
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Código</label>
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => set('codigo', e.target.value)}
                placeholder="001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Nome do produto ou serviço"
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Preço + Custo + Unidade + Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Preço (R$)</label>
              <input
                type="text"
                value={form.preco}
                onChange={(e) => set('preco', e.target.value)}
                placeholder="0,00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Custo (R$)</label>
              <input
                type="text"
                value={form.custo}
                onChange={(e) => set('custo', e.target.value)}
                placeholder="0,00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Unidade</label>
              <select
                value={form.unidade}
                onChange={(e) => set('unidade', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select
                value={form.ativo ? 'true' : 'false'}
                onChange={(e) => set('ativo', e.target.value === 'true')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
              placeholder="Descrição complementar..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Campos fiscais */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dados fiscais</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">NCM</label>
                <input
                  type="text"
                  value={form.ncm}
                  onChange={(e) => set('ncm', e.target.value)}
                  placeholder="Ex: 84729021"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {!isServico && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">CEST</label>
                  <input
                    type="text"
                    value={form.cest}
                    onChange={(e) => set('cest', e.target.value)}
                    placeholder="Ex: 2800300"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              {isServico && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Cód. Serviço (LC116)</label>
                  <input
                    type="text"
                    value={form.cod_servico}
                    onChange={(e) => set('cod_servico', e.target.value)}
                    placeholder="Ex: 01.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className={isServico ? 'col-span-1' : 'col-span-2 sm:col-span-1'}>
                <label className="block text-xs text-gray-600 mb-1">Origem</label>
                <select
                  value={form.origem}
                  onChange={(e) => set('origem', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {ORIGENS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
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
