'use client'

import { useState } from 'react'
import { Package, Tag, Layers } from 'lucide-react'
import ProdutosView from './ProdutosView'
import ClassificacaoManager from './ClassificacaoManager'
import { type Produto, type Classificacao } from './types'

export default function ProdutosScreen({
  produtos, total, currentTipo, currentAtivo, currentQ, produtosKey, categorias, familias,
}: {
  produtos: Produto[]
  total: number
  currentTipo: string
  currentAtivo: string
  currentQ: string
  produtosKey: string
  categorias: Classificacao[]
  familias: Classificacao[]
}) {
  const [aba, setAba] = useState<'produtos' | 'categorias' | 'familias'>('produtos')

  const tabs = [
    { id: 'produtos'   as const, label: 'Produtos',   Icon: Package },
    { id: 'categorias' as const, label: 'Categorias', Icon: Tag },
    { id: 'familias'   as const, label: 'Famílias',   Icon: Layers },
  ]

  return (
    <>
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setAba(id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              aba === id
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {aba === 'produtos' && (
        <ProdutosView key={produtosKey} produtos={produtos} total={total}
          currentTipo={currentTipo} currentAtivo={currentAtivo} currentQ={currentQ} />
      )}
      {aba === 'categorias' && <ClassificacaoManager tabela="categorias" singular="Categoria" items={categorias} />}
      {aba === 'familias'   && <ClassificacaoManager tabela="familias"   singular="Família"   items={familias} />}
    </>
  )
}
