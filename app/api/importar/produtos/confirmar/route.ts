import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ParsedRow } from '@/lib/excel/parse'

function num(v: string | undefined): number | null {
  if (!v) return null
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))
  return isNaN(n) ? null : n
}

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

  const payload = validas.map(r => {
    const tipo = r.dados.tipo?.trim().toLowerCase() === 'servico' ? 'servico' : 'produto'
    const origemDig = r.dados.origem?.replace(/\D/g, '')
    return {
      tenant_id:   usuario.tenant_id,
      nome:        r.dados.nome?.trim(),
      codigo:      r.dados.codigo?.trim()      || null,
      tipo,
      unidade:     r.dados.unidade?.trim().toUpperCase() || 'UN',
      custo:       num(r.dados.custo),
      preco:       num(r.dados.preco),
      ncm:         r.dados.ncm?.replace(/\D/g, '') || null,
      cest:        r.dados.cest?.trim()        || null,
      cod_servico: r.dados.cod_servico?.trim() || null,
      origem:      origemDig ? parseInt(origemDig) : 0,
      segmento:    r.dados.segmento?.trim()    || null,
      descricao:   r.dados.descricao?.trim()   || null,
      ativo:       true,
    }
  })

  const BATCH = 200
  let inseridos = 0
  const erros: string[] = []

  for (let i = 0; i < payload.length; i += BATCH) {
    const batch = payload.slice(i, i + BATCH)
    const { error, count } = await admin.from('produtos').insert(batch, { count: 'exact' })

    if (!error) { inseridos += count ?? batch.length; continue }

    // Fallback: insere uma a uma para não perder o lote inteiro por causa de poucas linhas
    for (const row of batch) {
      const { error: rowErr } = await admin.from('produtos').insert(row)
      if (rowErr) erros.push(`"${row.nome}": ${rowErr.message}`)
      else inseridos++
    }
  }

  return NextResponse.json({ ok: true, inseridos, erros })
}
