import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateExcel } from '@/lib/excel/generate'
import { COLS_CLIENTES } from '@/lib/excel/columns'

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
    .from('clientes')
    .select('nome, empresa, email, telefone, cpf_cnpj, status, segmento, vendedor_maq_id, parceiro_id, origem, cep, rua, numero, complemento, bairro, cidade, estado')
    .eq('tenant_id', usuario.tenant_id)
    .order('nome')

  const status = params.get('status')
  if (status && status !== 'todos') query = query.eq('status', status)

  const q = params.get('q')
  if (q) query = query.or(`nome.ilike.%${q}%,empresa.ilike.%${q}%`)

  const [{ data: clientes }, { data: vendedores }, { data: parceiros }] = await Promise.all([
    query,
    admin.from('vendedores').select('id, nome').eq('tenant_id', usuario.tenant_id),
    admin.from('parceiros').select('id, nome').eq('tenant_id', usuario.tenant_id),
  ])

  const vendMap = new Map((vendedores ?? []).map(v => [v.id, v.nome]))
  const parcMap = new Map((parceiros ?? []).map(p => [p.id, p.nome]))
  const rows = (clientes ?? []).map(({ vendedor_maq_id, parceiro_id, ...rest }) => ({
    ...rest,
    vendedor: vendedor_maq_id ? (vendMap.get(vendedor_maq_id) ?? '') : '',
    parceiro: parceiro_id ? (parcMap.get(parceiro_id) ?? '') : '',
  }))

  const buffer = await generateExcel(COLS_CLIENTES, rows, 'Clientes')

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="clientes_${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  })
}
