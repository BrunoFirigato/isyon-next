import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PrintButton from '../../_components/PrintButton'

interface Props { params: Promise<{ id: string }> }

interface ItemDoc {
  descricao: string
  quantidade: number
  valorUnitario: number
  unidade?: string | null
  ncm?: string | null
}

const brl = (v: number | null | undefined) =>
  v == null ? 'R$ 0,00' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const dataBR = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

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
  const subtotal = itens.reduce((s, it) => s + it.quantidade * it.valorUnitario, 0)
  const descontoPct = cond?.desconto ?? 0
  const descontoVal = subtotal * (descontoPct / 100)
  const total = subtotal - descontoVal

  // Cronograma de vencimentos
  const baseDate = p.criado_em ? new Date(p.criado_em) : new Date()
  const parcelas = Math.max(1, cond?.parcelas ?? 1)
  const intervalo = cond?.intervalo ?? 0
  const aVista = parcelas === 1 && (intervalo <= 1 || cond?.forma === 'pix')
  const valorParcela = total / parcelas
  const cronograma = aVista
    ? [{ n: 1, valor: total, venc: null as string | null }]
    : Array.from({ length: parcelas }, (_, i) => {
        const d = new Date(baseDate)
        d.setDate(d.getDate() + intervalo * (i + 1))
        return { n: i + 1, valor: valorParcela, venc: d.toISOString() }
      })

  const cor = empresa?.cor ?? '#2563eb'
  const endEmpresa = empresa ? [empresa.rua, empresa.numero, empresa.bairro, empresa.cidade, empresa.estado].filter(Boolean).join(', ') : ''
  const endCliente = cliente ? [cliente.rua, cliente.numero, cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(', ') : ''

  // Mostra o título só quando ele agrega algo além do nome do cliente (evita duplicar o bloco "Cliente")
  const tit = (p.titulo ?? '').toLowerCase()
  const empNome = (cliente?.empresa ?? '').toLowerCase()
  const contNome = (cliente?.nome ?? '').toLowerCase()
  const mostrarAssunto = !!p.titulo && !(empNome && tit.includes(empNome)) && !(contNome && tit.includes(contNome))

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white py-8 print:py-0">
      <style>{`@media print { @page { size: A4; margin: 14mm; } .no-print { display: none !important; } }`}</style>

      {/* Ações (somem na impressão) */}
      <div className="no-print max-w-[800px] mx-auto mb-4 flex justify-end px-4">
        <PrintButton />
      </div>

      {/* Documento */}
      <div className="max-w-[800px] mx-auto bg-white shadow-sm print:shadow-none p-10 print:p-0 text-gray-800 text-sm">
        {/* Cabeçalho */}
        <header className="flex items-start justify-between border-b-2 pb-4" style={{ borderColor: cor }}>
          <div className="flex items-center gap-3">
            {empresa?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={empresa.logo_url} alt="logo" className="h-14 w-auto object-contain" />
            ) : (
              <div className="h-14 w-14 rounded-lg flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: cor }}>
                {empresa?.sigla ?? 'EM'}
              </div>
            )}
            <div>
              <p className="font-bold text-base text-gray-900">{empresa?.razao_social ?? empresa?.nome ?? 'Sua Empresa'}</p>
              {empresa?.cnpj && <p className="text-xs text-gray-500">CNPJ {empresa.cnpj}{empresa.inscricao_estadual ? ` · IE ${empresa.inscricao_estadual}` : ''}</p>}
              {endEmpresa && <p className="text-xs text-gray-500">{endEmpresa}</p>}
              {(empresa?.telefone || empresa?.email) && <p className="text-xs text-gray-500">{[empresa?.telefone, empresa?.email].filter(Boolean).join(' · ')}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold" style={{ color: cor }}>PROPOSTA</p>
            <p className="text-sm font-mono text-gray-700">{p.numero ?? '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Emissão: {dataBR(p.criado_em)}</p>
            {p.validade && <p className="text-xs text-gray-500">Validade: {dataBR(p.validade)}</p>}
          </div>
        </header>

        {/* Assunto (só quando agrega algo além do nome do cliente) */}
        {mostrarAssunto && (
          <p className="mt-5 text-sm">
            <span className="text-gray-400">Assunto: </span>
            <span className="font-semibold text-gray-900">{p.titulo}</span>
          </p>
        )}

        {/* Cliente */}
        <section className="mt-5 bg-gray-50 rounded-lg p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Cliente</p>
          <p className="font-medium text-gray-900">{cliente?.empresa ?? cliente?.nome ?? '—'}</p>
          {cliente?.empresa && cliente?.nome && <p className="text-xs text-gray-600">A/C {cliente.nome}</p>}
          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
            {cliente?.cpf_cnpj && <p>CNPJ/CPF: {cliente.cpf_cnpj}{cliente.inscricao_estadual ? ` · IE ${cliente.inscricao_estadual}` : ''}</p>}
            {endCliente && <p>{endCliente}</p>}
            {(cliente?.telefone || cliente?.email) && <p>{[cliente?.telefone, cliente?.email].filter(Boolean).join(' · ')}</p>}
          </div>
        </section>

        {/* Itens */}
        <table className="w-full mt-5 text-sm border-collapse">
          <thead>
            <tr className="text-left text-white" style={{ backgroundColor: cor }}>
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Descrição</th>
              <th className="px-3 py-2 font-semibold text-center">Qtd</th>
              <th className="px-3 py-2 font-semibold text-center">Un.</th>
              <th className="px-3 py-2 font-semibold text-right">Vlr unit.</th>
              <th className="px-3 py-2 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((it, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                <td className="px-3 py-2 text-gray-800">
                  {it.descricao}
                  {it.ncm ? <span className="text-[10px] text-gray-400"> · NCM {it.ncm}</span> : null}
                </td>
                <td className="px-3 py-2 text-center">{it.quantidade}</td>
                <td className="px-3 py-2 text-center text-gray-500">{it.unidade ?? '—'}</td>
                <td className="px-3 py-2 text-right">{brl(it.valorUnitario)}</td>
                <td className="px-3 py-2 text-right font-medium">{brl(it.quantidade * it.valorUnitario)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Resumo financeiro: totais + pagamento num bloco único (um total só) */}
        <div className="flex justify-end mt-5">
          <div className="w-80 rounded-lg border p-4" style={{ borderColor: cor }}>
            <div className="flex justify-between py-0.5 text-sm text-gray-600"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
            {descontoPct > 0 && (
              <div className="flex justify-between py-0.5 text-sm text-green-600"><span>Desconto ({descontoPct}%)</span><span>- {brl(descontoVal)}</span></div>
            )}
            <div className="flex justify-between py-2 mt-1 border-t-2 font-bold text-lg text-gray-900" style={{ borderColor: cor }}>
              <span>Total</span><span>{brl(total)}</span>
            </div>

            {cond && (
              <div className="mt-3 pt-3 border-t border-dashed border-gray-300">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: cor }}>Pagamento</p>
                <p className="font-semibold text-gray-900">{cond.nome}</p>
                {cronograma.length > 1 ? (
                  <div className="mt-1.5 space-y-0.5">
                    {cronograma.map((c) => (
                      <div key={c.n} className="flex justify-between text-xs text-gray-700">
                        <span>Parcela {c.n}/{cronograma.length} · venc. {dataBR(c.venc)}</span>
                        <span className="font-medium">{brl(c.valor)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {cronograma[0]?.venc ? `Vencimento em ${dataBR(cronograma[0].venc)}` : 'Pagamento à vista'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Observações */}
        {p.obs && (
          <section className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Observações</p>
            <p className="text-xs text-gray-600 whitespace-pre-line">{p.obs}</p>
          </section>
        )}

        {/* Rodapé */}
        <footer className="mt-10 pt-5 border-t border-gray-200">
          <p className="text-sm text-gray-700">Agradecemos a oportunidade e ficamos à disposição para qualquer esclarecimento.</p>
          {vendedor && (
            <p className="text-xs text-gray-500 mt-1">
              Responsável: {vendedor.nome}{vendedor.email ? ` · ${vendedor.email}` : ''}
            </p>
          )}
          <div className="grid grid-cols-2 gap-8 mt-14 text-center text-xs text-gray-500">
            <div className="border-t border-gray-300 pt-1">{empresa?.razao_social ?? empresa?.nome ?? 'Empresa'}</div>
            <div className="border-t border-gray-300 pt-1">Aceite do cliente</div>
          </div>
        </footer>
      </div>
    </div>
  )
}
