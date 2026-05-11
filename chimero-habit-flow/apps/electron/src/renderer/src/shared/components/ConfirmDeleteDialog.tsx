import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"

import { Dialog, DialogContent } from "@packages/ui/dialog"
import { Button } from "@packages/ui/button"

interface ConfirmDeleteDialogProps {
  open: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  title?: string
  body?: string
  description?: string
  confirmLabel?: string
  pendingLabel?: string
}

export function ConfirmDeleteDialog({
  open,
  onConfirm,
  onCancel,
  title = "Delete entry",
  body = "Are you sure you want to delete this entry?",
  description = "This action cannot be undone.",
  confirmLabel = "Delete",
  pendingLabel = "Deleting...",
}: ConfirmDeleteDialogProps) {
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!open) {
      setIsPending(false)
    }
  }, [open])

  const handleConfirm = async () => {
    if (isPending) return

    setIsPending(true)
    try {
      await Promise.resolve(onConfirm())
    } finally {
      setIsPending(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && isPending) return
    if (!isOpen) onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0">
        <div className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="surface-chip rounded-full p-3">
              <Trash2 className="h-6 w-6 text-[hsl(var(--destructive))]" />
            </div>
            <div>
              <div className="section-kicker">Danger zone</div>
              <h2 className="mt-1 text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{description}</p>
            </div>
          </div>

          <p className="mb-6 text-sm text-[hsl(var(--muted-foreground))]">{body}</p>

          {isPending && (
            <div
              aria-live="polite"
              className="mb-6 rounded-2xl border border-[hsl(var(--border)/0.7)] bg-white/[0.03] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]"
            >
              Removing it now. You can keep this open while we finish safely.
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 rounded-xl"
              onClick={handleConfirm}
              loading={isPending}
              loadingText={pendingLabel}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
