"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Bell, Clock, Check, Eye, EyeOff } from "lucide-react"
import { cn } from "../lib/utils"
import type { Reminder, Entry } from "../lib/store"
import { useTrackers, useCalendarMonth, useStats, useReminders, useEntries } from "../lib/queries"
import { TimelineView } from "../components/TimelineView"

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function CalendarPage() {
  const [activeTab, setActiveTab] = useState<"calendar" | "timeline">("calendar")
  const { data: reminders = [] } = useReminders()
  const { data: trackers = [] } = useTrackers()
  const { data: stats } = useStats()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [hiddenCalendarTrackers, setHiddenCalendarTrackers] = useState<Set<number>>(new Set())
  const [hiddenTimelineTrackers, setHiddenTimelineTrackers] = useState<Set<number>>(new Set())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  
  // Timeline year state - controlled by CalendarPage
  const [timelineYear, setTimelineYear] = useState(new Date().getFullYear())
  const currentTimelineYear = new Date().getFullYear()

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  const { data: calendarData } = useCalendarMonth(currentYear, currentMonth)

  const activeDays = calendarData?.activeDays ?? []
  const entriesByDate = useMemo(
    () => calendarData?.entriesByDate ?? {},
    [calendarData?.entriesByDate]
  )

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  // Get entries for selected day from calendar API
  const selectedDayEntries = useMemo(() => {
    if (!selectedDay) return []
    const dateStr = new Date(currentYear, currentMonth, selectedDay).toISOString().slice(0, 10)
    return entriesByDate[dateStr] ?? []
  }, [entriesByDate, selectedDay, currentMonth, currentYear])

  // For selected day: show reminders that apply (one-off date match or recurring weekday match).
  const selectedDayReminders = useMemo(() => {
    if (!selectedDay) return []
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    const dayOfWeek = new Date(currentYear, currentMonth, selectedDay).getDay()
    return (reminders as Reminder[]).filter((r) => {
      if (!r.enabled) return false
      if (r.date != null && r.date !== "") return r.date === dateStr
      return !r.days || r.days.length === 0 || r.days.includes(dayOfWeek)
    })
  }, [reminders, selectedDay, currentMonth, currentYear])

  const pendingDayReminders = useMemo(
    () => selectedDayReminders.filter((r) => r.completedAt == null || r.completedAt === undefined),
    [selectedDayReminders]
  )
  const completedDayReminders = useMemo(
    () => selectedDayReminders.filter((r) => r.completedAt != null && r.completedAt !== undefined),
    [selectedDayReminders]
  )

  // Days that have at least one reminder: one-off (date) = only that day; recurring (days) = every matching weekday
  const daysWithReminders = useMemo(() => {
    const list = (reminders as Reminder[]).filter((r) => r.enabled)
    if (list.length === 0) return []
    const days = new Set<number>()
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay()
      const hasReminder = list.some((r) => {
        if (r.date != null && r.date !== "") return r.date === dateStr
        return r.days && r.days.length > 0 && r.days.includes(dayOfWeek)
      })
      if (hasReminder) days.add(d)
    }
    return Array.from(days)
  }, [reminders, currentMonth, currentYear, daysInMonth])

  // Map of day number -> array of tracker colors that have entries that day
  const trackerColorsByDay = useMemo(() => {
    const map = new Map<number, string[]>()
    const entriesByDateTyped = entriesByDate as Record<string, Entry[]>
    Object.entries(entriesByDateTyped).forEach(([dateStr, dayEntries]) => {
      const day = parseInt(dateStr.split('-')[2], 10)
      const colors: string[] = []
      const seenTrackerIds = new Set<number>()
      dayEntries.forEach((entry) => {
        // Saltar trackers ocultos
        if (hiddenCalendarTrackers.has(entry.trackerId)) return
        if (!seenTrackerIds.has(entry.trackerId)) {
          seenTrackerIds.add(entry.trackerId)
          const tracker = trackers.find((t) => t.id === entry.trackerId)
          if (tracker?.color) {
            colors.push(tracker.color)
          } else {
            colors.push('hsl(266 73% 63%)')
          }
        }
      })
      if (colors.length > 0) map.set(day, colors)
    })
    return map
  }, [entriesByDate, trackers, hiddenCalendarTrackers])

  // Fetch all entries for pills calculation
  const { data: allEntries = [] } = useEntries()

  // Trackers con entries en el mes actual (para pills de Calendar)
  const trackersWithCalendarEntries = useMemo(() => {
    return trackers.filter((tracker) =>
      allEntries.some((entry) => {
        const d = new Date(entry.timestamp)
        return (
          entry.trackerId === tracker.id &&
          d.getFullYear() === currentYear &&
          d.getMonth() === currentMonth
        )
      })
    )
  }, [trackers, allEntries, currentYear, currentMonth])

  // Trackers con entries en el año de Timeline
  const trackersWithTimelineEntries = useMemo(() => {
    return trackers.filter((tracker) =>
      allEntries.some((entry) => {
        return (
          entry.trackerId === tracker.id &&
          new Date(entry.timestamp).getFullYear() === timelineYear
        )
      })
    )
  }, [trackers, allEntries, timelineYear])

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    setSelectedDay(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    setSelectedDay(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDay(new Date().getDate())
  }

  const toggleCalendarTracker = (trackerId: number) => {
    setHiddenCalendarTrackers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(trackerId)) {
        newSet.delete(trackerId)
      } else {
        newSet.add(trackerId)
      }
      return newSet
    })
  }

  const toggleTimelineTracker = (trackerId: number) => {
    setHiddenTimelineTrackers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(trackerId)) {
        newSet.delete(trackerId)
      } else {
        newSet.add(trackerId)
      }
      return newSet
    })
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  return (
    <div className="space-y-8">
      {/* HEADER COMPLETO - dos filas */}
      <div className="space-y-4">
        {/* Fila 1: título a la izquierda, controles a la derecha */}
        <div className="flex items-start justify-between gap-4">
          {/* Título dinámico */}
          <div>
            <h1 className="text-4xl font-display font-bold mb-2 text-[hsl(210_25%_97%)]">
              {activeTab === "calendar" ? "Calendar" : "Timeline"}
            </h1>
            <p className="text-[hsl(210_12%_47%)]">
              {activeTab === "calendar" ? "Track your progress over time" : "Track your activities over time"}
            </p>
          </div>

          {/* Controles del lado derecho — condicionales por tab */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {activeTab === "calendar" && (
              <div className="flex items-center gap-3">
                <button
                  onClick={goToToday}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-[hsl(210_20%_15%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_18%)] transition-colors border border-[hsl(210_18%_22%)]"
                >
                  Today
                </button>
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 rounded-lg bg-[hsl(210_20%_15%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(266_73%_63%)] hover:text-white transition-colors border border-[hsl(210_18%_22%)]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xl font-bold text-[hsl(210_25%_97%)] min-w-[160px] text-center">
                  {months[currentMonth]} {currentYear}
                </span>
                <button
                  onClick={goToNextMonth}
                  className="p-2 rounded-lg bg-[hsl(210_20%_15%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(266_73%_63%)] hover:text-white transition-colors border border-[hsl(210_18%_22%)]"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
            {activeTab === "timeline" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTimelineYear(y => y - 1)}
                  className="p-2 rounded-lg bg-[hsl(210_20%_15%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(266_73%_63%)] hover:text-white transition-colors border border-[hsl(210_18%_22%)]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xl font-bold text-[hsl(210_25%_97%)] min-w-[60px] text-center">
                  {timelineYear}
                </span>
                <button
                  onClick={() => timelineYear < currentTimelineYear && setTimelineYear(y => y + 1)}
                  disabled={timelineYear >= currentTimelineYear}
                  className={cn(
                    "p-2 rounded-lg border transition-colors border-[hsl(210_18%_22%)]",
                    timelineYear >= currentTimelineYear
                      ? "bg-[hsl(210_20%_15%)] text-[hsl(210_12%_47%)] cursor-not-allowed"
                      : "bg-[hsl(210_20%_15%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(266_73%_63%)] hover:text-white"
                  )}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Fila 2: tabs a la izquierda, tracker pills a la derecha */}
        <div className="flex items-center justify-between border-b border-[hsl(210_18%_22%)] pb-4">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeTab === "calendar"
                  ? "bg-[hsl(266_73%_63%)] text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  : "text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_15%)]"
              )}
              onClick={() => setActiveTab("calendar")}
            >
              Calendar
            </button>
            <button
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeTab === "timeline"
                  ? "bg-[hsl(266_73%_63%)] text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  : "text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_15%)]"
              )}
              onClick={() => setActiveTab("timeline")}
            >
              Timeline
            </button>
          </div>

          {/* Pills — mismo sistema en ambos tabs */}
          {(() => {
            const isCalendar = activeTab === "calendar"
            const pillTrackers = isCalendar ? trackersWithCalendarEntries : trackersWithTimelineEntries
            const hiddenSet = isCalendar ? hiddenCalendarTrackers : hiddenTimelineTrackers
            const toggleFn = isCalendar ? toggleCalendarTracker : toggleTimelineTracker

            if (pillTrackers.length === 0) return null

            return (
              <div className="flex items-center gap-2 overflow-x-auto max-w-[55%]">
                <Eye className="w-4 h-4 text-[hsl(210_12%_47%)] flex-shrink-0" />
                <span className="text-sm text-[hsl(210_12%_47%)] flex-shrink-0">Trackers:</span>
                {pillTrackers.map((tracker) => {
                  const isHidden = hiddenSet.has(tracker.id)
                  return (
                    <button
                      key={tracker.id}
                      onClick={() => toggleFn(tracker.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border flex-shrink-0 flex items-center gap-1.5",
                        isHidden
                          ? "bg-transparent text-[hsl(210_12%_47%)] border-[hsl(210_18%_22%)] opacity-50"
                          : "text-white border-transparent"
                      )}
                      style={!isHidden && tracker.color ? { backgroundColor: tracker.color, borderColor: tracker.color } : undefined}
                    >
                      {tracker.name}
                      {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>

      {/* CONTENIDO DEL TAB CALENDAR */}
      {activeTab === "calendar" && (
        <>
          <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-6">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {daysOfWeek.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-[hsl(210_12%_47%)] py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {emptyDays.map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {days.map((day) => {
                const hasReminders = daysWithReminders.includes(day)
                const isSelected = selectedDay === day
                const isToday =
                  day === new Date().getDate() &&
                  currentMonth === new Date().getMonth() &&
                  currentYear === new Date().getFullYear()

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "aspect-square rounded-xl border transition-all duration-200",
                      "flex flex-col items-center justify-center gap-1",
                      "hover:border-[hsl(266_73%_63%)] hover:bg-[hsl(210_20%_15)]",
                      isSelected
                        ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%/0.1)]"
                        : "border-[hsl(210_18%_22)]",
                      isToday && !isSelected && "border-[hsl(266_73%_63%/0.5)] bg-[hsl(266_73%_63%/0.05)]"
                    )}
                  >
                    <span
                      className={cn(
                        "font-medium",
                        isSelected && "text-[hsl(266_73%_63%)]",
                        isToday && !isSelected && "text-[hsl(266_73%_63%)]",
                        !isSelected && !isToday && "text-[hsl(210_25%_97)]"
                      )}
                    >
                      {day}
                    </span>
                    <div className="flex gap-0.5 flex-wrap justify-center max-w-[40px]">
                      {(trackerColorsByDay.get(day) ?? []).slice(0, 5).map((color, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      {hasReminders && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day Details (when a day is selected) */}
          {selectedDay && (
            <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-6">
              <h3 className="text-xl font-display font-bold mb-4 text-[hsl(210_25%_97%)]">
                {months[currentMonth]} {selectedDay}, {currentYear}
              </h3>

              {/* Tracked Activities Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-[hsl(210_12%_47%)] uppercase tracking-wider mb-3">
                  Tracked Activities
                </h4>
                  {selectedDayEntries.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedDayEntries.map((entry) => {
                        const tracker = trackers.find((t) => t.id === entry.trackerId)

                        return (
                          <div
                            key={entry.id}
                            className="bg-[hsl(210_20%_15%)] rounded-xl p-4 border border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%/0.5)] transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-[hsl(210_25%_97)]">{tracker?.name || "Unknown"}</span>
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tracker?.color || 'hsl(266 73% 63%)' }} />
                            </div>
                          <p className="text-2xl font-display font-bold text-[hsl(266_73%_63%)]">
                            {entry.value ?? "—"}
                            {tracker?.config?.unit && (
                              <span className="text-sm font-normal text-[hsl(210_12%_47%)] ml-1">
                                {tracker.config.unit as string}
                              </span>
                            )}
                          </p>
                          {entry.note && (
                            <p className="text-sm text-[hsl(210_12%_47%)] mt-2">{entry.note}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-[hsl(210_20%_15%)] rounded-xl border border-[hsl(210_18%_22%)]">
                    <p className="text-[hsl(210_12%_47%)]">No entries for this day</p>
                  </div>
                )}
              </div>

              {/* Reminders & Notifications Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-semibold text-[hsl(210_12%_47%)] uppercase tracking-wider">
                    Reminders & Notifications
                  </h4>
                </div>
                {selectedDayReminders.length > 0 ? (
                  <div className="space-y-4">
                    {/* Pending */}
                    {pendingDayReminders.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[hsl(210_12%_47%)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Pending ({pendingDayReminders.length})
                        </p>
                        <div className="space-y-2">
                          {pendingDayReminders.map((reminder) => {
                            const linkedTracker = reminder.trackerId
                              ? trackers.find((t) => t.id === reminder.trackerId)
                              : null
                            return (
                              <div
                                key={reminder.id}
                                className="flex items-center gap-4 p-4 rounded-xl border border-[hsl(210_18%_22%)] bg-[hsl(210_20%_15%)] hover:border-amber-400/30 transition-all"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-[hsl(210_25%_97)]">{reminder.title}</p>
                                  {reminder.description && (
                                    <p className="text-xs text-[hsl(210_12%_47%)] mt-1 line-clamp-2">{reminder.description}</p>
                                  )}
                                  {linkedTracker && (
                                    <p className="text-xs text-[hsl(266_73%_63%)] mt-1">Linked to: {linkedTracker.name}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-[hsl(210_12%_47%)]">
                                  <Clock className="w-4 h-4" />
                                  {reminder.time}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {/* Completed */}
                    {completedDayReminders.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[hsl(210_12%_47%)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          Completed ({completedDayReminders.length})
                        </p>
                        <div className="space-y-2">
                          {completedDayReminders.map((reminder) => {
                            const linkedTracker = reminder.trackerId
                              ? trackers.find((t) => t.id === reminder.trackerId)
                              : null
                            return (
                              <div
                                key={reminder.id}
                                className="flex items-center gap-4 p-4 rounded-xl border border-[hsl(210_18%_22%)]/60 bg-[hsl(210_20%_15%)]/60 opacity-75"
                              >
                                <div className="flex-shrink-0 w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-[hsl(210_12%_47%)] line-through">{reminder.title}</p>
                                  {reminder.description && (
                                    <p className="text-xs text-[hsl(210_12%_47%)]/80 mt-1 line-clamp-2">{reminder.description}</p>
                                  )}
                                  {linkedTracker && (
                                    <p className="text-xs text-[hsl(266_73%_63%)]/70 mt-1">Linked to: {linkedTracker.name}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-[hsl(210_12%_47%)]/80">
                                  <Clock className="w-4 h-4" />
                                  {reminder.time}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-[hsl(210_20%_15%)] rounded-xl border border-[hsl(210_18%_22%)]">
                    <p className="text-[hsl(210_12%_47%)]">No reminders for this day</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-xl p-4">
              <p className="text-sm text-[hsl(210_12%_47%)] mb-1">Active Days</p>
              <p className="text-2xl font-display font-bold text-[hsl(266_73%_63%)]">{activeDays.length}</p>
            </div>
            <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-xl p-4">
              <p className="text-sm text-[hsl(210_12%_47%)] mb-1">Total Entries (month)</p>
              <p className="text-2xl font-display font-bold text-[hsl(280_65%_60%)]">
                {Object.values(entriesByDate).flat().length}
              </p>
            </div>
            <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-xl p-4">
              <p className="text-sm text-[hsl(210_12%_47%)] mb-1">Current Streak</p>
              <p className="text-2xl font-display font-bold text-[hsl(250_70%_65%)]">{stats?.currentStreak ?? 0} days</p>
            </div>
            <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-xl p-4">
              <p className="text-sm text-[hsl(210_12%_47%)] mb-1">Best Streak</p>
              <p className="text-2xl font-display font-bold text-[hsl(290_60%_58%)]">{stats?.bestStreak ?? 0} days</p>
            </div>
          </div>
        </>
      )}

      {/* CONTENIDO DEL TAB TIMELINE */}
      {activeTab === "timeline" && <TimelineView showHeader={false} year={timelineYear} hiddenTrackers={hiddenTimelineTrackers} />}
    </div>
  )
}
