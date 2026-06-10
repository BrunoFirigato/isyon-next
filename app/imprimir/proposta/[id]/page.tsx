import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PrintButton from '../../_components/PrintButton'
import PropostaDoc, { type ItemDoc } from '@/app/_components/PropostaDoc'

interface Props { params: Promise<{ id: string }> }

export default async function ImprimirProposta({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: p } = await supabase
    .from('propostas')
    .select('id, titulo, numero, valor, itens, validade, obs, cliente_id, vendedor_id, empresa_id, cond_pagamento_id, criado_em')
    .eq('id', id)
    .maybeSingle()
  if (!p) notFound()

  const [{ data: cliente }, { data: empresa }, { data: cond }, { data: vendedor }] = await Promise.all([
    p.cliente_id
      ? supabase.from('clientes').select('nome, empresa, cpf_cnpj, inscricao_estadual, email, telefone, rua, numero, bairro, cidade, estado').eq('id', p.cliente_id).maybeSingle()
      : Promise.resolve({ data: null }),
    p.empresa_id
      ? supabase.from('empresas').select('nome, razao_social, sigla, cnpj, inscricao_estadual, email, telefone, rua, numero, bairro, cidade, estado, logo_url, cor').eq('id', p.empresa_id).maybeSingle()
      : Promise.resolve({ data: null }),
    p.cond_pagamento_id
      ? supabase.from('cond_pagamentos').select('nome, parcelas, intervalo, entrada, desconto, forma').eq('id', p.cond_pagamento_id).maybeSingle()
      : Promise.resolve({ data: null }),
    p.vendedor_id
      ? supabase.from('vendedores').select('nome, email').eq('id', p.vendedor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const itens: ItemDoc[] = (p.itens as ItemDoc[] | null) ?? []

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white py-8 print:py-0">
      <style>{`@media print { @page { size: A4; margin: 14mm; } .no-print { display: none !important; } }`}</style>

      {/* Ações (somem na impressão) */}
      <div className="no-print max-w-[800px] mx-auto mb-4 flex justify-end px-4">
        <PrintButton />
      </div>

      {/* Documento */}
      <div className="max-w-[800px] mx-auto bg-white shadow-sm print:shadow-none p-10 print:p-0 text-gray-800 text-sm">
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
          modo="print"
        />
      </div>
    </div>
  )
}
