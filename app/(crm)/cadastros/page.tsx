import { createClient } from '@/lib/supabase/server'
import CadastrosView from './_components/CadastrosView'

type Tab = 'ncm' | 'transportadoras' | 'cond_pagamentos'

interface Props {
  searchParams: Promise<{ tab?: string }>
}

const VALID_TABS: Tab[] = ['ncm', 'transportadoras', 'cond_pagamentos']

export default async function CadastrosPage({ searchParams }: Props) {
  const { tab: tabParam } = await searchParams
  const activeTab: Tab = VALID_TABS.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : 'ncm'

  const supabase = await createClient()

  const [
    { data: ncms },
    { data: transportadoras },
    { data: condPagamentos },
  ] = await Promise.all([
    supabase.from('ncms').select('*').order('codigo'),
    supabase.from('transportadoras').select('*').order('nome'),
    supabase.from('cond_pagamentos').select('*').order('nome'),
  ])

  return (
    <CadastrosView
      ncms={ncms ?? []}
      transportadoras={transportadoras ?? []}
      condPagamentos={condPagamentos ?? []}
      activeTab={activeTab}
    />
  )
}
