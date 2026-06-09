import { redirect } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import SuperLogout from './_components/SuperLogout'

/**
 * Layout exclusivo do superadmin (fornecedor da plataforma).
 * Sem a sidebar/menu do tenant — o superadmin não é usuário de nenhuma empresa.
 */
export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')
  if (user.email !== 'sa@isyon.com.br') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 md:px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-600 text-white shrink-0">
            <ShieldAlert size={17} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Isyon</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Administração da plataforma</p>
          </div>
        </div>
        <SuperLogout />
      </header>
      <main className="max-w-6xl mx-auto p-4 md:p-6">{children}</main>
    </div>
  )
}
