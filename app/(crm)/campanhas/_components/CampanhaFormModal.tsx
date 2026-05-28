'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  type Campanha,
  TIPOS_CAMPANHA,
  PUBLICO_TIPOS,
} from './types'
import { useToast } from '@/app/(crm)/_components/Toast'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'

interface Props {
  campanha?: Campanha
  onClose: () => void
}

export default function CampanhaFormModal({ campanha, onClose }: Props) {
  const router    = useRouter()
  const toast     = useToast()
  const tenantId  = useTenantId()
  const isEditing = !!campanha

  const [form, setForm] = useState({
    titulo:           campanha?.titulo            ?? '',
    tipo:             campanha?.tipo              ?? 'email',
    publico_tipo:     campanha?.publico_tipo      ?? 'clientes',
    publico_segmento: campanha?.publico_segmento  ?? '',
    publico_status:   campanha?.publico_status    ?? '',
    assunto:          campanha?.assunto           ?? '',
    mensagem:         campanha?.mensagem          ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim())   { setError('Título é obrigatório');    return }
    if (!form.mensagem.trim()) { setError('Mensagem é obrigatória');  return }
    if (form.tipo === 'email' && !form.assunto.trim()) {
      setError('Assunto é obrigatório para campanhas de e-mail')
      return
    }
    setSaving(true); setError('')

    const supabase = createClient()
    const payload = {
      titulo:           form.titulo.trim(),
      tipo:             form.tipo,
      publico_tipo:     form.publico_tipo,
      publico_segmento: form.publico_segmento.trim() || null,
      publico_status:   form.publico_status    || null,
      assunto:          form.assunto.trim()    || null,
      mensagem:         form.mensagem.trim(),
    }

    const { error: err } = isEditing
      ? await supabase.from('campanhas').update(payload).eq('id', campanha!.id)
      : await supabase.from('campanhas').insert({ ...payload, tenant_id: tenantId, status: 'rascunho' })

    if (err) { setError(err.message); setSaving(false); return }

    toast(isEditing ? 'Campanha atualizada!' : 'Campanha criada!')
    router.refresh()
    onClose()
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl max-h-[92vh] flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar campanha' : 'Nova campanha'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">

            {/* Título */}
            <div>
              <label className={labelCls}>
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text" value={form.titulo} onChange={e => set('titulo', e.target.value)}
                autoFocus required placeholder="Ex: Black Friday 2026"
                className={inputCls}
              />
            </div>

            {/* Canal */}
            <div>
              <label className={labelCls}>Canal</label>
              <div className="flex gap-2">
                {TIPOS_CAMPANHA.map(t => (
                  <button
                    key={t.value} type="button" onClick={() => set('tipo', t.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.tipo === t.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Público */}
            <div>
              <label className={labelCls}>Público-alvo</label>
              <div className="grid grid-cols-3 gap-2">
                {PUBLICO_TIPOS.map(p => (
                  <button
                    key={p.value} type="button" onClick={() => set('publico_tipo', p.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      form.publico_tipo === p.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtros de público */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>
                  Filtrar por segmento
                  <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">(opcional)</span>
                </label>
                <input
                  type="text" value={form.publico_segmento} onChange={e => set('publico_segmento', e.target.value)}
                  placeholder="Ex: Máquinas, Peças..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Filtrar por status
                  <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">(opcional)</span>
                </label>
                <select
                  value={form.publico_status} onChange={e => set('publico_status', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os status</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
            </div>

            {/* Assunto (apenas email) */}
            {form.tipo === 'email' && (
              <div>
                <label className={labelCls}>
                  Assunto do e-mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" value={form.assunto} onChange={e => set('assunto', e.target.value)}
                  placeholder="Ex: Promoção especial para você!"
                  className={inputCls}
                />
              </div>
            )}

            {/* Mensagem */}
            <div>
              <label className={labelCls}>
                Mensagem <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.mensagem} onChange={e => set('mensagem', e.target.value)}
                rows={6}
                placeholder={form.tipo === 'email'
                  ? 'Conteúdo do e-mail...'
                  : 'Mensagem do WhatsApp. Use {nome} para personalizar.'}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Variáveis disponíveis: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{nome}'}</code>{' '}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{empresa}'}</code>
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
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
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar campanha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
