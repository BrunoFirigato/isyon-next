import { createClient } from '@/lib/supabase/server'
import CondicoesPagamentoView from './_components/CondicoesPagamentoView'

export default async function CondicoesPagamentoPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('cond_pagamentos').select('*').order('nome')
  return <CondicoesPagamentoView condPagamentos={data ?? []} />
}
