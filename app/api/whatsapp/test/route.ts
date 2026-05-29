import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkInstance } from '@/lib/whatsapp/evolution'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { url, key, instance } = await req.json()

  if (!url || !key || !instance)
    return NextResponse.json({ error: 'url, key e instance são obrigatórios' }, { status: 400 })

  const result = await checkInstance({ url, key, instance })
  return NextResponse.json(result)
}
