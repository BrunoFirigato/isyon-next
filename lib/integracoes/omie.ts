/**
 * Cliente da API do Omie (https://app.omie.com.br/api/v1).
 * Toda chamada envia app_key + app_secret no corpo (JSON), padrão do Omie.
 */

const OMIE_BASE = 'https://app.omie.com.br/api/v1'

interface OmieResult {
  httpOk: boolean
  status: number
  data: { faultstring?: string; faultcode?: string; [k: string]: unknown } | null
}

export async function omieCall(
  appKey: string, appSecret: string, path: string, call: string, param: Record<string, unknown>,
): Promise<OmieResult> {
  const res = await fetch(`${OMIE_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ call, app_key: appKey, app_secret: appSecret, param: [param] }),
  })
  const data = await res.json().catch(() => null)
  return { httpOk: res.ok, status: res.status, data }
}

export interface OmieProduto {
  codigo: string
  descricao: string
  valor_unitario: number
  unidade: string | null
  ncm: string | null
  descr_detalhada: string | null
}

/** Lista TODOS os produtos do Omie (paginado, teto de segurança de 100 páginas). */
export async function listarProdutosOmie(
  appKey: string, appSecret: string,
): Promise<{ ok: boolean; produtos?: OmieProduto[]; error?: string }> {
  try {
    const todos: OmieProduto[] = []
    let pagina = 1
    let totalPaginas = 1
    do {
      const r = await omieCall(appKey, appSecret, 'geral/produtos/', 'ListarProdutos', {
        pagina, registros_por_pagina: 100, filtrar_apenas_omiepdv: 'N',
      })
      const fault = r.data?.faultstring
      if (fault) {
        if (/registro/i.test(fault)) break       // base vazia
        return { ok: false, error: fault }
      }
      const lista = (r.data?.produto_servico_cadastro as Array<Record<string, unknown>>) ?? []
      for (const p of lista) {
        todos.push({
          codigo:          String(p.codigo ?? p.codigo_produto ?? ''),
          descricao:       String(p.descricao ?? ''),
          valor_unitario:  Number(p.valor_unitario ?? 0),
          unidade:         (p.unidade as string) || null,
          ncm:             (p.ncm as string) || null,
          descr_detalhada: (p.descr_detalhada as string) || null,
        })
      }
      totalPaginas = Number(r.data?.total_de_paginas ?? 1)
      pagina++
    } while (pagina <= totalPaginas && pagina <= 100)
    return { ok: true, produtos: todos }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro ao listar produtos do Omie' }
  }
}

export interface OmieCliente {
  nome: string
  empresa: string | null
  email: string | null
  telefone: string | null
  cpf_cnpj: string | null
  inscricao_estadual: string | null
  pessoa_fisica: boolean
  cep: string | null
  rua: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
}

/** Lista TODOS os clientes do Omie (paginado, teto de segurança de 200 páginas). */
export async function listarClientesOmie(
  appKey: string, appSecret: string,
): Promise<{ ok: boolean; clientes?: OmieCliente[]; error?: string }> {
  try {
    const todos: OmieCliente[] = []
    let pagina = 1
    let totalPaginas = 1
    do {
      const r = await omieCall(appKey, appSecret, 'geral/clientes/', 'ListarClientes', {
        pagina, registros_por_pagina: 100, apenas_importado_api: 'N',
      })
      const fault = r.data?.faultstring
      if (fault) {
        if (/registro/i.test(fault)) break
        return { ok: false, error: fault }
      }
      const lista = (r.data?.clientes_cadastro as Array<Record<string, unknown>>) ?? []
      for (const c of lista) {
        const ddd = String(c.telefone1_ddd ?? '').replace(/\D/g, '')
        const num = String(c.telefone1_numero ?? '').replace(/\D/g, '')
        const tel = (ddd || num) ? `(${ddd}) ${num}`.trim() : null
        todos.push({
          nome:               String(c.razao_social ?? c.nome_fantasia ?? c.cnpj_cpf ?? '').trim(),
          empresa:            (c.nome_fantasia as string) || (c.razao_social as string) || null,
          email:              (c.email as string) || null,
          telefone:           tel,
          cpf_cnpj:           (c.cnpj_cpf as string) || null,
          inscricao_estadual: (c.inscricao_estadual as string) || null,
          pessoa_fisica:      String(c.pessoa_fisica ?? 'N').toUpperCase() === 'S',
          cep:                String(c.cep ?? '').replace(/\D/g, '') || null,
          rua:                (c.endereco as string) || null,
          numero:             (c.endereco_numero as string) || null,
          complemento:        (c.complemento as string) || null,
          bairro:             (c.bairro as string) || null,
          cidade:             (c.cidade as string) || null,
          estado:             (c.estado as string) || null,
        })
      }
      totalPaginas = Number(r.data?.total_de_paginas ?? 1)
      pagina++
    } while (pagina <= totalPaginas && pagina <= 200)
    return { ok: true, clientes: todos }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro ao listar clientes do Omie' }
  }
}

/**
 * Valida as credenciais do Omie chamando um endpoint leve (ListarClientes, 1 registro).
 * "Não existem registros" conta como SUCESSO (chave válida, base apenas vazia).
 */
export async function testarOmie(appKey: string, appSecret: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await omieCall(appKey, appSecret, 'geral/clientes/', 'ListarClientes', { pagina: 1, registros_por_pagina: 1 })
    const fault = r.data?.faultstring
    if (fault) {
      if (/registro/i.test(fault)) return { ok: true }   // base vazia = credencial OK
      return { ok: false, error: fault }                  // ex: chave inválida
    }
    if (!r.httpOk) return { ok: false, error: `Omie respondeu HTTP ${r.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro de conexão com o Omie' }
  }
}
