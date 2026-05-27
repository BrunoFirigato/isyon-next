import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SuperadminView from './_components/SuperadminView'

export default async function SuperadminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'sa@isyon.com.br') {
    redirect('/admin')
  }

  const admin = createAdminClient()

  const [{ data: tenants }, { data: usuarios }] = await Promise.all([
    admin.from('tenants').select('id, nome, plano, status, criado_em').order('nome'),
    admin.from('usuarios').select('tenant_id'),
  ])

  const contagem = (usuarios ?? []).reduce<Record<string, number>>((acc, u) => {
    if (u.tenant_id) acc[u.tenant_id] = (acc[u.tenant_id] ?? 0) + 1
    return acc
  }, {})

  const tenantsComContagem = (tenants ?? []).map((t) => ({
    ...t,
    total_usuarios: contagem[t.id] ?? 0,
  }))

  return <SuperadminView tenants={tenantsComContagem} />
}
