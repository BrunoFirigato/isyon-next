/**
 * Documento visual da proposta — fonte única usada tanto na impressão
 * (/imprimir/proposta/[id]) quanto na página pública enviada ao cliente
 * (/p/[token]). Componente puramente presentacional (server-friendly).
 */

interface Empresa {
  nome?: string | null
  razao_social?: string | null
  sigla?: string | null
  cnpj?: string | null
  inscricao_estadual?: string | null
  telefone?: string | null
  email?: string | null
  logo_url?: string | null
  cor?: string | null
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
}

interface Cliente {
  nome?: string | null
  empresa?: string | null
  cpf_cnpj?: string | null
  inscricao_estadual?: string | null
  telefone?: string | null
  email?: string | null
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
}

interface Cond {
  nome?: string | null
  parcelas?: number | null
  intervalo?: number | null
  entrada?: number | null
  desconto?: number | null
  forma?: string | null
}

interface Vendedor { nome?: string | null; email?: string | null }

export interface ItemDoc {
  descricao: string
  quantidade: number
  valorUnitario: number
  unidade?: string | null
  ncm?: string | null
}

interface Props {
  empresa: Empresa | null
  cliente: Cliente | null
  cond: Cond | null
  vendedor: Vendedor | null
  numero: string | null
  titulo: string | null
  criadoEm: string | null
  validade: string | null
  obs: string | null
  itens: ItemDoc[]
  /** 'print' mostra as linhas de assinatura; 'publico' omite. */
  modo?: 'print' | 'publico'
}

const brl = (v: number | null | undefined) =>
  v == null ? 'R$ 0,00' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const dataBR = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export default function PropostaDoc({
  empresa, cliente, cond, vendedor, numero, titulo, criadoEm, validade, obs, itens, modo = 'print',
}: Props) {
  const subtotal = itens.reduce((s, it) => s + it.quantidade * it.valorUnitario, 0)
  const descontoPct = cond?.desconto ?? 0
  const descontoVal = subtotal * (descontoPct / 100)
  const total = subtotal - descontoVal

  // Cronograma de vencimentos
  const baseDate = criadoEm ? new Date(criadoEm) : new Date()
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

  // Mostra o assunto só quando agrega algo além do nome do cliente
  const tit = (titulo ?? '').toLowerCase()
  const empNome = (cliente?.empresa ?? '').toLowerCase()
  const contNome = (cliente?.nome ?? '').toLowerCase()
  const mostrarAssunto = !!titulo && !(empNome && tit.includes(empNome)) && !(contNome && tit.includes(contNome))

  return (
    <>
      {/* Cabeçalho */}
      <header className="flex items-start justify-between border-b-2 pb-4 gap-3" style={{ borderColor: cor }}>
        <div className="flex items-center gap-3 min-w-0">
          {empresa?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={empresa.logo_url} alt="logo" className="h-14 w-auto object-contain shrink-0" />
          ) : (
            <div className="h-14 w-14 rounded-lg flex items-center justify-center text-white text-xl font-bold shrink-0" style={{ backgroundColor: cor }}>
              {empresa?.sigla ?? 'EM'}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-base text-gray-900 truncate">{empresa?.razao_social ?? empresa?.nome ?? 'Sua Empresa'}</p>
            {empresa?.cnpj && <p className="text-xs text-gray-500">CNPJ {empresa.cnpj}{empresa.inscricao_estadual ? ` · IE ${empresa.inscricao_estadual}` : ''}</p>}
            {endEmpresa && <p className="text-xs text-gray-500">{endEmpresa}</p>}
            {(empresa?.telefone || empresa?.email) && <p className="text-xs text-gray-500 truncate">{[empresa?.telefone, empresa?.email].filter(Boolean).join(' · ')}</p>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold" style={{ color: cor }}>PROPOSTA</p>
          <p className="text-sm font-mono text-gray-700">{numero ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-1">Emissão: {dataBR(criadoEm)}</p>
          {validade && <p className="text-xs text-gray-500">Validade: {dataBR(validade)}</p>}
        </div>
      </header>

      {/* Assunto */}
      {mostrarAssunto && (
        <p className="mt-5 text-sm">
          <span className="text-gray-400">Assunto: </span>
          <span className="font-semibold text-gray-900">{titulo}</span>
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

      {/* Itens — faixa azul arredondada (mesma moldura do bloco de pagamento) */}
      <section className="mt-5 rounded-lg border overflow-hidden" style={{ borderColor: cor }}>
        <table className="w-full text-sm border-collapse">
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
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td colSpan={5} className="px-3 py-2 text-right text-sm text-gray-600">Subtotal dos itens</td>
              <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">{brl(subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Condição de pagamento */}
      <section className="mt-6 rounded-lg border overflow-hidden" style={{ borderColor: cor }}>
        <div className="px-4 py-2 text-white text-sm font-semibold" style={{ backgroundColor: cor }}>
          Condição de pagamento
        </div>
        <div className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900">{cond?.nome ?? 'A combinar'}</p>
            {cronograma.length > 1 ? (
              <div className="mt-2 space-y-0.5 text-sm text-gray-700">
                {cronograma.map((c) => (
                  <div key={c.n} className="flex items-baseline gap-3">
                    <span className="text-gray-500 w-24 shrink-0">Parcela {c.n}/{cronograma.length}</span>
                    <span className="w-28 shrink-0">venc. {dataBR(c.venc)}</span>
                    <span className="font-medium">{brl(c.valor)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-600">
                {cronograma[0]?.venc ? `Vencimento em ${dataBR(cronograma[0].venc)}` : 'Pagamento à vista'}
              </p>
            )}
          </div>
          <div className="w-full sm:w-56 shrink-0 text-sm">
            {descontoPct > 0 && (
              <div className="flex justify-between py-0.5 text-green-600"><span>Desconto ({descontoPct}%)</span><span>- {brl(descontoVal)}</span></div>
            )}
            <div className="flex justify-between py-2 mt-1 border-t-2 font-bold text-lg text-gray-900" style={{ borderColor: cor }}>
              <span>Total</span><span>{brl(total)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Observações */}
      {obs && (
        <section className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Observações</p>
          <p className="text-xs text-gray-600 whitespace-pre-line">{obs}</p>
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
        {modo === 'print' && (
          <div className="grid grid-cols-2 gap-8 mt-14 text-center text-xs text-gray-500">
            <div className="border-t border-gray-300 pt-1">{empresa?.razao_social ?? empresa?.nome ?? 'Empresa'}</div>
            <div className="border-t border-gray-300 pt-1">Aceite do cliente</div>
          </div>
        )}
        <p className="mt-8 text-center text-[10px] text-gray-400">
          {modo === 'print' ? 'Documento gerado por ' : 'Proposta enviada por '}
          <span className="font-semibold text-gray-600">Isyon CRM</span> · crm.isyon.com.br
        </p>
      </footer>
    </>
  )
}
