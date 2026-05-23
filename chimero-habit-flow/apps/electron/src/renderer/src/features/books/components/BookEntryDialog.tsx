"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Button } from "@packages/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@packages/ui/dialog"
import { Input } from "@packages/ui/input"
import { formatToastError, useToast } from "@shared/components/toast"
import { formatBookRatingDisplay, getBookActionLabel, getBookLifecycleRecord } from "@contracts/features/books"
import { useBook, useDeleteBookReadActivityMutation, useUpdateBookMutation, useUpdateBookReadActivityMutation } from "@shared/queries"
import type { Entry } from "@shared/store"
import { CheckCheck, Trash2 } from "lucide-react"

interface BookEntryDialogProps {
  entry: Entry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BookEntryDialog({ entry, open, onOpenChange }: BookEntryDialogProps) {
  const updateBookMutation = useUpdateBookMutation()
  const updateBookReadActivityMutation = useUpdateBookReadActivityMutation()
  const deleteBookReadActivityMutation = useDeleteBookReadActivityMutation()
  const toast = useToast()
  const book = useMemo(() => (entry ? getBookLifecycleRecord(entry) : null), [entry])
  const bookDetails = useBook(open && book?.bookId != null ? book.bookId : null, open && book?.bookId != null)

  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")

  useEffect(() => {
    if (open && entry && book) {
      setTitle(book.title)
      setDate(format(new Date(entry.timestamp), "yyyy-MM-dd"))
      setTime(format(new Date(entry.timestamp), "HH:mm"))
    }
  }, [book, entry, open])

  const handleSave = async () => {
    if (!entry || !book || !title.trim() || book.bookId == null || book.action !== "read") return

    const [year, month, day] = date.split("-").map(Number)
    const [hours, minutes] = time.split(":").map(Number)
    const nextTimestamp = new Date()
    nextTimestamp.setFullYear(year, month - 1, day)
    nextTimestamp.setHours(hours, minutes, 0, 0)

    try {
      await updateBookMutation.mutateAsync({
        bookId: book.bookId,
        updates: { title: title.trim() },
      })

      await updateBookReadActivityMutation.mutateAsync({
        entryId: entry.id,
        updates: {
          timestamp: nextTimestamp.getTime(),
          assetId: entry.assetId ?? null,
          tagIds: entry.tagIds ?? [],
        },
      })

      toast.success("Book updated.", title.trim())
      onOpenChange(false)
    } catch (error) {
      toast.error(
        "We couldn't save that book entry.",
        formatToastError(error, "Please try again in a moment."),
      )
    }
  }

  const handleDelete = async () => {
    if (!entry || book?.bookId == null || book.action !== "read") return

    try {
      await deleteBookReadActivityMutation.mutateAsync(entry.id)
      toast.destructive("Book entry removed.", book?.title ?? "Book")
      onOpenChange(false)
    } catch (error) {
      toast.error(
        "We couldn't delete that book entry.",
        formatToastError(error, "Please try again in a moment."),
      )
    }
  }

  const canSave = !!entry && !!book && !!title.trim() && book.bookId != null && book.action === "read"
  const isBusy = updateBookMutation.isPending || updateBookReadActivityMutation.isPending || deleteBookReadActivityMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isBusy && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-lg min-w-0 overflow-hidden p-0">
        <div className="max-h-[85vh] overflow-y-auto p-5">
          <DialogTitle className="mb-4 text-lg font-semibold text-[hsl(var(--foreground))]">
            Book entry
          </DialogTitle>

          {book && (
            <div className="mb-4 rounded-2xl border border-[hsl(var(--border)/0.62)] bg-white/[0.03] p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                {getBookActionLabel(book.action)}
              </div>
              <div className="mt-1 text-sm font-medium text-[hsl(var(--foreground))]">{book.title}</div>
              <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                {new Date(book.timestamp).toLocaleDateString()}
              </div>
              {book.action === "finished" && bookDetails.data?.book.ratingTenths != null && (
                <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <span className="font-medium text-[hsl(var(--foreground))]">
                    {formatBookRatingDisplay(bookDetails.data.book.ratingTenths)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Title</label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 bg-white/5 text-[hsl(var(--foreground))] [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Time</label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-11 bg-white/5 text-[hsl(var(--foreground))] [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={handleSave}
              disabled={!canSave}
              loading={isBusy}
              loadingText="Saving..."
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={handleDelete}
              disabled={isBusy}
              title="Delete book entry"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
