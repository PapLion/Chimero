"use client"

import { useState } from "react"
import { cn } from "../lib/utils"
import { useAppStore, type PageType } from "../lib/store"
import { useTrackers, useStats } from "../lib/queries"
import { Home, Calendar, ImageIcon, Flame, ChevronDown, ChevronRight, Settings, Book, Dumbbell, Gamepad2, Smile, Scale, Heart, Coffee, Moon, Sun, Zap, Target, Music, Camera, Wallet, Users, CheckSquare, Tv, Salad, Smartphone, type LucideIcon } from "lucide-react"

// Static main navigation only
const navigation: { name: string; id: PageType; icon: typeof Home }[] = [
  { name: "Home", id: "home", icon: Home },
  { name: "Calendar", id: "calendar", icon: Calendar },
  { name: "Assets", id: "assets", icon: ImageIcon },
  { name: "Custom Trackers", id: "custom-trackers", icon: Settings },
]

const trackerIconMap: Record<string, LucideIcon> = {
  flame: Flame,
  book: Book,
  dumbbell: Dumbbell,
  "gamepad-2": Gamepad2,
  smile: Smile,
  scale: Scale,
  heart: Heart,
  coffee: Coffee,
  moon: Moon,
  sun: Sun,
  zap: Zap,
  target: Target,
  music: Music,
  camera: Camera,
  wallet: Wallet,
  users: Users,
  "check-square": CheckSquare,
  tv: Tv,
  salad: Salad,
  smartphone: Smartphone,
}

export function Sidebar() {
  const { activeTracker, setActiveTracker, currentPage, setCurrentPage } = useAppStore()
  const { data: trackers = [] } = useTrackers()
  const { data: stats } = useStats()
  const [trackingExpanded, setTrackingExpanded] = useState(true)

  const isTrackingActive = activeTracker != null

  return (
    <aside className="w-64 border-r border-[hsl(210_18%_22%)] bg-[hsl(210_30%_9%)] flex flex-col h-full">
      {/* Header with Flame Logo */}
      <div className="p-6 border-b border-[hsl(210_18%_22%)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(266_73%_63%/0.2)] flex items-center justify-center">
            <Flame className="w-5 h-5 text-[hsl(266_73%_63%)]" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-[hsl(210_25%_97%)]">HabitFlow</h1>
            <p className="text-xs text-[hsl(210_12%_47%)]">Track your life</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = currentPage === item.id && !isTrackingActive
            return (
              <li key={item.name}>
                <button
                  onClick={() => {
                    setCurrentPage(item.id)
                    setActiveTracker(null)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    "hover:bg-[hsl(210_20%_15%)] group",
                    isActive && "bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_63%)]"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive
                        ? "text-white"
                        : "text-[hsl(210_12%_47%)] group-hover:text-[hsl(210_25%_97%)]"
                    )}
                  />
                  <span className="font-medium">{item.name}</span>
                </button>
              </li>
            )
          })}

          {/* Tracking Section (Collapsible) */}
          <li className="pt-2">
            <button
              onClick={() => setTrackingExpanded(!trackingExpanded)}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                "hover:bg-[hsl(210_20%_15%)] group",
                isTrackingActive && "bg-[hsl(210_20%_15%)]"
              )}
            >
              <div className="flex items-center gap-3">
                <Flame
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isTrackingActive
                      ? "text-[hsl(266_73%_63%)]"
                      : "text-[hsl(210_12%_47%)] group-hover:text-[hsl(210_25%_97%)]"
                  )}
                />
                <span className="font-medium text-[hsl(210_25%_97%)]">Tracking</span>
              </div>
              {trackingExpanded ? (
                <ChevronDown className="w-4 h-4 text-[hsl(210_12%_47%)]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[hsl(210_12%_47%)]" />
              )}
            </button>

            {trackingExpanded && (
              <ul className="mt-1 ml-4 space-y-1 border-l border-[hsl(210_18%_22%)] pl-2">
                {trackers.map((tracker) => {
                  const isActive = activeTracker === tracker.id
                  const Icon = trackerIconMap[tracker.icon ?? ""] ?? Flame
                  return (
                    <li key={tracker.id}>
                      <button
                        onClick={() => {
                          setCurrentPage("home")
                          setActiveTracker(tracker.id)
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                          "hover:bg-[hsl(210_20%_15%)] group",
                          isActive && "bg-[hsl(266_73%_63%/0.1)] text-[hsl(266_73%_63%)] hover:bg-[hsl(266_73%_63%/0.2)]"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 transition-colors shrink-0",
                            isActive ? "text-[hsl(266_73%_63%)]" : "text-[hsl(210_12%_47%)] group-hover:text-[hsl(210_25%_97%)]"
                          )}
                          style={!isActive && tracker.color ? { color: tracker.color } : undefined}
                        />
                        <span className="font-medium truncate">{tracker.name}</span>
                      </button>
                    </li>
                  )
                })}
                {trackers.length === 0 && (
                  <li className="px-3 py-2 text-xs text-[hsl(210_12%_47%)]">
                    No trackers yet. Add one in Custom Trackers.
                  </li>
                )}
              </ul>
            )}
          </li>
        </ul>
      </nav>

      {/* Current Streak Footer */}
      <div className="p-6 border-t border-[hsl(210_18%_22%)]">
        <div className="bg-[hsl(210_20%_15%)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[hsl(210_12%_47%)]">Current Streak</span>
            <Flame className="w-4 h-4 text-[hsl(266_73%_63%)]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold text-[hsl(266_73%_63%)]">{stats?.currentStreak ?? 0}</span>
            <span className="text-sm text-[hsl(210_12%_47%)]">days</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
