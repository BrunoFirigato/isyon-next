import { TrendingUp, Building2, UserPlus } from 'lucide-react'

interface Props {
  cliente?: { nome: string; empresa: string | null } | null
  lead?: { nome: string } | null
  op?: { titulo: string; numero: string | null } | null
  className?: string
}

/** Badge que identifica o vínculo (oportunidade > cliente > lead) por ícone + cor. */
export default function VinculoBadge({ cliente, lead, op, className = '' }: Props) {
  const base = `inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 max-w-[160px] ${className}`

  if (op) {
    return (
      <span title={`Oportunidade: ${op.titulo}`} className={`${base} bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300`}>
        <TrendingUp size={11} className="shrink-0" />
        <span className="truncate">{op.numero ?? op.titulo}</span>
      </span>
    )
  }
  if (cliente) {
    return (
      <span title={`Cliente: ${cliente.empresa ?? cliente.nome}`} className={`${base} bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300`}>
        <Building2 size={11} className="shrink-0" />
        <span className="truncate">{cliente.empresa ?? cliente.nome}</span>
      </span>
    )
  }
  if (lead) {
    return (
      <span title={`Lead: ${lead.nome}`} className={`${base} bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300`}>
        <UserPlus size={11} className="shrink-0" />
        <span className="truncate">{lead.nome}</span>
      </span>
    )
  }
  return null
}
