'use client'

import { useState, useEffect } from 'react'
import { PERIODO_PADRAO, periodoGte } from '@/lib/periodo'

/**
 * Filtro de período por data de criação com preferência LEMBRADA por tela
 * (localStorage). Retorna o valor atual, o setter (que persiste) e um
 * predicado pronto para filtrar itens por `criado_em`.
 */
export function usePeriodo(storageKey: string) {
  const [periodo, setPeriodoState] = useState(PERIODO_PADRAO)
  const [mounted, setMounted] = useState(false)

  // Carrega a preferência salva após montar. O `mounted` evita o mismatch de
  // hidratação: o filtro depende da data/hora atual (UTC no servidor × local no
  // cliente), então no 1º render — servidor e cliente — não filtramos nada.
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) setPeriodoState(saved)
    setMounted(true)
  }, [storageKey])

  function setPeriodo(p: string) {
    setPeriodoState(p)
    try { localStorage.setItem(storageKey, p) } catch { /* ignore */ }
  }

  const gte = periodoGte(periodo)
  /** true se a data de criação cai dentro do período (sem filtrar antes de montar). */
  const dentroDoPeriodo = (criadoEm: string | null | undefined) =>
    !mounted || !gte || (!!criadoEm && criadoEm >= gte)

  return { periodo, setPeriodo, dentroDoPeriodo }
}
