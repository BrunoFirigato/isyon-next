'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/app/(crm)/_components/Toast'

interface Tenant {
  id: string
  nome: string
  plano: string | null
  status: string | null
  criado_em: string
}

interface ConfigUsuario {
  id: string
  usuario_id: string
  chave: string
  valor: string
}

interface Props {
  tenant: Tenant
  configs: ConfigUsuario[]
  usuarioId: string
}

const CONFIG_LABELS: Record<string, string> = {
  dias_sem_contato: 'Dias sem contato (alerta)',
  dias_followup:    'Dias para follow-up',
  dias_op_parada:   'Dias de oportunidade parada',
  dias_proposta:    'Dias de proposta sem retorno',
  meta_global:      'Meta mensal (R$)',
}

const CONFIG_DEFAULTS: Record<string, string> = {
  dias_sem_contato: '30',
  dias_followup:    '7',
  dias_op_parada:   '14',
  dias_proposta:    '15',
  meta_global:      '0',
}

export default function ConfiguracoesView({ tenant, configs, usuarioId }: Props) {
  const router = useRouter()
  const toast = useToast()

  const [nomeEmpresa, setNomeEmpresa] = useState(tenant.nome)
  const [savingEmpresa, setSavingEmpresa] = useState(false)
  const [successEmpresa, setSuccessEmpresa] = useState(false)

  const configMap = new Map(configs.map((c) => [c.chave, c]))
  const [valores, setValores] = useState<Record<string, string>>(
    Object.keys(CONFIG_LABELS).reduce((acc, chave) => {
      acc[chave] = configMap.get(chave)?.valor ?? CONFIG_DEFAULTS[chave]
      return acc
    }, {} as Record<string, string>)
  )
  const [savingConfig, setSavingConfig] = useState(false)
  const [successConfig, setSuccessConfig] = useState(false)

  async function salvarEmpresa(e: React.FormEvent) {
    e.preventDefault()
    setSavingEmpresa(true)
    const supabase = createClient()
    await supabase.from('tenants').update({ nome: nomeEmpresa.trim() }).eq('id', tenant.id)
    setSavingEmpresa(false)
    setSuccessEmpresa(true)
    setTimeout(() => setSuccessEmpresa(false), 2000)
    toast('Dados da empresa salvos!')
    router.refresh()
  }

  async function salvarConfigs(e: React.FormEvent) {
    e.preventDefault()
    setSavingConfig(true)
    const supabase = createClient()

    for (const [chave, valor] of Object.entries(valores)) {
      const existing = configMap.get(chave)
      if (existing) {
        await supabase.from('config_usuario').update({ valor }).eq('id', existing.id)
      } else {
        await supabase.from('config_usuario').insert({ usuario_id: usuarioId, chave, valor })
      }
    }

    setSavingConfig(false)
    setSuccessConfig(true)
    setTimeout(() => setSuccessConfig(false), 2000)
    toast('Preferências salvas!')
    router.refresh()
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie as configurações da empresa e preferências</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Dados da empresa */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Building2 size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Dados da empresa</h2>
          </div>
          <form onSubmit={salvarEmpresa} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome da empresa</label>
              <input
                type="text" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Plano</label>
                <p className="text-sm text-gray-900 py-2">{tenant.plano ?? '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg mt-1 ${
                  tenant.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tenant.status ?? '—'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit" disabled={savingEmpresa}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Save size={14} />
                {savingEmpresa ? 'Salvando...' : 'Salvar'}
              </button>
              {successEmpresa && (
                <span className="text-sm text-green-600 font-medium">Salvo!</span>
              )}
            </div>
          </form>
        </div>

        {/* Preferências comerciais */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Preferências comerciais</h2>
            <p className="text-xs text-gray-400 mt-0.5">Parâmetros usados nos alertas e no dashboard</p>
          </div>
          <form onSubmit={salvarConfigs} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(CONFIG_LABELS).map(([chave, label]) => (
                <div key={chave}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
                  <input
                    type="number" min="0" value={valores[chave]}
                    onChange={(e) => setValores((v) => ({ ...v, [chave]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit" disabled={savingConfig}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Save size={14} />
                {savingConfig ? 'Salvando...' : 'Salvar preferências'}
              </button>
              {successConfig && (
                <span className="text-sm text-green-600 font-medium">Salvo!</span>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
