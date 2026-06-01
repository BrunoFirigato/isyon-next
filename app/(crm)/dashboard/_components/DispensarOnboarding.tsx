'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/** Botão para dispensar o bloco de primeiros passos (persiste em config_usuario). */
export default function DispensarOnboarding({ usuarioId }: { usuarioId: string }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function dispensar() {
    if (!usuarioId) return
    setSaving(true)
    const supabase = createClient()
    const { data: existente } = await supabase
      .from('config_usuario').select('id')
      .eq('usuario_id', usuarioId).eq('chave', 'onboarding_dispensado')
      .maybeSingle()

    if (existente) await supabase.from('config_usuario').update({ valor: 'true' }).eq('id', existente.id)
    else           await supabase.from('config_usuario').insert({ usuario_id: usuarioId, chave: 'onboarding_dispensado', valor: 'true' })

    router.refresh()
  }

  return (
    <button
      onClick={dispensar}
      disabled={saving}
      title="Dispensar primeiros passos"
      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
    >
      <X size={16} />
    </button>
  )
}
