// lib/nfe/fiscal.ts
// Constantes fiscais e cálculo automático de CFOP — portado do sistema legado (fiscal.js)

/** CFOP automático por natureza × tipo de item × destino. */
export const CFOP_AUTO: Record<string, {
  produto: { interno: string; interestadual: string; exterior: string }
  servico: { interno: string; interestadual: string; exterior: string }
}> = {
  venda:         { produto: { interno: '5102', interestadual: '6102', exterior: '7102' }, servico: { interno: '5933', interestadual: '6933', exterior: '7933' } },
  devolucao:     { produto: { interno: '5202', interestadual: '6202', exterior: '7202' }, servico: { interno: '5933', interestadual: '6933', exterior: '7933' } },
  remessa:       { produto: { interno: '5905', interestadual: '6905', exterior: '7905' }, servico: { interno: '5933', interestadual: '6933', exterior: '7933' } },
  transferencia: { produto: { interno: '5152', interestadual: '6152', exterior: '7152' }, servico: { interno: '5933', interestadual: '6933', exterior: '7933' } },
  bonificacao:   { produto: { interno: '5910', interestadual: '6910', exterior: '7910' }, servico: { interno: '5933', interestadual: '6933', exterior: '7933' } },
  consignacao:   { produto: { interno: '5917', interestadual: '6917', exterior: '7917' }, servico: { interno: '5933', interestadual: '6933', exterior: '7933' } },
}

export type Destino = 'interno' | 'interestadual' | 'exterior'

/**
 * Calcula o CFOP a partir da chave da natureza, UFs de emitente/destinatário e tipo de item.
 * @returns código CFOP ou null se não houver tabela para a combinação.
 */
export function calcularCfop(
  chaveNatureza: string | null,
  ufEmitente: string | null,
  ufDestinatario: string | null,
  tipoItem: 'produto' | 'servico' = 'produto',
): { codigo: string; destino: Destino } | null {
  const chave = (chaveNatureza || 'venda').toLowerCase()
  const tabela = CFOP_AUTO[chave]
  if (!tabela) return null

  const ufE = (ufEmitente || '').toUpperCase().trim()
  const ufD = (ufDestinatario || '').toUpperCase().trim()

  let destino: Destino = 'interno'
  if (!ufE || !ufD) destino = 'interno'         // fallback seguro
  else if (ufD === 'EX') destino = 'exterior'
  else if (ufE !== ufD) destino = 'interestadual'

  const tabelaTipo = tipoItem === 'servico' ? tabela.servico : tabela.produto
  const codigo = tabelaTipo[destino] || tabelaTipo.interno
  if (!codigo) return null

  return { codigo, destino }
}

/** Regimes considerados Simples Nacional (usam CSOSN no lugar de CST de ICMS). */
export function isSimplesNacional(regimeTributario: string | null, crt: string | null): boolean {
  if (crt === '1' || crt === '2') return true
  const r = (regimeTributario || '').toLowerCase()
  return r === 'simples_nacional' || r === 'mei'
}

/** Defaults de tributação para Simples Nacional. */
export const SIMPLES_DEFAULTS = {
  csosn:       '102',  // Tributada sem permissão de crédito
  cstPis:      '49',   // Outras operações de saída
  cstCofins:   '49',
}

/** Defaults de tributação para Regime Normal (Lucro Presumido/Real). */
export const NORMAL_DEFAULTS = {
  cstIcms:     '00',   // Tributada integralmente
  cstPis:      '01',   // Operação tributável à alíquota básica
  cstCofins:   '01',
}
