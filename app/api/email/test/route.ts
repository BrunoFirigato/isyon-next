import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Testa uma chave Resend verificando se consegue listar os domínios.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { apiKey } = await req.json()
  if (!apiKey?.trim()) return NextResponse.json({ error: 'API key não informada' }, { status: 400 })

  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { 'Authorization': `Bearer ${apiKey.trim()}` },
    })

    if (res.status === 401 || res.status === 403)
      return NextResponse.json({ ok: false, error: 'API key inválida' })

    if (!res.ok)
      return NextResponse.json({ ok: false, error: `HTTP ${res.status}` })

    const data = await res.json().catch(() => null)
    const qtd  = data?.data?.length ?? 0
    return NextResponse.json({
      ok:     true,
      status: `API key válida ✓${qtd > 0 ? ` — ${qtd} domínio(s) configurado(s)` : ''}`,
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de conexão',
    })
  }
}
