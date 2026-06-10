import { createClient } from '@/lib/supabase/server'
import CadastrosView from './_components/CadastrosView'

type Tab = 'transportadoras' | 'cond_pagamentos'

interface Props {
  searchParams: Promise<{ tab?: string }>
}

const VALID_TABS: Tab[] = ['transportadoras', 'cond_pagamentos']

export default async function CadastrosPage({ searchParams }: Props) {
  const { tab: tabParam } = await searchParams
  const activeTab: Tab = VALID_TABS.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : 'transportadoras'

  const supabase = await createClient()

  const [
    { data: transportadoras },
    { data: condPagamentos },
  ] = await Promise.all([
    supabase.from('transportadoras').select('*').order('nome'),
    supabase.from('cond_pagamentos').select('*').order('nome'),
  ])

  return (
    <CadastrosView
      transportadoras={transportadoras ?? []}
      condPagamentos={condPagamentos ?? []}
      activeTab={activeTab}
    />
  )
}
