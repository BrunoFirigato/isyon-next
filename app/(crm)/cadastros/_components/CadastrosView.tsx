'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  type Ncm, type NaturezaOperacao, type Cfop, type Transportadora, type CondPagamento,
  formatDate, formaLabel, formaStyle,
} from './types'
import NcmFormModal from './NcmFormModal'
import NaturezaFormModal from './NaturezaFormModal'
import CfopFormModal from './CfopFormModal'
import TransportadoraFormModal from './TransportadoraFormModal'
import CondPagamentoFormModal from './CondPagamentoFormModal'
import { useToast } from '@/app/(crm)/_components/Toast'

type Tab = 'ncm' | 'naturezas' | 'cfop' | 'transportadoras' | 'cond_pagamentos'

const TABS: { id: Tab; label: string }[] = [
  { id: 'ncm',             label: 'NCM' },
  { id: 'naturezas',       label: 'Natureza de Operação' },
  { id: 'cfop',            label: 'CFOP' },
  { id: 'transportadoras', label: 'Transportadoras' },
  { id: 'cond_pagamentos', label: 'Cond. de Pagamento' },
]

const TAB_LABEL: Record<Tab, string> = {
  ncm:             'NCM',
  naturezas:       'Natureza de Operação',
  cfop:            'CFOP',
  transportadoras: 'Transportadora',
  cond_pagamentos: 'Condição de Pagamento',
}

interface Props {
  ncms: Ncm[]
  naturezas: NaturezaOperacao[]
  cfops: Cfop[]
  transportadoras: Transportadora[]
  condPagamentos: CondPagamento[]
  activeTab: Tab
}

export default function CadastrosView({
  ncms, naturezas, cfops, transportadoras, condPagamentos, activeTab: initialTab,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const toast = useToast()

  const [tab, setTab] = useState<Tab>(initialTab)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingTable, setDeletingTable] = useState<string>('')

  const [editNcm, setEditNcm] = useState<Ncm | null>(null)
  const [editNatureza, setEditNatureza] = useState<NaturezaOperacao | null>(null)
  const [editCfop, setEditCfop] = useState<Cfop | null>(null)
  const [editTransp, setEditTransp] = useState<Transportadora | null>(null)
  const [editCond, setEditCond] = useState<CondPagamento | null>(null)

  function handleTabChange(t: Tab) {
    setTab(t)
    setSearch('')
    router.push(pathname + '?' + new URLSearchParams({ tab: t }).toString())
  }

  async function handleDelete() {
    if (!deletingId || !deletingTable) return
    const supabase = createClient()
    const { error } = await supabase.from(deletingTable).delete().eq('id', deletingId)
    setDeletingId(null)
    setDeletingTable('')
    if (error) { toast('Erro ao excluir', 'error'); return }
    toast('Registro excluído', 'info')
    router.refresh()
  }

  function openDelete(id: string, table: string) {
    setDeletingId(id)
    setDeletingTable(table)
  }

  const q = search.toLowerCase().trim()

  const filteredNcms      = ncms.filter((n) => !q || n.codigo.toLowerCase().includes(q) || n.descricao.toLowerCase().includes(q))
  const filteredNaturezas = naturezas.filter((n) => !q || n.codigo.toLowerCase().includes(q) || n.descricao.toLowerCase().includes(q))
  const filteredCfops     = cfops.filter((c) => !q || c.codigo.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q))
  const filteredTransps   = transportadoras.filter((t) => !q || t.nome.toLowerCase().includes(q) || (t.cnpj ?? '').toLowerCase().includes(q))
  const filteredConds     = condPagamentos.filter((c) => !q || c.nome.toLowerCase().includes(q) || (formaLabel(c.forma)).toLowerCase().includes(q))

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Cadastros</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Tabelas auxiliares para NF-e e fiscal</p>
        </div>
        <button
          onClick={() => {
            setEditNcm(null); setEditNatureza(null); setEditCfop(null)
            setEditTransp(null); setEditCond(null)
            setFormOpen(true)
          }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo {TAB_LABEL[tab]}</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === id
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={14} />
          </button>
        )}
      </div>

      {/* ─── Tab: NCM ─────────────────────────────────────────────────────────── */}
      {tab === 'ncm' && (
        filteredNcms.length === 0
          ? <EmptyState label="NCM" onNew={() => setFormOpen(true)} />
          : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm hidden md:table">
                <thead><tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <Th>Código</Th><Th>Descrição</Th><Th>Alíq. IPI</Th><Th>Unid. Trib.</Th><Th>Cadastro</Th><th className="px-4 py-3" />
                </tr></thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {filteredNcms.map((n) => (
                    <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 group">
                      <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-100">{n.codigo}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{n.descricao}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{n.aliq_ipi != null ? `${n.aliq_ipi}%` : '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{n.unid_trib ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{formatDate(n.created_at)}</td>
                      <td className="px-4 py-3"><Actions onEdit={() => { setEditNcm(n); setFormOpen(true) }} onDelete={() => openDelete(n.id, 'ncms')} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {filteredNcms.map((n) => (
                  <div key={n.id} className="p-4 flex items-start justify-between gap-2 group">
                    <div>
                      <p className="font-mono font-medium text-gray-900 dark:text-gray-100 text-sm">{n.codigo}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{n.descricao}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{n.aliq_ipi != null ? `IPI ${n.aliq_ipi}%` : ''}{n.unid_trib ? ` · ${n.unid_trib}` : ''}</p>
                    </div>
                    <Actions onEdit={() => { setEditNcm(n); setFormOpen(true) }} onDelete={() => openDelete(n.id, 'ncms')} />
                  </div>
                ))}
              </div>
            </div>
          )
      )}

      {/* ─── Tab: Naturezas ───────────────────────────────────────────────────── */}
      {tab === 'naturezas' && (
        filteredNaturezas.length === 0
          ? <EmptyState label="Natureza de Operação" onNew={() => setFormOpen(true)} />
          : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm hidden md:table">
                <thead><tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <Th>Código</Th><Th>Descrição</Th><Th>CFOP</Th><Th>Tipo</Th><Th>Chave</Th><th className="px-4 py-3" />
                </tr></thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {filteredNaturezas.map((n) => (
                    <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 group">
                      <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-100">{n.codigo}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{n.descricao}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{n.cfop ?? '—'}</td>
                      <td className="px-4 py-3">
                        {n.tipo ? <span className={`text-xs font-medium px-2 py-0.5 rounded-lg capitalize ${n.tipo === 'saida' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{n.tipo === 'saida' ? 'Saída' : 'Entrada'}</span> : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs font-mono">{n.chave ?? '—'}</td>
                      <td className="px-4 py-3"><Actions onEdit={() => { setEditNatureza(n); setFormOpen(true) }} onDelete={() => openDelete(n.id, 'naturezas_operacao')} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {filteredNaturezas.map((n) => (
                  <div key={n.id} className="p-4 flex items-start justify-between gap-2 group">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-medium text-gray-900 dark:text-gray-100 text-sm">{n.codigo}</p>
                        {n.tipo && <span className={`text-xs font-medium px-1.5 py-0.5 rounded capitalize ${n.tipo === 'saida' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{n.tipo === 'saida' ? 'Saída' : 'Entrada'}</span>}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{n.descricao}</p>
                      {n.cfop && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">CFOP {n.cfop}</p>}
                    </div>
                    <Actions onEdit={() => { setEditNatureza(n); setFormOpen(true) }} onDelete={() => openDelete(n.id, 'naturezas_operacao')} />
                  </div>
                ))}
              </div>
            </div>
          )
      )}

      {/* ─── Tab: CFOP ────────────────────────────────────────────────────────── */}
      {tab === 'cfop' && (
        filteredCfops.length === 0
          ? <EmptyState label="CFOP" onNew={() => setFormOpen(true)} />
          : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm hidden md:table">
                <thead><tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <Th>Código</Th><Th>Descrição</Th><Th>Tipo</Th><Th>CSOSN</Th><Th>CST ICMS</Th><Th>Status</Th><th className="px-4 py-3" />
                </tr></thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {filteredCfops.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 group">
                      <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-100">{c.codigo}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.descricao}</td>
                      <td className="px-4 py-3">
                        {c.tipo ? <span className={`text-xs font-medium px-2 py-0.5 rounded-lg capitalize ${c.tipo === 'saida' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{c.tipo === 'saida' ? 'Saída' : 'Entrada'}</span> : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{c.csosn ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{c.cst_icms ?? '—'}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${c.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{c.ativo ? 'Ativo' : 'Inativo'}</span></td>
                      <td className="px-4 py-3"><Actions onEdit={() => { setEditCfop(c); setFormOpen(true) }} onDelete={() => openDelete(c.id, 'cfops')} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {filteredCfops.map((c) => (
                  <div key={c.id} className="p-4 flex items-start justify-between gap-2 group">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-medium text-gray-900 dark:text-gray-100 text-sm">{c.codigo}</p>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${c.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{c.ativo ? 'Ativo' : 'Inativo'}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{c.descricao}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{c.tipo ? (c.tipo === 'saida' ? 'Saída' : 'Entrada') : ''}{c.csosn ? ` · CSOSN ${c.csosn}` : ''}</p>
                    </div>
                    <Actions onEdit={() => { setEditCfop(c); setFormOpen(true) }} onDelete={() => openDelete(c.id, 'cfops')} />
                  </div>
                ))}
              </div>
            </div>
          )
      )}

      {/* ─── Tab: Transportadoras ─────────────────────────────────────────────── */}
      {tab === 'transportadoras' && (
        filteredTransps.length === 0
          ? <EmptyState label="Transportadora" onNew={() => setFormOpen(true)} />
          : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm hidden md:table">
                <thead><tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <Th>Nome</Th><Th>CNPJ</Th><Th>Contato</Th><Th>Telefone</Th><Th>E-mail</Th><th className="px-4 py-3" />
                </tr></thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {filteredTransps.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 group">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{t.nome}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{t.cnpj ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.contato ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.telefone ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.email ?? '—'}</td>
                      <td className="px-4 py-3"><Actions onEdit={() => { setEditTransp(t); setFormOpen(true) }} onDelete={() => openDelete(t.id, 'transportadoras')} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {filteredTransps.map((t) => (
                  <div key={t.id} className="p-4 flex items-start justify-between gap-2 group">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{t.nome}</p>
                      {t.cnpj && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{t.cnpj}</p>}
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 space-y-0.5">
                        {t.contato && <p>{t.contato}</p>}
                        {t.telefone && <p>{t.telefone}</p>}
                      </div>
                    </div>
                    <Actions onEdit={() => { setEditTransp(t); setFormOpen(true) }} onDelete={() => openDelete(t.id, 'transportadoras')} />
                  </div>
                ))}
              </div>
            </div>
          )
      )}

      {/* ─── Tab: Condições de Pagamento ──────────────────────────────────────── */}
      {tab === 'cond_pagamentos' && (
        filteredConds.length === 0
          ? <EmptyState label="Condição de Pagamento" onNew={() => setFormOpen(true)} />
          : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm hidden md:table">
                <thead><tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <Th>Nome</Th><Th>Forma</Th><Th>Parcelas</Th><Th>Intervalo</Th><Th>Desconto</Th><Th>Status</Th><th className="px-4 py-3" />
                </tr></thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {filteredConds.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 group">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{c.nome}</p>
                        {c.obs && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-48">{c.obs}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${formaStyle(c.forma)}`}>
                          {formaLabel(c.forma)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {c.parcelas}x
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {c.intervalo > 0 ? `${c.intervalo} dias` : 'À vista'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {c.desconto && c.desconto > 0 ? `${c.desconto}%` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${c.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                          {c.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Actions onEdit={() => { setEditCond(c); setFormOpen(true) }} onDelete={() => openDelete(c.id, 'cond_pagamentos')} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {filteredConds.map((c) => (
                  <div key={c.id} className="p-4 flex items-start justify-between gap-2 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{c.nome}</p>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${formaStyle(c.forma)}`}>
                          {formaLabel(c.forma)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {c.parcelas}x
                        {c.intervalo > 0 ? ` · ${c.intervalo} dias` : ' · À vista'}
                        {c.desconto && c.desconto > 0 ? ` · ${c.desconto}% desconto` : ''}
                      </p>
                      {c.obs && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{c.obs}</p>}
                    </div>
                    <Actions onEdit={() => { setEditCond(c); setFormOpen(true) }} onDelete={() => openDelete(c.id, 'cond_pagamentos')} />
                  </div>
                ))}
              </div>
            </div>
          )
      )}

      {/* ─── Modal: Confirmar exclusão ────────────────────────────────────────── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Excluir registro?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modais de formulário ─────────────────────────────────────────────── */}
      {formOpen && tab === 'ncm' && (
        <NcmFormModal ncm={editNcm ?? undefined} onClose={() => { setFormOpen(false); setEditNcm(null) }} />
      )}
      {formOpen && tab === 'naturezas' && (
        <NaturezaFormModal natureza={editNatureza ?? undefined} onClose={() => { setFormOpen(false); setEditNatureza(null) }} />
      )}
      {formOpen && tab === 'cfop' && (
        <CfopFormModal cfop={editCfop ?? undefined} onClose={() => { setFormOpen(false); setEditCfop(null) }} />
      )}
      {formOpen && tab === 'transportadoras' && (
        <TransportadoraFormModal transportadora={editTransp ?? undefined} onClose={() => { setFormOpen(false); setEditTransp(null) }} />
      )}
      {formOpen && tab === 'cond_pagamentos' && (
        <CondPagamentoFormModal cond={editCond ?? undefined} onClose={() => { setFormOpen(false); setEditCond(null) }} />
      )}
    </>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
      {children}
    </th>
  )
}

function Actions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1 justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
      <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 dark:text-gray-500 hover:text-blue-600 transition-colors" title="Editar">
        <Pencil size={15} />
      </button>
      <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors" title="Excluir">
        <Trash2 size={15} />
      </button>
    </div>
  )
}

function EmptyState({ label, onNew }: { label: string; onNew: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center">
      <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum(a) {label} cadastrado(a).</p>
      <button onClick={onNew} className="mt-4 text-sm text-blue-600 hover:underline">Cadastrar primeiro(a)</button>
    </div>
  )
}
