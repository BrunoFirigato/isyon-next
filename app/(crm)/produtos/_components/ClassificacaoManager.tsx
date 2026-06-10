'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTenantId } from '@/app/(crm)/_components/TenantContext'
import { useToast } from '@/app/(crm)/_components/Toast'
import { type Classificacao } from './types'

/** CRUD enxuto de uma classificação de produto (Categorias / Famílias). */
export default function ClassificacaoManager({ tabela, singular, items }: {
  tabela: 'categorias' | 'familias'
  singular: string
  items: Classificacao[]
}) {
  const router = useRouter()
  const tenantId = useTenantId()
  const toast = useToast()
  const [novo, setNovo] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const low = singular.toLowerCase()

  async function criar() {
    const nome = novo.trim()
    if (!nome) return
    setBusy(true)
    const { error } = await createClient().from(tabela).insert({ tenant_id: tenantId, nome })
    setBusy(false)
    if (error) { toast('Erro ao criar', 'error'); return }
    setNovo(''); toast(`${singular} criada!`); router.refresh()
  }

  async function salvarEdit() {
    const nome = editNome.trim()
    if (!nome || !editId) return
    setBusy(true)
    const { error } = await createClient().from(tabela).update({ nome }).eq('id', editId)
    setBusy(false)
    if (error) { toast('Erro ao salvar', 'error'); return }
    setEditId(null); router.refresh()
  }

  async function excluir() {
    if (!deletingId) return
    setBusy(true)
    const { error } = await createClient().from(tabela).delete().eq('id', deletingId)
    setBusy(false); setDeletingId(null)
    if (error) { toast(`Não foi possível excluir — pode estar em uso por produtos.`, 'error'); return }
    toast(`${singular} excluída`, 'info'); router.refresh()
  }

  const inputCls = 'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="max-w-xl">
      {/* Adicionar */}
      <div className="flex gap-2 mb-4">
        <input value={novo} onChange={e => setNovo(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') criar() }}
          placeholder={`Nova ${low}...`} className={`flex-1 ${inputCls}`} />
        <button onClick={criar} disabled={busy || !novo.trim()}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors shrink-0">
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-12 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma {low} cadastrada.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700 overflow-hidden">
          {items.map(it => (
            <div key={it.id} className="flex items-center gap-2 px-4 py-2.5 group">
              {editId === it.id ? (
                <>
                  <input value={editNome} onChange={e => setEditNome(e.target.value)} autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') salvarEdit(); if (e.key === 'Escape') setEditId(null) }}
                    className={`flex-1 ${inputCls} py-1`} />
                  <button onClick={salvarEdit} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"><Check size={16} /></button>
                  <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={16} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{it.nome}</span>
                  <button onClick={() => { setEditId(it.id); setEditNome(it.nome) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={14} /></button>
                  <button onClick={() => setDeletingId(it.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir {low}?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Produtos vinculados ficam sem {low}.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={excluir} disabled={busy} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
