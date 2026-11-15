import type { ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './primitives'

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 520,
  className,
  icon,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: number
  className?: string
  icon?: ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade bg-black/55 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          style={{ width: `min(${width}px, calc(100vw - 48px))` }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-64px)] -translate-x-1/2 -translate-y-1/2 animate-pop flex-col rounded-2xl border border-line bg-surface shadow-lift',
            className,
          )}
        >
          <header className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-4">
            {icon}
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="font-display text-xl font-semibold leading-tight">{title}</DialogPrimitive.Title>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <DialogPrimitive.Close className="-mr-1.5 -mt-0.5 grid h-8 w-8 place-items-center rounded-control text-muted hover:bg-raised hover:text-text" aria-label="Close">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line/70 px-5 py-3">{footer}</footer>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Delete',
  busy,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  children: ReactNode
  confirmLabel?: string
  busy?: boolean
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      width={420}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} busy={busy} autoFocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-base text-muted">{children}</div>
    </Dialog>
  )
}
