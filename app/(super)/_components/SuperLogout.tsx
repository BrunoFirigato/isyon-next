'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SuperLogout() {
  const router = useRouter()
  async function sair() {
    await createClient().auth.signOut()
    router.push('/admin')
    router.refresh()
  }
  return (
    <button
      onClick={sair}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
    >
      <LogOut size={15} /> Sair
    </button>
  )
}
