import { createClient } from '@/lib/supabase/server'
import AgendaView from './_components/AgendaView'
import type { Compromisso } from './_components/types'

export default async function AgendaPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('compromissos')
    .select('id, titulo, tipo, data_hora, duracao_min, descricao, cliente_id, lead_id, status, criado_em')
    .order('data_hora', { ascending: true })

  if (!rows || rows.length === 0) {
    return <AgendaView compromissos={[]} />
  }

  // Collect unique references
  const clienteIds = [...new Set(rows.filter(r => r.cliente_id).map(r => r.cliente_id as string))]
  const leadIds    = [...new Set(rows.filter(r => r.lead_id).map(r => r.lead_id as string))]

  const [{ data: clientesData }, { data: leadsData }] = await Promise.all([
    clienteIds.length > 0
      ? supabase.from('clientes').select('id, nome, empresa').in('id', clienteIds)
      : Promise.resolve({ data: [] }),
    leadIds.length > 0
      ? supabase.from('leads').select('id, nome').in('id', leadIds)
      : Promise.resolve({ data: [] }),
  ])

  const clienteMap = new Map((clientesData ?? []).map(c => [c.id, c]))
  const leadMap    = new Map((leadsData ?? []).map(l => [l.id, l]))

  const compromissos: Compromisso[] = rows.map(r => ({
    ...r,
    duracao_min: r.duracao_min ?? null,
    descricao:   r.descricao   ?? null,
    cliente_id:  r.cliente_id  ?? null,
    lead_id:     r.lead_id     ?? null,
    cliente: r.cliente_id ? (clienteMap.get(r.cliente_id) ?? null) : null,
    lead:    r.lead_id    ? (leadMap.get(r.lead_id)       ?? null) : null,
  }))

  return <AgendaView compromissos={compromissos} />
}
