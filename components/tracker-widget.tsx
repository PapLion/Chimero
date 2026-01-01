"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  CheckSquare,
  BookOpen,
  Apple,
  Dumbbell,
  Gamepad2,
  Smartphone,
  Smile,
  Users,
  Tv,
  Scale,
  TrendingDown,
  TrendingUp,
  Phone,
  MessageSquare,
  Video,
  UserRound,
  Instagram,
  Youtube,
  Music,
  Podcast,
  Film,
  BarChart3,
} from "lucide-react"
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip } from "recharts"
import type { CustomTrackerConfig } from "@/types"
import { useAppData } from "@/contexts/app-data-context"
import * as Icons from "lucide-react"

// Types
export type TrackerType =
  | "tasks"
  | "books"
  | "diet"
  | "exercise"
  | "gaming"
  | "media"
  | "mood"
  | "social"
  | "tv"
  | "weight"
  | "custom"

interface TrackerWidgetProps {
  type: TrackerType
  className?: string
  // For custom trackers
  customTracker?: CustomTrackerConfig
  // Optional data override
  data?: any
}

// Mock data for each tracker type
const mockDataByType = {
  tasks: {
    completed: 5,
    total: 8,
    remaining: 3,
    percentage: 62.5,
  },
  books: {
    readingTime: 45,
    unit: "minutes",
    currentBook: {
      title: "Atomic Habits",
      currentPage: 142,
      totalPages: 320,
      percentage: 44.4,
    },
  },
  diet: {
    status: "on-track",
    macros: {
      protein: 85,
      carbs: 180,
      fats: 55,
    },
  },
  exercise: {
    hoursCompleted: 2.5,
    goalHours: 4,
    percentage: 62,
    unit: "hours",
  },
  gaming: {
    playTime: 1.5,
    unit: "hours",
    lastPlayedGame: "Elden Ring",
    recentSessions: [
      { id: 1, game: "Elden Ring", activityType: "story", duration: 45 },
      { id: 2, game: "Valorant", activityType: "competitive", duration: 30 },
      { id: 3, game: "Stardew Valley", activityType: "casual", duration: 20 },
      { id: 4, game: "Elden Ring", activityType: "achievement", duration: 15 },
    ],
  },
  media: {
    totalHours: 3.2,
    breakdown: [
      { platform: "Instagram", hours: 1.5 },
      { platform: "Twitter", hours: 1.2 },
      { platform: "YouTube", hours: 0.5 },
    ],
    recentSessions: [
      { id: 1, platform: "Instagram", type: "social", duration: 45 },
      { id: 2, platform: "YouTube", type: "video", duration: 30 },
      { id: 3, platform: "Spotify", type: "music", duration: 60 },
      { id: 4, platform: "Twitter", type: "social", duration: 20 },
      { id: 5, platform: "Netflix", type: "streaming", duration: 90 },
    ],
  },
  mood: {
    currentRating: 7,
    dailyAverage: 6.8,
    dailyMin: 5,
    dailyMax: 8,
    entriesCount: 4,
    history: [
      { timestamp: new Date("2024-01-15T08:00:00"), rating: 6, notes: "Morning" },
      { timestamp: new Date("2024-01-15T12:00:00"), rating: 7, notes: "After lunch" },
      { timestamp: new Date("2024-01-15T16:00:00"), rating: 8, notes: "Productive afternoon" },
      { timestamp: new Date("2024-01-15T20:00:00"), rating: 7, notes: "Evening" },
    ],
  },
  social: {
    todayInteractions: 5,
    weekInteractions: 18,
    lastInteraction: {
      id: 1,
      timestamp: new Date("2024-01-15T14:30:00"),
      person: "Mom",
      method: "call" as const,
      duration: 25,
    },
    breakdown: [
      { method: "call" as const, count: 2 },
      { method: "text" as const, count: 8 },
      { method: "video" as const, count: 1 },
      { method: "in-person" as const, count: 7 },
    ],
    recentContacts: [
      { id: 1, name: "Mom", initials: "MO", relationship: "family" },
      { id: 2, name: "John Doe", initials: "JD", relationship: "friend" },
      { id: 3, name: "Sarah K", initials: "SK", relationship: "colleague" },
      { id: 4, name: "Mike R", initials: "MR", relationship: "friend" },
      { id: 5, name: "Lisa Chen", initials: "LC", relationship: "acquaintance" },
    ],
  },
  tv: {
    episodesWatched: 4,
    currentShow: {
      title: "Breaking Bad",
      season: 3,
    },
  },
  weight: {
    current: 172.8,
    unit: "lbs",
    trend: -2.2,
    trendDirection: "down",
    goal: 170,
    history: [
      { day: "Mon", weight: 175 },
      { day: "Tue", weight: 174.5 },
      { day: "Wed", weight: 174 },
      { day: "Thu", weight: 173.8 },
      { day: "Fri", weight: 173.5 },
      { day: "Sat", weight: 173 },
      { day: "Sun", weight: 172.8 },
    ],
  },
}

// Config for each tracker type
const trackerConfig: Record<
  TrackerType,
  { icon: React.ComponentType<any>; title: string; subtitle: string; colorClass: string }
> = {
  tasks: { icon: CheckSquare, title: "Tasks", subtitle: "Today's todos", colorClass: "bg-accent/10 text-accent" },
  books: { icon: BookOpen, title: "Books", subtitle: "Reading time", colorClass: "bg-primary/10 text-primary" },
  diet: { icon: Apple, title: "Diet", subtitle: "Nutrition today", colorClass: "bg-accent/10 text-accent" },
  exercise: { icon: Dumbbell, title: "Exercise", subtitle: "Workout time", colorClass: "bg-primary/10 text-primary" },
  gaming: { icon: Gamepad2, title: "Gaming", subtitle: "Play time", colorClass: "bg-accent/10 text-accent" },
  media: { icon: Smartphone, title: "Media", subtitle: "Social & apps", colorClass: "bg-primary/10 text-primary" },
  mood: { icon: Smile, title: "Mood", subtitle: "How you feel", colorClass: "bg-primary/10 text-primary" },
  social: { icon: Users, title: "Social", subtitle: "Interactions", colorClass: "bg-accent/10 text-accent" },
  tv: { icon: Tv, title: "TV", subtitle: "Shows & movies", colorClass: "bg-accent/10 text-accent" },
  weight: { icon: Scale, title: "Weight", subtitle: "7-day trend", colorClass: "bg-primary/10 text-primary" },
  custom: { icon: BarChart3, title: "Custom", subtitle: "Custom tracker", colorClass: "bg-primary/10 text-primary" },
}

// Activity type configs
const gamingActivityConfig: Record<string, { color: string; label: string }> = {
  story: { color: "bg-purple-500", label: "Story" },
  multiplayer: { color: "bg-blue-500", label: "Multiplayer" },
  competitive: { color: "bg-red-500", label: "Competitive" },
  casual: { color: "bg-green-500", label: "Casual" },
  achievement: { color: "bg-amber-500", label: "Achievement" },
}

const mediaTypeConfig: Record<string, { color: string; icon: React.ComponentType<any>; label: string }> = {
  social: { color: "bg-pink-500", icon: Instagram, label: "Social" },
  video: { color: "bg-red-500", icon: Youtube, label: "Video" },
  music: { color: "bg-green-500", icon: Music, label: "Music" },
  podcast: { color: "bg-purple-500", icon: Podcast, label: "Podcast" },
  streaming: { color: "bg-blue-500", icon: Film, label: "Streaming" },
}

const methodIcons: Record<string, React.ComponentType<any>> = {
  call: Phone,
  text: MessageSquare,
  video: Video,
  "in-person": UserRound,
}

const methodLabels: Record<string, string> = {
  call: "Call",
  text: "Text",
  video: "Video",
  "in-person": "In Person",
}

const relationshipColors: Record<string, string> = {
  family: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  friend: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  colleague: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  acquaintance: "bg-slate-500/20 text-slate-400 border-slate-500/30",
}

// Render functions for each tracker type
function renderTasks(data: typeof mockDataByType.tasks) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-4xl font-display font-bold">{data.completed}</span>
        <span className="text-muted-foreground">/ {data.total} done</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent to-primary" style={{ width: `${data.percentage}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{Math.round(data.percentage)}%</span>
      </div>
      <div className="pt-2 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-muted-foreground">{data.remaining} tasks remaining</span>
        </div>
      </div>
    </div>
  )
}

function renderBooks(data: typeof mockDataByType.books) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-display font-bold">{data.readingTime}</span>
        <span className="text-muted-foreground">{data.unit}</span>
      </div>
      <div className="pt-2 border-t border-border/50">
        <div className="text-sm">
          <span className="text-muted-foreground">Reading: </span>
          <span className="font-medium">{data.currentBook.title}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Page {data.currentBook.currentPage} of {data.currentBook.totalPages}
        </div>
      </div>
    </div>
  )
}

function renderDiet(data: typeof mockDataByType.diet) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Status</span>
        <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium capitalize">
          {data.status.replace("-", " ")}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-muted rounded-lg">
          <div className="text-lg font-display font-bold">{data.macros.protein}g</div>
          <div className="text-xs text-muted-foreground">Protein</div>
        </div>
        <div className="text-center p-2 bg-muted rounded-lg">
          <div className="text-lg font-display font-bold">{data.macros.carbs}g</div>
          <div className="text-xs text-muted-foreground">Carbs</div>
        </div>
        <div className="text-center p-2 bg-muted rounded-lg">
          <div className="text-lg font-display font-bold">{data.macros.fats}g</div>
          <div className="text-xs text-muted-foreground">Fats</div>
        </div>
      </div>
    </div>
  )
}

function renderExercise(data: typeof mockDataByType.exercise) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-display font-bold">{data.hoursCompleted}</span>
          <span className="text-muted-foreground">{data.unit}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${data.percentage}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{data.percentage}%</span>
        </div>
      </div>
      <div className="pt-2 border-t border-border/50">
        <div className="text-sm text-muted-foreground">Goal: {data.goalHours}h/day</div>
      </div>
    </div>
  )
}

function renderGaming(data: typeof mockDataByType.gaming) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-display font-bold">{data.playTime}</span>
        <span className="text-muted-foreground">{data.unit}</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Today's Activity</span>
          <div className="flex items-center gap-1.5">
            {data.recentSessions.slice(0, 6).map((session) => (
              <div
                key={session.id}
                className={cn("w-3 h-3 rounded-sm", gamingActivityConfig[session.activityType]?.color || "bg-muted")}
                title={`${session.game} - ${gamingActivityConfig[session.activityType]?.label}`}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(gamingActivityConfig)
            .slice(0, 3)
            .map(([key, config]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={cn("w-2 h-2 rounded-sm", config.color)} />
                <span className="text-muted-foreground">{config.label}</span>
              </div>
            ))}
        </div>
      </div>
      <div className="pt-2 border-t border-border/50">
        <div className="text-sm">
          <span className="text-muted-foreground">Last played: </span>
          <span className="font-medium">{data.lastPlayedGame}</span>
        </div>
      </div>
    </div>
  )
}

function renderMedia(data: typeof mockDataByType.media) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-display font-bold">{data.totalHours}</span>
        <span className="text-muted-foreground">hours</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Today's Activity</span>
          <div className="flex items-center gap-1">
            {data.recentSessions.slice(0, 6).map((session) => (
              <div
                key={session.id}
                className={cn("w-3 h-3 rounded-sm", mediaTypeConfig[session.type]?.color || "bg-muted")}
                title={`${session.platform} - ${mediaTypeConfig[session.type]?.label}`}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(mediaTypeConfig)
            .slice(0, 3)
            .map(([key, config]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={cn("w-2 h-2 rounded-sm", config.color)} />
                <span className="text-muted-foreground">{config.label}</span>
              </div>
            ))}
        </div>
      </div>
      <div className="pt-2 border-t border-border/50 space-y-2">
        {data.breakdown.map((item) => (
          <div key={item.platform} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.platform}</span>
            <span className="font-medium">{item.hours}h</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function renderMood(data: typeof mockDataByType.mood) {
  const getMoodEmoji = (rating: number) => {
    if (rating >= 8) return "😊"
    if (rating >= 6) return "🙂"
    if (rating >= 4) return "😐"
    if (rating >= 2) return "😕"
    return "😢"
  }

  const chartData = data.history.map((entry, index) => ({
    time: index + 1,
    rating: entry.rating,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-display font-bold">{data.currentRating}</span>
          <span className="text-2xl">{getMoodEmoji(data.currentRating)}</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Avg: {data.dailyAverage.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">
            Range: {data.dailyMin}-{data.dailyMax}
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.67 0.19 259)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="oklch(0.67 0.19 259)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover border border-border rounded-lg p-2">
                    <p className="text-sm font-medium">
                      Rating: {payload[0].value} {getMoodEmoji(Number(payload[0].value))}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="rating"
            stroke="oklch(0.67 0.19 259)"
            strokeWidth={2}
            fill="url(#moodGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="pt-2 border-t border-border/50 text-sm text-muted-foreground">
        {data.entriesCount} entries today
      </div>
    </div>
  )
}

function renderSocial(data: typeof mockDataByType.social) {
  const Icon = data.lastInteraction ? methodIcons[data.lastInteraction.method] : Users

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-display font-bold">{data.todayInteractions}</span>
        <span className="text-muted-foreground">interactions today</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex -space-x-2">
          {data.recentContacts.slice(0, 4).map((person) => (
            <div
              key={person.id}
              className={cn(
                "w-8 h-8 text-xs rounded-full flex items-center justify-center font-semibold border",
                relationshipColors[person.relationship] || relationshipColors.acquaintance,
              )}
              title={person.name}
            >
              {person.initials}
            </div>
          ))}
        </div>
        {data.recentContacts.length > 4 && (
          <span className="text-xs text-muted-foreground ml-2">+{data.recentContacts.length - 4} more</span>
        )}
      </div>
      {data.lastInteraction && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Contact</span>
            <Badge variant="secondary" className="gap-1">
              <Icon className="w-3 h-3" />
              {methodLabels[data.lastInteraction.method]}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {data.lastInteraction.person}
            {data.lastInteraction.duration && ` • ${data.lastInteraction.duration}m`}
          </div>
        </div>
      )}
      <div className="pt-2 border-t border-border/50">
        <div className="grid grid-cols-2 gap-2">
          {data.breakdown.slice(0, 4).map((item) => {
            const MethodIcon = methodIcons[item.method]
            return (
              <div key={item.method} className="flex items-center gap-2 text-sm">
                <MethodIcon className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">{item.count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function renderTV(data: typeof mockDataByType.tv) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-display font-bold">{data.episodesWatched}</span>
        <span className="text-muted-foreground">episodes</span>
      </div>
      <div className="pt-2 border-t border-border/50">
        <div className="text-sm">
          <span className="text-muted-foreground">Currently: </span>
          <span className="font-medium">
            {data.currentShow.title}
            {data.currentShow.season && ` S${data.currentShow.season}`}
          </span>
        </div>
      </div>
    </div>
  )
}

function renderWeight(data: typeof mockDataByType.weight) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-display font-bold">{data.current}</span>
        <span className="text-muted-foreground">{data.unit}</span>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={data.history}>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover border border-border rounded-lg p-2">
                    <p className="text-sm font-medium">
                      {payload[0].value} {data.unit}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Line type="monotone" dataKey="weight" stroke="oklch(0.67 0.19 25)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="pt-2 border-t border-border/50 text-sm text-muted-foreground">
        Goal: {data.goal} {data.unit} by end of month
      </div>
    </div>
  )
}

function renderCustom(tracker: CustomTrackerConfig, getTrackerEntries: (id: string) => any[]) {
  const entries = getTrackerEntries(tracker.id)

  const todayEntries = entries.filter((entry) => {
    const today = new Date()
    const entryDate = new Date(entry.timestamp)
    return entryDate.toDateString() === today.toDateString()
  })

  const latestEntry = entries[entries.length - 1]
  const currentValue = tracker.goalField && latestEntry ? (latestEntry.data[tracker.goalField] as number) : 0
  const goalProgress = tracker.hasGoal && tracker.goalValue ? (currentValue / tracker.goalValue) * 100 : 0

  return (
    <div className="space-y-3">
      {tracker.hasGoal && tracker.goalValue && (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{currentValue}</span>
            <span className="text-sm text-muted-foreground">/ {tracker.goalValue}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(goalProgress)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${Math.min(goalProgress, 100)}%`,
                  backgroundColor: tracker.color || "hsl(var(--primary))",
                }}
              />
            </div>
          </div>
        </>
      )}
      {!tracker.hasGoal && (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{entries.length}</span>
          <span className="text-sm text-muted-foreground">total entries</span>
        </div>
      )}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          <span>{todayEntries.length} today</span>
        </div>
      </div>
    </div>
  )
}

export function TrackerWidget({ type, className, customTracker, data }: TrackerWidgetProps) {
  const { getTrackerEntries } = useAppData()

  // Get config based on type or custom tracker
  const config =
    type === "custom" && customTracker
      ? {
          icon: customTracker.icon
            ? (Icons[customTracker.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>) ||
              BarChart3
            : BarChart3,
          title: customTracker.name,
          subtitle: customTracker.goalType || "Custom tracker",
          colorClass: "bg-primary/10 text-primary",
          color: customTracker.color,
        }
      : trackerConfig[type]

  const Icon = config.icon
  const mockData = data || (type !== "custom" ? mockDataByType[type] : null)

  // Render header extra content based on type
  const renderHeaderExtra = () => {
    if (type === "weight" && mockData) {
      const weightData = mockData as typeof mockDataByType.weight
      return (
        <div className="flex items-center gap-1 text-accent">
          <TrendingDown className="w-4 h-4" />
          <span className="text-sm font-medium">
            {weightData.trend > 0 ? "+" : ""}
            {weightData.trend} {weightData.unit}
          </span>
        </div>
      )
    }
    if (type === "mood" && mockData) {
      return (
        <Button size="icon" variant="ghost" className="rounded-full w-8 h-8">
          <TrendingUp className="w-4 h-4" />
        </Button>
      )
    }
    return (
      <Button size="icon" variant="ghost" className="rounded-full w-8 h-8">
        <Plus className="w-4 h-4" />
      </Button>
    )
  }

  // Render content based on type
  const renderContent = () => {
    if (!mockData && type !== "custom") return null

    switch (type) {
      case "tasks":
        return renderTasks(mockData as typeof mockDataByType.tasks)
      case "books":
        return renderBooks(mockData as typeof mockDataByType.books)
      case "diet":
        return renderDiet(mockData as typeof mockDataByType.diet)
      case "exercise":
        return renderExercise(mockData as typeof mockDataByType.exercise)
      case "gaming":
        return renderGaming(mockData as typeof mockDataByType.gaming)
      case "media":
        return renderMedia(mockData as typeof mockDataByType.media)
      case "mood":
        return renderMood(mockData as typeof mockDataByType.mood)
      case "social":
        return renderSocial(mockData as typeof mockDataByType.social)
      case "tv":
        return renderTV(mockData as typeof mockDataByType.tv)
      case "weight":
        return renderWeight(mockData as typeof mockDataByType.weight)
      case "custom":
        return customTracker ? renderCustom(customTracker, getTrackerEntries) : null
      default:
        return null
    }
  }

  return (
    <div
      className={cn("bg-card border-2 border-border rounded-xl p-6 widget-glow transition-all duration-200", className)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.colorClass)}
            style={
              type === "custom" && customTracker?.color
                ? {
                    backgroundColor: `${customTracker.color}20`,
                  }
                : undefined
            }
          >
            <Icon
              className="w-5 h-5"
              style={type === "custom" && customTracker?.color ? { color: customTracker.color } : undefined}
            />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg">{config.title}</h3>
            <p className="text-xs text-muted-foreground">{config.subtitle}</p>
          </div>
        </div>
        {renderHeaderExtra()}
      </div>
      {renderContent()}
    </div>
  )
}
