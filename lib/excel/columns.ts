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
  { header: 'Nome *',        key: 'nome',         width: 32 },
  { header: 'Empresa',       key: 'empresa',      width: 28 },
  { header: 'E-mail',        key: 'email',        width: 32 },
  { header: 'Telefone',      key: 'telefone',     width: 18 },
  { header: 'Cargo',         key: 'cargo',        width: 20 },
  { header: 'Vendedor',      key: 'vendedor',     width: 22 }, // nome do vendedor responsável
  { header: 'Cidade',        key: 'cidade',       width: 22 },
  { header: 'Estado',        key: 'estado',       width:  8 },
  { header: 'Faturamento',   key: 'faturamento',  width: 26 },
  { header: 'Funcionários',  key: 'funcionarios', width: 14 },
  { header: 'Score',         key: 'score',        width: 12 }, // quente | morno | frio
  { header: 'Status',        key: 'status',       width: 14 }, // novo | contato | qualificado | perdido
  { header: 'Origem *',      key: 'origem',       width: 18 },
  { header: 'Observações',   key: 'obs',          width: 45 },
]

export const EXEMPLO_LEAD = {
  nome:         'Maria Oliveira',
  empresa:      'Tech Solutions',
  email:        'maria@techsolutions.com.br',
  telefone:     '(21) 98888-1234',
  cargo:        'Comprador(a)',
  vendedor:     'João Souza',
  cidade:       'Rio de Janeiro',
  estado:       'RJ',
  faturamento:  'R$ 360 mil – 4,8 mi (EPP)',
  funcionarios: '10 a 49',
  score:        'quente',
  status:       'novo',
  origem:       'Site',
  obs:          'Demonstrou interesse no produto A',
}

// ── Produtos ──────────────────────────────────────────────────────────────────
export const COLS_PRODUTOS: ColDef[] = [
  { header: 'Nome *',       key: 'nome',        width: 36 },
  { header: 'Código',       key: 'codigo',      width: 16 },
  { header: 'Tipo',         key: 'tipo',        width: 12 }, // produto | servico
  { header: 'Unidade',      key: 'unidade',     width: 10 },
  { header: 'Custo',        key: 'custo',       width: 12 },
  { header: 'Preço',        key: 'preco',       width: 12 },
  { header: 'NCM',          key: 'ncm',         width: 12 },
  { header: 'CEST',         key: 'cest',        width: 12 },
  { header: 'Cód. Serviço', key: 'cod_servico', width: 14 },
  { header: 'Origem',       key: 'origem',      width: 10 }, // 0..8
  { header: 'Segmento',     key: 'segmento',    width: 16 },
  { header: 'Descrição',    key: 'descricao',   width: 40 },
]

export const EXEMPLO_PRODUTO = {
  nome:        'Notebook Dell Latitude',
  codigo:      'NB001',
  tipo:        'produto',
  unidade:     'un',
  custo:       '3000.00',
  preco:       '4500.00',
  ncm:         '84713012',
  cest:        '',
  cod_servico: '',
  origem:      '0',
  segmento:    '',
  descricao:   'Notebook i7 16GB',
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
