"use client"

import React, { useMemo, useState } from "react"
import { useAppStore } from "../lib/store"
import { useTrackers, useEntries, useDeleteEntryMutation } from "../lib/queries"
import { filterEntriesByDate } from "../lib/utils"
import type { Entry } from "../lib/store"
import { Scale, Smile, Dumbbell, Users, CheckSquare, Wallet, Flame, Book, Heart, Coffee, Moon, Sun, Zap, Target, Music, Camera, Gamepad2, Star, TrendingUp, TrendingDown, Salad, ImageIcon, Trash2, Pencil, type LucideIcon } from "lucide-react"
import { EditEntryDialog } from "./modals/EditEntryDialog"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { cn } from "../lib/utils"

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
  camera: Camera,
  salad: Salad,
}

interface Asset {
  id: number
  thumbnailUrl: string
  assetUrl: string
  originalName?: string | null
}

interface TrackerDetailViewProps {
  trackerId: number
  selectedDate: Date
  assets: Map<number, Asset>
}

// Recharts Tooltip content props
interface TooltipContentProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}
const CustomTooltip = ({ active, payload, label }: TooltipContentProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] rounded-lg p-2 shadow-lg">
        <p className="text-xs text-white/60 mb-1">{label}</p>
        <p className="text-sm font-medium text-white">
          {typeof payload[0].value === 'number'
            ? payload[0].value.toFixed(1)
            : payload[0].value}
        </p>
      </div>
    )
  }
  return null
}

export function TrackerDetailView({ trackerId, selectedDate: propSelectedDate, assets }: TrackerDetailViewProps) {
  const { selectedDate: storeSelectedDate } = useAppStore()
  const { data: trackers = [] } = useTrackers()
  const { data: allEntries = [] } = useEntries({ limit: 1000 })
  const deleteEntryMutation = useDeleteEntryMutation()

  const handleDeleteEntry = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (e.shiftKey) {
      deleteEntryMutation.mutate(id)
    } else {
      if (window.confirm("Delete this entry?")) {
        deleteEntryMutation.mutate(id)
      }
    }
  }

  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)

  const handleEditEntry = (e: React.MouseEvent, entry: Entry) => {
    e.stopPropagation()
    e.preventDefault()
    setEditingEntry(entry)
  }

  const [activeTab, setActiveTab] = useState<"stats" | "graphs" | "entries">("entries")
  const [chartTimeFilter, setChartTimeFilter] = useState<"1M" | "3M" | "1Y">("1M")

  // Use store selectedDate if available, fallback to prop
  const selectedDate = storeSelectedDate || propSelectedDate
  const isToday = selectedDate.toDateString() === new Date().toDateString()

  const tracker = trackers.find((t) => t.id === trackerId)

  // Filter entries for this tracker (hooks must run unconditionally)
  const trackerEntries = useMemo(() => {
    return allEntries.filter((e) => e.trackerId === trackerId)
  }, [allEntries, trackerId])

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

  // Calculate stats - use selectedDateEntries for "today's" stats when viewing a specific date
  const totalCount = isToday ? trackerEntries.length : selectedDateEntries.length
  const currentStreak = calculateStreak(trackerEntries) // Streak is always calculated from all entries
  const averageValue = selectedDateEntries.length > 0
    ? selectedDateEntries.reduce((sum, e) => sum + (e.value ?? 0), 0) / selectedDateEntries.length
    : 0

  // --- NEW ANALYTICS: Month Average, Change vs Last Month, and Days Since Last Entry ---
  const { monthAverage, lastMonthAverage, changeVsLastMonth, daysSinceLastEntry } = useMemo(() => {
    if (trackerEntries.length === 0) {
      return { monthAverage: 0, lastMonthAverage: 0, changeVsLastMonth: 0, daysSinceLastEntry: null }
    }

    const referenceDate = new Date(selectedDate.getTime())
    referenceDate.setHours(23, 59, 59, 999)
    const refTime = referenceDate.getTime()
    const msPerDay = 1000 * 60 * 60 * 24

    // Filter out future entries relative to the selected date
    const pastEntries = trackerEntries.filter((e) => e.timestamp <= refTime)

    if (pastEntries.length === 0) {
      return { monthAverage: 0, lastMonthAverage: 0, changeVsLastMonth: 0, daysSinceLastEntry: null }
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

    return {
      monthAverage: currentAvg,
      lastMonthAverage: prevAvg,
      changeVsLastMonth: percentChange,
      daysSinceLastEntry: daysSince
    }
  }, [trackerEntries, selectedDate])

  // Chart data: Filtered by 1M, 3M, 1Y bounds
  const chartData = useMemo(() => {
    if (!tracker) return []
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
      const isRatingType = tracker.type === "rating"

      let aggregatedValue: number
      if (isWeightTracker || isRatingType) {
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
  }, [trackerEntries, tracker, chartTimeFilter, selectedDate])

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
  const isMediaType = trackerNameLower.includes("book") || trackerNameLower.includes("tv") ||
    trackerNameLower.includes("movie") || trackerNameLower.includes("game") ||
    trackerNameLower.includes("media") ||
    tracker.icon === "book" || tracker.icon === "gamepad-2" || tracker.icon === "music"
  const isWeightType = trackerNameLower.includes("weight") || trackerNameLower.includes("peso")
  const isTaskType = tracker.type === "list" || tracker.type === "binary" || trackerNameLower.includes("task")
  const isDietType = trackerNameLower.includes("diet") || trackerNameLower.includes("calorie") || trackerNameLower.includes("food") || trackerNameLower.includes("meal") || tracker.icon === "salad"
  const isSavingsType = trackerNameLower.includes("saving") || trackerNameLower.includes("finance") || trackerNameLower.includes("money") || trackerNameLower.includes("budget") || tracker.icon === "wallet"
  const isNumericType = tracker.type === "numeric" || tracker.type === "range" || tracker.type === "counter"

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 rounded-2xl bg-white/[0.06]">
            <Icon className="w-8 h-8 text-white/70" style={{ color: tracker.color ?? undefined }} />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">{tracker.name}</h1>
            <p className="text-sm text-white/60 mt-1">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-4">
          <button
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === "stats"
                ? "bg-[hsl(266_73%_63%)] text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "text-white/50 hover:text-white hover:bg-white/5"
            )}
            onClick={() => setActiveTab("stats")}
          >
            Statistics
          </button>
          <button
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === "graphs"
                ? "bg-[hsl(266_73%_63%)] text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "text-white/50 hover:text-white hover:bg-white/5"
            )}
            onClick={() => setActiveTab("graphs")}
          >
            Graphs
          </button>
          <button
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === "entries"
                ? "bg-[hsl(266_73%_63%)] text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "text-white/50 hover:text-white hover:bg-white/5"
            )}
            onClick={() => setActiveTab("entries")}
          >
            Entries
          </button>
          <button
            className="px-4 py-2 rounded-xl text-sm font-medium text-white/20 cursor-not-allowed hidden sm:block"
            disabled
          >
            Insights (Soon)
          </button>
        </div>
      </div>

      {/* Tab Content Rendering */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <div className="text-xs text-white/60 mb-1">Total Entries</div>
                <div className="text-2xl font-bold text-white">{totalCount}</div>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <div className="text-xs text-white/60 mb-1">Current Streak</div>
                <div className="text-2xl font-bold text-[hsl(266_73%_63%)]">{currentStreak} days</div>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <div className="text-xs text-white/60 mb-1">Average Value</div>
                <div className="text-2xl font-bold text-white">
                  {averageValue > 0 ? averageValue.toFixed(1) : "--"}
                </div>
              </div>
            </div>

            {/* Deep Analytics Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white/[0.03] border border-[hsl(266_73%_63%_/_0.2)] rounded-xl p-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(266_73%_63%_/_0.1)] to-transparent opacity-50" />
                <div className="text-xs text-white/70 mb-1 relative z-10">30-Day Average</div>
                <div className="flex items-end gap-2 relative z-10">
                  <div className="text-3xl font-bold text-white">
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

              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <div className="text-xs text-white/60 mb-1">Days Since Last Entry</div>
                <div className="text-3xl font-bold text-white">
                  {daysSinceLastEntry !== null ? daysSinceLastEntry : "--"}
                  <span className="text-sm font-normal text-white/40 ml-1">days</span>
                </div>
              </div>

              {/* Optional Empty placeholder slot to preserve grid aesthetics */}
              <div className="hidden md:flex bg-white/[0.01] border border-white/5 border-dashed rounded-xl p-4 items-center justify-center text-white/20 text-xs">
                Insights Engine Active
              </div>
            </div>
          </div>
        )}

        {/* Graphs Tab */}
        {activeTab === "graphs" && (
          <div className="space-y-6">
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Trend History</h2>
                <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/5">
                  {(["1M", "3M", "1Y"] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setChartTimeFilter(filter)}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                        chartTimeFilter === filter
                          ? "bg-[hsl(266_73%_63%)] text-white"
                          : "text-white/40 hover:text-white/80 hover:bg-white/5"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {chartData.length > 1 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
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
                        tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
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
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-white/30 text-sm">
                  Not enough data within {chartTimeFilter} to plot a trend.
                </div>
              )}
            </div>

            {/* Year in Pixels Heatmap */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 overflow-x-auto">
              <h2 className="text-lg font-semibold text-white mb-6">Year in Pixels</h2>
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
                <div className="flex justify-between text-xs text-white/40 mt-3 px-1">
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
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">
              {isToday ? "History" : `History for ${selectedDate.toLocaleDateString()}`}
            </h2>

            {historyEntries.length === 0 ? (
              <div className="text-center py-12 text-white/40">
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
                      className="group relative bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden hover:bg-white/[0.05] transition-colors"
                      onClick={(e) => { if (e.shiftKey) handleDeleteEntry(e, entry.id) }}
                      onContextMenu={(e) => { if (e.shiftKey) handleEditEntry(e, entry) }}
                    >
                      <div className="absolute z-10 top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" onClick={(e) => handleEditEntry(e, entry)} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" onClick={(e) => handleDeleteEntry(e, entry.id)} title="Delete entry (Shift+Click bypasses confirm)">
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
                {historyEntries.map((entry) => {
                  const change = historyEntries.length > 1
                    ? (entry.value ?? 0) - (historyEntries[historyEntries.indexOf(entry) + 1]?.value ?? entry.value ?? 0)
                    : 0
                  const asset = entry.assetId != null ? assets.get(entry.assetId) : null
                  return (
                    <div
                      key={entry.id}
                      className="group relative bg-white/[0.03] border border-white/5 rounded-xl p-4"
                      onClick={(e) => { if (e.shiftKey) handleDeleteEntry(e, entry.id) }}
                      onContextMenu={(e) => { if (e.shiftKey) handleEditEntry(e, entry) }}
                    >
                      <div className="absolute z-10 top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" onClick={(e) => handleEditEntry(e, entry)} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" onClick={(e) => handleDeleteEntry(e, entry.id)} title="Delete entry (Shift+Click bypasses confirm)">
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
                        {entry.value?.toFixed(1)}{(tracker.config as Record<string, unknown>)?.unit as string || "kg"}
                      </div>
                      {entry.note && (
                        <div className="text-sm text-white/60 mb-2">{entry.note}</div>
                      )}
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
            ) : isTaskType ? (
              /* The Timeline - Tasks/Journal with inline attachment */
              <div className="space-y-3">
                {historyEntries.map((entry) => {
                  const asset = entry.assetId != null ? assets.get(entry.assetId) : null
                  return (
                    <div
                      key={entry.id}
                      className="group relative bg-white/[0.03] border border-white/5 rounded-xl p-4"
                      onClick={(e) => { if (e.shiftKey) handleDeleteEntry(e, entry.id) }}
                      onContextMenu={(e) => { if (e.shiftKey) handleEditEntry(e, entry) }}
                    >
                      <div className="absolute z-10 top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" onClick={(e) => handleEditEntry(e, entry)} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" onClick={(e) => handleDeleteEntry(e, entry.id)} title="Delete entry (Shift+Click bypasses confirm)">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-[hsl(266_73%_63%)] mt-2 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white/90 mb-1">{entry.note || "Task"}</div>
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
                        {entry.value != null && entry.value >= 1 && (
                          <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : isDietType ? (
              /* The Ledger - Diet: Large inline meal photos */
              <div className="space-y-4">
                {historyEntries.map((entry) => {
                  const value = entry.value ?? 0
                  const isHighCal = averageValue > 0 && value > averageValue * 1.3
                  const asset = entry.assetId != null ? assets.get(entry.assetId) : null
                  return (
                    <div
                      key={entry.id}
                      className="group relative bg-white/[0.03] border border-white/5 rounded-xl p-4"
                      onClick={(e) => { if (e.shiftKey) handleDeleteEntry(e, entry.id) }}
                      onContextMenu={(e) => { if (e.shiftKey) handleEditEntry(e, entry) }}
                    >
                      <div className="absolute z-10 top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" onClick={(e) => handleEditEntry(e, entry)} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" onClick={(e) => handleDeleteEntry(e, entry.id)} title="Delete entry (Shift+Click bypasses confirm)">
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
            ) : isSavingsType ? (
              /* The Ledger - Savings/Finance: Large inline receipt photos */
              <div className="space-y-4">
                {historyEntries.map((entry) => {
                  const value = entry.value ?? 0
                  const unit = (tracker.config as Record<string, unknown>)?.unit as string | undefined
                  const displayValue = unit === "$" ? `$${value.toLocaleString()}` : `${value.toFixed(1)}${unit ?? ""}`
                  const asset = entry.assetId != null ? assets.get(entry.assetId) : null
                  return (
                    <div
                      key={entry.id}
                      className="group relative bg-white/[0.03] border border-white/5 rounded-xl p-4"
                      onClick={(e) => { if (e.shiftKey) handleDeleteEntry(e, entry.id) }}
                      onContextMenu={(e) => { if (e.shiftKey) handleEditEntry(e, entry) }}
                    >
                      <div className="absolute z-10 top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" onClick={(e) => handleEditEntry(e, entry)} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" onClick={(e) => handleDeleteEntry(e, entry.id)} title="Delete entry (Shift+Click bypasses confirm)">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-white/60">
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-lg font-semibold text-emerald-400">
                          {displayValue}
                        </div>
                      </div>
                      <div className="text-sm text-white/90 mb-2">{entry.note || "Category"}</div>
                      {asset && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-white/10 max-h-[300px] bg-white/[0.04]">
                          <img
                            src={asset.thumbnailUrl || asset.assetUrl}
                            alt=""
                            className="w-full h-auto max-h-[300px] object-contain"
                            title={entry.note || "Receipt/photo"}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : isNumericType ? (
              /* The Ledger - Generic numeric with large inline attachments */
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
                      className="group relative bg-white/[0.03] border border-white/5 rounded-xl p-4"
                      onClick={(e) => { if (e.shiftKey) handleDeleteEntry(e, entry.id) }}
                      onContextMenu={(e) => { if (e.shiftKey) handleEditEntry(e, entry) }}
                    >
                      <div className="absolute z-10 top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" onClick={(e) => handleEditEntry(e, entry)} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" onClick={(e) => handleDeleteEntry(e, entry.id)} title="Delete entry (Shift+Click bypasses confirm)">
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
                      className="group relative bg-white/[0.03] border border-white/5 rounded-xl p-4"
                      onClick={(e) => { if (e.shiftKey) handleDeleteEntry(e, entry.id) }}
                      onContextMenu={(e) => { if (e.shiftKey) handleEditEntry(e, entry) }}
                    >
                      <div className="absolute z-10 top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" onClick={(e) => handleEditEntry(e, entry)} title="Edit entry (Shift+RightClick)">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" onClick={(e) => handleDeleteEntry(e, entry.id)} title="Delete entry (Shift+Click bypasses confirm)">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-sm text-white/90 mb-2">{entry.note || `Value: ${entry.value ?? "--"}`}</div>
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
      </div>

      <EditEntryDialog
        entry={editingEntry}
        open={editingEntry !== null}
        onOpenChange={(open) => !open && setEditingEntry(null)}
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
