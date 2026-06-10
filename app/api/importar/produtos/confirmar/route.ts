import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ParsedRow } from '@/lib/excel/parse'

function num(v: string | undefined): number | null {
  if (!v) return null
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))
  return isNaN(n) ? null : n
}

/** Acha as classificações por nome (cria as que faltarem). Devolve mapa nome(lower)→id. */
async function resolveClassif(
  admin: ReturnType<typeof createAdminClient>,
  tabela: 'categorias' | 'familias',
  tenantId: string,
  nomes: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const distintos = [...new Set(nomes.map(n => n.trim()).filter(Boolean))]
  if (distintos.length === 0) return map
  const { data: existentes } = await admin.from(tabela).select('id, nome').eq('tenant_id', tenantId)
  for (const e of existentes ?? []) map.set(String(e.nome).trim().toLowerCase(), e.id as string)
  const faltantes = distintos.filter(n => !map.has(n.toLowerCase()))
  if (faltantes.length) {
    const { data: novos } = await admin.from(tabela)
      .insert(faltantes.map(nome => ({ tenant_id: tenantId, nome }))).select('id, nome')
    for (const n of novos ?? []) map.set(String(n.nome).trim().toLowerCase(), n.id as string)
  }
  return map
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

  // Resolve categorias/famílias por nome (cria as que faltarem)
  const catMap = await resolveClassif(admin, 'categorias', usuario.tenant_id, validas.map(r => r.dados.categoria ?? ''))
  const famMap = await resolveClassif(admin, 'familias',   usuario.tenant_id, validas.map(r => r.dados.familia ?? ''))

  const payload = validas.map(r => {
    const tipo = r.dados.tipo?.trim().toLowerCase() === 'servico' ? 'servico' : 'produto'
    const cat = r.dados.categoria?.trim()
    const fam = r.dados.familia?.trim()
    return {
      tenant_id:   usuario.tenant_id,
      nome:        r.dados.nome?.trim(),
      codigo:      r.dados.codigo?.trim()      || null,
      tipo,
      unidade:     r.dados.unidade?.trim().toUpperCase() || 'UN',
      custo:       num(r.dados.custo),
      preco:       null,
      ncm:         r.dados.ncm?.replace(/\D/g, '') || null,
      cest:        r.dados.cest?.trim()        || null,
      cod_servico: r.dados.cod_servico?.trim() || null,
      origem:      0,
      segmento:    r.dados.segmento?.trim()    || null,
      categoria_id: cat ? (catMap.get(cat.toLowerCase()) ?? null) : null,
      familia_id:   fam ? (famMap.get(fam.toLowerCase()) ?? null) : null,
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
