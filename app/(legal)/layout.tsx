import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Cabeçalho */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" alt="Isyon" className="w-8 h-8" />
            <span className="font-semibold text-gray-800 dark:text-gray-100">Isyon CRM</span>
          </Link>
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft size={15} />
            Voltar
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          {children}
        </article>
      </main>

      {/* Rodapé */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-gray-400 dark:text-gray-500 space-y-2">
          <div className="flex items-center justify-center gap-4">
            <Link href="/politica-privacidade" className="hover:text-gray-600 dark:hover:text-gray-300">Política de Privacidade</Link>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <Link href="/termos-de-uso" className="hover:text-gray-600 dark:hover:text-gray-300">Termos de Uso</Link>
          </div>
          <p>© {new Date().getFullYear()} Isyon CRM · Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  )
}
