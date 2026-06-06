/**
 * Cliente para a Evolution API v1.8.6
 * Documentação: https://doc.evolution-api.com
 */

export interface EvolutionConfig {
  url:      string   // ex: http://136.248.77.187:8080
  key:      string   // apikey
  instance: string   // nome da instância conectada
}

/** Credenciais do servidor Evolution (sem instância — várias instâncias compartilham url+key). */
export interface EvolutionServer { url: string; key: string }

const base = (url: string) => url.replace(/\/+$/, '')
const hdrs = (key: string) => ({ apikey: key, 'Content-Type': 'application/json' })

/** Cria uma nova instância (número) e já solicita o QR Code. */
export async function createInstance(srv: EvolutionServer, instanceName: string): Promise<{ ok: boolean; qrBase64?: string | null; error?: string }> {
  try {
    const res = await fetch(`${base(srv.url)}/instance/create`, {
      method: 'POST', headers: hdrs(srv.key),
      body: JSON.stringify({ instanceName, qrcode: true }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: `Evolution ${res.status}: ${JSON.stringify(d).slice(0, 200)}` }
    return { ok: true, qrBase64: d?.qrcode?.base64 ?? d?.base64 ?? null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro de conexão' }
  }
}

/** Obtém o QR Code (ou pairing code) para conectar/reconectar uma instância existente. */
export async function connectInstance(srv: EvolutionServer, instanceName: string): Promise<{ ok: boolean; qrBase64?: string | null; code?: string | null; error?: string }> {
  try {
    const res = await fetch(`${base(srv.url)}/instance/connect/${encodeURIComponent(instanceName)}`, { headers: hdrs(srv.key) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: `Evolution ${res.status}` }
    return { ok: true, qrBase64: d?.base64 ?? d?.qrcode?.base64 ?? null, code: d?.code ?? d?.pairingCode ?? null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro de conexão' }
  }
}

/** Estado da conexão de uma instância: 'open' (conectado), 'connecting', 'close'. */
export async function connectionState(srv: EvolutionServer, instanceName: string): Promise<{ ok: boolean; state?: string; error?: string }> {
  try {
    const res = await fetch(`${base(srv.url)}/instance/connectionState/${encodeURIComponent(instanceName)}`, { headers: hdrs(srv.key) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: `Evolution ${res.status}` }
    return { ok: true, state: d?.instance?.state ?? d?.state ?? 'desconhecido' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro de conexão' }
  }
}

/** Desconecta a sessão (logout) de uma instância. */
export async function logoutInstance(srv: EvolutionServer, instanceName: string): Promise<void> {
  await fetch(`${base(srv.url)}/instance/logout/${encodeURIComponent(instanceName)}`, { method: 'DELETE', headers: hdrs(srv.key) }).catch(() => {})
}

/** Remove a instância do servidor Evolution. */
export async function deleteInstance(srv: EvolutionServer, instanceName: string): Promise<void> {
  await fetch(`${base(srv.url)}/instance/delete/${encodeURIComponent(instanceName)}`, { method: 'DELETE', headers: hdrs(srv.key) }).catch(() => {})
}

/** Lista todas as instâncias do servidor com seus estados (1 chamada). */
export async function listInstances(srv: EvolutionServer): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${base(srv.url)}/instance/fetchInstances`, { headers: { apikey: srv.key } })
    const d = await res.json().catch(() => [])
    const map: Record<string, string> = {}
    if (Array.isArray(d)) {
      d.forEach((i: { instance?: { instanceName?: string; state?: string; status?: string } }) => {
        const n = i?.instance?.instanceName
        if (n) map[n] = i?.instance?.state ?? i?.instance?.status ?? 'desconhecido'
      })
    }
    return map
  } catch {
    return {}
  }
}

/**
 * Envia uma mensagem de texto via WhatsApp.
 * @param config   Credenciais da Evolution API
 * @param to       Número no formato DDI+DDD+número (ex: 5511999999999)
 * @param text     Texto da mensagem
 */
export async function sendWhatsApp(
  config: EvolutionConfig,
  to:     string,
  text:   string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const phone = to.replace(/\D/g, '')
    if (!phone) return { ok: false, error: 'Número inválido' }

    const res = await fetch(
      `${config.url.replace(/\/$/, '')}/message/sendText/${config.instance}`,
      {
        method:  'POST',
        headers: {
          'apikey':       config.key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number:      phone,
          textMessage: { text },
        }),
      }
    )

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, error: `Evolution API ${res.status}: ${body}` }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }
}

/**
 * Testa a conexão com a Evolution API verificando o status da instância.
 */
export async function checkInstance(
  config: EvolutionConfig,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  try {
    const res = await fetch(
      `${config.url.replace(/\/$/, '')}/instance/fetchInstances`,
      {
        headers: { 'apikey': config.key },
      }
    )
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }

    const data = await res.json()
    const inst = Array.isArray(data)
      ? data.find((i: { instance?: { instanceName?: string } }) =>
          i?.instance?.instanceName === config.instance
        )
      : null

    if (!inst) return { ok: false, error: 'Instância não encontrada' }

    const status = inst?.instance?.status ?? inst?.state ?? 'desconhecido'
    return { ok: true, status }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro de conexão' }
  }
}
