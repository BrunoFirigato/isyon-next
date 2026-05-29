'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface Props {
  href: string           // ex: /api/exportar/clientes?status=ativo
  label?: string
  filename?: string
}

export default function ExportButton({ href, label = 'Exportar', filename }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res  = await fetch(href)
      if (!res.ok) { alert('Erro ao exportar'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = filename ?? `exportacao_${new Date().toISOString().slice(0,10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {label}
    </button>
  )
}
