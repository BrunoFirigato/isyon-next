import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateExcel } from '@/lib/excel/generate'
import { COLS_PRODUTOS } from '@/lib/excel/columns'

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
    .from('produtos')
    .select('nome, codigo, tipo, unidade, custo, preco, ncm, cest, cod_servico, origem, segmento, descricao')
    .eq('tenant_id', usuario.tenant_id)
    .order('nome')

  const tipo = params.get('tipo')
  if (tipo && tipo !== 'todos') query = query.eq('tipo', tipo)
  const q = params.get('q')
  if (q) query = query.or(`nome.ilike.%${q}%,codigo.ilike.%${q}%`)

  const { data: produtos } = await query
  const rows = (produtos ?? []).map(p => ({ ...p, origem: p.origem != null ? String(p.origem) : '' }))

  const buffer = await generateExcel(COLS_PRODUTOS, rows, 'Produtos')
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="produtos_${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  })
}
