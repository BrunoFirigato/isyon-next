import { createClient } from '@/lib/supabase/server'
import CadastrosView from './_components/CadastrosView'

type Tab = 'ncm' | 'naturezas' | 'cfop' | 'transportadoras'

interface Props {
  searchParams: Promise<{ tab?: string }>
}

const VALID_TABS: Tab[] = ['ncm', 'naturezas', 'cfop', 'transportadoras']

export default async function CadastrosPage({ searchParams }: Props) {
  const { tab: tabParam } = await searchParams
  const activeTab: Tab = VALID_TABS.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : 'ncm'

  const supabase = await createClient()

  const [
    { data: ncms },
    { data: naturezas },
    { data: cfops },
    { data: transportadoras },
  ] = await Promise.all([
    supabase.from('ncms').select('*').order('codigo'),
    supabase.from('naturezas_operacao').select('*').order('codigo'),
    supabase.from('cfops').select('*').order('codigo'),
    supabase.from('transportadoras').select('*').order('nome'),
  ])

  return (
    <CadastrosView
      ncms={ncms ?? []}
      naturezas={naturezas ?? []}
      cfops={cfops ?? []}
      transportadoras={transportadoras ?? []}
      activeTab={activeTab}
    />
  )
}
