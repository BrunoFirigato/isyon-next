'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Building2, Phone, Mail, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import EmpresaFormModal from './EmpresaFormModal'
import type { Empresa } from './types'

interface Props { empresas: Empresa[] }

function maskCnpj(v: string) {
  return v.replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function EmpresasView({ empresas }: Props) {
  const router = useRouter()
  const toast  = useToast()

  const [formOpen,    setFormOpen]    = useState(false)
  const [editing,     setEditing]     = useState<Empresa | null>(null)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('empresas').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast('Erro ao excluir empresa', 'error'); return }
    toast('Empresa excluída', 'info')
    router.refresh()
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Filiais</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {empresas.length} filial{empresas.length !== 1 ? 's' : ''} cadastrada{empresas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nova filial</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>

      {/* Lista vazia */}
      {empresas.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm py-16 text-center">
          <Building2 size={32} className="mx-auto text-gray-200 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma filial cadastrada.</p>
          <button
            onClick={() => { setEditing(null); setFormOpen(true) }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Cadastrar primeira filial
          </button>
        </div>
      )}

      {/* Grid de cards */}
      {empresas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {empresas.map(e => {
            const cor = e.cor ?? '#1a56a0'
            const endereco = [e.cidade, e.estado].filter(Boolean).join(' / ')
            return (
              <div key={e.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden group"
              >
                {/* Barra de cor */}
                <div className="h-1.5" style={{ backgroundColor: cor }} />

                <div className="p-5">
                  {/* Topo: sigla + nome + ações */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar com cor da empresa */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: cor }}
                      >
                        {e.sigla.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{e.nome}</p>
                        {e.cnpj && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                            {maskCnpj(e.cnpj)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => { setEditing(e); setFormOpen(true) }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeletingId(e.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Infos de contato */}
                  <div className="space-y-1.5">
                    {e.telefone && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Phone size={11} className="text-gray-400 dark:text-gray-500 shrink-0" />
                        {e.telefone}
                      </div>
                    )}
                    {e.email && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Mail size={11} className="text-gray-400 dark:text-gray-500 shrink-0" />
                        <span className="truncate">{e.email}</span>
                      </div>
                    )}
                    {endereco && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin size={11} className="text-gray-400 dark:text-gray-500 shrink-0" />
                        {endereco}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir filial?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Esta ação não pode ser desfeita. Oportunidades, propostas e pedidos vinculados perderão o vínculo.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deletingId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <EmpresaFormModal
          empresa={editing ?? undefined}
          onClose={() => { setFormOpen(false); setEditing(null) }}
        />
      )}
    </>
  )
}
