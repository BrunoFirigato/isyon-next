'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Transportadora } from '@/app/(crm)/cadastros/_components/types'
import TransportadoraFormModal from '@/app/(crm)/cadastros/_components/TransportadoraFormModal'
import { useToast } from '@/app/(crm)/_components/Toast'

export default function TransportadorasView({ transportadoras }: { transportadoras: Transportadora[] }) {
  const router = useRouter()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [edit, setEdit] = useState<Transportadora | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete() {
    if (!deletingId) return
    const { error } = await createClient().from('transportadoras').delete().eq('id', deletingId)
    setDeletingId(null)
    if (error) { toast('Não foi possível excluir — há registros vinculados.', 'error'); return }
    toast('Transportadora excluída', 'info')
    router.refresh()
  }

  const q = search.toLowerCase().trim()
  const lista = transportadoras.filter(t => !q || t.nome.toLowerCase().includes(q) || (t.cnpj ?? '').toLowerCase().includes(q))

  return (
    <>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Transportadoras</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Cadastro de transportadoras para o frete dos pedidos</p>
        </div>
        <button onClick={() => { setEdit(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
          <Plus size={16} /> <span className="hidden sm:inline">Nova transportadora</span><span className="sm:hidden">Nova</span>
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
          <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhuma transportadora cadastrada.</p>
          <button onClick={() => { setEdit(null); setFormOpen(true) }} className="mt-4 text-sm text-blue-600 hover:underline">Cadastrar a primeira</button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm hidden md:table">
            <thead><tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <Th>Nome</Th><Th>CNPJ</Th><Th>Contato</Th><Th>Telefone</Th><Th>E-mail</Th><th className="px-4 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {lista.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 group">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{t.nome}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{t.cnpj ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.contato ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.telefone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.email ?? '—'}</td>
                  <td className="px-4 py-3"><Actions onEdit={() => { setEdit(t); setFormOpen(true) }} onDelete={() => setDeletingId(t.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {lista.map((t) => (
              <div key={t.id} className="p-4 flex items-start justify-between gap-2 group">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{t.nome}</p>
                  {t.cnpj && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{t.cnpj}</p>}
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 space-y-0.5">
                    {t.contato && <p>{t.contato}</p>}
                    {t.telefone && <p>{t.telefone}</p>}
                  </div>
                </div>
                <Actions onEdit={() => { setEdit(t); setFormOpen(true) }} onDelete={() => setDeletingId(t.id)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir transportadora?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {formOpen && <TransportadoraFormModal transportadora={edit ?? undefined} onClose={() => { setFormOpen(false); setEdit(null) }} />}
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
