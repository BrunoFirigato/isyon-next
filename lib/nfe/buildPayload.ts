// lib/nfe/buildPayload.ts
// Monta o payload da BrasilNFe (/EnviarNotaFiscal e /PreVisualizarNotaFiscal)
// a partir das entidades internas do Isyon.

import { isSimplesNacional, SIMPLES_DEFAULTS, NORMAL_DEFAULTS } from './fiscal'
import type { FilialFiscal, ClienteFiscal, ItemFiscal, DadosEmissao } from './types'

function soDigitos(v: string | null | undefined): string {
  return (v ?? '').replace(/\D/g, '')
}

/**
 * Indicador de IE do destinatário:
 * 1 = contribuinte ICMS, 2 = isento, 9 = não contribuinte.
 * Usa o valor cadastrado; se ausente, assume 9 (não contribuinte/consumidor final).
 */
function indicadorIe(indicadorCadastrado: string | null): number {
  const v = Number(indicadorCadastrado)
  return v === 1 || v === 2 ? v : 9
}

export function buildBrasilNFePayload(
  filial: FilialFiscal,
  cliente: ClienteFiscal,
  itens: ItemFiscal[],
  dados: DadosEmissao,
): Record<string, unknown> {
  const simples = isSimplesNacional(filial.regime_tributario, filial.crt)
  const ambiente = filial.ambiente_nfe === 'producao' ? '1' : '2'
  const aliqPis    = filial.aliq_pis    ?? 0
  const aliqCofins = filial.aliq_cofins ?? 0

  const cpfCnpjCli = soDigitos(cliente.cpf_cnpj)
  const indIe = indicadorIe(cliente.indicador_ie)

  const produtos = itens.map((it, idx) => {
    const valorTotal = Math.round(it.quantidade * it.valorUnitario * 100) / 100

    // Imposto: Simples Nacional usa CSOSN; Regime Normal usa CST
    const icms = simples
      ? { CodSituacaoTributaria: SIMPLES_DEFAULTS.csosn, AliquotaICMS: 0 }
      : { CodSituacaoTributaria: NORMAL_DEFAULTS.cstIcms, AliquotaICMS: 0 }

    const pis = {
      CodSituacaoTributaria: simples ? SIMPLES_DEFAULTS.cstPis : NORMAL_DEFAULTS.cstPis,
      Aliquota: aliqPis,
      BaseCalculo: aliqPis > 0 ? valorTotal : 0,
    }
    const cofins = {
      CodSituacaoTributaria: simples ? SIMPLES_DEFAULTS.cstCofins : NORMAL_DEFAULTS.cstCofins,
      Aliquota: aliqCofins,
      BaseCalculo: aliqCofins > 0 ? valorTotal : 0,
    }

    return {
      NmProduto:        it.descricao,
      NCM:              soDigitos(it.ncm) || '00000000',
      CFOP:             Number(it.cfop) || 5102,
      UnidadeComercial: it.unidade || 'UN',
      Quantidade:       it.quantidade,
      ValorUnitario:    it.valorUnitario,
      ValorTotal:       valorTotal,
      OrigemProduto:    Number(it.origem) || 0,
      NItemPed:         idx + 1,
      Imposto: { ICMS: icms, PIS: pis, COFINS: cofins },
    }
  })

  return {
    ModeloDocumento:  55,
    Finalidade:       1,
    TipoAmbiente:     ambiente,
    NaturezaOperacao: dados.naturezaOp || 'Venda de Mercadoria',
    Serie:            Number(dados.serie)  || 1,
    Numero:           Number(dados.numero) || 1,
    DataEmissao:      `${dados.data}T12:00:00Z`,
    Observacao:       dados.dadosAdicionais || '',
    ConsumidorFinal:  indIe === 9,
    Cliente: {
      CpfCnpj:     cpfCnpjCli,
      NmCliente:   cliente.nome || 'Consumidor',
      IndicadorIe: indIe,
      // IE só vai quando contribuinte (1); isento/não contribuinte = ISENTO
      Ie:          indIe === 1 ? (soDigitos(cliente.inscricao_estadual) || 'ISENTO') : 'ISENTO',
      Endereco: {
        Cep:         soDigitos(cliente.cep),
        Logradouro:  cliente.rua || '',
        Numero:      cliente.numero || 'S/N',
        Complemento: cliente.complemento || '',
        Bairro:      cliente.bairro || '',
        Municipio:   cliente.cidade || '',
        Uf:          (cliente.estado || '').toUpperCase(),
        CodPais:     1058,
        Pais:        'BRASIL',
      },
      Contato: {
        Email:    cliente.email || '',
        Telefone: soDigitos(cliente.telefone),
      },
    },
    Produtos: produtos,
    EnviarEmail: false,
  }
}
