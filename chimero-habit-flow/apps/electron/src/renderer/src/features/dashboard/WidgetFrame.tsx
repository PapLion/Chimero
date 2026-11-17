import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Tip } from '@/ui/primitives'

interface WidgetFrameProps {
  title: string
  icon?: ReactNode
  /** Opens the detail view behind this widget. */
  onOpen?: () => void
  /** Quick "log" action shown in the header. */
  onAdd?: () => void
  addLabel?: string
  accent?: string
  meta?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** Shared chrome for every dashboard widget. */
export function WidgetFrame({ title, icon, onOpen, onAdd, addLabel, accent, meta, children, className, bodyClassName }: WidgetFrameProps) {
  return (
    <article className={cn('card flex h-full w-full flex-col overflow-hidden', className)}>
      <header className="flex h-10 shrink-0 items-center gap-2 pl-3.5 pr-2">
        {icon && <span className="grid h-5 w-5 shrink-0 place-items-center [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        {onOpen ? (
          <button type="button" onClick={onOpen} className="min-w-0 truncate rounded text-sm font-semibold text-text hover:underline hover:decoration-faint hover:underline-offset-4">
            {title}
          </button>
        ) : (
          <h3 className="min-w-0 truncate font-sans text-sm font-semibold tracking-normal">{title}</h3>
        )}
        <span data-widget-tools className="min-w-0 flex-1 truncate text-right text-xs text-faint">{meta}</span>
        {onAdd && (
          <Tip label={addLabel ?? `Log ${title}`}>
            <button
              type="button"
              onClick={onAdd}
              aria-label={addLabel ?? `Log ${title}`}
              data-widget-tools
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted transition-colors hover:text-white"
              style={{ ['--hover' as string]: accent }}
              onMouseEnter={(event) => (event.currentTarget.style.background = accent ?? 'rgb(var(--accent))')}
              onMouseLeave={(event) => (event.currentTarget.style.background = '')}
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </Tip>
        )}
      </header>
      <div className={cn('flex min-h-0 flex-1 flex-col px-3.5 pb-3', bodyClassName)}>{children}</div>
    </article>
  )
}
