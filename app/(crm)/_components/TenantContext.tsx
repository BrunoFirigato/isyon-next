'use client'

import { createContext, useContext } from 'react'

interface TenantCtx {
  tenantId: string
  whatsappTemplate: string | null
  emailTemplateAssunto: string | null
  emailTemplateCorpo: string | null
}

const TenantContext = createContext<TenantCtx | null>(null)

export function TenantProvider({
  tenantId,
  whatsappTemplate,
  emailTemplateAssunto,
  emailTemplateCorpo,
  children,
}: {
  tenantId: string
  whatsappTemplate: string | null
  emailTemplateAssunto: string | null
  emailTemplateCorpo: string | null
  children: React.ReactNode
}) {
  return (
    <TenantContext.Provider value={{ tenantId, whatsappTemplate, emailTemplateAssunto, emailTemplateCorpo }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenantId(): string {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenantId deve ser usado dentro do layout CRM')
  return ctx.tenantId
}

export function useTenantConfig(): TenantCtx {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenantConfig deve ser usado dentro do layout CRM')
  return ctx
}
