import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase com service_role — bypassa RLS.
 * Usar APENAS em route handlers (app/api/**) — NUNCA no browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada em .env.local')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
