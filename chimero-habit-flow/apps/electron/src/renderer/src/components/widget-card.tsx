"use client"

import { cn } from "../lib/utils"
import { useAppStore, type Widget, type Tracker, type Entry } from "../lib/store"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Scale, Smile, Dumbbell, Users, CheckSquare, Wallet, GripVertical, TrendingUp, TrendingDown, Minus, Type as type, LucideIcon } from "lucide-react"
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
  const recent = entries[entries.length - 1].value
  const previous = entries[entries.length - 2].value
  if (recent > previous) return "up"
  if (recent < previous) return "down"
  return "neutral"
}

function MoodWidget({ entries, tracker }: { entries: Entry[]; tracker: Tracker }) {
  const latestEntry = entries[entries.length - 1]
  const moodEmojis = ["😢", "😔", "😐", "🙂", "😄"]
  const moodValue = latestEntry ? Math.min(Math.max(Math.round(latestEntry.value) - 1, 0), 4) : 2

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <span className="text-5xl">{moodEmojis[moodValue]}</span>
      <span className="text-sm text-muted-foreground">Today's Mood</span>
      <div className="flex gap-1 mt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full",
              i <= (latestEntry?.value || 0) ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
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
  const Icon = iconMap[tracker.icon] || CheckSquare

  const chartData = entries.slice(-7).map((entry) => ({
    value: entry.value,
    date: new Date(entry.timestamp).toLocaleDateString("en", { weekday: "short" }),
  }))

  const goal = tracker.config.goal as number | undefined
  const progress = goal && latestEntry ? Math.min((latestEntry.value / goal) * 100, 100) : 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">{tracker.name}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-400" />}
          {trend === "down" && <TrendingDown className="w-3 h-3 text-rose-400" />}
          {trend === "neutral" && <Minus className="w-3 h-3 text-muted-foreground" />}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="text-3xl font-bold text-foreground">
          {latestEntry ? formatValue(latestEntry.value, tracker.config) : "--"}
        </div>

        {goal && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
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
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
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

function TaskWidget({ tracker }: { tracker: Tracker }) {
  const mockTasks = [
    { id: 1, text: "Review project specs", done: true },
    { id: 2, text: "Update documentation", done: true },
    { id: 3, text: "Team standup meeting", done: false },
    { id: 4, text: "Code review PR #42", done: false },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <CheckSquare className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-medium text-foreground">{tracker.name}</span>
      </div>
      <div className="space-y-2 flex-1">
        {mockTasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2">
            <div
              className={cn(
                "w-4 h-4 rounded border flex items-center justify-center",
                task.done ? "bg-primary border-primary" : "border-muted-foreground"
              )}
            >
              {task.done && <CheckSquare className="w-3 h-3 text-primary-foreground" />}
            </div>
            <span
              className={cn(
                "text-sm",
                task.done ? "text-muted-foreground line-through" : "text-foreground"
              )}
            >
              {task.text}
            </span>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        {mockTasks.filter((t) => t.done).length}/{mockTasks.length} completed
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
      return <TaskWidget tracker={tracker} />
    }
    return <CounterWidget entries={entries} tracker={tracker} size={widget.size} />
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeClasses[widget.size],
        "group relative bg-card border border-border rounded-xl p-4 transition-all",
        isDragging && "opacity-50 scale-105 z-50 shadow-2xl shadow-primary/20",
        "hover:border-primary/30"
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
          "hover:bg-muted cursor-grab active:cursor-grabbing"
        )}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      {renderContent()}
    </div>
  )
}
