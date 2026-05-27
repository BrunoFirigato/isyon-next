import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConfiguracoesView from './_components/ConfiguracoesView'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: tenants }, { data: usuario }, { data: configs }] = await Promise.all([
    supabase.from('tenants').select('id, nome, plano, status, criado_em').limit(1),
    supabase.from('usuarios').select('id').eq('auth_id', user.id).limit(1).maybeSingle(),
    supabase.from('config_usuario').select('id, usuario_id, chave, valor'),
  ])

  const tenant = tenants?.[0]
  if (!tenant) redirect('/dashboard')

  return (
    <ConfiguracoesView
      tenant={tenant}
      configs={configs ?? []}
      usuarioId={usuario?.id ?? ''}
    />
  )
}
