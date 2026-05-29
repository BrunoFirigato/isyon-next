import type { Column } from 'exceljs'

export type ColDef = Partial<Column> & { key: string; header: string; width: number }

// ── Clientes ──────────────────────────────────────────────────────────────────
export const COLS_CLIENTES: ColDef[] = [
  { header: 'Nome *',        key: 'nome',        width: 32 },
  { header: 'Empresa',       key: 'empresa',     width: 28 },
  { header: 'E-mail',        key: 'email',       width: 32 },
  { header: 'Telefone',      key: 'telefone',    width: 18 },
  { header: 'CPF/CNPJ',      key: 'cpf_cnpj',   width: 20 },
  { header: 'Status',        key: 'status',      width: 14 },  // ativo | prospect | inativo
  { header: 'Segmento',      key: 'segmento',    width: 18 },
  { header: 'Origem',        key: 'origem',      width: 18 },
  { header: 'CEP',           key: 'cep',         width: 12 },
  { header: 'Rua',           key: 'rua',         width: 30 },
  { header: 'Número',        key: 'numero',      width: 10 },
  { header: 'Complemento',   key: 'complemento', width: 20 },
  { header: 'Bairro',        key: 'bairro',      width: 20 },
  { header: 'Cidade',        key: 'cidade',      width: 22 },
  { header: 'Estado',        key: 'estado',      width:  8 },
]

export const EXEMPLO_CLIENTE = {
  nome:        'João da Silva',
  empresa:     'ACME Ltda',
  email:       'joao@acme.com.br',
  telefone:    '(11) 99999-0000',
  cpf_cnpj:    '12.345.678/0001-99',
  status:      'ativo',
  segmento:    '',
  origem:      'Indicação',
  cep:         '01310-100',
  rua:         'Av. Paulista',
  numero:      '1000',
  complemento: 'Sala 5',
  bairro:      'Bela Vista',
  cidade:      'São Paulo',
  estado:      'SP',
}

// ── Leads ─────────────────────────────────────────────────────────────────────
export const COLS_LEADS: ColDef[] = [
  { header: 'Nome *',     key: 'nome',     width: 32 },
  { header: 'Empresa',    key: 'empresa',  width: 28 },
  { header: 'E-mail',     key: 'email',    width: 32 },
  { header: 'Telefone',   key: 'telefone', width: 18 },
  { header: 'Status',     key: 'status',   width: 14 }, // novo | contato | qualificado | perdido
  { header: 'Origem',     key: 'origem',   width: 18 },
  { header: 'Observações',key: 'obs',      width: 45 },
]

export const EXEMPLO_LEAD = {
  nome:     'Maria Oliveira',
  empresa:  'Tech Solutions',
  email:    'maria@techsolutions.com.br',
  telefone: '(21) 98888-1234',
  status:   'novo',
  origem:   'Site',
  obs:      'Demonstrou interesse no produto A',
}

// ── Oportunidades ─────────────────────────────────────────────────────────────
export const COLS_OPORTUNIDADES: ColDef[] = [
  { header: 'Número',   key: 'numero',     width: 14 },
  { header: 'Título',   key: 'titulo',     width: 40 },
  { header: 'Status',   key: 'status',     width: 14 },
  { header: 'Etapa',    key: 'etapa',      width: 20 },
  { header: 'Valor',    key: 'valor',      width: 16 },
  { header: 'Segmento', key: 'segmento',   width: 18 },
  { header: 'Criado em',key: 'criado_em',  width: 18 },
]

// ── Propostas ─────────────────────────────────────────────────────────────────
export const COLS_PROPOSTAS: ColDef[] = [
  { header: 'Número',   key: 'numero',    width: 14 },
  { header: 'Título',   key: 'titulo',    width: 40 },
  { header: 'Status',   key: 'status',    width: 14 },
  { header: 'Valor',    key: 'valor',     width: 16 },
  { header: 'Validade', key: 'validade',  width: 14 },
  { header: 'Segmento', key: 'segmento',  width: 18 },
  { header: 'Criado em',key: 'criado_em', width: 18 },
]

// ── Pedidos ───────────────────────────────────────────────────────────────────
export const COLS_PEDIDOS: ColDef[] = [
  { header: 'Número',   key: 'numero',    width: 14 },
  { header: 'Status',   key: 'status',    width: 14 },
  { header: 'Valor',    key: 'valor',     width: 16 },
  { header: 'Segmento', key: 'segmento',  width: 18 },
  { header: 'Criado em',key: 'criado_em', width: 18 },
]
