import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateExcel } from '@/lib/excel/generate'
import { COLS_LEADS } from '@/lib/excel/columns'

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
    .from('leads')
    .select('nome, empresa, email, telefone, cargo, vendedor_id, cidade, estado, faturamento, funcionarios, score, status, origem, obs')
    .eq('tenant_id', usuario.tenant_id)
    .order('nome')

  const status = params.get('status')
  if (status && status !== 'todos') query = query.eq('status', status)

  const q = params.get('q')
  if (q) query = query.or(`nome.ilike.%${q}%,empresa.ilike.%${q}%`)

  const [{ data: leads }, { data: vendedores }] = await Promise.all([
    query,
    admin.from('vendedores').select('id, nome').eq('tenant_id', usuario.tenant_id),
  ])

  // Resolve o nome do vendedor responsável a partir do vendedor_id
  const vendMap = new Map((vendedores ?? []).map(v => [v.id, v.nome]))
  const rows = (leads ?? []).map(({ vendedor_id, ...rest }) => ({
    ...rest,
    vendedor: vendedor_id ? (vendMap.get(vendedor_id) ?? '') : '',
  }))

  const buffer = await generateExcel(COLS_LEADS, rows, 'Leads')

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="leads_${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  })
}
