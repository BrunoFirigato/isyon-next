import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ParsedRow } from '@/lib/excel/parse'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios').select('tenant_id').eq('auth_id', user.id).maybeSingle()
  if (!usuario?.tenant_id) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 403 })

  const { rows }: { rows: ParsedRow[] } = await req.json()
  const validas = rows.filter(r => r.valido)

  if (validas.length === 0)
    return NextResponse.json({ error: 'Nenhuma linha válida para importar' }, { status: 400 })

  const admin = createAdminClient()

  // Mapa nome (minúsculo) → id para resolver o vendedor responsável da planilha
  const { data: vendedores } = await admin
    .from('vendedores').select('id, nome').eq('tenant_id', usuario.tenant_id)
  const vendByNome = new Map((vendedores ?? []).map(v => [v.nome.trim().toLowerCase(), v.id]))

  const scoreValidos = new Set(['quente', 'morno', 'frio'])
  // Status aceitos pela trava do banco; fora disso, vira 'novo'
  const STATUS_OK = ['novo', 'contato', 'qualificado', 'convertido', 'perdido']

  const payload = validas.map(r => {
    const vendNome = r.dados.vendedor?.trim().toLowerCase()
    const score    = r.dados.score?.trim().toLowerCase()
    const statusRaw = (r.dados.status?.trim().toLowerCase()) || 'novo'
    return {
      tenant_id:    usuario.tenant_id,
      nome:         r.dados.nome?.trim(),
      empresa:      r.dados.empresa?.trim()      || null,
      email:        r.dados.email?.trim()        || null,
      telefone:     r.dados.telefone?.trim()     || null,
      cargo:        r.dados.cargo?.trim()        || null,
      vendedor_id:  vendNome ? (vendByNome.get(vendNome) ?? null) : null,
      cidade:       r.dados.cidade?.trim()       || null,
      estado:       r.dados.estado?.trim()       || null,
      faturamento:  r.dados.faturamento?.trim()  || null,
      funcionarios: r.dados.funcionarios?.trim() || null,
      score:        score && scoreValidos.has(score) ? score : null,
      status:       STATUS_OK.includes(statusRaw) ? statusRaw : 'novo',
      origem:       r.dados.origem?.trim()        || null,
      obs:          r.dados.obs?.trim()           || null,
    }
  })

  const BATCH = 100
  let inseridos = 0
  const erros: string[] = []

  for (let i = 0; i < payload.length; i += BATCH) {
    const batch = payload.slice(i, i + BATCH)
    const { error, count } = await admin.from('leads').insert(batch, { count: 'exact' })

    if (!error) { inseridos += count ?? batch.length; continue }

    // Fallback: insere uma a uma para não perder o lote inteiro por causa de poucas linhas
    for (const row of batch) {
      const { error: rowErr } = await admin.from('leads').insert(row)
      if (rowErr) erros.push(`"${row.nome}": ${rowErr.message}`)
      else inseridos++
    }
  }

  return NextResponse.json({ ok: true, inseridos, erros })
}
