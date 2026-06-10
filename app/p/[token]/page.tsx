import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import PropostaDoc, { type ItemDoc } from '@/app/_components/PropostaDoc'
import Aceite from './_components/Aceite'

interface Props { params: Promise<{ token: string }> }

// Página pública: não indexar em buscadores
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function PropostaPublica({ params }: Props) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: p } = await admin
    .from('propostas')
    .select('id, titulo, numero, valor, itens, validade, obs, status, aceite_por, aceite_em, cliente_id, vendedor_id, empresa_id, cond_pagamento_id, criado_em')
    .eq('share_token', token)
    .maybeSingle()
  if (!p) notFound()

  const [{ data: cliente }, { data: empresa }, { data: cond }, { data: vendedor }] = await Promise.all([
    p.cliente_id
      ? admin.from('clientes').select('nome, empresa, cpf_cnpj, inscricao_estadual, email, telefone, rua, numero, bairro, cidade, estado').eq('id', p.cliente_id).maybeSingle()
      : Promise.resolve({ data: null }),
    p.empresa_id
      ? admin.from('empresas').select('nome, razao_social, sigla, cnpj, inscricao_estadual, email, telefone, rua, numero, bairro, cidade, estado, logo_url, cor').eq('id', p.empresa_id).maybeSingle()
      : Promise.resolve({ data: null }),
    p.cond_pagamento_id
      ? admin.from('cond_pagamentos').select('nome, parcelas, intervalo, entrada, desconto, forma').eq('id', p.cond_pagamento_id).maybeSingle()
      : Promise.resolve({ data: null }),
    p.vendedor_id
      ? admin.from('vendedores').select('nome, email').eq('id', p.vendedor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const itens: ItemDoc[] = (p.itens as ItemDoc[] | null) ?? []
  const subtotal = itens.reduce((s, it) => s + it.quantidade * it.valorUnitario, 0)
  const descontoPct = cond?.desconto ?? 0
  const total = subtotal - subtotal * (descontoPct / 100)
  const cor = empresa?.cor ?? '#2563eb'
  const hoje = new Date().toISOString().slice(0, 10)
  const vencida = !!p.validade && p.validade < hoje && p.status !== 'aprovada' && p.status !== 'recusada'

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-[760px] mx-auto">
        {/* Barra de aceite — topo */}
        <Aceite
          token={token}
          status={p.status}
          aceitePor={p.aceite_por}
          aceiteEm={p.aceite_em}
          vencida={vencida}
          total={total}
          empresaNome={empresa?.razao_social ?? empresa?.nome ?? 'a empresa'}
          cor={cor}
        />

        {/* Documento — mesmo layout da proposta impressa */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-10 text-gray-800 text-sm mt-4">
          <PropostaDoc
            empresa={empresa}
            cliente={cliente}
            cond={cond}
            vendedor={vendedor}
            numero={p.numero}
            titulo={p.titulo}
            criadoEm={p.criado_em}
            validade={p.validade}
            obs={p.obs}
            itens={itens}
            modo="publico"
          />
        </div>
      </div>
    </div>
  )
}
