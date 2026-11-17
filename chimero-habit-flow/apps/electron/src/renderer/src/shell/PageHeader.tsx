import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Standard page frame: a header row and a scrolling body. */
export function PageShell({ title, subtitle, actions, icon, children, bodyClassName, toolbar }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; icon?: ReactNode; children: ReactNode; bodyClassName?: string; toolbar?: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-3 px-7 pb-4 pt-6">
        {icon}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {toolbar && <div className="flex shrink-0 items-center gap-3 px-7 pb-4">{toolbar}</div>}
      <div className={cn('min-h-0 flex-1 overflow-y-auto px-7 pb-8', bodyClassName)}>{children}</div>
    </div>
  )
}

export function Section({ title, hint, actions, children, className }: { title: string; hint?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('card p-5', className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
        {actions}
      </div>
      <div>{children}</div>
    </section>
  )
}
