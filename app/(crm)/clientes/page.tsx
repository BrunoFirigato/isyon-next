import { createClient } from '@/lib/supabase/server'
import ClientesView from './_components/ClientesView'

interface Props {
  searchParams: Promise<{ status?: string; q?: string; vendedor?: string; parceiro?: string }>
}

export default async function ClientesPage({ searchParams }: Props) {
  const { status, q, vendedor, parceiro } = await searchParams
  const supabase = await createClient()

  const [{ data: vendedores }, { data: parceiros }] = await Promise.all([
    supabase.from('vendedores').select('id, nome').eq('status', 'ativo').order('nome'),
    supabase.from('parceiros').select('id, nome').eq('status', 'ativo').order('nome'),
  ])

  let query = supabase
    .from('clientes')
    .select(
      'id, nome, empresa, email, telefone, cpf_cnpj, cep, rua, numero, complemento, bairro, cidade, estado, tipo, segmento, status, valor_total, origem, lead_id, vendedor_maq_id, vendedor_pec_id, parceiro_id, criado_em, atualizado_em'
    )
    .order('nome', { ascending: true })

  if (status && status !== 'todos') {
    query = query.eq('status', status)
  }

  if (q?.trim()) {
    const termo = q.trim()
    query = query.or(
      `nome.ilike.%${termo}%,empresa.ilike.%${termo}%,email.ilike.%${termo}%,cpf_cnpj.ilike.%${termo}%,telefone.ilike.%${termo}%`
    )
  }

  if (vendedor) {
    query = query.or(`vendedor_maq_id.eq.${vendedor},vendedor_pec_id.eq.${vendedor}`)
  }

  if (parceiro) {
    query = query.eq('parceiro_id', parceiro)
  }

  const { data: clientes } = await query

  return (
    <ClientesView
      clientes={clientes ?? []}
      currentStatus={status ?? 'todos'}
      currentQ={q ?? ''}
      currentVendedor={vendedor ?? ''}
      currentParceiro={parceiro ?? ''}
      vendedores={vendedores ?? []}
      parceiros={parceiros ?? []}
    />
  )
}
