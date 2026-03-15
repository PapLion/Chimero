import React from "react"
import { Dialog, DialogContent } from "@packages/ui/dialog"
import { Button } from "@packages/ui/button"
import { Trash2 } from "lucide-react"

interface ConfirmDeleteDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeleteDialog({ open, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-md bg-[hsl(210_24%_10%)] border-white/10 text-white p-0 overflow-hidden shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-rose-500/10">
              <Trash2 className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white/90">Delete entry</h2>
              <p className="text-xs text-white/50">This action cannot be undone.</p>
            </div>
          </div>

          <p className="text-sm text-white/70 mb-6">
            Are you sure you want to delete this entry?
          </p>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-transparent border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_20%)]"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-rose-500 text-white hover:bg-rose-600"
              onClick={onConfirm}
            >
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
