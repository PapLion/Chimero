  "use client"

  import { useAppStore } from "../../lib/store"
  import { useTrackers, useReminders, useCompleteReminderMutation, useUncompleteReminderMutation, useDeleteReminderMutation } from "../../lib/queries"
  import type { Reminder } from "../../lib/store"
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "@packages/ui/dialog"
  import { Button } from "@packages/ui/button"
  import { Bell, Check, CheckCheck, Clock, Trash2 } from "lucide-react"

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  export function NotificationsModal() {
    const { isNotificationsOpen, setNotificationsOpen } = useAppStore()
    const { data: trackers = [] } = useTrackers()
    const { data: reminders = [] } = useReminders()
    const completeMutation = useCompleteReminderMutation()
    const uncompleteMutation = useUncompleteReminderMutation()
    const deleteMutation = useDeleteReminderMutation()

    const pendingReminders = (reminders as Reminder[]).filter((r) => r.completedAt == null || r.completedAt === undefined)
    const completedReminders = (reminders as Reminder[]).filter((r) => r.completedAt != null && r.completedAt !== undefined)

    const completeReminder = (id: number) => completeMutation.mutate(id)
    const uncompleteReminder = (id: number) => uncompleteMutation.mutate(id)
    const deleteReminder = (id: number) => deleteMutation.mutate(id)

    const markAllAsRead = () => {
      pendingReminders.forEach((r) => completeReminder(r.id))
    }

    const formatDays = (r: Reminder) => {
      if (r.date) return r.date
      const days = r.days
      if (!days || days.length === 0) return "Every day"
      if (days.length === 7) return "Every day"
      return days.map((d) => DAY_LABELS[d]).join(", ")
    }

    return (
      <Dialog open={isNotificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="sm:max-w-[420px] p-0 gap-0 bg-[hsl(210_35%_7%)] border-[hsl(210_18%_22%)] max-h-[80vh] flex flex-col">
          <DialogHeader className="p-4 pb-3 border-b border-[hsl(210_18%_22%)] flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[hsl(266_73%_63%)]" />
                <div>
                  <DialogTitle className="text-lg font-display font-semibold text-[hsl(210_25%_97%)]">
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
                  className="text-xs text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_15%)]"
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Mark all done
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {reminders.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-[hsl(210_20%_15%)] flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-[hsl(210_12%_47%)]" />
                </div>
                <p className="text-[hsl(210_25%_97%)] font-medium mb-1">No notifications</p>
                <p className="text-sm text-[hsl(210_12%_47%)] text-center">
                  You're all caught up! Use Quick Entry (⌘K) → Reminder tab to add one.
                </p>
              </div>
            ) : (
              <div className="p-2">
                {/* Pending Section */}
                {pendingReminders.length > 0 && (
                  <div className="mb-4">
                    <div className="px-2 py-2 text-xs font-semibold text-[hsl(210_12%_47%)] uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[hsl(266_73%_63%)] animate-pulse" />
                      Pending ({pendingReminders.length})
                    </div>
                    <div className="space-y-1">
                      {pendingReminders.map((reminder) => {
                        const linkedTracker = reminder.trackerId
                          ? trackers.find((t) => t.id === reminder.trackerId)
                          : null

                        return (
                          <div
                            key={reminder.id}
                            className="group flex items-start gap-3 p-3 rounded-xl bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%/0.3)] transition-colors"
                          >
                            <button
                              onClick={() => completeReminder(reminder.id)}
                              className="mt-0.5 w-5 h-5 rounded-md border-2 border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%)] flex items-center justify-center transition-colors flex-shrink-0"
                            >
                              <Check className="w-3 h-3 text-transparent group-hover:text-[hsl(266_73%_63%)]" />
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[hsl(210_25%_97%)] text-sm">
                                {reminder.title}
                              </p>
                              {reminder.description && (
                                <p className="text-xs text-[hsl(210_12%_47%)] mt-1 line-clamp-2">
                                  {reminder.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="flex items-center gap-1 text-xs text-[hsl(210_12%_47%)]">
                                  <Clock className="w-3 h-3" />
                                  {reminder.time} · {formatDays(reminder)}
                                </span>
                                {linkedTracker && (
                                  <span 
                                    className="text-xs px-1.5 py-0.5 rounded-md"
                                    style={{ 
                                      backgroundColor: `${linkedTracker.color}20`,
                                      color: linkedTracker.color 
                                    }}
                                  >
                                    {linkedTracker.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => deleteReminder(reminder.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[hsl(210_12%_47%)] hover:text-red-400 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Completed Section */}
                {completedReminders.length > 0 && (
                  <div>
                    <div className="px-2 py-2 text-xs font-semibold text-[hsl(210_12%_47%)] uppercase tracking-wider">
                      Completed ({completedReminders.length})
                    </div>
                    <div className="space-y-1">
                      {completedReminders.map((reminder) => {
                        const linkedTracker = reminder.trackerId
                          ? trackers.find((t) => t.id === reminder.trackerId)
                          : null

                        return (
                          <div
                            key={reminder.id}
                            className="group flex items-start gap-3 p-3 rounded-xl bg-[hsl(210_20%_15%)/50] border border-[hsl(210_18%_22%)/50] opacity-60 hover:opacity-80 transition-opacity"
                          >
                            <button
                              onClick={() => uncompleteReminder(reminder.id)}
                              className="mt-0.5 w-5 h-5 rounded-md bg-[hsl(266_73%_63%)] flex items-center justify-center flex-shrink-0"
                            >
                              <Check className="w-3 h-3 text-white" />
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[hsl(210_12%_47%)] text-sm line-through">
                                {reminder.title}
                              </p>
                              {reminder.description && (
                                <p className="text-xs text-[hsl(210_12%_47%)] mt-1 line-clamp-2">{reminder.description}</p>
                              )}
                              <span className="text-xs text-[hsl(210_12%_47%)]">{reminder.time} · {formatDays(reminder)}</span>
                              {linkedTracker && (
                                <span 
                                  className="text-xs px-1.5 py-0.5 rounded-md mt-1 inline-block opacity-50"
                                  style={{ 
                                    backgroundColor: `${linkedTracker.color}20`,
                                    color: linkedTracker.color 
                                  }}
                                >
                                  {linkedTracker.name}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => deleteReminder(reminder.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[hsl(210_12%_47%)] hover:text-red-400 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[hsl(210_18%_22%)] flex-shrink-0">
            <Button
              variant="outline"
              className="w-full bg-transparent border-[hsl(210_18%_22%)] text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_15%)]"
              onClick={() => setNotificationsOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
