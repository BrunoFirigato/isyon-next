'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Upload, Download, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react'
import { useToast } from './Toast'
import type { ParsedRow } from '@/lib/excel/parse'

type Modulo = 'clientes' | 'leads' | 'produtos'

interface Props {
  modulo:    Modulo
  onClose:   () => void
}

const LABELS: Record<Modulo, string> = {
  clientes: 'Clientes',
  leads:    'Leads',
  produtos: 'Produtos',
}

// Colunas exibidas no preview, por módulo
const PREVIEW_COLS: Record<Modulo, { key: string; label: string }[]> = {
  clientes: [{ key: 'nome', label: 'Nome' }, { key: 'empresa', label: 'Empresa' }, { key: 'email', label: 'E-mail' }, { key: 'telefone', label: 'Telefone' }],
  leads:    [{ key: 'nome', label: 'Nome' }, { key: 'empresa', label: 'Empresa' }, { key: 'email', label: 'E-mail' }, { key: 'telefone', label: 'Telefone' }],
  produtos: [{ key: 'nome', label: 'Nome' }, { key: 'codigo', label: 'Código' }, { key: 'custo', label: 'Custo' }, { key: 'preco', label: 'Preço' }],
}

export default function ImportModal({ modulo, onClose }: Props) {
  const router  = useRouter()
  const toast   = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  type Step = 'upload' | 'preview' | 'done'
  const [step,      setStep]      = useState<Step>('upload')
  const [loading,   setLoading]   = useState(false)
  const [rows,      setRows]      = useState<ParsedRow[]>([])
  const [summary,   setSummary]   = useState({ total: 0, validos: 0, invalidos: 0 })
  const [resultado, setResultado] = useState({ inseridos: 0, erros: [] as string[] })
  const [dragging,  setDragging]  = useState(false)

  const label = LABELS[modulo]

  // ── Baixar template ────────────────────────────────────────────────────────
  async function downloadTemplate() {
    const res  = await fetch(`/api/importar/${modulo}`)
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `template_${modulo}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Upload e parse ─────────────────────────────────────────────────────────
  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast('Formato inválido. Use .xlsx ou .csv', 'error'); return
    }
    setLoading(true)
    const form = new FormData()
    form.append('file', file)

    try {
      const res  = await fetch(`/api/importar/${modulo}`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erro ao processar arquivo', 'error'); return }
      setRows(data.rows)
      setSummary({ total: data.total, validos: data.validos, invalidos: data.invalidos })
      setStep('preview')
    } finally {
      setLoading(false)
    }
  }

  // ── Confirmar importação ───────────────────────────────────────────────────
  async function handleConfirmar() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/importar/${modulo}/confirmar`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rows: rows.filter(r => r.valido) }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erro na importação', 'error'); return }
      setResultado({ inseridos: data.inseridos, erros: data.erros ?? [] })
      setStep('done')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const validRows   = rows.filter(r => r.valido)
  const invalidRows = rows.filter(r => !r.valido)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl max-h-[90vh] flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Importar {label}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">

          {/* ── Step 1: Upload ──────────────────────────────────────────── */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Template download */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                <FileSpreadsheet size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Passo 1 — Baixe o template</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    Preencha com seus dados e faça o upload abaixo. Campos marcados com * são obrigatórios.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="mt-2 flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:text-blue-800 transition-colors"
                  >
                    <Download size={13} /> Baixar template_{modulo}.xlsx
                  </button>
                </div>
              </div>

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault(); setDragging(false)
                  const file = e.dataTransfer.files[0]
                  if (file) handleFile(file)
                }}
              >
                {loading ? (
                  <Loader2 size={28} className="mx-auto text-blue-500 animate-spin mb-2" />
                ) : (
                  <Upload size={28} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                )}
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {loading ? 'Processando arquivo...' : 'Arraste o arquivo ou clique para selecionar'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  .xlsx ou .csv — máximo 1.000 linhas
                </p>
              </div>
              <input
                ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>
          )}

          {/* ── Step 2: Preview ─────────────────────────────────────────── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="flex gap-3">
                <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.total}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total</p>
                </div>
                <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{summary.validos}</p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">Válidos</p>
                </div>
                {summary.invalidos > 0 && (
                  <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.invalidos}</p>
                    <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">Com erro</p>
                  </div>
                )}
              </div>

              {/* Linhas com erro */}
              {invalidRows.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-4">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} /> {invalidRows.length} linha{invalidRows.length > 1 ? 's' : ''} com erro (serão ignoradas)
                  </p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {invalidRows.map(r => (
                      <p key={r.linha} className="text-xs text-red-600 dark:text-red-400">
                        Linha {r.linha}: {r.erros.join(', ')}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview das linhas válidas */}
              {validRows.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                    Preview — primeiras 5 linhas válidas
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                          {PREVIEW_COLS[modulo].map(c => (
                            <th key={c.key} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">{c.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {validRows.slice(0, 5).map(r => (
                          <tr key={r.linha} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            {PREVIEW_COLS[modulo].map((c, ci) => (
                              <td key={c.key} className={`px-3 py-2 ${ci === 0 ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                                {r.dados[c.key] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {validRows.length > 5 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 text-center">
                      + {validRows.length - 5} registro{validRows.length - 5 > 1 ? 's' : ''} não exibido{validRows.length - 5 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Done ────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="text-center py-4">
              <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Importação concluída!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {resultado.inseridos} registro{resultado.inseridos !== 1 ? 's' : ''} importado{resultado.inseridos !== 1 ? 's' : ''} com sucesso.
              </p>
              {resultado.erros.length > 0 && (
                <div className="mt-3 text-left bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-3">
                  {resultado.erros.map((e, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3 shrink-0 border-t border-gray-100 dark:border-gray-700 pt-4">
          {step === 'done' ? (
            <button onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              Fechar
            </button>
          ) : (
            <>
              <button
                onClick={() => { if (step === 'preview') { setStep('upload'); setRows([]) } else onClose() }}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {step === 'preview' ? 'Voltar' : 'Cancelar'}
              </button>
              {step === 'preview' && validRows.length > 0 && (
                <button
                  onClick={handleConfirmar}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  {loading ? 'Importando...' : `Importar ${validRows.length} registro${validRows.length !== 1 ? 's' : ''}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
