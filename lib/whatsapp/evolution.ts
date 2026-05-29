/**
 * Cliente para a Evolution API v1.8.6
 * Documentação: https://doc.evolution-api.com
 */

export interface EvolutionConfig {
  url:      string   // ex: http://136.248.77.187:8080
  key:      string   // apikey
  instance: string   // nome da instância conectada
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
