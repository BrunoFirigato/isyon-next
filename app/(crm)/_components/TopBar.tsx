'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

function avatarInitials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

export default function TopBar({ userEmail }: { userEmail: string }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = avatarInitials(userEmail)
  const userName = userEmail.split('@')[0]

  return (
    <header className="hidden md:flex items-center justify-end gap-3 h-14 px-6 bg-white border-b border-gray-200 shrink-0">
      {/* Usuário */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs shrink-0">
          {initials}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-800 leading-tight">{userName}</p>
          <p className="text-[10px] text-gray-400 leading-tight">{userEmail}</p>
        </div>
      </div>

      {/* Divisor */}
      <div className="w-px h-5 bg-gray-200" />

      {/* Sair */}
      <button
        onClick={handleLogout}
        title="Sair"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <LogOut size={14} />
        <span className="text-xs font-medium">Sair</span>
      </button>
    </header>
  )
}
