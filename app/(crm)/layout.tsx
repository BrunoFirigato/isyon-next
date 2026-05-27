import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from './_components/Sidebar'
import BottomTabBar from './_components/BottomTabBar'
import { ToastProvider } from './_components/Toast'

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Busca perfil do usuário para passar para os componentes de navegação
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('auth_id', user.id)
    .maybeSingle()

  const perfil = usuario?.perfil ?? 'vendedor'

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar userEmail={user.email ?? ''} perfil={perfil} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>
        <BottomTabBar perfil={perfil} />
      </div>
    </ToastProvider>
  )
}
