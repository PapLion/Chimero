"use client"

import { useState, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Bell, Clock, Check, Eye, EyeOff } from "lucide-react"
import { cn } from "@shared/utils"
import type { Reminder, Entry } from "@shared/store"
import { useTrackers, useCalendarMonth, useStats, useReminders, useEntries, useTags } from "@shared/queries"
import { TimelineView } from "./components/TimelineView"
import { TagChips } from "@features/tags/components/TagChips"
import type { CalendarDayEntry } from "@contracts/features/calendar"
import { clampMoodScore, moodScoreToColor, moodScoreToLabel } from "@contracts/domain"
import { getBookActionLabel, getBookLifecycleRecord } from "@contracts/features/books"
import { getTrackerIdentity } from "@contracts/features/tracking"

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function CalendarPage() {
  const [activeTab, setActiveTab] = useState<"calendar" | "timeline">("calendar")
  const { data: reminders = [] } = useReminders()
  const { data: trackers = [] } = useTrackers()
  const { data: tags = [] } = useTags()
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
  const calendarViewKey = `${currentYear}-${currentMonth}`
  const selectedDayKey = selectedDay ? `${currentYear}-${currentMonth}-${selectedDay}` : "none"

  // Get entries for selected day from calendar API
  const selectedDayEntries = useMemo(() => {
    if (!selectedDay) return []
    const dateStr = new Date(currentYear, currentMonth, selectedDay).toISOString().slice(0, 10)
    return entriesByDate[dateStr] ?? []
  }, [entriesByDate, selectedDay, currentMonth, currentYear])
  const { data: allEntries = [] } = useEntries()
  const allEntriesById = useMemo(
    () => new Map(allEntries.map((entry) => [entry.id, entry])),
    [allEntries],
  )

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
    <div className="space-y-6">
      <div className="surface-panel-strong rounded-[1.5rem] p-6 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="page-title mb-2 text-[2.4rem]">
              {activeTab === "calendar" ? "Calendar" : "Timeline"}
            </h1>
            <p className="page-subtitle">
              {activeTab === "calendar" ? "Track your progress over time" : "Track your activities over time"}
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto lg:flex-nowrap">
            {activeTab === "calendar" && (
              <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto sm:flex-nowrap">
                <button
                  onClick={goToToday}
                  className="surface-chip px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.78)] hover:bg-[hsl(var(--card)/0.94)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
                >
                  Today
                </button>
                <button
                  onClick={goToPreviousMonth}
                  className="surface-chip p-2 text-[hsl(var(--foreground))] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.78)] hover:bg-[hsl(var(--card)/0.94)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={calendarViewKey}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="min-w-0 flex-1 text-center text-xl font-bold text-[hsl(var(--foreground))] sm:flex-none sm:min-w-[160px]"
                  >
                    {months[currentMonth]} {currentYear}
                  </motion.span>
                </AnimatePresence>
                <button
                  onClick={goToNextMonth}
                  className="surface-chip p-2 text-[hsl(var(--foreground))] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.78)] hover:bg-[hsl(var(--card)/0.94)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
            {activeTab === "timeline" && (
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                <button
                  onClick={() => setTimelineYear(y => y - 1)}
                  className="surface-chip p-2 text-[hsl(var(--foreground))] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.78)] hover:bg-[hsl(var(--card)/0.94)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="min-w-0 flex-1 text-center text-xl font-bold text-[hsl(var(--foreground))] sm:flex-none sm:min-w-[60px]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={timelineYear}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="inline-block"
                    >
                      {timelineYear}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <button
                  onClick={() => timelineYear < currentTimelineYear && setTimelineYear(y => y + 1)}
                  disabled={timelineYear >= currentTimelineYear}
                  className={cn(
                    "surface-chip p-2 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
                    timelineYear >= currentTimelineYear
                      ? "cursor-not-allowed opacity-50"
                      : "text-[hsl(var(--foreground))] hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.78)] hover:bg-[hsl(var(--card)/0.94)]"
                  )}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-[hsl(var(--border)/0.7)] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={cn(
                "surface-chip px-4 py-2 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
                activeTab === "calendar"
                  ? "border-[hsl(var(--primary)/0.42)] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--foreground))] shadow-[0_10px_22px_rgba(2,6,23,0.12)]"
                  : "text-[hsl(var(--muted-foreground))] hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.78)] hover:bg-[hsl(var(--card)/0.94)] hover:text-[hsl(var(--foreground))]"
              )}
              onClick={() => setActiveTab("calendar")}
              aria-pressed={activeTab === "calendar"}
            >
              Calendar
            </button>
            <button
              className={cn(
                "surface-chip px-4 py-2 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
                activeTab === "timeline"
                  ? "border-[hsl(var(--primary)/0.42)] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--foreground))] shadow-[0_10px_22px_rgba(2,6,23,0.12)]"
                  : "text-[hsl(var(--muted-foreground))] hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.78)] hover:bg-[hsl(var(--card)/0.94)] hover:text-[hsl(var(--foreground))]"
              )}
              onClick={() => setActiveTab("timeline")}
              aria-pressed={activeTab === "timeline"}
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
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 overflow-x-auto pb-1 lg:max-w-[55%] lg:justify-end">
                <Eye className="w-4 h-4 flex-shrink-0 text-[hsl(var(--muted-foreground))]" />
                <span className="flex-shrink-0 text-sm text-[hsl(var(--muted-foreground))]">Trackers:</span>
                {pillTrackers.map((tracker) => {
                  const isHidden = hiddenSet.has(tracker.id)
                  return (
                    <button
                      key={tracker.id}
                      onClick={() => toggleFn(tracker.id)}
                      className={cn(
                        "surface-chip flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
                        isHidden
                          ? "border-[hsl(var(--border)/0.68)] bg-[hsl(var(--card)/0.7)] text-[hsl(var(--muted-foreground))] opacity-60"
                          : "border-[hsl(var(--border)/0.68)] bg-[hsl(var(--card)/0.9)] text-[hsl(var(--foreground))] shadow-[0_8px_20px_rgba(2,6,23,0.08)] hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.82)] hover:bg-[hsl(var(--card)/0.96)] hover:shadow-[0_10px_22px_rgba(2,6,23,0.12)]"
                      )}
                      style={!isHidden && tracker.color ? { backgroundColor: `${tracker.color}14`, borderColor: `${tracker.color}44`, color: tracker.color } : undefined}
                      aria-pressed={!isHidden}
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

      <AnimatePresence mode="wait" initial={false}>
        {activeTab === "calendar" ? (
          <motion.div
            key={`calendar-${calendarViewKey}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="surface-panel-strong rounded-[1.5rem] p-6">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {daysOfWeek.map((day) => (
                  <div key={day} className="py-2 text-center text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    {day}
                  </div>
                ))}
              </div>

              <motion.div
                key={calendarViewKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-7 gap-2"
              >
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
                        "surface-card aspect-square rounded-[1.15rem] border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.28)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
                        "flex flex-col items-center justify-center gap-1",
                        "hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.82)] hover:bg-[hsl(var(--card)/0.94)] hover:shadow-[0_10px_22px_rgba(2,6,23,0.12)]",
                        isSelected
                          ? "border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.08)] shadow-[0_12px_26px_rgba(2,6,23,0.14)]"
                          : "border-[hsl(var(--border)/0.68)] bg-[hsl(var(--card)/0.82)]",
                        isToday && !isSelected && "border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.05)]"
                      )}
                    >
                      <span
                        className={cn(
                          "font-medium",
                          isSelected && "text-[hsl(var(--foreground))]",
                          isToday && !isSelected && "text-[hsl(var(--primary))]",
                          !isSelected && !isToday && "text-[hsl(var(--foreground))]"
                        )}
                      >
                        {day}
                      </span>
                      <div className="flex max-w-[40px] flex-wrap justify-center gap-0.5">
                        {(trackerColorsByDay.get(day) ?? []).slice(0, 5).map((color, i) => (
                          <div
                            key={i}
                            className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        {hasReminders && <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[hsl(var(--accent))]" />}
                      </div>
                    </button>
                  )
                })}
              </motion.div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {selectedDay ? (
                <motion.div
                  key={selectedDayKey}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="surface-panel-strong rounded-[1.5rem] p-6"
                >
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl font-bold text-[hsl(var(--foreground))]">
                        {months[currentMonth]} {selectedDay}, {currentYear}
                      </h3>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Entries and reminders for the selected day.
                      </p>
                    </div>
                    <div className="section-kicker">Selected day</div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div>
                      <h4 className="section-kicker mb-3">Entries</h4>
                      {selectedDayEntries.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {selectedDayEntries.map((entry) => {
                            const detailedEntry = allEntriesById.get(entry.id) ?? null
                            const tracker = trackers.find((t) => t.id === entry.trackerId)
                            const displayUnit = entry.unit ?? (tracker?.config?.unit as string | undefined)
                            const trackerNameLower = tracker?.name.toLowerCase() ?? ""
                            const isMoodEntry = trackerNameLower.includes("mood") || trackerNameLower.includes("feeling") || tracker?.icon === "smile"
                            const isTaskEntry = !!entry.taskState
                            const isGamingTracker = tracker ? getTrackerIdentity(tracker) === "gaming" : false
                            const isFoodTracker = tracker ? getTrackerIdentity(tracker) === "diet" : false
                            const isBooksTracker = tracker ? getTrackerIdentity(tracker) === "books" : false
                            const gaming = entry.gaming?.structured ? entry.gaming : null
                            const food = entry.food?.structured ? entry.food : null
                            const legacyGaming = isGamingTracker && !gaming
                            const legacyFood = isFoodTracker && !food
                            const book = isBooksTracker && detailedEntry ? getBookLifecycleRecord(detailedEntry as Entry) : null
                            const moodScore = isMoodEntry ? clampMoodScore(entry.value) : null
                            const entryTime = new Date(entry.timestamp).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })

                            return (
                              <div
                                key={entry.id}
                                className="surface-card rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.82)] hover:shadow-[0_12px_24px_rgba(2,6,23,0.12)]"
                              >
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <span className="font-medium text-[hsl(var(--foreground))]">
                                    {tracker?.name || "Unknown"}
                                  </span>
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: tracker?.color || "hsl(266 73% 63%)" }}
                                  />
                                </div>
                                <p className="text-2xl font-display font-bold text-[hsl(var(--primary))]">
                                  {isBooksTracker && book
                                    ? (book.action === "legacy" ? "Legacy" : getBookActionLabel(book.action))
                                    : isTaskEntry
                                      ? (entry.taskState === "postponed" ? "Postponed" : "Task")
                                      : gaming
                                        ? `${gaming.estimatedHours}h`
                                        : isMoodEntry && moodScore != null
                                          ? `${moodScore}/10`
                                          : legacyGaming
                                            ? "Legacy"
                                            : entry.value ?? "—"}
                                  {!isTaskEntry && !isMoodEntry && !isBooksTracker && displayUnit && (
                                    <span className="ml-1 text-sm font-normal text-[hsl(var(--muted-foreground))]">
                                      {displayUnit}
                                    </span>
                                  )}
                                </p>
                                {isTaskEntry && (
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    <span className={cn(
                                      "rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-normal",
                                      entry.taskState === "postponed"
                                        ? "border-amber-300/30 bg-amber-300/10 text-amber-300"
                                        : "border-emerald-300/25 bg-emerald-300/10 text-emerald-300"
                                    )}>
                                      {entry.taskState === "postponed" ? "Postponed" : "Actionable"}
                                    </span>
                                    {entry.taskActiveDate && entry.taskState === "postponed" && (
                                      <span className="rounded-full border border-[hsl(var(--border)/0.5)] px-2 py-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                                        Active {entry.taskActiveDate}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {isMoodEntry && moodScore != null && (
                                  <p className="mt-1 text-sm" style={{ color: moodScoreToColor(moodScore) }}>
                                    {moodScoreToLabel(moodScore)}
                                  </p>
                                )}
                                {isBooksTracker && book && (
                                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                    {book.title}
                                  </p>
                                )}
                                {legacyGaming && (
                                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                    Unstructured legacy game entry
                                  </p>
                                )}
                                {legacyGaming && entry.note && (
                                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{entry.note}</p>
                                )}
                                {isBooksTracker && book && book.rating != null && (
                                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                    {book.rating.toFixed(1)}/5
                                  </p>
                                )}
                                {isBooksTracker && book && book.action === "legacy" && entry.note && (
                                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{entry.note}</p>
                                )}
                                {food && (
                                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                    {food.foodName}
                                  </p>
                                )}
                                {food && (
                                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                    {food.calories != null ? `${Math.round(food.calories)} kcal` : "Calories not set"}
                                    {food.mealType ? ` · ${food.mealType}` : ""}
                                  </p>
                                )}
                                {legacyFood && (
                                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                    Unstructured legacy food entry
                                  </p>
                                )}
                                {legacyFood && entry.note && (
                                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{entry.note}</p>
                                )}
                                {(entry as CalendarDayEntry).waist != null && (
                                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                    Waist {(entry as CalendarDayEntry).waist}
                                    {(entry as CalendarDayEntry).waistUnit ? ` ${(entry as CalendarDayEntry).waistUnit}` : ""}
                                  </p>
                                )}
                                {entry.note && !gaming && !legacyGaming && !isBooksTracker && !food && !legacyFood && (
                                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{entry.note}</p>
                                )}
                                {gaming && (
                                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{gaming.gameTitle}</p>
                                )}
                                <TagChips
                                  tagIds={(entry as CalendarDayEntry).tagIds}
                                  tags={tags}
                                  limit={3}
                                  className="mt-2"
                                />
                                <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))/0.8]">{entryTime}</p>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="surface-card rounded-2xl py-6 text-center">
                          <p className="text-[hsl(var(--muted-foreground))]">No entries for this day</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-400" />
                        <h4 className="section-kicker">Reminders</h4>
                      </div>
                      {selectedDayReminders.length > 0 ? (
                        <div className="space-y-4">
                          {pendingDayReminders.length > 0 && (
                            <div>
                              <p className="section-kicker mb-2 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
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
                                      className="surface-card flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.82)] hover:shadow-[0_10px_22px_rgba(2,6,23,0.12)]"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-[hsl(var(--foreground))]">{reminder.title}</p>
                                        {reminder.description && (
                                          <p className="mt-1 line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">
                                            {reminder.description}
                                          </p>
                                        )}
                                        {linkedTracker && (
                                          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                            Linked to: {linkedTracker.name}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))]">
                                        <Clock className="w-4 h-4" />
                                        {reminder.time}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          {completedDayReminders.length > 0 && (
                            <div>
                              <p className="section-kicker mb-2 flex items-center gap-1.5">
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
                                      className="surface-card flex items-center gap-4 rounded-2xl p-4 opacity-75 transition-all duration-200"
                                    >
                                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-emerald-500/15">
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium line-through text-[hsl(var(--muted-foreground))]">
                                          {reminder.title}
                                        </p>
                                        {reminder.description && (
                                          <p className="mt-1 line-clamp-2 text-xs text-[hsl(var(--muted-foreground))/0.8]">
                                            {reminder.description}
                                          </p>
                                        )}
                                        {linkedTracker && (
                                          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))/0.7]">
                                            Linked to: {linkedTracker.name}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))/0.8]">
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
                        <div className="surface-card rounded-2xl py-6 text-center">
                          <p className="text-[hsl(var(--muted-foreground))]">No reminders for this day</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.div
              key={`stats-${calendarViewKey}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1], delay: 0.03 }}
              className="grid grid-cols-2 gap-4 md:grid-cols-4"
            >
              <div className="metric-chip rounded-2xl p-4">
                <p className="section-kicker mb-1">Active Days</p>
                <p className="text-2xl font-display font-bold text-[hsl(var(--foreground))]">{activeDays.length}</p>
              </div>
              <div className="metric-chip rounded-2xl p-4">
                <p className="section-kicker mb-1">Total Entries (month)</p>
                <p className="text-2xl font-display font-bold text-[hsl(var(--foreground))]">
                  {Object.values(entriesByDate).flat().length}
                </p>
              </div>
              <div className="metric-chip rounded-2xl p-4">
                <p className="section-kicker mb-1">Current Streak</p>
                <p className="text-2xl font-display font-bold text-[hsl(var(--foreground))]">
                  {stats?.currentStreak ?? 0} days
                </p>
              </div>
              <div className="metric-chip rounded-2xl p-4">
                <p className="section-kicker mb-1">Best Streak</p>
                <p className="text-2xl font-display font-bold text-[hsl(var(--foreground))]">
                  {stats?.bestStreak ?? 0} days
                </p>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <TimelineView showHeader={false} year={timelineYear} hiddenTrackers={hiddenTimelineTrackers} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
