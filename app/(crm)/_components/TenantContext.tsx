'use client'

import { createContext, useContext } from 'react'

const TenantContext = createContext<string | null>(null)

export function TenantProvider({
  tenantId,
  children,
}: {
  tenantId: string
  children: React.ReactNode
}) {
  return (
    <TenantContext.Provider value={tenantId}>
      {children}
    </TenantContext.Provider>
  )
}

/** Retorna o tenant_id do usuário logado. Deve ser usado dentro do layout CRM. */
export function useTenantId(): string {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenantId deve ser usado dentro do layout CRM')
  return ctx
}
