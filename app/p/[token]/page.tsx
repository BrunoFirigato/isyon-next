import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import Aceite from './_components/Aceite'

interface Props { params: Promise<{ token: string }> }

// Página pública: não indexar em buscadores
export const metadata: Metadata = { robots: { index: false, follow: false } }

interface ItemDoc {
  descricao: string
  quantidade: number
  valorUnitario: number
  unidade?: string | null
}

const brl = (v: number | null | undefined) =>
  v == null ? 'R$ 0,00' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const dataBR = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

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
      ? admin.from('clientes').select('nome, empresa, cpf_cnpj').eq('id', p.cliente_id).maybeSingle()
      : Promise.resolve({ data: null }),
    p.empresa_id
      ? admin.from('empresas').select('nome, razao_social, sigla, cnpj, telefone, email, logo_url, cor').eq('id', p.empresa_id).maybeSingle()
      : Promise.resolve({ data: null }),
    p.cond_pagamento_id
      ? admin.from('cond_pagamentos').select('nome').eq('id', p.cond_pagamento_id).maybeSingle()
      : Promise.resolve({ data: null }),
    p.vendedor_id
      ? admin.from('vendedores').select('nome, email').eq('id', p.vendedor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const itens: ItemDoc[] = (p.itens as ItemDoc[] | null) ?? []
  const total = itens.reduce((s, it) => s + it.quantidade * it.valorUnitario, 0)
  const cor = empresa?.cor ?? '#2563eb'
  const hoje = new Date().toISOString().slice(0, 10)
  const vencida = !!p.validade && p.validade < hoje && p.status !== 'aprovada' && p.status !== 'recusada'

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-[760px] mx-auto">
        {/* Barra de aceite — topo, fica grudada no que importa */}
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

        {/* Documento */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-10 text-gray-800 text-sm mt-4">
          {/* Cabeçalho */}
          <header className="flex items-start justify-between border-b-2 pb-4 gap-3" style={{ borderColor: cor }}>
            <div className="flex items-center gap-3 min-w-0">
              {empresa?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={empresa.logo_url} alt="logo" className="h-12 w-auto object-contain shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ backgroundColor: cor }}>
                  {empresa?.sigla ?? 'EM'}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-base text-gray-900 truncate">{empresa?.razao_social ?? empresa?.nome ?? 'Proposta comercial'}</p>
                {empresa?.cnpj && <p className="text-xs text-gray-500">CNPJ {empresa.cnpj}</p>}
                {(empresa?.telefone || empresa?.email) && (
                  <p className="text-xs text-gray-500 truncate">{[empresa?.telefone, empresa?.email].filter(Boolean).join(' · ')}</p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-bold" style={{ color: cor }}>PROPOSTA</p>
              <p className="text-sm font-mono text-gray-700">{p.numero ?? '—'}</p>
              {p.validade && <p className="text-xs text-gray-500 mt-1">Validade: {dataBR(p.validade)}</p>}
            </div>
          </header>

          {/* Cliente */}
          <section className="mt-5 bg-gray-50 rounded-lg p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Para</p>
            <p className="font-medium text-gray-900">{cliente?.empresa ?? cliente?.nome ?? '—'}</p>
            {cliente?.empresa && cliente?.nome && <p className="text-xs text-gray-600">A/C {cliente.nome}</p>}
            {cliente?.cpf_cnpj && <p className="text-xs text-gray-600 mt-0.5">CNPJ/CPF: {cliente.cpf_cnpj}</p>}
          </section>

          {/* Itens */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[460px]">
              <thead>
                <tr className="text-left text-white" style={{ backgroundColor: cor }}>
                  <th className="px-3 py-2 font-semibold">Descrição</th>
                  <th className="px-3 py-2 font-semibold text-center w-14">Qtd</th>
                  <th className="px-3 py-2 font-semibold text-right w-28">Vlr unit.</th>
                  <th className="px-3 py-2 font-semibold text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((it, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-800">{it.descricao}</td>
                    <td className="px-3 py-2 text-center">{it.quantidade}</td>
                    <td className="px-3 py-2 text-right">{brl(it.valorUnitario)}</td>
                    <td className="px-3 py-2 text-right font-medium">{brl(it.quantidade * it.valorUnitario)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2" style={{ borderColor: cor }}>
                  <td colSpan={3} className="px-3 py-2.5 text-right text-base font-bold text-gray-900">Total</td>
                  <td className="px-3 py-2.5 text-right text-base font-bold text-gray-900">{brl(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {cond?.nome && (
            <p className="mt-4 text-sm text-gray-700">
              <span className="text-gray-400">Condição de pagamento: </span>
              <span className="font-medium">{cond.nome}</span>
            </p>
          )}

          {/* Observações */}
          {p.obs && (
            <section className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Observações</p>
              <p className="text-xs text-gray-600 whitespace-pre-line">{p.obs}</p>
            </section>
          )}

          {/* Rodapé */}
          <footer className="mt-8 pt-5 border-t border-gray-200">
            <p className="text-sm text-gray-700">Agradecemos a oportunidade e ficamos à disposição.</p>
            {vendedor && (
              <p className="text-xs text-gray-500 mt-1">
                Responsável: {vendedor.nome}{vendedor.email ? ` · ${vendedor.email}` : ''}
              </p>
            )}
            <p className="mt-6 text-center text-[10px] text-gray-400">
              Proposta enviada por <span className="font-semibold text-gray-600">Isyon CRM</span> · crm.isyon.com.br
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
