"use client"

import { useMemo } from "react"
import { useAppStore } from "../lib/store"
import { useTrackers, useEntries } from "../lib/queries"
import { filterEntriesByDate } from "../lib/utils"
import type { Entry } from "../lib/store"
import { Scale, Smile, Dumbbell, Users, CheckSquare, Wallet, Flame, Book, Heart, Coffee, Moon, Sun, Zap, Target, Music, Camera, Gamepad2, Star, TrendingUp, TrendingDown, Salad, ImageIcon, type LucideIcon } from "lucide-react"
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

  // Chart data: Last 30 days (guard when tracker is missing)
  const chartData = useMemo(() => {
    if (!tracker) return []
    const last30Days: Record<string, Entry[]> = {}
    trackerEntries.slice(-100).forEach((entry) => {
      const entryDateStr = entry.dateStr || new Date(entry.timestamp).toISOString().split("T")[0]
      if (!last30Days[entryDateStr]) {
        last30Days[entryDateStr] = []
      }
      last30Days[entryDateStr].push(entry)
    })

    const dates = Object.keys(last30Days).sort().slice(-30)
    return dates.map((dateStr) => {
      const dayEntries = last30Days[dateStr]
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
        date: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
        fullDate: dateStr,
      }
    })
  }, [trackerEntries, tracker])

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

        {/* Big Stats Row */}
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
      </div>

      {/* Master Chart */}
      {chartData.length > 1 && (
        <div className="mb-8 bg-white/[0.03] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">30-Day History</h2>
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
        </div>
      )}

      {/* Rich History Feed */}
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
                <div key={entry.id} className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden hover:bg-white/[0.05] transition-colors">
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
                <div key={entry.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
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
                <div key={entry.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
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
                <div key={entry.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
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
                <div key={entry.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
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
                <div key={entry.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
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
                <div key={entry.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
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
