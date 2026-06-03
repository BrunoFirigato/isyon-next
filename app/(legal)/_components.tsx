import React from 'react'

export function DocHeader({ titulo, atualizado }: { titulo: string; atualizado: string }) {
  return (
    <header className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{titulo}</h1>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Última atualização: {atualizado}</p>
    </header>
  )
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-3">{children}</h2>
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-300 mb-4">{children}</p>
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1.5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300 mb-4">{children}</ul>
}

export function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-gray-800 dark:text-gray-200">{children}</strong>
}
