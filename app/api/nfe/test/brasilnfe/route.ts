import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BRASILNFE_URL = 'https://api.brasilnfe.com.br'

/**
 * Testa a conexão com a API BrasilNFe.
 * Autenticação: token no header 'Token' (não Bearer).
 * Endpoint: GET /services/fiscal/ConsultarEmitente
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { token } = await req.json()
  if (!token?.trim()) return NextResponse.json({ error: 'Token não informado' }, { status: 400 })

  try {
    const res = await fetch(`${BRASILNFE_URL}/services/fiscal/ConsultarEmitente`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Token': token.trim() },
    })

    if (res.status === 401 || res.status === 403)
      return NextResponse.json({ ok: false, error: 'Token inválido ou sem permissão' })

    if (res.ok) {
      const data = await res.json().catch(() => null)
      const empresa = data?.NmEmpresa ?? data?.nome ?? data?.razaoSocial ?? null
      return NextResponse.json({
        ok: true,
        status: empresa ? `Token válido ✓ — ${empresa}` : 'Token válido ✓',
      })
    }

    // Endpoint não encontrado — tenta ListarEmpresas para validar o token
    const res2 = await fetch(`${BRASILNFE_URL}/services/fiscal/ListarEmpresas`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Token': token.trim() },
    })

    if (res2.status === 401 || res2.status === 403)
      return NextResponse.json({ ok: false, error: 'Token inválido' })

    return NextResponse.json({ ok: true, status: 'Token válido ✓' })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de conexão',
    })
  }
}
