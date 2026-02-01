"use client"

import { cn } from "../lib/utils"
import { type Widget, type Tracker, type Entry } from "../lib/store"
import { useMoodDailyAggregates } from "../lib/queries"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Scale, Smile, Dumbbell, Users, CheckSquare, Wallet, GripVertical, TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"

const iconMap: Record<string, LucideIcon> = {
  scale: Scale,
  smile: Smile,
  dumbbell: Dumbbell,
  users: Users,
  "check-square": CheckSquare,
  wallet: Wallet,
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

interface WidgetCardProps {
  widget: Widget
  tracker: Tracker
  entries: Entry[]
}

function formatValue(value: number, config: Record<string, unknown>): string {
  const unit = config.unit as string | undefined
  if (unit === "$") return `$${value.toLocaleString()}`
  if (unit) return `${value}${unit}`
  return value.toString()
}

function getTrend(entries: Entry[]): "up" | "down" | "neutral" {
  if (entries.length < 2) return "neutral"
  const recent = entries[entries.length - 1]?.value ?? 0
  const previous = entries[entries.length - 2]?.value ?? 0
  if (recent > previous) return "up"
  if (recent < previous) return "down"
  return "neutral"
}

function MoodWidget({ entries, tracker }: { entries: Entry[]; tracker: Tracker }) {
  const latestEntry = entries[entries.length - 1]
  const { data: dailyAggregates = [] } = useMoodDailyAggregates(tracker.id, 14)
  const moodEmojis = ["😢", "😔", "😐", "🙂", "😄"]
  const moodValue = latestEntry ? Math.min(Math.max(Math.round(latestEntry.value ?? 0) - 1, 0), 4) : 2

  const chartData = dailyAggregates.map((d) => ({
    date: d.date.slice(5), // MM-DD
    value: d.value,
  }))

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col items-center gap-1 mb-2">
        <span className="text-4xl">{moodEmojis[moodValue]}</span>
        <span className="text-xs text-white/60">Today</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                i <= (latestEntry?.value || 0) ? "bg-blue-500" : "bg-white/10"
              )}
            />
          ))}
        </div>
      </div>
      {chartData.length > 0 && (
        <div className="flex-1 min-h-[60px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[1, 5]} />
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
}: {
  entries: Entry[]
  tracker: Tracker
  size: string
}) {
  const latestEntry = entries[entries.length - 1]
  const trend = getTrend(entries)
  const Icon = iconMap[tracker.icon ?? ""] || CheckSquare

  const chartData = entries.slice(-7).map((entry) => ({
    value: entry.value ?? 0,
    date: new Date(entry.timestamp).toLocaleDateString("en", { weekday: "short" }),
  }))

  const goal = (tracker.config as Record<string, unknown>)?.goal as number | undefined
  const progress = goal && latestEntry != null ? Math.min(((latestEntry.value ?? 0) / goal) * 100, 100) : 0

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
          {latestEntry ? formatValue(latestEntry.value ?? 0, (tracker.config ?? {}) as Record<string, unknown>) : "--"}
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

function TaskWidget({ entries, tracker }: { entries: Entry[]; tracker: Tracker }) {
  const tasks = entries.map((e) => ({
    id: e.id,
    text: e.note ?? "Task",
    done: (e.value ?? 0) >= 1,
  }))
  const completed = tasks.filter((t) => t.done).length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-white/[0.06]">
          <CheckSquare className="w-4 h-4 text-white/70" />
        </div>
        <span className="text-sm font-medium text-white/60">{tracker.name}</span>
      </div>
      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[120px]">
        {tasks.length === 0 ? (
          <p className="text-sm text-white/40">No tasks yet</p>
        ) : (
          tasks.slice(0, 8).map((task) => (
            <div key={task.id} className="flex items-center gap-3">
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors duration-200",
                  task.done ? "bg-blue-500 border-blue-500" : "border-white/20"
                )}
              >
                {task.done && <CheckSquare className="w-3 h-3 text-white" />}
              </div>
              <span
                className={cn(
                  "text-sm transition-colors duration-200 truncate",
                  task.done ? "text-white/40 line-through" : "text-white/80"
                )}
              >
                {task.text}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="text-xs text-white/40 mt-3">
        {completed}/{tasks.length} completed
      </div>
    </div>
  )
}

export function WidgetCard({ widget, tracker, entries }: WidgetCardProps) {
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
    if (tracker.type === "rating" && tracker.icon === "smile") {
      return <MoodWidget entries={entries} tracker={tracker} />
    }
    if (tracker.type === "list") {
      return <TaskWidget entries={entries} tracker={tracker} />
    }
    return <CounterWidget entries={entries} tracker={tracker} size={widget.size} />
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
