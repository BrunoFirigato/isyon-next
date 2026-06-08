'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Loader2 } from 'lucide-react'
import { useToast } from '@/app/(crm)/_components/Toast'

/** Atalho "Importar do Omie" para as telas de Produtos/Clientes.
 *  Só aparece se o Omie estiver conectado (e o usuário for admin — a rota é admin-only). */
export default function OmieImportButton({ tipo }: { tipo: 'produtos' | 'clientes' }) {
  const router = useRouter()
  const toast = useToast()
  const [conectado, setConectado] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/integracoes/omie')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.conectado) setConectado(true) })
      .catch(() => {})
  }, [])

  if (!conectado) return null

  async function importar() {
    setBusy(true)
    const action = tipo === 'produtos' ? 'importar_produtos' : 'importar_clientes'
    const r = await fetch('/api/integracoes/omie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { toast(d.error ?? 'Falha ao importar do Omie', 'error'); return }
    toast(tipo === 'produtos'
      ? `${d.importados} produto(s) importado(s) · ${d.atualizados} atualizado(s)`
      : `${d.importados} cliente(s) importado(s) · ${d.ignorados} já existia(m)`)
    router.refresh()
  }

  return (
    <button
      onClick={importar}
      disabled={busy}
      title="Importar do Omie"
      className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-60 transition-colors"
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
      Importar do Omie
    </button>
  )
}
