"use client"

import { cn } from "../lib/utils"
import { type Widget, type Tracker, type Entry } from "../lib/store"
import { useMoodDailyAggregates, useUpdateEntryMutation } from "../lib/queries"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Scale, Smile, Dumbbell, Users, CheckSquare, Wallet, GripVertical, TrendingUp, TrendingDown, Minus, Flame, Book, Heart, Coffee, Moon, Sun, Zap, Target, Music, Camera, Gamepad2, Star, Salad, type LucideIcon } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
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
  heart: Heart,
  coffee: Coffee,
  moon: Moon,
  sun: Sun,
  zap: Zap,
  target: Target,
  music: Music,
  camera: Camera,
  "gamepad-2": Gamepad2,
  salad: Salad,
}

// Premium card classes for the Bento Grid
const cardBaseClasses = cn(
  "bg-white/[0.03]",
  "border border-white/5",
  "rounded-2xl",
  "shadow-xl shadow-black/40",
  "backdrop-blur-md",
  "p-6",
  "hover:bg-white/[0.04] hover:border-white/10",
  "transition-all duration-200 ease-out"
)

interface Asset {
  id: number
  thumbnailUrl: string
  assetUrl: string
  originalName?: string | null
}

interface WidgetCardProps {
  widget: Widget
  tracker: Tracker
  entries: Entry[]
  assets: Map<number, Asset>
  selectedDate: Date
}

function formatValue(value: number, config: Record<string, unknown>): string {
  const unit = config.unit as string | undefined
  if (unit === "$") return `$${value.toLocaleString()}`
  if (unit) return `${value}${unit}`
  return value.toString()
}

/**
 * Helper function to check if two dates are the same day (ignoring time)
 */
function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1)
  const date2 = new Date(timestamp2)
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Converts a Date to YYYY-MM-DD format
 */
function dateToDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/**
 * Calculates the daily aggregate value for a tracker based on selected date's entries.
 * 
 * Strategy:
 * - SUM: For numeric, counter, range types (e.g., Savings, Calories, Water)
 * - LAST: For weight trackers or rating types (e.g., Mood, Weight)
 * 
 * @param entries - All entries for the tracker (already filtered by date)
 * @param tracker - The tracker configuration
 * @param selectedDate - The date to calculate value for
 * @returns The aggregated value for the selected date, or null if no entries exist
 */
function getDateValue(entries: Entry[], tracker: Tracker, selectedDate: Date): number | null {
  const targetDateStr = dateToDateStr(selectedDate)
  
  // Filter entries for selected date using dateStr (faster) or timestamp comparison
  const dateEntries = entries.filter((entry) => {
    // Prefer dateStr if available (more efficient)
    if (entry.dateStr) {
      return entry.dateStr === targetDateStr
    }
    // Fallback to timestamp comparison
    return isSameDay(entry.timestamp, selectedDate.getTime())
  })

  if (dateEntries.length === 0) {
    return null
  }

  // Determine aggregation strategy
  const trackerNameLower = tracker.name.toLowerCase()
  const isWeightTracker = trackerNameLower.includes("weight") || trackerNameLower.includes("peso")
  const isRatingType = tracker.type === "rating"

  // Use LAST strategy for weight or rating types
  if (isWeightTracker || isRatingType) {
    // Return the last entry of the selected date (most recent)
    const lastEntry = dateEntries[dateEntries.length - 1]
    return lastEntry?.value ?? null
  }

  // Use SUM strategy for numeric, counter, range types
  return dateEntries.reduce((acc, entry) => acc + (entry.value ?? 0), 0)
}

function getTrend(entries: Entry[]): "up" | "down" | "neutral" {
  if (entries.length < 2) return "neutral"
  const recent = entries[entries.length - 1]?.value ?? 0
  const previous = entries[entries.length - 2]?.value ?? 0
  if (recent > previous) return "up"
  if (recent < previous) return "down"
  return "neutral"
}

// Recharts Tooltip content props
interface TooltipContentProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}
// Custom Tooltip component for dark theme
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

function MoodWidget({ entries, tracker, selectedDate }: { entries: Entry[]; tracker: Tracker; selectedDate: Date }) {
  // Get selected date's mood value (last entry of selected date, or null if no entries)
  const dateMoodValue = getDateValue(entries, tracker, selectedDate)
  const { data: dailyAggregates = [] } = useMoodDailyAggregates(tracker.id, 14)
  
  // 1-10 scale emoji mapping
  const moodEmojis = ["🤬", "😠", "😞", "☹️", "😐", "🙂", "😊", "😄", "🤩", "😍"]
  
  // Map 1-10 to emoji index (0-9)
  const moodValue = dateMoodValue !== null 
    ? Math.min(Math.max(Math.round(dateMoodValue) - 1, 0), 9) 
    : 4 // Default middle emoji (5/10) if no entry for selected date
  const displayMoodValue = dateMoodValue ?? 5 // For the dots display (1-10 scale)
  
  // Background gradient based on mood
  const getMoodGradient = (value: number | null) => {
    if (value === null) return "from-white/5 to-white/5"
    if (value <= 2) return "from-red-500/20 to-orange-500/20" // Angry
    if (value <= 4) return "from-blue-500/20 to-indigo-500/20" // Sad
    if (value <= 6) return "from-gray-500/20 to-gray-500/20" // Neutral
    if (value <= 8) return "from-yellow-500/20 to-green-500/20" // Happy
    return "from-yellow-500/30 to-green-500/30" // Very Happy
  }

  const chartData = dailyAggregates.map((d) => ({
    date: d.date.slice(5), // MM-DD
    value: d.value,
    fullDate: d.date,
  }))

  const moodGradient = getMoodGradient(displayMoodValue)

  return (
    <div className={cn("flex flex-col h-full rounded-2xl bg-gradient-to-br", moodGradient)}>
      <div className="flex flex-col items-center gap-1 mb-2 p-4">
        <span className="text-4xl">{moodEmojis[moodValue]}</span>
        <span className="text-xs text-white/60">
          {selectedDate.toDateString() === new Date().toDateString() ? "Today" : selectedDate.toLocaleDateString()}
        </span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                i <= displayMoodValue ? "bg-blue-500" : "bg-white/10"
              )}
            />
          ))}
        </div>
        {dateMoodValue === null && (
          <span className="text-xs text-white/40 mt-1">No entry for this date</span>
        )}
      </div>
      {chartData.length > 0 && (
        <div className="flex-1 min-h-[60px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[1, 10]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(266 73% 63%)"
                strokeWidth={2}
                dot={{ fill: "hsl(266 73% 63% / 0.5)", r: 2 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function CounterWidget({
  entries,
  tracker,
  size,
  selectedDate,
}: {
  entries: Entry[]
  tracker: Tracker
  size: string
  selectedDate: Date
}) {
  // Calculate selected date's aggregated value
  const dateValue = getDateValue(entries, tracker, selectedDate)
  const trend = getTrend(entries)
  const iconKey = (tracker.icon ?? "").trim() || "check-square"
  const Icon = iconMap[iconKey] || CheckSquare

  // For chart: aggregate last 7 days by day (sum per day for counter types, last for weight/rating)
  const chartData = (() => {
    const last7Days: Record<string, Entry[]> = {}
    
    // Group entries by date for the last 7 days
    entries.slice(-30).forEach((entry) => {
      const entryDateStr = entry.dateStr || new Date(entry.timestamp).toISOString().split("T")[0]
      if (!last7Days[entryDateStr]) {
        last7Days[entryDateStr] = []
      }
      last7Days[entryDateStr].push(entry)
    })

    // Get last 7 days and aggregate
    const dates = Object.keys(last7Days).sort().slice(-7)
    return dates.map((dateStr) => {
      const dayEntries = last7Days[dateStr]
      const trackerNameLower = tracker.name.toLowerCase()
      const isWeightTracker = trackerNameLower.includes("weight") || trackerNameLower.includes("peso")
      const isRatingType = tracker.type === "rating"
      
      let aggregatedValue: number
      if (isWeightTracker || isRatingType) {
        // Use last entry for weight/rating
        aggregatedValue = dayEntries[dayEntries.length - 1]?.value ?? 0
      } else {
        // Sum for counter types
        aggregatedValue = dayEntries.reduce((acc, e) => acc + (e.value ?? 0), 0)
      }

      const date = new Date(dateStr)
      return {
        value: aggregatedValue,
        date: date.toLocaleDateString("en", { weekday: "short" }),
      }
    })
  })()

  const goal = (tracker.config as Record<string, unknown>)?.goal as number | undefined
  const displayValue = dateValue ?? 0
  const progress = goal ? Math.min((displayValue / goal) * 100, 100) : 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/[0.06]">
            <Icon className="w-4 h-4 text-white/70" />
          </div>
          <span className="text-sm font-medium text-white/60">{tracker.name}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
          {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
          {trend === "neutral" && <Minus className="w-3.5 h-3.5 text-white/30" />}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="text-3xl font-medium text-white tracking-tight">
          {dateValue !== null ? formatValue(displayValue, (tracker.config ?? {}) as Record<string, unknown>) : "--"}
        </div>

        {goal && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-white/40 mb-1.5">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {size === "large" && chartData.length > 1 && (
          <div className="flex-1 mt-4 min-h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gradient-${tracker.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill={`url(#gradient-${tracker.id})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

// MediaWidget: For Books, TV, Games, Apps
function MediaWidget({ 
  entries, 
  tracker, 
  assets 
}: { 
  entries: Entry[]; 
  tracker: Tracker;
  assets: Map<number, Asset>;
}) {
  // Get last 3-4 entries
  const recentEntries = entries
    .filter((e) => e.note) // Only entries with notes (titles)
    .slice(-4)
    .reverse()

  if (recentEntries.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-white/[0.06]">
            {(() => {
              const iconKey = (tracker.icon ?? "").trim() || "book"
              const Icon = iconMap[iconKey] || Book
              return <Icon className="w-4 h-4 text-white/70" />
            })()}
          </div>
          <span className="text-sm font-medium text-white/60">{tracker.name}</span>
        </div>
        <p className="text-sm text-white/40">No entries yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-white/[0.06]">
          {(() => {
            const iconKey = (tracker.icon ?? "").trim() || "book"
            const Icon = iconMap[iconKey] || Book
            return <Icon className="w-4 h-4 text-white/70" />
          })()}
        </div>
        <span className="text-sm font-medium text-white/60">{tracker.name}</span>
      </div>
      <div className="space-y-3 flex-1 overflow-y-auto">
        {recentEntries.map((entry) => {
          const asset = entry.assetId ? assets.get(entry.assetId) : null
          return (
            <div key={entry.id} className="flex items-start gap-3">
              {asset && (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
                  <img
                    src={asset.thumbnailUrl || asset.assetUrl}
                    alt={entry.note || "Media"}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white/90 truncate">
                  {entry.note || "Untitled"}
                </div>
                {entry.value && entry.value > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-white/50">{entry.value}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// WeightWidget: For Weight tracker
function WeightWidget({ 
  entries, 
  tracker, 
  assets,
  selectedDate
}: { 
  entries: Entry[]; 
  tracker: Tracker;
  assets: Map<number, Asset>;
  selectedDate: Date;
}) {
  const targetDateStr = dateToDateStr(selectedDate)
  const dateEntry = entries
    .filter((e) => {
      if (e.dateStr) return e.dateStr === targetDateStr
      return isSameDay(e.timestamp, selectedDate.getTime())
    })
    .sort((a, b) => b.timestamp - a.timestamp)[0] // Most recent for selected date

  const dateAsset = dateEntry?.assetId ? assets.get(dateEntry.assetId) : null

  // Chart data: Last 30 days
  const chartData = (() => {
    const last30Days: Record<string, Entry[]> = {}
    entries.slice(-60).forEach((entry) => {
      const entryDateStr = entry.dateStr || new Date(entry.timestamp).toISOString().split("T")[0]
      if (!last30Days[entryDateStr]) {
        last30Days[entryDateStr] = []
      }
      last30Days[entryDateStr].push(entry)
    })

    const dates = Object.keys(last30Days).sort().slice(-30)
    return dates.map((dateStr) => {
      const dayEntries = last30Days[dateStr]
      const lastEntry = dayEntries[dayEntries.length - 1]
      const date = new Date(dateStr)
      return {
        value: lastEntry?.value ?? null,
        date: date.toLocaleDateString("en", { weekday: "short" }),
        fullDate: dateStr,
      }
    }).filter((d) => d.value !== null)
  })()

  const unit = (tracker.config as Record<string, unknown>)?.unit as string | undefined || "kg"
  const currentWeight = dateEntry?.value ?? null

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Background Image */}
      {dateAsset && (
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `url(${dateAsset.thumbnailUrl || dateAsset.assetUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-white/[0.06]">
            <Scale className="w-4 h-4 text-white/70" />
          </div>
          <span className="text-sm font-medium text-white/60">{tracker.name}</span>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="text-5xl font-bold text-white tracking-tight mb-4">
            {currentWeight !== null ? `${currentWeight.toFixed(1)}${unit}` : "--"}
          </div>

          {chartData.length > 1 && (
            <div className="flex-1 min-h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                  />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(266 73% 63%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(266 73% 63% / 0.5)", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ExerciseWidget: Specialized for Exercise/Workout trackers
function ExerciseWidget({
  entries,
  tracker,
  size,
  selectedDate,
}: {
  entries: Entry[]
  tracker: Tracker
  size: string
  selectedDate: Date
}) {
  const dateValue = getDateValue(entries, tracker, selectedDate)
  const targetDateStr = dateToDateStr(selectedDate)
  
  // Get today's entries with activity names (notes)
  const dateEntries = entries.filter((e) => {
    if (e.dateStr) return e.dateStr === targetDateStr
    return isSameDay(e.timestamp, selectedDate.getTime())
  })
  
  // Total minutes/calories
  const totalMinutes = dateValue ?? 0
  
  // Activity names from notes
  const activities = dateEntries
    .filter((e) => e.note)
    .map((e) => e.note!)
    .slice(0, 5) // Show up to 5 activities

  const iconKey = (tracker.icon ?? "").trim() || "dumbbell"
  const Icon = iconMap[iconKey] || Dumbbell

  // Chart data: Last 7 days
  const chartData = (() => {
    const last7Days: Record<string, Entry[]> = {}
    entries.slice(-30).forEach((entry) => {
      const entryDateStr = entry.dateStr || new Date(entry.timestamp).toISOString().split("T")[0]
      if (!last7Days[entryDateStr]) {
        last7Days[entryDateStr] = []
      }
      last7Days[entryDateStr].push(entry)
    })

    const dates = Object.keys(last7Days).sort().slice(-7)
    return dates.map((dateStr) => {
      const dayEntries = last7Days[dateStr]
      const aggregatedValue = dayEntries.reduce((acc, e) => acc + (e.value ?? 0), 0)
      const date = new Date(dateStr)
      return {
        value: aggregatedValue,
        date: date.toLocaleDateString("en", { weekday: "short" }),
        fullDate: dateStr,
      }
    })
  })()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/[0.06]">
            <Icon className="w-4 h-4 text-white/70" />
          </div>
          <span className="text-sm font-medium text-white/60">{tracker.name}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="text-3xl font-medium text-white tracking-tight mb-2">
          {dateValue !== null ? `${totalMinutes} min` : "--"}
        </div>
        
        {/* Activity List */}
        {activities.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {activities.map((activity, idx) => (
              <div key={idx} className="text-xs text-white/60 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-[hsl(266_73%_63%)]" />
                <span className="truncate">{activity}</span>
              </div>
            ))}
          </div>
        )}

        {size === "large" && chartData.length > 1 && (
          <div className="flex-1 mt-4 min-h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gradient-exercise-${tracker.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(266 73% 63%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(266 73% 63%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(266 73% 63%)"
                  strokeWidth={2}
                  fill={`url(#gradient-exercise-${tracker.id})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

// ProgressWidget: For Diet, Water (not Exercise)
function ProgressWidget({
  entries,
  tracker,
  size,
  selectedDate,
}: {
  entries: Entry[]
  tracker: Tracker
  size: string
  selectedDate: Date
}) {
  const dateValue = getDateValue(entries, tracker, selectedDate)
  const goal = (tracker.config as Record<string, unknown>)?.goal as number | undefined
  const displayValue = dateValue ?? 0
  const progress = goal ? Math.min((displayValue / goal) * 100, 100) : 0

  const iconKey = (tracker.icon ?? "").trim() || "check-square"
  const Icon = iconMap[iconKey] || CheckSquare

  // Chart data: Last 7 days aggregated
  const chartData = (() => {
    const last7Days: Record<string, Entry[]> = {}
    entries.slice(-30).forEach((entry) => {
      const entryDateStr = entry.dateStr || new Date(entry.timestamp).toISOString().split("T")[0]
      if (!last7Days[entryDateStr]) {
        last7Days[entryDateStr] = []
      }
      last7Days[entryDateStr].push(entry)
    })

    const dates = Object.keys(last7Days).sort().slice(-7)
    return dates.map((dateStr) => {
      const dayEntries = last7Days[dateStr]
      const aggregatedValue = dayEntries.reduce((acc, e) => acc + (e.value ?? 0), 0)
      const date = new Date(dateStr)
      return {
        value: aggregatedValue,
        date: date.toLocaleDateString("en", { weekday: "short" }),
        fullDate: dateStr,
      }
    })
  })()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/[0.06]">
            <Icon className="w-4 h-4 text-white/70" />
          </div>
          <span className="text-sm font-medium text-white/60">{tracker.name}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="text-3xl font-medium text-white tracking-tight">
          {dateValue !== null ? formatValue(displayValue, (tracker.config ?? {}) as Record<string, unknown>) : "--"}
        </div>

        {goal && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/40 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            {/* Radial Progress */}
            <div className="relative w-20 h-20 mx-auto">
              <svg className="transform -rotate-90 w-20 h-20">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="hsl(266 73% 63%)"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-white">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        )}

        {size === "large" && chartData.length > 1 && (
          <div className="flex-1 mt-4 min-h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gradient-progress-${tracker.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(266 73% 63%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(266 73% 63%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(266 73% 63%)"
                  strokeWidth={2}
                  fill={`url(#gradient-progress-${tracker.id})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

// SocialWidget: For Social/Connection trackers
function SocialWidget({ entries, tracker, selectedDate }: { entries: Entry[]; tracker: Tracker; selectedDate: Date }) {
  const dateValue = getDateValue(entries, tracker, selectedDate)
  const targetDateStr = dateToDateStr(selectedDate)
  
  // Get today's entries
  const dateEntries = entries.filter((e) => {
    if (e.dateStr) return e.dateStr === targetDateStr
    return isSameDay(e.timestamp, selectedDate.getTime())
  })
  
  // Extract names from notes (e.g., "@Mom", "with John")
  const extractNames = (note: string | null): string[] => {
    if (!note) return []
    // Match @mentions or "with Name" patterns
    const mentions = note.match(/@(\w+)/g)?.map(m => m.slice(1)) || []
    const withPattern = note.match(/with\s+(\w+)/gi)?.map(m => m.replace(/with\s+/i, '')) || []
    return [...mentions, ...withPattern]
  }
  
  const allNames = dateEntries
    .flatMap((e) => extractNames(e.note))
    .filter((name, idx, arr) => arr.indexOf(name) === idx) // Unique names
    .slice(0, 5)

  // Satisfaction meter (1-10) or time spent
  const satisfaction = dateValue ?? 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-white/[0.06]">
          <Users className="w-4 h-4 text-white/70" />
        </div>
        <span className="text-sm font-medium text-white/60">{tracker.name}</span>
      </div>

      <div className="flex-1 flex flex-col">
        {satisfaction > 0 && (
          <div className="mb-4">
            <div className="text-2xl font-medium text-white tracking-tight mb-2">
              {satisfaction}/10
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 flex-1 rounded-full transition-colors",
                    i <= satisfaction ? "bg-[hsl(266_73%_63%)]" : "bg-white/10"
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Names/Tags */}
        {allNames.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-white/60 mb-2">People</div>
            <div className="flex flex-wrap gap-2">
              {allNames.map((name, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded-lg bg-[hsl(266_73%_63%/0.2)] text-xs text-[hsl(266_73%_63%)] border border-[hsl(266_73%_63%/0.3)]"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {dateEntries.length === 0 && (
          <p className="text-sm text-white/40">No entries for this date</p>
        )}
      </div>
    </div>
  )
}

function TaskWidget({ entries, tracker, selectedDate }: { entries: Entry[]; tracker: Tracker; selectedDate: Date }) {
  const targetDateStr = dateToDateStr(selectedDate)
  const updateEntryMutation = useUpdateEntryMutation()
  
  // Filter tasks to show only those for selected date
  const dateTasks = entries
    .filter((e) => {
      // Prefer dateStr if available (more efficient)
      if (e.dateStr) {
        return e.dateStr === targetDateStr
      }
      // Fallback to timestamp comparison
      return isSameDay(e.timestamp, selectedDate.getTime())
    })
    .map((e) => ({
      id: e.id,
      text: e.note ?? "Task",
      done: (e.value ?? 0) >= 1,
    }))
  
  const completed = dateTasks.filter((t) => t.done).length

  const handleToggle = (entryId: number, currentValue: number | null) => {
    const newValue = (currentValue ?? 0) >= 1 ? 0 : 1
    updateEntryMutation.mutate({ id: entryId, updates: { value: newValue } })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-white/[0.06]">
          <CheckSquare className="w-4 h-4 text-white/70" />
        </div>
        <span className="text-sm font-medium text-white/60">{tracker.name}</span>
      </div>
      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[120px]">
        {dateTasks.length === 0 ? (
          <p className="text-sm text-white/40">No tasks for this date</p>
        ) : (
          dateTasks.slice(0, 8).map((task) => {
            const entry = entries.find((e) => e.id === task.id)
            return (
              <div key={task.id} className="flex items-center gap-3">
                <button
                  onClick={() => handleToggle(task.id, entry?.value ?? null)}
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors duration-200 cursor-pointer",
                    task.done ? "bg-blue-500 border-blue-500" : "border-white/20 hover:border-white/40"
                  )}
                >
                  {task.done && <CheckSquare className="w-3 h-3 text-white" />}
                </button>
                <span
                  className={cn(
                    "text-sm transition-colors duration-200 truncate",
                    task.done ? "text-white/40 line-through" : "text-white/80"
                  )}
                >
                  {task.text}
                </span>
              </div>
            )
          })
        )}
      </div>
      <div className="text-xs text-white/40 mt-3">
        {completed}/{dateTasks.length} completed
      </div>
    </div>
  )
}

export function WidgetCard({ widget, tracker, entries, assets, selectedDate }: WidgetCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const sizeClasses = {
    small: "col-span-6 md:col-span-4 lg:col-span-3 row-span-1",
    medium: "col-span-6 md:col-span-4 lg:col-span-4 row-span-1",
    large: "col-span-12 md:col-span-8 lg:col-span-6 row-span-2",
  }

  const renderContent = () => {
    const trackerNameLower = tracker.name.toLowerCase()
    const trackerType = tracker.type

    // Mood Widget: rating type with smile icon
    if (trackerType === "rating" && tracker.icon === "smile") {
      return <MoodWidget entries={entries} tracker={tracker} selectedDate={selectedDate} />
    }

    // Weight Widget: weight tracker
    if (trackerNameLower.includes("weight") || trackerNameLower.includes("peso")) {
      return <WeightWidget entries={entries} tracker={tracker} assets={assets} selectedDate={selectedDate} />
    }

    // Media Widget: Books, TV, Games, Media, Apps (must be before Task so "Books" list type gets Media)
    if (
      trackerNameLower.includes("book") ||
      trackerNameLower.includes("tv") ||
      trackerNameLower.includes("movie") ||
      trackerNameLower.includes("game") ||
      trackerNameLower.includes("media") ||
      trackerNameLower.includes("app") ||
      tracker.icon === "book" ||
      tracker.icon === "gamepad-2" ||
      tracker.icon === "music"
    ) {
      return <MediaWidget entries={entries} tracker={tracker} assets={assets} />
    }

    // Social Widget: social/connection tracker
    if (trackerNameLower.includes("social") || tracker.icon === "users") {
      return <SocialWidget entries={entries} tracker={tracker} selectedDate={selectedDate} />
    }

    // Progress Widget: Diet, Water (before Task so "Diet" list type gets Progress)
    if (
      trackerNameLower.includes("diet") ||
      trackerNameLower.includes("water") ||
      trackerNameLower.includes("calorie") ||
      trackerNameLower.includes("nutrition") ||
      tracker.icon === "coffee" ||
      tracker.icon === "salad"
    ) {
      return <ProgressWidget entries={entries} tracker={tracker} size={widget.size} selectedDate={selectedDate} />
    }

    // Task Widget: list (text/composite from API), binary (checkbox-style), or task-named trackers
    if (trackerType === "list" || trackerType === "binary" || trackerNameLower.includes("task") || trackerNameLower.includes("todo")) {
      return <TaskWidget entries={entries} tracker={tracker} selectedDate={selectedDate} />
    }

    // Exercise Widget: Specialized for Exercise/Workout
    if (
      trackerNameLower.includes("exercise") ||
      trackerNameLower.includes("workout") ||
      tracker.icon === "dumbbell"
    ) {
      return <ExerciseWidget entries={entries} tracker={tracker} size={widget.size} selectedDate={selectedDate} />
    }

    // Counter Widget: Savings, Finance, and other numeric (currency formatting via config.unit)
    if (
      trackerNameLower.includes("saving") ||
      trackerNameLower.includes("finance") ||
      trackerNameLower.includes("money") ||
      tracker.icon === "wallet"
    ) {
      return <CounterWidget entries={entries} tracker={tracker} size={widget.size} selectedDate={selectedDate} />
    }

    // Default: Counter Widget for numeric, range, counter types
    return <CounterWidget entries={entries} tracker={tracker} size={widget.size} selectedDate={selectedDate} />
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeClasses[widget.size],
        "group relative",
        cardBaseClasses,
        isDragging && "opacity-50 scale-105 z-50 shadow-2xl shadow-blue-500/10"
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200",
          "hover:bg-white/[0.06] cursor-grab active:cursor-grabbing"
        )}
      >
        <GripVertical className="w-4 h-4 text-white/30" />
      </button>

      {renderContent()}
    </div>
  )
}
