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

  const payload = validas.map(r => ({
    tenant_id:   usuario.tenant_id,
    nome:        r.dados.nome?.trim(),
    empresa:     r.dados.empresa?.trim()     || null,
    email:       r.dados.email?.trim()       || null,
    telefone:    r.dados.telefone?.trim()    || null,
    cpf_cnpj:    r.dados.cpf_cnpj?.replace(/\D/g, '') || null,
    status:      r.dados.status?.trim()      || 'ativo',
    segmento:    r.dados.segmento?.trim()    || null,
    origem:      r.dados.origem?.trim()      || null,
    cep:         r.dados.cep?.replace(/\D/g, '') || null,
    rua:         r.dados.rua?.trim()         || null,
    numero:      r.dados.numero?.trim()      || null,
    complemento: r.dados.complemento?.trim() || null,
    bairro:      r.dados.bairro?.trim()      || null,
    cidade:      r.dados.cidade?.trim()      || null,
    estado:      r.dados.estado?.trim()      || null,
  }))

  // Inserir em lotes de 100
  const BATCH = 100
  let inseridos = 0
  const erros: string[] = []

  for (let i = 0; i < payload.length; i += BATCH) {
    const batch = payload.slice(i, i + BATCH)
    const { error, count } = await admin
      .from('clientes')
      .insert(batch, { count: 'exact' })

    if (error) {
      erros.push(`Lote ${Math.floor(i / BATCH) + 1}: ${error.message}`)
    } else {
      inseridos += count ?? batch.length
    }
  }

  return NextResponse.json({ ok: true, inseridos, erros })
}
