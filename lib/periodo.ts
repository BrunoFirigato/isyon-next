/** Filtro de período por data de criação — usado em Oportunidades, Propostas e Pedidos. */

export const PERIODO_OPTIONS = [
  { value: 'hoje', label: 'Hoje'            },
  { value: '7d',   label: 'Últimos 7 dias'  },
  { value: 'mes',  label: 'Este mês'        },
  { value: '30d',  label: 'Últimos 30 dias' },
  { value: '90d',  label: 'Últimos 90 dias' },
  { value: 'ano',  label: 'Este ano'        },
  { value: 'tudo', label: 'Todo o período'  },
] as const

/** Padrão dos ERPs: abre no mês vigente (reseta sozinho no dia 1º); usuário expande quando quiser. */
export const PERIODO_PADRAO = 'mes'

/** Retorna o recorte (>= gte) para aplicar em criado_em. Vazio = sem filtro. */
export function periodoGte(periodo: string | undefined): string | null {
  const p = periodo || PERIODO_PADRAO
  const now = new Date()
  const hoje0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const menosDias = (n: number) => { const d = new Date(hoje0); d.setDate(d.getDate() - n); return d.toISOString() }

  switch (p) {
    case 'tudo': return null
    case 'hoje': return hoje0.toISOString()
    case '7d':   return menosDias(6)
    case 'mes':  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    case '90d':  return menosDias(89)
    case 'ano':  return new Date(now.getFullYear(), 0, 1).toISOString()
    case '30d':
    default:     return menosDias(29)
  }
}
