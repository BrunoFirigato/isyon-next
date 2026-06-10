'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { vinculosCondPagamento, inativarRegistro, type Vinculo } from '@/lib/exclusao'
import BloqueioExclusaoDialog from '@/app/(crm)/_components/BloqueioExclusaoDialog'
import { type CondPagamento, formaLabel, formaStyle } from '@/app/(crm)/cadastros/_components/types'
import CondPagamentoFormModal from '@/app/(crm)/cadastros/_components/CondPagamentoFormModal'
import { useToast } from '@/app/(crm)/_components/Toast'

export default function CondicoesPagamentoView({ condPagamentos }: { condPagamentos: CondPagamento[] }) {
  const router = useRouter()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [edit, setEdit] = useState<CondPagamento | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bloqueio, setBloqueio] = useState<{ id: string; vinculos: Vinculo[] } | null>(null)
  const [inativando, setInativando] = useState(false)

  async function handleDelete() {
    if (!deletingId) return
    const supabase = createClient()
    const vinc = await vinculosCondPagamento(supabase, deletingId)
    if (vinc.length) { setBloqueio({ id: deletingId, vinculos: vinc }); setDeletingId(null); return }
    const { error } = await supabase.from('cond_pagamentos').delete().eq('id', deletingId)
    setDeletingId(null)
    if (error) { toast('Não foi possível excluir — há registros vinculados.', 'error'); return }
    toast('Condição de pagamento excluída', 'info')
    router.refresh()
  }

  async function handleInativar() {
    if (!bloqueio) return
    setInativando(true)
    const { error } = await inativarRegistro(createClient(), 'cond_pagamentos', bloqueio.id)
    setInativando(false); setBloqueio(null)
    if (error) { toast('Não foi possível inativar.', 'error'); return }
    toast('Condição de pagamento inativada', 'info')
    router.refresh()
  }

  const q = search.toLowerCase().trim()
  const lista = condPagamentos.filter(c => !q || c.nome.toLowerCase().includes(q) || formaLabel(c.forma).toLowerCase().includes(q))

  return (
    <>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Condições de Pagamento</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Formas e prazos usados nos pedidos</p>
        </div>
        <button onClick={() => { setEdit(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
          <Plus size={16} /> <span className="hidden sm:inline">Nova condição</span><span className="sm:hidden">Nova</span>
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
          className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"><X size={14} /></button>}
      </div>

      {lista.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhuma condição de pagamento cadastrada.</p>
          <button onClick={() => { setEdit(null); setFormOpen(true) }} className="mt-4 text-sm text-blue-600 hover:underline">Cadastrar a primeira</button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm hidden md:table">
            <thead><tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <Th>Nome</Th><Th>Forma</Th><Th>Parcelas</Th><Th>Intervalo</Th><Th>Desconto</Th><Th>Status</Th><th className="px-4 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {lista.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 group">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{c.nome}</p>
                    {c.obs && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-48">{c.obs}</p>}
                  </td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${formaStyle(c.forma)}`}>{formaLabel(c.forma)}</span></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.parcelas}x</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.intervalo > 0 ? `${c.intervalo} dias` : 'À vista'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.desconto && c.desconto > 0 ? `${c.desconto}%` : '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${c.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{c.ativo ? 'Ativa' : 'Inativa'}</span></td>
                  <td className="px-4 py-3"><Actions onEdit={() => { setEdit(c); setFormOpen(true) }} onDelete={() => setDeletingId(c.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {lista.map((c) => (
              <div key={c.id} className="p-4 flex items-start justify-between gap-2 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{c.nome}</p>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${formaStyle(c.forma)}`}>{formaLabel(c.forma)}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {c.parcelas}x{c.intervalo > 0 ? ` · ${c.intervalo} dias` : ' · À vista'}{c.desconto && c.desconto > 0 ? ` · ${c.desconto}% desconto` : ''}
                  </p>
                  {c.obs && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{c.obs}</p>}
                </div>
                <Actions onEdit={() => { setEdit(c); setFormOpen(true) }} onDelete={() => setDeletingId(c.id)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir condição de pagamento?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}

      <BloqueioExclusaoDialog
        vinculos={bloqueio?.vinculos ?? null}
        podeInativar
        inativando={inativando}
        onInativar={handleInativar}
        onClose={() => setBloqueio(null)}
      />

      {formOpen && <CondPagamentoFormModal cond={edit ?? undefined} onClose={() => { setFormOpen(false); setEdit(null) }} />}
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{children}</th>
}
function Actions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1 justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
      <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 dark:text-gray-500 hover:text-blue-600 transition-colors" title="Editar"><Pencil size={15} /></button>
      <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={15} /></button>
    </div>
  )
}
