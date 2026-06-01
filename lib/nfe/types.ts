// lib/nfe/types.ts
// Tipos internos do módulo NF-e (independentes do provedor)

export interface FilialFiscal {
  cnpj:               string | null
  razao_social:       string | null
  nome:               string | null
  inscricao_estadual: string | null
  inscricao_municipal:string | null
  regime_tributario:  string | null
  crt:                string | null
  estado:             string | null   // UF do emitente
  cidade:             string | null
  ambiente_nfe:       string | null   // 'homologacao' | 'producao'
  aliq_pis:           number | null
  aliq_cofins:        number | null
}

export interface ClienteFiscal {
  nome:               string | null
  cpf_cnpj:           string | null
  inscricao_estadual: string | null
  indicador_ie:       string | null
  email:              string | null
  telefone:           string | null
  cep:         string | null
  rua:         string | null
  numero:      string | null
  complemento: string | null
  bairro:      string | null
  cidade:      string | null
  estado:      string | null
}

/** Item já resolvido com dados fiscais (NCM + CFOP). */
export interface ItemFiscal {
  descricao:     string
  quantidade:    number
  valorUnitario: number
  ncm:           string
  cfop:          string
  unidade:       string
  origem:        string         // '0'..'8'
  tipo:          'produto' | 'servico'
}

export interface DadosEmissao {
  numero:          string
  serie:           string
  data:            string       // ISO date (YYYY-MM-DD)
  naturezaOp:      string       // descrição da natureza
  dadosAdicionais: string
}

/** Resultado normalizado de uma emissão/pré-visualização. */
export interface ResultadoNFe {
  ok:           boolean
  chave?:       string
  numero?:      number | string
  serie?:       number | string
  statusCod?:   number
  statusDesc?:  string
  ambiente?:    string
  xmlBase64?:   string
  danfeBase64?: string
  error?:       string
  avisos?:      string[]
}
