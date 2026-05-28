'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface Breadcrumb {
  parentLabel: string
  parentHref: string
  currentLabel: string
}

interface BreadcrumbCtx {
  breadcrumb: Breadcrumb | null
  setBreadcrumb: (b: Breadcrumb | null) => void
}

const BreadcrumbContext = createContext<BreadcrumbCtx>({
  breadcrumb: null,
  setBreadcrumb: () => {},
})

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [breadcrumb, setBreadcrumbState] = useState<Breadcrumb | null>(null)
  const setBreadcrumb = useCallback((b: Breadcrumb | null) => {
    setBreadcrumbState(b)
  }, [])
  return (
    <BreadcrumbContext.Provider value={{ breadcrumb, setBreadcrumb }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumb() {
  return useContext(BreadcrumbContext)
}
