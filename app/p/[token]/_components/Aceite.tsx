'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react'

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const dataBR = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

interface Props {
  token: string
  status: string
  aceitePor: string | null
  aceiteEm: string | null
  vencida: boolean
  total: number
  empresaNome: string
  cor: string
}

export default function Aceite({ token, status, aceitePor, aceiteEm, vencida, total, empresaNome, cor }: Props) {
  // Estado local reflete a resposta — depois de aceitar/recusar mostramos o resultado
  const [resultado, setResultado] = useState<'aprovada' | 'recusada' | null>(
    status === 'aprovada' ? 'aprovada' : status === 'recusada' ? 'recusada' : null,
  )
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState<'aceitar' | 'recusar' | null>(null)
  const [erro, setErro] = useState('')

  async function responder(action: 'aceitar' | 'recusar') {
    setLoading(action)
    setErro('')
    try {
      const res = await fetch(`/api/p/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, nome: nome.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.error ?? 'Não foi possível registrar sua resposta. Tente novamente.')
        return
      }
      setResultado(data.status === 'recusada' ? 'recusada' : 'aprovada')
    } catch {
      setErro('Falha de conexão. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  // ── Já respondida (ou acabou de responder) ──────────────────────────────
  if (resultado === 'aprovada') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
        <CheckCircle2 className="mx-auto text-green-600" size={40} />
        <p className="mt-2 text-base font-bold text-green-800">Proposta aceita!</p>
        <p className="text-sm text-green-700">
          {aceitePor ? `Aceita por ${aceitePor}` : 'Recebemos seu aceite'}
          {aceiteEm ? ` em ${dataBR(aceiteEm)}` : ''}. {empresaNome} foi notificada e dará sequência.
        </p>
      </div>
    )
  }
  if (resultado === 'recusada') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
        <XCircle className="mx-auto text-gray-400" size={40} />
        <p className="mt-2 text-base font-bold text-gray-700">Proposta recusada</p>
        <p className="text-sm text-gray-500">Obrigado pelo retorno. Qualquer coisa, fale com o responsável.</p>
      </div>
    )
  }

  // ── Vencida ─────────────────────────────────────────────────────────────
  if (vencida) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
        <Clock className="mx-auto text-amber-500" size={36} />
        <p className="mt-2 text-base font-bold text-amber-800">Proposta vencida</p>
        <p className="text-sm text-amber-700">Esta proposta expirou. Solicite uma atualização ao responsável.</p>
      </div>
    )
  }

  // ── Aguardando resposta ─────────────────────────────────────────────────
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <p className="text-sm text-gray-500">Valor total da proposta</p>
      <p className="text-2xl font-bold text-gray-900" style={{ color: cor }}>{brl(total)}</p>

      <div className="mt-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">Seu nome (opcional)</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Quem está aprovando?"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {erro && (
        <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" /> <span>{erro}</span>
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => responder('aceitar')}
          disabled={!!loading}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          {loading === 'aceitar' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          Aceitar proposta
        </button>
        <button
          onClick={() => responder('recusar')}
          disabled={!!loading}
          className="flex-1 sm:flex-none sm:px-5 inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60 font-medium py-3 rounded-xl text-sm transition-colors"
        >
          {loading === 'recusar' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
          Recusar
        </button>
      </div>
      <p className="mt-2 text-[11px] text-gray-400 text-center">Ao aceitar, você confirma os itens e valores acima.</p>
    </div>
  )
}
