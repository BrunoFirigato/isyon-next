import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WhatsAppNumerosView from '../_components/WhatsAppNumerosView'

export default async function WhatsAppNumerosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('tenant_id, perfil').eq('auth_id', user.id).maybeSingle()
  if (!usuario?.tenant_id) redirect('/dashboard')
  if (usuario.perfil !== 'admin') redirect('/integracoes')

  return <WhatsAppNumerosView />
}
