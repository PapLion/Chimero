"use client"

import { useAppStore } from "../../lib/store"
import { useTrackers } from "../../lib/queries"
import type { Reminder } from "../../lib/store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@packages/ui/dialog"
import { Button } from "@packages/ui/button"
import { Bell, Check, CheckCheck, Clock, Trash2 } from "lucide-react"

// Reminders: no IPC yet; use empty list. Actions are no-ops until API exists.
const REMINDERS_EMPTY: Reminder[] = []
const noopToggleReminder = (_id: number) => {}
const noopDeleteReminder = (_id: number) => {}

export function NotificationsModal() {
  const { isNotificationsOpen, setNotificationsOpen } = useAppStore()
  const { data: trackers = [] } = useTrackers()
  const reminders = REMINDERS_EMPTY
  const toggleReminder = noopToggleReminder
  const deleteReminder = noopDeleteReminder

  const unreadReminders = reminders.filter((r) => !r.isCompleted)
  const completedReminders = reminders.filter((r) => r.isCompleted)

  const markAllAsRead = () => {
    unreadReminders.forEach((r) => toggleReminder(r.id))
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 0) {
      const absMins = Math.abs(diffMins)
      if (absMins < 60) return `${absMins}m ago`
      const absHours = Math.abs(diffHours)
      if (absHours < 24) return `${absHours}h ago`
      return `${Math.abs(diffDays)}d ago`
    }
    
    if (diffMins < 60) return `in ${diffMins}m`
    if (diffHours < 24) return `in ${diffHours}h`
    return `in ${diffDays}d`
  }

  return (
    <Dialog open={isNotificationsOpen} onOpenChange={setNotificationsOpen}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 bg-[hsl(210_35%_7%)] border-[hsl(210_18%_22%)] max-h-[80vh] flex flex-col">
        <DialogHeader className="p-4 pb-3 border-b border-[hsl(210_18%_22%)] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[hsl(266_73%_63%)]" />
              <DialogTitle className="text-lg font-display font-semibold text-[hsl(210_25%_97%)]">
                Notifications & Reminders
              </DialogTitle>
            </div>
            {unreadReminders.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_15%)]"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all read
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
                You're all caught up! New reminders will appear here.
              </p>
            </div>
          ) : (
            <div className="p-2">
              {/* Unread Section */}
              {unreadReminders.length > 0 && (
                <div className="mb-4">
                  <div className="px-2 py-2 text-xs font-semibold text-[hsl(210_12%_47%)] uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[hsl(266_73%_63%)] animate-pulse" />
                    Pending ({unreadReminders.length})
                  </div>
                  <div className="space-y-1">
                    {unreadReminders.map((reminder) => {
                      const linkedTracker = reminder.linkedTrackerId
                        ? trackers.find((t) => t.id === reminder.linkedTrackerId)
                        : null

                      return (
                        <div
                          key={reminder.id}
                          className="group flex items-start gap-3 p-3 rounded-xl bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%/0.3)] transition-colors"
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleReminder(reminder.id)}
                            className="mt-0.5 w-5 h-5 rounded-md border-2 border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%)] flex items-center justify-center transition-colors flex-shrink-0"
                          >
                            <Check className="w-3 h-3 text-transparent group-hover:text-[hsl(266_73%_63%)]" />
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[hsl(210_25%_97%)] text-sm">
                              {reminder.title}
                            </p>
                            {reminder.description && (
                              <p className="text-xs text-[hsl(210_12%_47%)] mt-0.5 line-clamp-2">
                                {reminder.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="flex items-center gap-1 text-xs text-[hsl(210_12%_47%)]">
                                <Clock className="w-3 h-3" />
                                {formatTime(reminder.dueDateTime)}
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

                          {/* Delete */}
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
                      const linkedTracker = reminder.linkedTrackerId
                        ? trackers.find((t) => t.id === reminder.linkedTrackerId)
                        : null

                      return (
                        <div
                          key={reminder.id}
                          className="group flex items-start gap-3 p-3 rounded-xl bg-[hsl(210_20%_15%)/50] border border-[hsl(210_18%_22%)/50] opacity-60 hover:opacity-80 transition-opacity"
                        >
                          {/* Checkbox (checked) */}
                          <button
                            onClick={() => toggleReminder(reminder.id)}
                            className="mt-0.5 w-5 h-5 rounded-md bg-[hsl(266_73%_63%)] flex items-center justify-center flex-shrink-0"
                          >
                            <Check className="w-3 h-3 text-white" />
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[hsl(210_12%_47%)] text-sm line-through">
                              {reminder.title}
                            </p>
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

                          {/* Delete */}
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
