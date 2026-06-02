'use client'

import { useState, useEffect } from 'react'
import { X, FileText, Loader2, Eye, Info, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'
import { type Pedido, brl } from './types'

interface Props {
  pedido:  Pedido
  onClose: () => void
}

interface NaturezaRef { id: string; codigo: string; descricao: string; cfop: string | null; chave: string | null }
interface ProdutoRef  { nome: string; ncm: string | null; unidade: string | null; origem: number | null; tipo: string | null }

interface ItemFiscalUI {
  descricao:     string
  quantidade:    number
  valorUnitario: number
  ncm:           string
  cfop:          string
  unidade:       string
  origem:        string
  tipo:          'produto' | 'servico'
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

/** Abre um PDF (base64) numa nova aba. */
function abrirPdfBase64(base64: string) {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export default function EmitirNFeModal({ pedido, onClose }: Props) {
  const toast = useToast()

  const [numero,   setNumero]   = useState('')
  const [serie,    setSerie]    = useState('1')
  const [data,     setData]     = useState(hoje())
  const [natId,    setNatId]    = useState('')
  const [dadosAd,  setDadosAd]  = useState(`Referente ao pedido ${pedido.numero ?? ''}.`)
  const [itens,    setItens]    = useState<ItemFiscalUI[]>([])

  const [naturezas, setNaturezas] = useState<NaturezaRef[]>([])
  const [previewing, setPreviewing] = useState(false)

  // Carrega naturezas + produtos e monta os itens fiscais
  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('naturezas_operacao').select('id, codigo, descricao, cfop, chave').order('codigo'),
      supabase.from('produtos').select('nome, ncm, unidade, origem, tipo'),
    ]).then(([{ data: nats }, { data: prods }]) => {
      if (nats) setNaturezas(nats as NaturezaRef[])
      const produtos = (prods ?? []) as ProdutoRef[]

      const base = (pedido.itens ?? []).map(it => {
        // Auto-match por nome do produto (case-insensitive)
        const match = produtos.find(p =>
          p.nome?.trim().toLowerCase() === it.descricao?.trim().toLowerCase()
        )
        return {
          descricao:     it.descricao,
          quantidade:    it.quantidade,
          valorUnitario: it.valorUnitario,
          ncm:           match?.ncm ?? '',
          cfop:          '5102',
          unidade:       match?.unidade ?? 'UN',
          origem:        match?.origem != null ? String(match.origem) : '0',
          tipo:          (match?.tipo === 'servico' ? 'servico' : 'produto') as 'produto' | 'servico',
        }
      })
      setItens(base)
    })
  }, [pedido])

  function setItem(idx: number, field: keyof ItemFiscalUI, value: string) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  // Ao trocar a natureza, aplica o CFOP padrão dela a todos os itens
  function onNaturezaChange(id: string) {
    setNatId(id)
    const nat = naturezas.find(n => n.id === id)
    if (nat?.cfop) {
      setItens(prev => prev.map(it => ({ ...it, cfop: nat.cfop! })))
    }
  }

  const natureza = naturezas.find(n => n.id === natId)

  // Validações
  const alertas: string[] = []
  if (!pedido.aprovado) alertas.push('Pedido aguardando aprovação do gestor — só é possível emitir após a liberação.')
  if (!pedido.empresa_id) alertas.push('Pedido sem filial emissora — edite o pedido e selecione a filial.')
  if (!pedido.cliente_id) alertas.push('Pedido sem cliente vinculado.')
  const itensSemNcm = itens.filter(it => it.tipo === 'produto' && !it.ncm.trim()).length
  if (itensSemNcm > 0) alertas.push(`${itensSemNcm} item(ns) sem NCM. Preencha antes de emitir.`)

  async function handlePreview() {
    if (!numero.trim()) { toast('Informe o número da NF', 'error'); return }
    if (!natureza)      { toast('Selecione a natureza de operação', 'error'); return }
    if (itensSemNcm > 0){ toast('Há itens sem NCM', 'error'); return }

    setPreviewing(true)
    try {
      const res = await fetch('/api/nfe/previsualizar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId:        pedido.id,
          numero, serie, data,
          naturezaOp:      natureza.descricao,
          dadosAdicionais: dadosAd,
          itens,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        toast(json.error ?? 'Falha na pré-visualização', 'error')
        return
      }
      if (json.danfeBase64) {
        abrirPdfBase64(json.danfeBase64)
        toast('DANFE de pré-visualização gerado!')
      } else {
        toast('Pré-visualização OK, mas sem PDF retornado.', 'info')
      }
    } catch {
      toast('Erro ao conectar com a BrasilNFe', 'error')
    } finally {
      setPreviewing(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5'
  const cellCls  = 'border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl max-h-[94vh] flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            Emitir NF-e — {pedido.numero}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Número / Série / Data */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Número da NF <span className="text-red-500">*</span></label>
              <input type="number" min="1" value={numero} onChange={e => setNumero(e.target.value)} placeholder="1" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Série</label>
              <input value={serie} onChange={e => setSerie(e.target.value)} maxLength={3} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Data de emissão</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Natureza */}
          <div>
            <label className={labelCls}>Natureza de operação <span className="text-red-500">*</span></label>
            <select value={natId} onChange={e => onNaturezaChange(e.target.value)} className={inputCls}>
              <option value="">Selecione...</option>
              {naturezas.map(n => (
                <option key={n.id} value={n.id}>{n.codigo} — {n.descricao}</option>
              ))}
            </select>
            {naturezas.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Nenhuma natureza cadastrada. Cadastre em Cadastros → Naturezas de Operação.
              </p>
            )}
          </div>

          {/* Itens fiscais */}
          <div>
            <label className={labelCls}>Itens — confira NCM e CFOP</label>
            <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_70px_90px] gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Descrição</span>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">NCM</span>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">CFOP</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-600">
                {itens.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_70px_90px] gap-2 items-center px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{it.descricao}</p>
                      <p className="text-[11px] text-gray-400">{it.quantidade} × {brl(it.valorUnitario)}</p>
                    </div>
                    <input
                      value={it.ncm} onChange={e => setItem(idx, 'ncm', e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="00000000"
                      className={`${cellCls} ${it.tipo === 'produto' && !it.ncm ? 'border-amber-400' : ''}`}
                    />
                    <input value={it.cfop} onChange={e => setItem(idx, 'cfop', e.target.value.replace(/\D/g, '').slice(0, 4))} className={cellCls} />
                  </div>
                ))}
                {itens.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">Pedido sem itens.</p>
                )}
              </div>
            </div>
          </div>

          {/* Dados adicionais */}
          <div>
            <label className={labelCls}>Dados adicionais <span className="text-gray-400 font-normal">(NF-e)</span></label>
            <textarea value={dadosAd} onChange={e => setDadosAd(e.target.value)} rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* Validações */}
          {alertas.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg p-3 space-y-1">
              {alertas.map((a, i) => (
                <p key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {a}
                </p>
              ))}
            </div>
          )}

          {/* Aviso preview */}
          <div className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
            <Info size={13} className="mt-0.5 shrink-0" />
            A pré-visualização gera o DANFE <strong>sem transmitir à SEFAZ</strong> — para conferência antes da emissão real.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button onClick={handlePreview} disabled={previewing || alertas.length > 0}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
            {previewing ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
            {previewing ? 'Gerando...' : 'Pré-visualizar DANFE'}
          </button>
        </div>
      </div>
    </div>
  )
}
