// lib/nfe/brasilnfe.ts
// Cliente da API BrasilNFe — pré-visualização e emissão de NF-e.

import type { ResultadoNFe } from './types'

const BRASILNFE_URL = 'https://api.brasilnfe.com.br'

interface BrasilNFeResponse {
  Base64Xml?:  string
  Base64File?: string
  ReturnNF?: {
    Numero?:                number
    Serie?:                 number
    ChaveNF?:               string
    CodTipoAmbiente?:       number
    DsTipoAmbiente?:        string
    CodStatusRespostaSefaz?:number
    DsStatusRespostaSefaz?: string
    Ok?:                    boolean
  }
  Error?:  string
  Avisos?: string[]
}

function normalizar(data: BrasilNFeResponse): ResultadoNFe {
  const ret = data.ReturnNF
  const sefazOk = ret?.CodStatusRespostaSefaz === 100 || ret?.Ok === true
  const ok = sefazOk && !data.Error

  return {
    ok,
    chave:       ret?.ChaveNF,
    numero:      ret?.Numero,
    serie:       ret?.Serie,
    statusCod:   ret?.CodStatusRespostaSefaz,
    statusDesc:  ret?.DsStatusRespostaSefaz,
    ambiente:    ret?.DsTipoAmbiente,
    xmlBase64:   data.Base64Xml,
    danfeBase64: data.Base64File,
    error:       data.Error || (sefazOk ? undefined : ret?.DsStatusRespostaSefaz),
    avisos:      data.Avisos,
  }
}

async function postBrasilNFe(
  endpoint: string,
  token: string,
  payload: Record<string, unknown>,
): Promise<ResultadoNFe> {
  try {
    const res = await fetch(`${BRASILNFE_URL}/services/fiscal/${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Token': token },
      body:    JSON.stringify(payload),
    })

    const text = await res.text()
    let data: BrasilNFeResponse
    try { data = JSON.parse(text) } catch { data = { Error: text || `HTTP ${res.status}` } }

    if (res.status === 401 || res.status === 403)
      return { ok: false, error: 'Token inválido ou sem permissão' }

    return normalizar(data)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro de conexão com a BrasilNFe' }
  }
}

/** Pré-visualiza a NF-e (gera XML/DANFE sem transmitir à SEFAZ). */
export function previsualizarNFe(token: string, payload: Record<string, unknown>): Promise<ResultadoNFe> {
  return postBrasilNFe('PreVisualizarNotaFiscal', token, payload)
}

/** Emite a NF-e de forma síncrona (transmite à SEFAZ). */
export function emitirNFe(token: string, payload: Record<string, unknown>): Promise<ResultadoNFe> {
  return postBrasilNFe('EnviarNotaFiscal', token, payload)
}
