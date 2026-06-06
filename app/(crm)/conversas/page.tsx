import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConversasView from './_components/ConversasView'

export default async function ConversasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: usuario } = await supabase.from('usuarios').select('tenant_id').eq('auth_id', user.id).maybeSingle()
  if (!usuario?.tenant_id) redirect('/dashboard')

  return <ConversasView />
}
