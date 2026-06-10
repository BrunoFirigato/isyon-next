import { createClient } from '@/lib/supabase/server'
import TransportadorasView from './_components/TransportadorasView'

export default async function TransportadorasPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('transportadoras').select('*').order('nome')
  return <TransportadorasView transportadoras={data ?? []} />
}
