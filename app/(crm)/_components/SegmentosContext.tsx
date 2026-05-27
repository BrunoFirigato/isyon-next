'use client'

import { createContext, useContext } from 'react'

export interface Segmento {
  value: string
  label: string
}

export const DEFAULT_SEGMENTOS: Segmento[] = [
  { value: 'maquinas', label: 'Máquinas' },
  { value: 'pecas', label: 'Peças' },
]

const SegmentosContext = createContext<Segmento[]>(DEFAULT_SEGMENTOS)

export function SegmentosProvider({
  segmentos,
  children,
}: {
  segmentos: Segmento[]
  children: React.ReactNode
}) {
  return (
    <SegmentosContext.Provider value={segmentos.length > 0 ? segmentos : DEFAULT_SEGMENTOS}>
      {children}
    </SegmentosContext.Provider>
  )
}

/** Retorna a lista de segmentos configurados pelo tenant. */
export function useSegmentos(): Segmento[] {
  return useContext(SegmentosContext)
}

/** Converte um valor de segmento para o label, usando a lista configurada. */
export function segmentoLabel(value: string | null, segmentos: Segmento[]): string {
  if (!value) return '—'
  return segmentos.find((s) => s.value === value)?.label ?? value
}

/** Converte um array de valores para labels separados por vírgula. */
export function segmentosLabel(values: string[], segmentos: Segmento[]): string {
  if (!values || values.length === 0) return '—'
  return values.map((v) => segmentos.find((s) => s.value === v)?.label ?? v).join(', ')
}
