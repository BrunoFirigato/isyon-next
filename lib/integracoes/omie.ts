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
