'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Smartphone, Trash2, QrCode, RefreshCw, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'

interface Numero {
  id: string
  nome: string
  numero: string | null
  instance_name: string
  status: string
  vendedor_id: string | null
  ativo: boolean
  estado: string | null
}
interface VendedorRef { id: string; nome: string }

const STATUS_INFO: Record<string, { label: string; cls: string; dot: string }> = {
  conectado:    { label: 'Conectado',    cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500' },
  pareando:     { label: 'Aguardando',   cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',         dot: 'bg-amber-500' },
  desconectado: { label: 'Desconectado', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',                dot: 'bg-gray-400' },
}

export default function WhatsAppNumerosView() {
  const toast = useToast()
  const [numeros, setNumeros] = useState<Numero[]>([])
  const [vendedores, setVendedores] = useState<VendedorRef[]>([])
  const [loading, setLoading] = useState(true)
  const [evolutionOk, setEvolutionOk] = useState(true)

  const [addOpen, setAddOpen] = useState(false)
  const [addNome, setAddNome] = useState('')
  const [addNumero, setAddNumero] = useState('')
  const [addVendedor, setAddVendedor] = useState('')
  const [adding, setAdding] = useState(false)

  const [qr, setQr] = useState<{ id: string; base64: string | null } | null>(null)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const carregar = useCallback(async () => {
    const res = await fetch('/api/whatsapp/instancias')
    const data = await res.json()
    if (res.ok) { setNumeros(data.numeros ?? []); setEvolutionOk(data.evolutionConfigurada) }
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
    const supabase = createClient()
    supabase.from('vendedores').select('id, nome').eq('status', 'ativo').order('nome')
      .then(({ data }) => { if (data) setVendedores(data) })
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [carregar])

  function pararPoll() { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }

  // Enquanto o QR está aberto, verifica a conexão a cada 3s
  function iniciarPoll(id: string) {
    pararPoll()
    let tentativas = 0
    pollRef.current = setInterval(async () => {
      tentativas++
      const res = await fetch('/api/whatsapp/instancias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status', id }) })
      const d = await res.json()
      if (d.status === 'conectado') {
        pararPoll(); setQr(null); toast('Número conectado! 🎉'); carregar()
      } else if (tentativas > 40) { // ~2 min
        pararPoll()
      }
    }, 3000)
  }

  async function adicionar() {
    if (!addNome.trim()) { toast('Informe um nome.', 'error'); return }
    setAdding(true)
    const res = await fetch('/api/whatsapp/instancias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'criar', nome: addNome, numero: addNumero, vendedor_id: addVendedor }) })
    const d = await res.json()
    setAdding(false)
    if (!res.ok) { toast(d.error ?? 'Erro ao criar número', 'error'); return }
    setAddOpen(false); setAddNome(''); setAddNumero(''); setAddVendedor('')
    await carregar()
    setQr({ id: d.id, base64: d.qrBase64 ?? null })
    iniciarPoll(d.id)
  }

  async function reconectar(id: string) {
    setQr({ id, base64: null })
    const res = await fetch('/api/whatsapp/instancias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'conectar', id }) })
    const d = await res.json()
    if (!res.ok || !d.qrBase64) { toast(d.error ?? 'Não foi possível gerar o QR.', 'error'); setQr(null); return }
    setQr({ id, base64: d.qrBase64 })
    iniciarPoll(id)
  }

  async function atualizar(id: string, patch: Record<string, unknown>) {
    setNumeros(prev => prev.map(n => n.id === id ? { ...n, ...patch } as Numero : n))
    await fetch('/api/whatsapp/instancias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'atualizar', id, ...patch }) })
  }

  async function remover(id: string) {
    setRemovendo(null)
    await fetch('/api/whatsapp/instancias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remover', id }) })
    toast('Número removido', 'info')
    carregar()
  }

  const qrSrc = qr?.base64 ? (qr.base64.startsWith('data:') ? qr.base64 : `data:image/png;base64,${qr.base64}`) : null

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Link href="/integracoes" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Números de WhatsApp</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 ml-7">Conecte e gerencie vários números pelo WhatsApp (Evolution API).</p>

      {!evolutionOk && (
        <div className="mb-4 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg px-4 py-3">
          Configure a <Link href="/integracoes" className="font-medium underline">Evolution API em Integrações</Link> antes de adicionar números.
        </div>
      )}

      <div className="flex justify-end mb-3">
        <button onClick={() => setAddOpen(true)} disabled={!evolutionOk}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
          <Plus size={15} /> Adicionar número
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><Loader2 size={22} className="animate-spin mx-auto" /></div>
      ) : numeros.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm py-14 text-center">
          <Smartphone size={30} className="mx-auto text-gray-200 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum número conectado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {numeros.map(n => {
            const st = STATUS_INFO[n.status] ?? STATUS_INFO.desconectado
            return (
              <div key={n.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 shrink-0">
                      <Smartphone size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{n.nome}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{n.numero || 'sem número informado'}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full shrink-0 ${st.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <select
                    value={n.vendedor_id ?? ''}
                    onChange={(e) => atualizar(n.id, { vendedor_id: e.target.value || null })}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sem responsável</option>
                    {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                  </select>

                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={n.ativo} onChange={(e) => atualizar(n.id, { ativo: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    Ativo
                  </label>

                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => reconectar(n.id)} title={n.status === 'conectado' ? 'Reconectar' : 'Conectar (QR)'}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 transition-colors">
                      {n.status === 'conectado' ? <RefreshCw size={13} /> : <QrCode size={13} />}
                      {n.status === 'conectado' ? 'Reconectar' : 'Conectar'}
                    </button>
                    <button onClick={() => setRemovendo(n.id)} title="Remover"
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal adicionar */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !adding && setAddOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Adicionar número</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nome / apelido <span className="text-red-500">*</span></label>
                <input value={addNome} onChange={e => setAddNome(e.target.value)} autoFocus placeholder="Ex: Comercial, João, Suporte"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Telefone (opcional)</label>
                <input value={addNumero} onChange={e => setAddNumero(e.target.value)} placeholder="Ex: 5511999999999"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Responsável (opcional)</label>
                <select value={addVendedor} onChange={e => setAddVendedor(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sem responsável</option>
                  {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button onClick={() => setAddOpen(false)} disabled={adding} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 disabled:opacity-60">Cancelar</button>
              <button onClick={adicionar} disabled={adding} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">{adding ? 'Criando...' : 'Criar e conectar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR */}
      {qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { pararPoll(); setQr(null) }} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-xs shadow-xl text-center">
            <button onClick={() => { pararPoll(); setQr(null) }} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Conectar WhatsApp</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">No celular: WhatsApp → Aparelhos conectados → Conectar um aparelho → escaneie o código.</p>
            <div className="bg-white rounded-xl p-3 inline-block border border-gray-100">
              {qrSrc
                ? <img src={qrSrc} alt="QR Code" className="w-52 h-52" />  // eslint-disable-line @next/next/no-img-element
                : <div className="w-52 h-52 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-gray-300" /></div>}
            </div>
            <p className="text-xs text-gray-400 mt-4 flex items-center justify-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Aguardando leitura...</p>
          </div>
        </div>
      )}

      {/* Confirmar remoção */}
      {removendo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRemovendo(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Remover número?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">A instância será desconectada e removida do servidor. As conversas já registradas permanecem.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setRemovendo(null)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200">Cancelar</button>
              <button onClick={() => remover(removendo)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
