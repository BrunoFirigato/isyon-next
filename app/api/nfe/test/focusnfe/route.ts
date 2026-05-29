import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Testa a conexão com a API Focus NFe.
 * Endpoint de verificação: GET /v2/empresas
 * Autenticação: Basic auth com token como usuário e senha vazia
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { token } = await req.json()
  if (!token?.trim()) return NextResponse.json({ error: 'Token não informado' }, { status: 400 })

  try {
    // Focus NFe usa Basic auth: token como username, senha vazia
    const credentials = Buffer.from(`${token.trim()}:`).toString('base64')

    const res = await fetch('https://homologacao.focusnfe.com.br/v2/empresas', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    })

    if (res.status === 401 || res.status === 403)
      return NextResponse.json({ ok: false, error: 'Token inválido ou sem permissão' })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return NextResponse.json({ ok: false, error: `HTTP ${res.status}: ${body}` })
    }

    const data = await res.json().catch(() => null)
    const qtd  = Array.isArray(data) ? data.length : null
    return NextResponse.json({
      ok:     true,
      status: qtd !== null ? `Token válido ✓ — ${qtd} empresa(s) cadastrada(s)` : 'Token válido ✓',
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de conexão',
    })
  }
}
