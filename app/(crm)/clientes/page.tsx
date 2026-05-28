import { createClient } from '@/lib/supabase/server'
import ClientesView from './_components/ClientesView'

interface Props {
  searchParams: Promise<{ tipo?: string; q?: string }>
}

export default async function ClientesPage({ searchParams }: Props) {
  const { tipo, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('clientes')
    .select(
      'id, nome, empresa, email, telefone, cpf_cnpj, cep, rua, numero, complemento, bairro, cidade, estado, tipo, segmento, status, valor_total, origem, lead_id, criado_em, atualizado_em'
    )
    .order('nome', { ascending: true })

  if (tipo && tipo !== 'todos') {
    query = query.eq('tipo', tipo)
  }

  if (q?.trim()) {
    const termo = q.trim()
    query = query.or(
      `nome.ilike.%${termo}%,empresa.ilike.%${termo}%,email.ilike.%${termo}%,cpf_cnpj.ilike.%${termo}%,telefone.ilike.%${termo}%`
    )
  }

  const { data: clientes } = await query

  return (
    <ClientesView
      clientes={clientes ?? []}
      currentTipo={tipo ?? 'todos'}
      currentQ={q ?? ''}
    />
  )
}
