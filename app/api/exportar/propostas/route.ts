import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateExcel } from '@/lib/excel/generate'
import { COLS_PROPOSTAS } from '@/lib/excel/columns'

function brl(v: number | null) {
  if (v == null) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR')
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios').select('tenant_id').eq('auth_id', user.id).maybeSingle()
  if (!usuario?.tenant_id) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 403 })

  const admin = createAdminClient()
  const params = req.nextUrl.searchParams

  let query = admin
    .from('propostas')
    .select('numero, titulo, status, valor, validade, segmento, criado_em')
    .eq('tenant_id', usuario.tenant_id)
    .order('criado_em', { ascending: false })

  const status = params.get('status')
  if (status && status !== 'todos') query = query.eq('status', status)

  const { data: propostas } = await query
  const rows = (propostas ?? []).map(p => ({
    ...p,
    valor:     brl(p.valor),
    validade:  fmtDate(p.validade),
    criado_em: fmtDate(p.criado_em),
  }))

  const buffer = await generateExcel(COLS_PROPOSTAS, rows, 'Propostas')

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="propostas_${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  })
}
