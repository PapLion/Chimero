"use client"

import { useMemo, useState, type MouseEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { AssetWithUrls } from "@contracts/features/assets"
import type { WeightEntryHistoryItem } from "@contracts/contracts"
import {
  buildMoodEntriesReadModel,
  buildMoodStatisticsReadModel,
  buildTaskDayReadModel,
  buildWeightEntriesTabReadModel,
  buildWeightStatisticsReadModel,
  postponeTaskToNextDay,
  unpostponeTask,
} from "@contracts/domain"
import { usesMediaStyleRendering } from "@contracts/features/tracking"
import { useAppStore } from "@shared/store"
import { useTrackers, useEntries, useDeleteEntryMutation, useUpdateEntryMutation, useWeightDetail, useTags } from "@shared/queries"
import { filterEntriesByDate, cn } from "@shared/utils"
import type { Entry } from "@shared/store"
import { Scale, Smile, Dumbbell, Users, CheckSquare, Wallet, Flame, Book, Heart, Coffee, Moon, Sun, Zap, Target, Music, Camera, Gamepad2, Star, TrendingUp, TrendingDown, Salad, ImageIcon, Trash2, Pencil, CalendarPlus, Undo2, Square, Tv, type LucideIcon } from "lucide-react"
import { EditEntryDialog } from "@features/entry/modals/EditEntryDialog"
import { TagChips } from "@features/tags/components/TagChips"
import { ConfirmDeleteDialog } from "@shared/components/ConfirmDeleteDialog"
import { formatToastError, useToast } from "@shared/components/toast"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

const iconMap: Record<string, LucideIcon> = {
  scale: Scale,
  smile: Smile,
  dumbbell: Dumbbell,
  users: Users,
  "check-square": CheckSquare,
  wallet: Wallet,
  flame: Flame,
  book: Book,
  "gamepad-2": Gamepad2,
  heart: Heart,
  coffee: Coffee,
  moon: Moon,
  sun: Sun,
  zap: Zap,
  target: Target,
  music: Music,
  tv: Tv,
  camera: Camera,
  salad: Salad,
}

interface TrackerDetailViewProps {
  trackerId: number
  selectedDate: Date
  assets: Map<number, AssetWithUrls>
}

type TrackerChartPoint = {
  value: number
  waist?: number | null
  date: string
  fullDate: string
}

// Recharts Tooltip content props
interface TooltipContentProps {
  active?: boolean
  payload?: Array<{ value: number; name?: string; dataKey?: string }>
  label?: string
}
const CustomTooltip = ({ active, payload, label }: TooltipContentProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="surface-panel rounded-2xl border border-[hsl(var(--border)/0.72)] px-3 py-2 shadow-[0_20px_42px_rgba(2,6,23,0.28)] backdrop-blur-xl">
        <p className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
        {payload.map((item) => (
          <p key={String(item.dataKey ?? item.name ?? item.value)} className="text-sm font-medium text-[hsl(var(--foreground))]">
            {item.name ? `${item.name}: ` : ""}
            {typeof item.value === 'number'
              ? item.value.toFixed(1)
              : item.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const panelMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
}

const tabButtonBase =
  "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"

const statCardBase =
  "surface-card rounded-2xl p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.82)] hover:shadow-[0_12px_24px_rgba(2,6,23,0.12)]"

const entryCardBase =
  "group relative overflow-hidden surface-card rounded-2xl p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.82)] hover:shadow-[0_14px_28px_rgba(2,6,23,0.14)]"

const actionButtonBase =
  "rounded-lg border border-white/8 bg-white/[0.06] p-1.5 text-white/60 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/[0.1] hover:text-[hsl(var(--foreground))]"

export function TrackerDetailView({ trackerId, selectedDate: propSelectedDate, assets }: TrackerDetailViewProps) {
  const { selectedDate: storeSelectedDate } = useAppStore()
  const { data: trackers = [] } = useTrackers()
  const { data: allEntries = [] } = useEntries({ limit: 1000 })
  const { data: tags = [] } = useTags()
  const deleteEntryMutation = useDeleteEntryMutation()
  const updateEntryMutation = useUpdateEntryMutation()
  const toast = useToast()

  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null)

  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)

  const handleEditEntry = (e: MouseEvent, entry: Entry) => {
    e.stopPropagation()
    e.preventDefault()
    setEditingEntry(entry)
  }

  const renderEntryTags = (tagIds?: number[], className = "mb-2 mt-2") => (
    <TagChips tagIds={tagIds} tags={tags} limit={4} className={className} />
  )

  const [activeTab, setActiveTab] = useState<"stats" | "graphs" | "entries">("entries")
  const [chartTimeFilter, setChartTimeFilter] = useState<"1M" | "3M" | "1Y">("1M")
  const [chartType, setChartType] = useState<"area" | "bar">("area")

  // Use store selectedDate if available, fallback to prop
  const selectedDate = storeSelectedDate || propSelectedDate
  const isToday = selectedDate.toDateString() === new Date().toDateString()

  const tracker = trackers.find((t) => t.id === trackerId)
  const trackerNameLowerForWeight = tracker?.name.toLowerCase() ?? ""
  const isWeightTracker =
    !!tracker &&
    (trackerNameLowerForWeight.includes("weight") ||
      trackerNameLowerForWeight.includes("peso") ||
      tracker.icon === "scale")
  const trackerNameLowerForMood = tracker?.name.toLowerCase() ?? ""
  const isMoodTracker =
    !!tracker &&
    (trackerNameLowerForMood.includes("mood") ||
      trackerNameLowerForMood.includes("feeling") ||
      tracker.icon === "smile")
  const { data: weightDetail } = useWeightDetail(trackerId, isWeightTracker)
  const weightEntriesReadModel = useMemo(
    () => weightDetail ? buildWeightEntriesTabReadModel(weightDetail) : { entries: [] },
    [weightDetail],
  )
  const weightStatisticsReadModel = useMemo(
    () => weightDetail ? buildWeightStatisticsReadModel(weightDetail) : null,
    [weightDetail],
  )

  // Filter entries for this tracker (hooks must run unconditionally)
  const trackerEntries = useMemo(() => {
    return allEntries.filter((e) => e.trackerId === trackerId)
  }, [allEntries, trackerId])
  const moodEntriesReadModel = useMemo(
    () => buildMoodEntriesReadModel(trackerEntries),
    [trackerEntries],
  )
  const moodStatisticsReadModel = useMemo(
    () => buildMoodStatisticsReadModel(trackerEntries),
    [trackerEntries],
  )

  // Filter entries for selected date (for stats and history feed)
  const selectedDateEntries = useMemo(() => {
    return filterEntriesByDate(trackerEntries, selectedDate)
  }, [trackerEntries, selectedDate])

  // History feed: Show all entries if today, otherwise filter by selected date
  const historyEntries = useMemo(() => {
    if (isToday) {
      return trackerEntries.slice().reverse() // Show recent history when viewing today
    }
    return selectedDateEntries.slice().reverse() // Show only selected date when viewing past/future
  }, [trackerEntries, selectedDateEntries, isToday])

  const weightHistoryEntries = useMemo(() => {
    const entries = weightEntriesReadModel.entries
    if (isToday) return entries
    const selectedDateStr = toDateStr(selectedDate)
    return entries.filter((entry) => entry.dateStr === selectedDateStr)
  }, [weightEntriesReadModel.entries, selectedDate, isToday])

  const moodHistoryEntries = useMemo(() => {
    const entries = moodEntriesReadModel.entries
    if (isToday) return entries
    const selectedDateStr = toDateStr(selectedDate)
    return entries.filter((entry) => entry.dateStr === selectedDateStr)
  }, [moodEntriesReadModel.entries, selectedDate, isToday])

  // Calculate stats - use selectedDateEntries for "today's" stats when viewing a specific date
  const totalCount = isWeightTracker && weightStatisticsReadModel
    ? (isToday ? weightStatisticsReadModel.totalEntries : weightHistoryEntries.length)
    : isMoodTracker
      ? (isToday ? moodStatisticsReadModel.count : moodHistoryEntries.length)
    : isToday ? trackerEntries.length : selectedDateEntries.length
  const currentStreak = isWeightTracker && weightStatisticsReadModel
    ? weightStatisticsReadModel.streakDays
    : calculateStreak(trackerEntries) // Streak is always calculated from all entries
  const averageValue = selectedDateEntries.length > 0
    ? selectedDateEntries.reduce((sum, e) => sum + (e.value ?? 0), 0) / selectedDateEntries.length
    : 0

  // --- NEW ANALYTICS: Month Average, Change vs Last Month, and Days Since Last Entry ---
  const { monthAverage, lastMonthAverage, changeVsLastMonth, daysSinceLastEntry, entriesThisWeek, entriesThisYear } = useMemo(() => {
    if (trackerEntries.length === 0) {
      return { monthAverage: 0, lastMonthAverage: 0, changeVsLastMonth: 0, daysSinceLastEntry: null, entriesThisWeek: 0, entriesThisYear: 0 }
    }

    const referenceDate = new Date(selectedDate.getTime())
    referenceDate.setHours(23, 59, 59, 999)
    const refTime = referenceDate.getTime()
    const msPerDay = 1000 * 60 * 60 * 24

    // Filter out future entries relative to the selected date
    const pastEntries = trackerEntries.filter((e) => e.timestamp <= refTime)

    if (pastEntries.length === 0) {
      return { monthAverage: 0, lastMonthAverage: 0, changeVsLastMonth: 0, daysSinceLastEntry: null, entriesThisWeek: 0, entriesThisYear: 0 }
    }

    // 1. Days since last entry
    // Entries are sorted descending by default in our queries (or should be). Let's sort to be safe:
    const sortedDesc = [...pastEntries].sort((a, b) => b.timestamp - a.timestamp)
    const lastEntry = sortedDesc[0]
    const daysSince = Math.floor((refTime - lastEntry.timestamp) / msPerDay)

    // 2. Month Averages (Last 30 days vs 31-60 days ago)
    const thirtyDaysAgo = refTime - (30 * msPerDay)
    const sixtyDaysAgo = refTime - (60 * msPerDay)

    const thisMonthEntries = pastEntries.filter((e) => e.timestamp >= thirtyDaysAgo)
    const lastMonthEntries = pastEntries.filter((e) => e.timestamp >= sixtyDaysAgo && e.timestamp < thirtyDaysAgo)

    const calcAvg = (entries: typeof trackerEntries) =>
      entries.length > 0 ? entries.reduce((sum, e) => sum + (e.value ?? 0), 0) / entries.length : 0

    const currentAvg = calcAvg(thisMonthEntries)
    const prevAvg = calcAvg(lastMonthEntries)

    // 3. Percentage Change
    let percentChange = 0
    if (prevAvg > 0) {
      percentChange = ((currentAvg - prevAvg) / prevAvg) * 100
    } else if (currentAvg > 0) {
      percentChange = 100 // Infinite increase, cap at 100% for display
    }

    // 4. Entries This Week & Year (Relative to selectedDate)
    const dayOfWeek = referenceDate.getDay()
    const diffToMonday = referenceDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)

    const startOfWeek = new Date(referenceDate.getTime())
    startOfWeek.setDate(diffToMonday)
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfWeekTime = startOfWeek.getTime()

    const startOfYear = new Date(referenceDate.getFullYear(), 0, 1)
    const startOfYearTime = startOfYear.getTime()

    const entriesThisWeek = pastEntries.filter((e) => e.timestamp >= startOfWeekTime).length
    const entriesThisYear = pastEntries.filter((e) => e.timestamp >= startOfYearTime).length

    return {
      monthAverage: currentAvg,
      lastMonthAverage: prevAvg,
      changeVsLastMonth: percentChange,
      daysSinceLastEntry: daysSince,
      entriesThisWeek,
      entriesThisYear
    }
  }, [trackerEntries, selectedDate])

  // Chart data: Filtered by 1M, 3M, 1Y bounds
  const chartData = useMemo<TrackerChartPoint[]>(() => {
    if (!tracker) return []

    if (isWeightTracker && weightDetail?.chartData) {
      const referenceDate = new Date(selectedDate.getTime())
      referenceDate.setHours(23, 59, 59, 999)
      const daysBack = chartTimeFilter === "1M" ? 30 : chartTimeFilter === "3M" ? 90 : 365
      const cutoffDate = new Date(referenceDate.getTime())
      cutoffDate.setDate(cutoffDate.getDate() - daysBack)
      const cutoffStr = toDateStr(cutoffDate)
      const refStr = toDateStr(referenceDate)

      return weightDetail.chartData
        .filter((point) => point.date >= cutoffStr && point.date <= refStr)
        .map((point) => {
          const date = new Date(point.date)
          return {
            value: point.weight,
            waist: point.waist,
            date: chartTimeFilter === "1Y"
              ? date.toLocaleDateString("en", { month: "short" })
              : date.toLocaleDateString("en", { month: "short", day: "numeric" }),
            fullDate: point.date,
          }
        })
    }

    const datesMap: Record<string, Entry[]> = {}

    const referenceDate = new Date(selectedDate.getTime())
    referenceDate.setHours(23, 59, 59, 999)
    const refTime = referenceDate.getTime()

    // Determine days back relative to selectedDate
    const daysBack = chartTimeFilter === "1M" ? 30 : chartTimeFilter === "3M" ? 90 : 365
    const cutoffDate = new Date(referenceDate.getTime())
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)
    const cutoffTime = cutoffDate.getTime()

    // Filter relevant entries
    const relevantEntries = trackerEntries.filter(e => e.timestamp >= cutoffTime && e.timestamp <= refTime)

    relevantEntries.forEach((entry) => {
      const entryDateStr = entry.dateStr || new Date(entry.timestamp).toISOString().split("T")[0]
      if (!datesMap[entryDateStr]) {
        datesMap[entryDateStr] = []
      }
      datesMap[entryDateStr].push(entry)
    })

    const dates = Object.keys(datesMap).sort()
    return dates.map((dateStr) => {
      const dayEntries = datesMap[dateStr]
      const trackerNameLower = tracker.name.toLowerCase()
      const isWeightTracker = trackerNameLower.includes("weight") || trackerNameLower.includes("peso")
      const isMoodTracker = trackerNameLower.includes("mood") || trackerNameLower.includes("feeling") || tracker.icon === "smile"
      const isRatingType = tracker.type === "rating"

      let aggregatedValue: number
      if (isMoodTracker) {
        aggregatedValue = dayEntries.reduce((acc, e) => acc + (e.value ?? 0), 0) / dayEntries.length
      } else if (isWeightTracker || isRatingType) {
        aggregatedValue = dayEntries[dayEntries.length - 1]?.value ?? 0
      } else {
        aggregatedValue = dayEntries.reduce((acc, e) => acc + (e.value ?? 0), 0)
      }

      const date = new Date(dateStr)
      return {
        value: aggregatedValue,
        // Shorten label if it's 1Y to avoid cramming
        date: chartTimeFilter === "1Y"
          ? date.toLocaleDateString("en", { month: "short" })
          : date.toLocaleDateString("en", { month: "short", day: "numeric" }),
        fullDate: dateStr,
      }
    })
  }, [trackerEntries, tracker, chartTimeFilter, selectedDate, isWeightTracker, weightDetail?.chartData])

  // Heatmap data: "Year in Pixels"
  const heatmapData = useMemo(() => {
    const referenceDate = new Date(selectedDate.getTime())
    referenceDate.setHours(0, 0, 0, 0)

    // We want 364 days total (52 weeks exactly) ending today
    const numDays = 364
    const startDate = new Date(referenceDate.getTime())
    startDate.setDate(referenceDate.getDate() - numDays + 1)

    // Create an array mapping all dates
    const daysArray = Array.from({ length: numDays }).map((_, i) => {
      const d = new Date(startDate.getTime())
      d.setDate(startDate.getDate() + i)
      return d.toISOString().split("T")[0]
    })

    // Map intensity per date
    const intensityMap: Record<string, number> = {}
    let maxIntensity = 0

    const refTimeEnd = new Date(selectedDate.getTime())
    refTimeEnd.setHours(23, 59, 59, 999)

    const pastEntries = trackerEntries.filter((e) => e.timestamp <= refTimeEnd.getTime())

    pastEntries.forEach(entry => {
      const dateStr = entry.dateStr || new Date(entry.timestamp).toISOString().split("T")[0]
      if (!intensityMap[dateStr]) intensityMap[dateStr] = 0

      // Binary/Task trackers add 1, others add their scalar value
      const val = entry.value ?? 1
      intensityMap[dateStr] += val

      if (intensityMap[dateStr] > maxIntensity) {
        maxIntensity = intensityMap[dateStr]
      }
    })

    return { daysArray, intensityMap, maxIntensity }
  }, [trackerEntries, selectedDate])

  if (!tracker) return null

  const Icon = iconMap[tracker.icon ?? ""] || CheckSquare

  // Render based on tracker type
  const trackerNameLower = tracker.name.toLowerCase()
  const isMediaType = usesMediaStyleRendering(tracker)
  const isWeightType = isWeightTracker
  const isMoodType = isMoodTracker
  const isTaskType = tracker.type === "list" || tracker.type === "binary" || trackerNameLower.includes("task")
  const isDietType = trackerNameLower.includes("diet") || trackerNameLower.includes("calorie") || trackerNameLower.includes("food") || trackerNameLower.includes("meal") || tracker.icon === "salad"
  const isNumericType = tracker.type === "numeric" || tracker.type === "range" || tracker.type === "counter"
  const selectedDateStr = toDateStr(selectedDate)
  const taskHistoryReadModel = isTaskType ? buildTaskDayReadModel(trackerEntries, selectedDateStr) : null
  const taskHistoryEntries = taskHistoryReadModel?.entries.slice().reverse() ?? []

  const handlePostponeTask = async (entry: Entry) => {
    try {
      const metadata = postponeTaskToNextDay(entry, selectedDateStr)
      await updateEntryMutation.mutateAsync({ id: entry.id, updates: { metadata } })
      toast.info("Task postponed.", entry.note?.trim() || tracker.name)
    } catch (error) {
      toast.error(
        "We couldn't postpone that task.",
        formatToastError(error, "Please try again in a moment."),
      )
    }
  }

  const handleToggleTaskCompletion = async (entry: Entry, completed: boolean) => {
    try {
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        updates: { value: completed ? 1 : 0 },
      })
      toast.info(completed ? "Task completed." : "Task marked incomplete.", entry.note?.trim() || tracker.name)
    } catch (error) {
      toast.error(
        "We couldn't update that task.",
        formatToastError(error, "Please try again in a moment."),
      )
    }
  }

  const handleUnpostponeTask = async (entry: Entry) => {
    try {
      const metadata = unpostponeTask(entry)
      await updateEntryMutation.mutateAsync({ id: entry.id, updates: { metadata } })
      toast.info("Task restored.", entry.note?.trim() || tracker.name)
    } catch (error) {
      toast.error(
        "We couldn't restore that task.",
        formatToastError(error, "Please try again in a moment."),
      )
    }
  }

  return (
    <div className="flex h-full flex-col space-y-8 overflow-y-auto pr-1">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={trackerId}
          className="space-y-8"
          initial={panelMotion.initial}
          animate={panelMotion.animate}
          exit={panelMotion.exit}
          transition={panelMotion.transition}
        >
      <div className="surface-panel relative overflow-hidden rounded-3xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent" />
        <div className="relative z-10">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03]">
              <Icon className="h-8 w-8" style={{ color: tracker.color ?? undefined }} />
            </div>
            <div className="min-w-0">
              <div className="section-kicker">Tracker detail</div>
              <h1 className="page-title mt-1 text-[2.25rem]">{tracker.name}</h1>
              <p className="page-subtitle mt-1.5 max-w-2xl">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-white/8 pb-4">
          <button
            className={cn(
              tabButtonBase,
              activeTab === "stats"
                ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%)] text-white shadow-lg shadow-primary/20"
                : "border-white/8 bg-white/[0.04] text-[hsl(220_12%_58%)] hover:border-white/12 hover:bg-white/[0.06] hover:text-[hsl(210_28%_97%)]"
            )}
            onClick={() => setActiveTab("stats")}
            aria-pressed={activeTab === "stats"}
          >
            Statistics
          </button>
          <button
            className={cn(
              tabButtonBase,
              activeTab === "graphs"
                ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%)] text-white shadow-lg shadow-primary/20"
                : "border-white/8 bg-white/[0.04] text-[hsl(220_12%_58%)] hover:border-white/12 hover:bg-white/[0.06] hover:text-[hsl(210_28%_97%)]"
            )}
            onClick={() => setActiveTab("graphs")}
            aria-pressed={activeTab === "graphs"}
          >
            Graphs
          </button>
          <button
            className={cn(
              tabButtonBase,
              activeTab === "entries"
                ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%)] text-white shadow-lg shadow-primary/20"
                : "border-white/8 bg-white/[0.04] text-[hsl(220_12%_58%)] hover:border-white/12 hover:bg-white/[0.06] hover:text-[hsl(210_28%_97%)]"
            )}
            onClick={() => setActiveTab("entries")}
            aria-pressed={activeTab === "entries"}
          >
            Entries
          </button>
          <button
            className="hidden cursor-not-allowed rounded-full border border-white/5 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/20 sm:block"
            disabled
          >
            Insights (Soon)
          </button>
        </div>
        </div>
      </div>

      {/* Tab Content Rendering */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          className="flex-1 overflow-y-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className={statCardBase}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">Total Entries</div>
                <div className="text-3xl font-bold tracking-tight text-[hsl(210_28%_97%)]">{totalCount}</div>
              </div>
              <div className={statCardBase}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">Current Streak</div>
                <div className="text-3xl font-bold tracking-tight text-[hsl(266_73%_63%)]">
                  {isWeightType ? weightDetail?.streakDays ?? currentStreak : currentStreak} days
                </div>
              </div>
              <div className={statCardBase}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">
                  {isWeightType ? "Weekly Average" : isMoodType ? "Average Mood" : "Average Value"}
                </div>
                <div className="text-3xl font-bold tracking-tight text-[hsl(210_28%_97%)]">
                  {isWeightType
                    ? weightDetail?.weeklyAvg != null ? weightDetail.weeklyAvg.toFixed(1) : "--"
                    : isMoodType
                      ? moodStatisticsReadModel.averageScore != null ? `${moodStatisticsReadModel.averageScore.toFixed(1)}/10` : "--"
                    : averageValue > 0 ? averageValue.toFixed(1) : "--"}
                </div>
              </div>
            </div>

            {/* Deep Analytics Row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {isWeightType ? (
                <>
                  <div className={statCardBase}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">Previous Delta</div>
                    <div className="text-4xl font-bold tracking-tight text-[hsl(210_28%_97%)]">
                      {weightStatisticsReadModel?.deltaPrevious != null
                        ? `${weightStatisticsReadModel.deltaPrevious > 0 ? "+" : ""}${weightStatisticsReadModel.deltaPrevious.toFixed(1)}`
                        : "--"}
                    </div>
                  </div>
                  <div className={statCardBase}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">7-Day Delta</div>
                    <div className="text-4xl font-bold tracking-tight text-[hsl(210_28%_97%)]">
                      {weightStatisticsReadModel?.deltaWeek != null
                        ? `${weightStatisticsReadModel.deltaWeek > 0 ? "+" : ""}${weightStatisticsReadModel.deltaWeek.toFixed(1)}`
                        : "--"}
                    </div>
                  </div>
                  <div className={statCardBase}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">Latest Waist</div>
                    <div className="text-4xl font-bold tracking-tight text-[hsl(210_28%_97%)]">
                      {weightStatisticsReadModel?.waistStats
                        ? `${weightStatisticsReadModel.waistStats.latest.toFixed(1)} ${weightStatisticsReadModel.waistStats.unit}`
                        : "--"}
                    </div>
                  </div>
                </>
              ) : isMoodType ? (
                <>
                  <div className={statCardBase}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">High Mood</div>
                    <div className="text-4xl font-bold tracking-tight text-[hsl(210_28%_97%)]">
                      {moodStatisticsReadModel.highScore != null ? `${moodStatisticsReadModel.highScore}/10` : "--"}
                    </div>
                  </div>
                  <div className={statCardBase}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">Low Mood</div>
                    <div className="text-4xl font-bold tracking-tight text-[hsl(210_28%_97%)]">
                      {moodStatisticsReadModel.lowScore != null ? `${moodStatisticsReadModel.lowScore}/10` : "--"}
                    </div>
                  </div>
                  <div className={statCardBase}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">Latest Mood</div>
                    <div className="text-4xl font-bold tracking-tight text-[hsl(210_28%_97%)]">
                      {moodStatisticsReadModel.latestScore != null ? `${moodStatisticsReadModel.latestScore}/10` : "--"}
                    </div>
                  </div>
                </>
              ) : !isNumericType ? (
                <>
                  <div className={statCardBase + " relative overflow-hidden group"}>
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(266_73%_63%_/_0.08)] to-transparent opacity-60" />
                    <div className="relative z-10 mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">
                      {isMediaType ? "Items This Week" : isDietType ? "Meals This Week" : isTaskType ? "Tasks This Week" : "Entries This Week"}
                    </div>
                    <div className="relative z-10 text-4xl font-bold tracking-tight text-[hsl(210_28%_97%)]">
                      {entriesThisWeek}
                    </div>
                  </div>
                  <div className={statCardBase + " relative hidden overflow-hidden group md:block"}>
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(266_73%_63%_/_0.08)] to-transparent opacity-60" />
                    <div className="relative z-10 mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">
                      {isMediaType ? "Items This Year" : isDietType ? "Meals This Year" : isTaskType ? "Tasks This Year" : "Entries This Year"}
                    </div>
                    <div className="relative z-10 text-4xl font-bold tracking-tight text-[hsl(210_28%_97%)]">
                      {entriesThisYear}
                    </div>
                  </div>
                </>
              ) : (
                <div className={statCardBase + " relative overflow-hidden group"}>
                  <div className="absolute inset-0 bg-gradient-to-br from-[hsl(266_73%_63%_/_0.08)] to-transparent opacity-60" />
                  <div className="relative z-10 mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">30-Day Average</div>
                  <div className="relative z-10 flex items-end gap-2">
                    <div className="text-4xl font-bold tracking-tight text-[hsl(210_28%_97%)]">
                      {monthAverage > 0 ? monthAverage.toFixed(1) : "--"}
                    </div>
                    {changeVsLastMonth !== 0 && (
                      <div className={cn(
                        "text-sm mb-1 font-medium flex items-center justify-center",
                        changeVsLastMonth > 0 ? "text-emerald-400" : "text-rose-400"
                      )} title={`Last month average: ${lastMonthAverage.toFixed(1)}`}>
                        {changeVsLastMonth > 0 ? "+" : ""}{changeVsLastMonth.toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={statCardBase}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">
                  {isMediaType ? "Days Since Last Item" : isDietType ? "Days Since Last Meal" : isTaskType ? "Days Since Last Task" : "Days Since Last Entry"}
                </div>
                <div className="text-4xl font-bold tracking-tight text-[hsl(210_28%_97%)]">
                  {daysSinceLastEntry !== null ? daysSinceLastEntry : "--"}
                  <span className="ml-1 text-sm font-normal text-[hsl(220_12%_58%)]">days</span>
                </div>
              </div>

              {/* Optional Empty placeholder slot to preserve grid aesthetics */}
              {isNumericType && (
                <div className="hidden items-center justify-center rounded-2xl border border-dashed border-white/8 bg-white/[0.02] p-4 text-xs text-[hsl(220_12%_58%)] md:flex">
                  Insights Engine Active
                </div>
              )}
            </div>
          </div>
        )}

        {/* Graphs Tab */}
        {activeTab === "graphs" && (
          <div className="space-y-6">
            <div className="surface-panel relative overflow-hidden rounded-3xl p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent" />
              <div className="relative z-10">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-[hsl(210_28%_97%)]">Trend history</h2>
                    <p className="mt-1 text-sm text-[hsl(220_12%_58%)]">Compare the recent window without crowding the chart.</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.04] p-1">
                  {(["1M", "3M", "1Y"] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setChartTimeFilter(filter)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out",
                        chartTimeFilter === filter
                          ? "bg-[hsl(266_73%_63%)] text-white shadow-lg shadow-primary/20"
                          : "text-[hsl(220_12%_58%)] hover:bg-white/[0.06] hover:text-[hsl(210_28%_97%)]"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.04] p-1">
                  <button
                    onClick={() => setChartType("area")}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out",
                      chartType === "area"
                        ? "bg-[hsl(266_73%_63%)] text-white shadow-lg shadow-primary/20"
                        : "text-[hsl(220_12%_58%)] hover:bg-white/[0.06] hover:text-[hsl(210_28%_97%)]"
                    )}
                  >
                    Line
                  </button>
                  <button
                    onClick={() => setChartType("bar")}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out",
                      chartType === "bar"
                        ? "bg-[hsl(266_73%_63%)] text-white shadow-lg shadow-primary/20"
                        : "text-[hsl(220_12%_58%)] hover:bg-white/[0.06] hover:text-[hsl(210_28%_97%)]"
                    )}
                  >
                    Bar
                  </button>
                  </div>
                </div>

                <motion.div
                  key={`${chartTimeFilter}-${chartType}`}
                  className="h-64"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  {chartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      {isWeightType && chartType === "area" ? (
                        <LineChart data={chartData}>
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            interval="preserveStartEnd"
                          />
                          <YAxis hide domain={["auto", "auto"]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            name="Weight"
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(266 73% 63%)"
                            strokeWidth={2}
                            dot={{ fill: "hsl(266 73% 63% / 0.5)", r: 3 }}
                            activeDot={{ r: 5 }}
                            isAnimationActive
                            animationDuration={260}
                          />
                          {chartData.some((point) => point.waist != null) && (
                            <Line
                              name="Waist"
                              type="monotone"
                              dataKey="waist"
                              stroke="hsl(160 62% 45%)"
                              strokeWidth={2}
                              dot={{ fill: "hsl(160 62% 45% / 0.5)", r: 3 }}
                              activeDot={{ r: 5 }}
                              connectNulls
                              isAnimationActive
                              animationDuration={260}
                            />
                          )}
                        </LineChart>
                      ) : chartType === "area" ? (
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id={`gradient-detail-${tracker.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(266 73% 63%)" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(266 73% 63%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            interval="preserveStartEnd"
                          />
                          <YAxis hide domain={["auto", "auto"]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(266 73% 63%)"
                            strokeWidth={2}
                            fill={`url(#gradient-detail-${tracker.id})`}
                            isAnimationActive
                            animationDuration={260}
                          />
                        </AreaChart>
                      ) : (
                        <BarChart data={chartData}>
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            interval="preserveStartEnd"
                          />
                          <YAxis hide domain={["auto", "auto"]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={260}>
                            {chartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill="hsl(266 73% 63%)" />
                            ))}
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  ) : (
                    <div className="surface-card flex h-full items-center justify-center rounded-2xl text-sm text-[hsl(220_12%_58%)]">
                      Not enough data within {chartTimeFilter} to plot a trend.
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Year in Pixels Heatmap */}
            <div className="surface-panel rounded-3xl p-6 overflow-x-auto">
              <div className="mb-6">
                <h2 className="text-lg font-semibold tracking-tight text-[hsl(210_28%_97%)]">Year in pixels</h2>
                <p className="mt-1 text-sm text-[hsl(220_12%_58%)]">A quieter density map for the full year.</p>
              </div>
              <div className="min-w-[700px]">
                {/* 52 columns, 7 rows layout (roughly year length) */}
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: 'repeat(52, minmax(0, 1fr))',
                    gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
                    gridAutoFlow: 'column'
                  }}
                >
                  {heatmapData.daysArray.map((dateStr, i) => {
                    const intensity = heatmapData.intensityMap[dateStr] || 0

                    // Simple opacity calculation relative to the max intensity
                    let opacity = 0
                    if (intensity > 0 && heatmapData.maxIntensity > 0) {
                      // Minimum opacity of 0.2 if there's any value, max 1.0
                      opacity = 0.2 + (0.8 * (intensity / heatmapData.maxIntensity))
                    }

                    return (
                      <div
                        key={i}
                        className={cn(
                          "w-3 h-3 rounded-[2px] transition-colors",
                          intensity > 0 ? "bg-[hsl(266_73%_63%)]" : "bg-white/[0.03] border border-white/5"
                        )}
                        style={intensity > 0 ? { opacity } : {}}
                        title={`${dateStr}: ${intensity.toFixed(1)}`}
                      />
                    )
                  })}
                </div>
                <div className="mt-3 flex justify-between px-1 text-xs text-[hsl(220_12%_58%)]">
                  <span>Less</span>
                  <div className="flex gap-1 items-center">
                    {[0, 0.25, 0.5, 0.75, 1].map((lvl, i) => (
                      <div
                        key={i}
                        className={cn("w-3 h-3 rounded-[2px]", lvl === 0 ? "bg-white/[0.03] border border-white/5" : "bg-[hsl(266_73%_63%)]")}
                        style={lvl > 0 ? { opacity: 0.2 + (0.8 * lvl) } : {}}
                      />
                    ))}
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Entries Tab */}
        {activeTab === "entries" && (
          <div className="mb-8 space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[hsl(210_28%_97%)]">
              {isToday ? "History" : `History for ${selectedDate.toLocaleDateString()}`}
              </h2>
              <p className="mt-1 text-sm text-[hsl(220_12%_58%)]">Recent entries are grouped by type to keep the scan effortless.</p>
            </div>

            {(isWeightType ? weightHistoryEntries.length : isMoodType ? moodHistoryEntries.length : isTaskType ? taskHistoryEntries.length : historyEntries.length) === 0 ? (
              <div className="surface-card rounded-2xl py-12 text-center text-[hsl(220_12%_58%)]">
                <p className="text-sm">No entries for {selectedDate.toLocaleDateString()}</p>
              </div>
            ) : isMediaType ? (
              /* The Shelf - Media Grid: Asset as hero, fallback placeholder */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {historyEntries.map((entry) => {
                  const asset = entry.assetId != null ? assets.get(entry.assetId) : null
                  return (
                    <div
                      key={entry.id}
                      className="group relative surface-card overflow-hidden rounded-2xl transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.82)] hover:shadow-[0_14px_28px_rgba(2,6,23,0.14)]"
                      onClick={(e) => { if (e.shiftKey) { e.preventDefault(); e.stopPropagation(); setDeletingEntry(entry) } }}
                      onContextMenu={(e) => { if (e.shiftKey) { e.preventDefault(); handleEditEntry(e, entry) } }}
                    >
                      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 translate-y-1 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); handleEditEntry(e, entry) }} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); setDeletingEntry(entry) }} title="Delete entry">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="aspect-[2/3] overflow-hidden bg-white/[0.04] flex items-center justify-center">
                        {asset ? (
                          <img
                            src={asset.thumbnailUrl || asset.assetUrl}
                            alt={entry.note || "Media"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-white/20" aria-hidden />
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-sm font-medium text-white/90 truncate mb-1">
                          {entry.note || "Untitled"}
                        </div>
                        {renderEntryTags(entry.tagIds, "mb-1 mt-2")}
                        {entry.value != null && entry.value > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-white/50">{entry.value}</span>
                          </div>
                        )}
                        <div className="text-xs text-white/40 mt-1">
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : isWeightType ? (
              /* The Gallery - Weight with Photos: Large inline attachments */
              <div className="space-y-4">
                {weightHistoryEntries.map((entry, entryIndex) => {
                  const previousValue = weightHistoryEntries[entryIndex + 1]?.weight ?? entry.weight
                  const change = weightHistoryEntries.length > 1 ? entry.weight - previousValue : 0
                  const asset = entry.assetId != null ? assets.get(entry.assetId) : null
                  const entryForMutation = weightHistoryItemToEntry(entry)
                  return (
                    <div
                      key={entry.entryId}
                      className={entryCardBase}
                      onClick={(e) => { if (e.shiftKey) { e.preventDefault(); e.stopPropagation(); setDeletingEntry(entryForMutation) } }}
                      onContextMenu={(e) => { if (e.shiftKey) { e.preventDefault(); setEditingEntry(entryForMutation) } }}
                    >
                      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 translate-y-1 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); setEditingEntry(entryForMutation) }} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); setDeletingEntry(entryForMutation) }} title="Delete entry">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-white/60">
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </div>
                        {change !== 0 && (
                          <div className={cn(
                            "flex items-center gap-1 text-xs",
                            change > 0 ? "text-rose-400" : "text-emerald-400"
                          )}>
                            {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(change).toFixed(1)}
                          </div>
                        )}
                      </div>
                      <div className="text-2xl font-bold text-white mb-2">
                        {entry.weight.toFixed(1)}{entry.weightUnit}
                      </div>
                      {entry.waist != null && (
                        <div className="mb-2 text-sm text-white/60">
                          Waist {entry.waist.toFixed(1)}{entry.waistUnit ?? ""}
                        </div>
                      )}
                      {entry.note && (
                        <div className="text-sm text-white/60 mb-2">{entry.note}</div>
                      )}
                      {renderEntryTags(entry.tagIds)}
                      {asset && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-white/10 max-h-[300px] bg-white/[0.04]">
                          <img
                            src={asset.thumbnailUrl || asset.assetUrl}
                            alt="Weight photo"
                            className="w-full h-auto max-h-[300px] object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : isMoodType ? (
              <div className="space-y-4">
                {moodHistoryEntries.map((entry) => {
                  const asset = entry.assetId != null ? assets.get(entry.assetId) : null
                  const entryForMutation: Entry = {
                    id: entry.entryId,
                    trackerId: entry.trackerId,
                    value: entry.moodScore,
                    note: entry.note,
                    metadata: { trackerKind: "mood" },
                    timestamp: entry.timestamp,
                    dateStr: entry.dateStr,
                    assetId: entry.assetId ?? null,
                    tagIds: entry.tagIds ?? [],
                  }
                  return (
                    <div
                      key={entry.entryId}
                      className={entryCardBase}
                      onClick={(e) => { if (e.shiftKey) { e.preventDefault(); e.stopPropagation(); setDeletingEntry(entryForMutation) } }}
                      onContextMenu={(e) => { if (e.shiftKey) { e.preventDefault(); setEditingEntry(entryForMutation) } }}
                    >
                      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 translate-y-1 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); setEditingEntry(entryForMutation) }} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); setDeletingEntry(entryForMutation) }} title="Delete entry">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-white/60">
                          {new Date(entry.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          {" · "}
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </div>
                        <div className="rounded-full px-2 py-1 text-xs font-medium text-white" style={{ backgroundColor: entry.color }}>
                          {entry.label}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-white mb-2">
                        {entry.moodScore}/10
                      </div>
                      {entry.note && (
                        <div className="text-sm text-white/60 mb-2">{entry.note}</div>
                      )}
                      {renderEntryTags(entry.tagIds)}
                      {asset && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-white/10 max-h-[300px] bg-white/[0.04]">
                          <img
                            src={asset.thumbnailUrl || asset.assetUrl}
                            alt=""
                            className="w-full h-auto max-h-[300px] object-contain"
                            title={entry.note || "Mood attachment"}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : isTaskType ? (
              /* The Timeline - Tasks/Journal with inline attachment */
              <div className="space-y-3">
                {taskHistoryEntries.map((task) => {
                  const entry = trackerEntries.find((candidate) => candidate.id === task.entryId)
                  if (!entry) return null
                  const asset = entry.assetId != null ? assets.get(entry.assetId) : null
                  const isPostponed = task.state === "postponed"
                  return (
                    <div
                      key={entry.id}
                      className={entryCardBase}
                      onClick={(e) => { if (e.shiftKey) { e.preventDefault(); e.stopPropagation(); setDeletingEntry(entry) } }}
                      onContextMenu={(e) => { if (e.shiftKey) { e.preventDefault(); handleEditEntry(e, entry) } }}
                    >
                      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 translate-y-1 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); handleEditEntry(e, entry) }} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!isPostponed && (
                          <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); void handlePostponeTask(entry) }} title="Postpone to next day">
                            <CalendarPlus className="w-4 h-4" />
                          </button>
                        )}
                        {isPostponed ? (
                          <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); void handleUnpostponeTask(entry) }} title="Undo postponement">
                            <Undo2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            className={actionButtonBase}
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleToggleTaskCompletion(entry, !task.completed)
                            }}
                            title={task.completed ? "Mark incomplete" : "Mark complete"}
                          >
                            {task.completed ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                          </button>
                        )}
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); setDeletingEntry(entry) }} title="Delete entry">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", isPostponed ? "bg-amber-300" : task.completed ? "bg-emerald-400" : "bg-[hsl(266_73%_63%)]")} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white/90 mb-1">{entry.note || "Task"}</div>
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {isPostponed ? (
                              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[11px] uppercase tracking-normal text-amber-200">Postponed</span>
                            ) : (
                              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[11px] uppercase tracking-normal text-emerald-200">Actionable</span>
                            )}
                            <span className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] uppercase tracking-normal",
                              task.completed
                                ? "border border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                                : "border border-white/10 bg-white/[0.04] text-white/45"
                            )}>
                              {task.completed ? "Completed" : "Incomplete"}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/45">
                              Active {task.activeDate}
                            </span>
                          </div>
                          {renderEntryTags(entry.tagIds)}
                          {asset && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-white/10 max-h-[300px] bg-white/[0.04]">
                              <img
                                src={asset.thumbnailUrl || asset.assetUrl}
                                alt=""
                                className="w-full h-auto max-h-[300px] object-contain"
                              />
                            </div>
                          )}
                          <div className="text-xs text-white/40 mt-2">
                            {new Date(entry.timestamp).toLocaleString()}
                          </div>
                        </div>
                        {!isPostponed && task.completed && (
                          <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : isDietType ? (
              /* History - Diet: Large inline meal photos */
              <div className="space-y-4">
                {historyEntries.map((entry) => {
                  const value = entry.value ?? 0
                  const isHighCal = averageValue > 0 && value > averageValue * 1.3
                  const asset = entry.assetId != null ? assets.get(entry.assetId) : null
                  return (
                    <div
                      key={entry.id}
                      className={entryCardBase}
                      onClick={(e) => { if (e.shiftKey) { e.preventDefault(); e.stopPropagation(); setDeletingEntry(entry) } }}
                      onContextMenu={(e) => { if (e.shiftKey) { e.preventDefault(); handleEditEntry(e, entry) } }}
                    >
                      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 translate-y-1 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); handleEditEntry(e, entry) }} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); setDeletingEntry(entry) }} title="Delete entry">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-white/60">
                          {new Date(entry.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          {" · "}
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </div>
                        <div className={cn(
                          "text-lg font-semibold",
                          isHighCal ? "text-rose-400" : "text-white"
                        )}>
                          {Math.round(value)} kcal
                        </div>
                      </div>
                      <div className="text-sm text-white/90 mb-2">{entry.note || "Meal"}</div>
                      {renderEntryTags(entry.tagIds)}
                      {asset && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-white/10 max-h-[300px] bg-white/[0.04]">
                          <img
                            src={asset.thumbnailUrl || asset.assetUrl}
                            alt=""
                            className="w-full h-auto max-h-[300px] object-contain"
                            title={entry.note || "Meal photo"}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : isNumericType ? (
              /* History - Generic numeric with large inline attachments */
              <div className="space-y-4">
                {historyEntries.map((entry) => {
                  const value = entry.value ?? 0
                  const isHigh = averageValue > 0 && value > averageValue * 1.5
                  const isLow = averageValue > 0 && value < averageValue * 0.5
                  const unit = (tracker.config as Record<string, unknown>)?.unit as string | undefined
                  const displayValue = unit === "$" ? `$${value.toLocaleString()}` : `${value.toFixed(1)}${unit ?? ""}`
                  const asset = entry.assetId != null ? assets.get(entry.assetId) : null
                  return (
                    <div
                      key={entry.id}
                      className={entryCardBase}
                      onClick={(e) => { if (e.shiftKey) { e.preventDefault(); e.stopPropagation(); setDeletingEntry(entry) } }}
                      onContextMenu={(e) => { if (e.shiftKey) { e.preventDefault(); handleEditEntry(e, entry) } }}
                    >
                      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 translate-y-1 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); handleEditEntry(e, entry) }} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); setDeletingEntry(entry) }} title="Delete entry">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-white/60">
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </div>
                        <div className={cn(
                          "text-lg font-semibold",
                          isHigh ? "text-rose-400" : isLow ? "text-blue-400" : "text-white"
                        )}>
                          {displayValue}
                        </div>
                      </div>
                      <div className="text-sm text-white/90 mb-2">{entry.note || "Entry"}</div>
                      {renderEntryTags(entry.tagIds)}
                      {asset && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-white/10 max-h-[300px] bg-white/[0.04]">
                          <img
                            src={asset.thumbnailUrl || asset.assetUrl}
                            alt=""
                            className="w-full h-auto max-h-[300px] object-contain"
                            title={entry.note || "Attachment"}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Default - Simple list with large inline attachments */
              <div className="space-y-4">
                {historyEntries.map((entry) => {
                  const asset = entry.assetId != null ? assets.get(entry.assetId) : null
                  return (
                    <div
                      key={entry.id}
                      className={entryCardBase}
                      onClick={(e) => { if (e.shiftKey) { e.preventDefault(); e.stopPropagation(); setDeletingEntry(entry) } }}
                      onContextMenu={(e) => { if (e.shiftKey) { e.preventDefault(); handleEditEntry(e, entry) } }}
                    >
                      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 translate-y-1 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); handleEditEntry(e, entry) }} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className={actionButtonBase} onClick={(e) => { e.stopPropagation(); setDeletingEntry(entry) }} title="Delete entry">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-sm text-white/90 mb-2">{entry.note || `Value: ${entry.value ?? "--"}`}</div>
                      {renderEntryTags(entry.tagIds)}
                      {asset && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-white/10 max-h-[300px] bg-white/[0.04]">
                          <img
                            src={asset.thumbnailUrl || asset.assetUrl}
                            alt=""
                            className="w-full h-auto max-h-[300px] object-contain"
                          />
                        </div>
                      )}
                      <div className="text-xs text-white/40 mt-2">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        </motion.div>
      </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      <EditEntryDialog
        entry={editingEntry}
        open={editingEntry !== null}
        onOpenChange={(open) => !open && setEditingEntry(null)}
      />

      <ConfirmDeleteDialog
        open={deletingEntry !== null}
        onConfirm={async () => {
          if (!deletingEntry) return

          const entry = deletingEntry

          try {
            await deleteEntryMutation.mutateAsync(entry.id)
            setDeletingEntry(null)
            toast.destructive(
              "Entry deleted.",
              entry.note?.trim() || tracker?.name || "Tracker entry",
            )
          } catch (error) {
            toast.error(
              "We couldn't delete that entry.",
              formatToastError(error, "Please try again in a moment."),
            )
          }
        }}
        onCancel={() => setDeletingEntry(null)}
      />
    </div>
  )
}

function calculateStreak(entries: Entry[]): number {
  if (entries.length === 0) return 0

  // Sort by date descending
  const sorted = entries
    .map((e) => ({
      dateStr: e.dateStr || new Date(e.timestamp).toISOString().split("T")[0],
      timestamp: e.timestamp,
    }))
    .sort((a, b) => b.dateStr.localeCompare(a.dateStr))

  // Get unique dates
  const uniqueDates = Array.from(new Set(sorted.map((e) => e.dateStr)))

  // Check consecutive days from today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = 0
  for (let i = 0; i < uniqueDates.length; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const checkDateStr = checkDate.toISOString().split("T")[0]

    if (uniqueDates.includes(checkDateStr)) {
      streak++
    } else {
      break
    }
  }

  return streak
}

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function weightHistoryItemToEntry(entry: WeightEntryHistoryItem): Entry {
  return {
    id: entry.entryId,
    trackerId: entry.trackerId,
    value: entry.weight,
    note: entry.note,
    metadata: {
      trackerKind: "weight",
      weightUnit: entry.weightUnit,
      waist: entry.waist,
      waistUnit: entry.waistUnit,
    },
    timestamp: entry.timestamp,
    dateStr: entry.dateStr,
    assetId: entry.assetId ?? null,
    tagIds: entry.tagIds ?? [],
  }
}
