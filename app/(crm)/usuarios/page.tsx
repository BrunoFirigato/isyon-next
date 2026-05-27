import { createClient } from '@/lib/supabase/server'
import UsuariosView from './_components/UsuariosView'

export default async function UsuariosPage() {
  const supabase = await createClient()

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome, email, perfil, ativo, criado_em')
    .order('nome', { ascending: true })

  return <UsuariosView usuarios={usuarios ?? []} />
}
