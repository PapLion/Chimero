"use client"

import { useState } from "react"

import { useAppStore } from "@shared/store"
import { useTrackers, useReminders, useCompleteReminderMutation, useUncompleteReminderMutation, useDeleteReminderMutation } from "@shared/queries"
import type { Reminder } from "@shared/store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@packages/ui/dialog"
import { Button } from "@packages/ui/button"
import { formatToastError, useToast } from "@shared/components/toast"
import { Bell, Check, CheckCheck, Clock, Trash2 } from "lucide-react"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

type ReminderAction =
  | { kind: "complete"; id: number }
  | { kind: "uncomplete"; id: number }
  | { kind: "delete"; id: number }
  | { kind: "mark-all" }
  | null

export function NotificationsModal() {
  const { isNotificationsOpen, setNotificationsOpen } = useAppStore()
  const { data: trackers = [] } = useTrackers()
  const { data: reminders = [] } = useReminders()
  const completeMutation = useCompleteReminderMutation()
  const uncompleteMutation = useUncompleteReminderMutation()
  const deleteMutation = useDeleteReminderMutation()
  const toast = useToast()
  const [pendingAction, setPendingAction] = useState<ReminderAction>(null)

  const pendingReminders = (reminders as Reminder[]).filter((r) => r.completedAt == null || r.completedAt === undefined)
  const completedReminders = (reminders as Reminder[]).filter((r) => r.completedAt != null && r.completedAt !== undefined)
  const isBusy = pendingAction !== null

  const formatDays = (r: Reminder) => {
    if (r.date) return r.date
    const days = r.days
    if (!days || days.length === 0) return "Every day"
    if (days.length === 7) return "Every day"
    return days.map((d) => DAY_LABELS[d]).join(", ")
  }

  const markReminderDone = async (reminder: Reminder) => {
    if (isBusy) return

    setPendingAction({ kind: "complete", id: reminder.id })
    try {
      await completeMutation.mutateAsync(reminder.id)
      toast.success("Reminder completed.", reminder.title)
    } catch (error) {
      toast.error(
        "We couldn't mark that reminder done.",
        formatToastError(error, "Please try again in a moment."),
      )
    } finally {
      setPendingAction(null)
    }
  }

  const reopenReminder = async (reminder: Reminder) => {
    if (isBusy) return

    setPendingAction({ kind: "uncomplete", id: reminder.id })
    try {
      await uncompleteMutation.mutateAsync(reminder.id)
      toast.info("Reminder reopened.", reminder.title)
    } catch (error) {
      toast.error(
        "We couldn't reopen that reminder.",
        formatToastError(error, "Please try again in a moment."),
      )
    } finally {
      setPendingAction(null)
    }
  }

  const removeReminder = async (reminder: Reminder) => {
    if (isBusy) return

    setPendingAction({ kind: "delete", id: reminder.id })
    try {
      await deleteMutation.mutateAsync(reminder.id)
      toast.destructive("Reminder removed.", reminder.title)
    } catch (error) {
      toast.error(
        "We couldn't remove that reminder.",
        formatToastError(error, "Please try again in a moment."),
      )
    } finally {
      setPendingAction(null)
    }
  }

  const markAllAsRead = async () => {
    if (isBusy || pendingReminders.length === 0) return

    setPendingAction({ kind: "mark-all" })
    try {
      const results = await Promise.allSettled(
        pendingReminders.map((reminder) => completeMutation.mutateAsync(reminder.id)),
      )

      const failures = results.filter((result) => result.status === "rejected").length
      const successes = results.length - failures

      if (failures === 0) {
        toast.success(
          "All caught up.",
          pendingReminders.length === 1
            ? "1 reminder was marked done."
            : `${pendingReminders.length} reminders were marked done.`,
        )
      } else if (successes > 0) {
        toast.error(
          "Some reminders stayed pending.",
          `${successes} were updated and ${failures} still need attention.`,
        )
      } else {
        toast.error(
          "We couldn't update those reminders.",
          "Please try again in a moment.",
        )
      }
    } finally {
      setPendingAction(null)
    }
  }

  const isActionBusy = (kind: Exclude<ReminderAction, null>["kind"], id?: number) =>
    pendingAction?.kind === kind && (id == null || ("id" in pendingAction && pendingAction.id === id))

  return (
    <Dialog open={isNotificationsOpen} onOpenChange={(open) => !isBusy && setNotificationsOpen(open)}>
      <DialogContent className="sm:max-w-[440px] max-h-[80vh] overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 border-b border-[hsl(var(--border)/0.7)] p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[hsl(var(--primary))]" />
              <div>
                <DialogTitle className="font-display text-lg font-semibold text-[hsl(var(--foreground))]">
                  Notifications & Reminders
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Manage your active and completed reminders.
                </DialogDescription>
              </div>
            </div>
            {pendingReminders.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                loading={isActionBusy("mark-all")}
                loadingText="Updating..."
                className="rounded-xl text-xs text-[hsl(var(--muted-foreground))] hover:bg-white/5 hover:text-[hsl(var(--foreground))]"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all done
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="surface-chip mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Bell className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
              </div>
              <p className="mb-1 font-medium text-[hsl(var(--foreground))]">No notifications</p>
              <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
                You&apos;re all caught up! Use Quick Entry (⌘K) → Reminder tab to add one.
              </p>
            </div>
          ) : (
            <div className="p-2">
              {pendingReminders.length > 0 && (
                <div className="mb-4">
                  <div className="section-kicker flex items-center gap-2 px-2 py-2">
                    <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
                    Pending ({pendingReminders.length})
                  </div>
                  <div className="space-y-1">
                    {pendingReminders.map((reminder) => {
                      const linkedTracker = reminder.trackerId
                        ? trackers.find((t) => t.id === reminder.trackerId)
                        : null
                      const linkedTrackerColor = linkedTracker?.color ?? undefined
                      const isCompleteBusy = isActionBusy("complete", reminder.id)
                      const isDeleteBusy = isActionBusy("delete", reminder.id)

                      return (
                        <div
                          key={reminder.id}
                          className="group surface-card flex items-start gap-3 rounded-2xl p-3 transition-colors hover:border-[hsl(var(--primary)/0.35)]"
                        >
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            loading={isCompleteBusy}
                            className="mt-0.5 !h-5 !w-5 rounded-md border-2 border-[hsl(var(--border)/0.7)] bg-transparent p-0"
                            onClick={() => markReminderDone(reminder)}
                          >
                            {isCompleteBusy ? null : <Check className="h-3 w-3 text-transparent group-hover:text-[hsl(var(--primary))]" />}
                          </Button>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                              {reminder.title}
                            </p>
                            {reminder.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">
                                {reminder.description}
                              </p>
                            )}
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                                <Clock className="w-3 h-3" />
                                {reminder.time} · {formatDays(reminder)}
                              </span>
                              {linkedTracker && (
                                <span
                                  className="rounded-md px-1.5 py-0.5 text-xs"
                                  style={{
                                    backgroundColor: linkedTrackerColor ? `${linkedTrackerColor}20` : undefined,
                                    color: linkedTrackerColor,
                                  }}
                                >
                                  {linkedTracker.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            loading={isDeleteBusy}
                            className="rounded p-1 text-[hsl(var(--muted-foreground))] opacity-0 transition-all hover:bg-[hsl(var(--destructive)/0.1)] hover:text-[hsl(var(--destructive))] group-hover:opacity-100 data-[loading]:opacity-100"
                            onClick={() => removeReminder(reminder)}
                          >
                            {isDeleteBusy ? null : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {completedReminders.length > 0 && (
                <div>
                  <div className="section-kicker px-2 py-2">
                    Completed ({completedReminders.length})
                  </div>
                  <div className="space-y-1">
                    {completedReminders.map((reminder) => {
                      const linkedTracker = reminder.trackerId
                        ? trackers.find((t) => t.id === reminder.trackerId)
                        : null
                      const linkedTrackerColor = linkedTracker?.color ?? undefined
                      const isReopenBusy = isActionBusy("uncomplete", reminder.id)
                      const isDeleteBusy = isActionBusy("delete", reminder.id)

                      return (
                        <div
                          key={reminder.id}
                          className="group surface-card flex items-start gap-3 rounded-2xl p-3 opacity-70 transition-opacity hover:opacity-90"
                        >
                          <Button
                            type="button"
                            variant="default"
                            size="icon-sm"
                            loading={isReopenBusy}
                            className="mt-0.5 !h-5 !w-5 rounded-md border-0 bg-[hsl(var(--primary))] p-0 text-white"
                            onClick={() => reopenReminder(reminder)}
                          >
                            {isReopenBusy ? null : <Check className="h-3 w-3 text-white" />}
                          </Button>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[hsl(var(--muted-foreground))] line-through">
                              {reminder.title}
                            </p>
                            {reminder.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">
                                {reminder.description}
                              </p>
                            )}
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">
                              {reminder.time} · {formatDays(reminder)}
                            </span>
                            {linkedTracker && (
                              <span
                                className="mt-1 inline-block rounded-md px-1.5 py-0.5 text-xs opacity-50"
                                style={{
                                  backgroundColor: linkedTrackerColor ? `${linkedTrackerColor}20` : undefined,
                                  color: linkedTrackerColor,
                                }}
                              >
                                {linkedTracker.name}
                              </span>
                            )}
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            loading={isDeleteBusy}
                            className="rounded p-1 text-[hsl(var(--muted-foreground))] opacity-0 transition-all hover:bg-[hsl(var(--destructive)/0.1)] hover:text-[hsl(var(--destructive))] group-hover:opacity-100 data-[loading]:opacity-100"
                            onClick={() => removeReminder(reminder)}
                          >
                            {isDeleteBusy ? null : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-[hsl(var(--border)/0.7)] p-3">
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => setNotificationsOpen(false)}
            disabled={isBusy}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
