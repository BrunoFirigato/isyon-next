import type { SupabaseClient } from '@supabase/supabase-js'
import { encrypt, readSecret } from '@/lib/crypto'

/**
 * Camada de serviço das Integrações (a "gaveta" + "cofre").
 * - Guarda uma integração por (tenant, provider) na tabela `integracoes`.
 * - As credenciais são CIFRADAS no banco (cofre) e só decifradas server-side.
 * - Sempre use o admin client (service_role) — chamadas server-side.
 */

export type Categoria = 'comercial' | 'erp' | 'automacao'
export type StatusIntegracao = 'conectado' | 'desconectado' | 'erro' | 'expirado'

export interface IntegracaoResumo {
  id: string
  provider: string
  categoria: string | null
  status: string
  conta_label: string | null
  atualizado_em: string
}

export interface IntegracaoComCredenciais extends IntegracaoResumo {
  credenciais: Record<string, string>
  config: Record<string, unknown>
}

interface SalvarInput {
  tenantId: string
  provider: string
  categoria?: Categoria
  credenciais?: Record<string, string>   // valores em texto puro — cifrados aqui dentro
  config?: Record<string, unknown>
  contaLabel?: string | null
  status?: StatusIntegracao
  criadoPor?: string | null
}

function cifrar(cred: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(cred).map(([k, v]) => [k, encrypt(String(v ?? ''))]))
}
function decifrar(cred: Record<string, string> | null | undefined): Record<string, string> {
  if (!cred) return {}
  return Object.fromEntries(Object.entries(cred).map(([k, v]) => [k, readSecret(v as string) ?? '']))
}

/** Cria ou atualiza a integração do tenant (uma por provider). Cifra as credenciais. */
export async function salvarIntegracao(admin: SupabaseClient, input: SalvarInput): Promise<{ id: string } | null> {
  const { tenantId, provider } = input
  const { data: existente } = await admin
    .from('integracoes').select('id').eq('tenant_id', tenantId).eq('provider', provider).maybeSingle()

  if (existente) {
    const patch: Record<string, unknown> = { atualizado_em: new Date().toISOString() }
    if (input.categoria !== undefined) patch.categoria = input.categoria
    if (input.config !== undefined) patch.config = input.config
    if (input.contaLabel !== undefined) patch.conta_label = input.contaLabel
    if (input.status !== undefined) patch.status = input.status
    if (input.credenciais !== undefined) patch.credenciais = cifrar(input.credenciais)
    await admin.from('integracoes').update(patch).eq('id', existente.id)
    return { id: existente.id as string }
  }

  const { data, error } = await admin.from('integracoes').insert({
    tenant_id: tenantId,
    provider,
    categoria: input.categoria ?? null,
    status: input.status ?? 'conectado',
    credenciais: input.credenciais ? cifrar(input.credenciais) : {},
    config: input.config ?? {},
    conta_label: input.contaLabel ?? null,
    criado_por: input.criadoPor ?? null,
  }).select('id').single()
  if (error || !data) return null
  return { id: data.id as string }
}

/** Lê a integração com as credenciais DECIFRADAS (uso server-side). */
export async function obterIntegracao(
  admin: SupabaseClient, tenantId: string, provider: string,
): Promise<IntegracaoComCredenciais | null> {
  const { data } = await admin.from('integracoes')
    .select('id, provider, categoria, status, conta_label, atualizado_em, credenciais, config')
    .eq('tenant_id', tenantId).eq('provider', provider).maybeSingle()
  if (!data) return null
  return {
    id: data.id as string,
    provider: data.provider as string,
    categoria: (data.categoria as string) ?? null,
    status: data.status as string,
    conta_label: (data.conta_label as string) ?? null,
    atualizado_em: data.atualizado_em as string,
    credenciais: decifrar(data.credenciais as Record<string, string>),
    config: (data.config as Record<string, unknown>) ?? {},
  }
}

/** Lista as integrações do tenant — SEM segredos (só status, para a UI). */
export async function listarIntegracoes(admin: SupabaseClient, tenantId: string): Promise<IntegracaoResumo[]> {
  const { data } = await admin.from('integracoes')
    .select('id, provider, categoria, status, conta_label, atualizado_em').eq('tenant_id', tenantId)
  return (data ?? []) as IntegracaoResumo[]
}

/** Marca o status da integração (ex.: 'erro' quando uma chamada falha). */
export async function definirStatus(
  admin: SupabaseClient, tenantId: string, provider: string, status: StatusIntegracao,
): Promise<void> {
  await admin.from('integracoes')
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq('tenant_id', tenantId).eq('provider', provider)
}

/** Registra um evento no log da integração (auditoria/diagnóstico). */
export async function logIntegracao(
  admin: SupabaseClient,
  input: { tenantId: string; integracaoId?: string | null; evento: string; nivel?: 'info' | 'warn' | 'error'; mensagem?: string; payload?: unknown },
): Promise<void> {
  await admin.from('integracao_logs').insert({
    tenant_id: input.tenantId,
    integracao_id: input.integracaoId ?? null,
    evento: input.evento,
    nivel: input.nivel ?? 'info',
    mensagem: input.mensagem ?? null,
    payload: input.payload ?? null,
  })
}
