import type { SupabaseClient } from '@supabase/supabase-js'

export interface CarteiraScope {
  /** true quando o usuário deve ver apenas a própria carteira. */
  restrict:   boolean
  /** id do vendedor do usuário logado (quando restrito). */
  vendedorId: string | null
}

/**
 * Determina se a listagem deve ser restrita à carteira do vendedor logado.
 *
 * Restringe quando, simultaneamente:
 *  1. o tenant tem `divisao_carteira` ativa;
 *  2. o usuário tem perfil 'vendedor';
 *  3. existe um cadastro em `vendedores` com o e-mail do usuário.
 *
 * Gestores/admins nunca são restritos.
 */
export async function getCarteiraScope(supabase: SupabaseClient): Promise<CarteiraScope> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { restrict: false, vendedorId: null }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('perfil, tenant_id')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (usuario?.perfil !== 'vendedor' || !usuario.tenant_id)
    return { restrict: false, vendedorId: null }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('divisao_carteira')
    .eq('id', usuario.tenant_id)
    .maybeSingle()

  if (!tenant?.divisao_carteira) return { restrict: false, vendedorId: null }

  const { data: vend } = await supabase
    .from('vendedores')
    .select('id')
    .eq('email', user.email)
    .eq('status', 'ativo')
    .limit(1)
    .maybeSingle()

  return { restrict: !!vend, vendedorId: vend?.id ?? null }
}
