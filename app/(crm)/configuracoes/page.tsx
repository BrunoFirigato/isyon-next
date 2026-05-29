import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConfiguracoesView from './_components/ConfiguracoesView'
import { DEFAULT_SEGMENTOS } from '@/app/(crm)/_components/SegmentosContext'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: usuario }, { data: configs }] = await Promise.all([
    supabase.from('usuarios').select('id, tenant_id').eq('auth_id', user.id).limit(1).maybeSingle(),
    supabase.from('config_usuario').select('id, usuario_id, chave, valor'),
  ])

  const tenantId = usuario?.tenant_id
  if (!tenantId) redirect('/dashboard')

  const { data: tenantData } = await supabase
    .from('tenants')
    .select(`
      id, nome, plano, status, criado_em,
      segmentos, whatsapp_template, email_template_assunto, email_template_corpo,
      evolution_url, evolution_key, evolution_instance,
      razao_social, nome_fantasia, cnpj,
      inscricao_estadual, inscricao_municipal, regime_tributario, crt, cnae,
      cep, rua, numero, complemento, bairro, cidade, estado,
      telefone, email_empresa, website
    `)
    .eq('id', tenantId)
    .maybeSingle()

  if (!tenantData) redirect('/dashboard')

  const segmentosIniciais = (tenantData.segmentos as typeof DEFAULT_SEGMENTOS | null) ?? DEFAULT_SEGMENTOS

  return (
    <ConfiguracoesView
      tenant={tenantData}
      configs={configs ?? []}
      usuarioId={usuario?.id ?? ''}
      segmentosIniciais={segmentosIniciais}
    />
  )
}
