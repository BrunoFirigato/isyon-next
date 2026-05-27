'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Lancamento, CATEGORIAS_RECEITA, CATEGORIAS_DESPESA } from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'

interface Props {
  lancamento?: Lancamento
  onClose: () => void
}

export default function LancamentoFormModal({ lancamento, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const tenantId = useTenantId()
  const isEditing = !!lancamento

  const [tipo, setTipo] = useState(lancamento?.tipo ?? 'receita')
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '')
  const [valor, setValor] = useState(lancamento?.valor?.toString() ?? '')
  const [data, setData] = useState(lancamento?.data?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [categoria, setCategoria] = useState(lancamento?.categoria ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const categorias = tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valor || Number(valor) <= 0) {
      setError('Informe um valor válido.')
      return
    }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const payload = {
      tipo,
      descricao: descricao.trim(),
      valor: Number(valor),
      data,
      categoria: categoria || null,
    }

    const { error: err } = isEditing
      ? await supabase.from('lancamentos').update(payload).eq('id', lancamento!.id)
      : await supabase.from('lancamentos').insert({ ...payload, tenant_id: tenantId })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    toast(isEditing ? 'Lançamento atualizado!' : 'Lançamento criado!')
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[94vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar lançamento' : 'Novo lançamento'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2">
              {(['receita', 'despesa'] as const).map((t) => (
                <button
                  key={t} type="button" onClick={() => { setTipo(t); setCategoria('') }}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    tipo === t
                      ? t === 'receita'
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-red-600 border-red-600 text-white'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t === 'receita' ? 'Receita' : 'Despesa'}
                </button>
              ))}
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Descrição <span className="text-red-500">*</span>
              </label>
              <input
                type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)}
                required placeholder="Ex: Pagamento de fatura #123"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Valor */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Valor (R$) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="0.01" step="0.01" value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Data */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Data</label>
                <input
                  type="date" value={data} onChange={(e) => setData(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Categoria</label>
              <select
                value={categoria} onChange={(e) => setCategoria(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecione...</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="px-5 pb-5 flex gap-3 shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
