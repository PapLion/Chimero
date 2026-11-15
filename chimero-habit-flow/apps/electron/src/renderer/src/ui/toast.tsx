import { useSyncExternalStore } from 'react'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  title: string
  detail?: string
  action?: { label: string; run: () => void }
}

let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

function push(kind: ToastKind, title: string, detail?: string, action?: ToastItem['action']): void {
  const id = nextId++
  items = [...items.slice(-3), { id, kind, title, detail, action }]
  emit()
  setTimeout(() => dismiss(id), kind === 'error' ? 8000 : action ? 6000 : 3200)
}

function dismiss(id: number): void {
  items = items.filter((item) => item.id !== id)
  emit()
}

export const toast = {
  success: (title: string, detail?: string, action?: ToastItem['action']) => push('success', title, detail, action),
  error: (title: string, detail?: string) => push('error', title, detail),
  info: (title: string, detail?: string) => push('info', title, detail),
}

const ICONS = { success: Check, error: AlertTriangle, info: Info }

export function ToastHost() {
  const list = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => items,
  )
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[340px] flex-col gap-2" role="status" aria-live="polite">
      {list.map((item) => {
        const Icon = ICONS[item.kind]
        return (
          <div key={item.id} className="pointer-events-auto flex animate-toast items-start gap-3 rounded-xl border border-line bg-raised p-3 shadow-pop">
            <span
              className={cn(
                'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full',
                item.kind === 'success' && 'bg-good/20 text-good',
                item.kind === 'error' && 'bg-bad/20 text-bad',
                item.kind === 'info' && 'bg-accent/20 text-accent',
              )}
            >
              <Icon className="h-3 w-3" strokeWidth={3} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text">{item.title}</p>
              {item.detail && <p className="selectable mt-0.5 break-words text-xs text-muted">{item.detail}</p>}
              {item.action && (
                <button
                  className="mt-1.5 text-xs font-semibold text-accent hover:underline"
                  onClick={() => {
                    item.action?.run()
                    dismiss(item.id)
                  }}
                >
                  {item.action.label}
                </button>
              )}
            </div>
            <button className="text-faint hover:text-text" onClick={() => dismiss(item.id)} aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
