import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Testa a conexão com a API BrasilNFe.
 * Endpoint de verificação: GET /v1/empresas
 * Autenticação: Bearer token no header Authorization
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { token } = await req.json()
  if (!token?.trim()) return NextResponse.json({ error: 'Token não informado' }, { status: 400 })

  try {
    // BrasilNFe — endpoint de consulta de empresas cadastradas
    // Ajuste a URL base conforme o ambiente da sua conta
    const res = await fetch('https://api.brasilnfe.com.br/v1/empresas', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
      },
    })

    if (res.status === 401 || res.status === 403)
      return NextResponse.json({ ok: false, error: 'Token inválido ou sem permissão' })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return NextResponse.json({ ok: false, error: `HTTP ${res.status}: ${body}` })
    }

    return NextResponse.json({ ok: true, status: 'Token válido ✓' })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de conexão',
    })
  }
}
