'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'

/* ─── Tipos ─── */
type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

/* ─── Context ─── */
const ToastContext = createContext<ToastContextValue | null>(null)

/* ─── Provider ─── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toasts container */}
      <div className="fixed bottom-20 md:bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastBubble key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/* ─── Bubble ─── */
function ToastBubble({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: (id: number) => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Pequeno delay para a animação de entrada
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const styles = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle2 size={16} className="text-green-500 shrink-0" />,
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: <XCircle size={16} className="text-red-500 shrink-0" />,
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: <AlertCircle size={16} className="text-blue-500 shrink-0" />,
    },
  }

  const s = styles[item.type]

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-3 rounded-xl border shadow-lg max-w-xs text-sm font-medium
        transition-all duration-300 ease-out
        ${s.bg} ${s.text}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      {s.icon}
      <span className="flex-1 leading-snug">{item.message}</span>
      <button
        onClick={() => onDismiss(item.id)}
        className="opacity-50 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
      >
        <X size={13} />
      </button>
    </div>
  )
}

/* ─── Hook ─── */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx.toast
}
