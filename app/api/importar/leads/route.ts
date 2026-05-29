import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTemplate } from '@/lib/excel/generate'
import { parseExcel } from '@/lib/excel/parse'
import { COLS_LEADS, EXEMPLO_LEAD } from '@/lib/excel/columns'

const REQUIRED = ['nome']
const MAX_ROWS  = 1000

export async function GET() {
  const buffer = await generateTemplate(COLS_LEADS, EXEMPLO_LEAD, 'Leads')
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template_leads.xlsx"',
    },
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const rows   = await parseExcel(buffer, COLS_LEADS, REQUIRED)

  if (rows.length > MAX_ROWS)
    return NextResponse.json({ error: `Máximo de ${MAX_ROWS} linhas por importação.` }, { status: 400 })

  return NextResponse.json({
    rows,
    total:    rows.length,
    validos:  rows.filter(r => r.valido).length,
    invalidos:rows.filter(r => !r.valido).length,
  })
}
