"use client"

import { useState } from "react"
import { cn } from "../lib/utils"
import { useAppStore, type PageType } from "../lib/store"
import { useTrackers, useStats } from "../lib/queries"
import { Home, Calendar, ImageIcon, Flame, ChevronDown, ChevronRight, Scale, Dumbbell, Salad, CheckSquare, Tv, Book, Gamepad2, Smartphone, Smile, Users, Settings } from "lucide-react"
import { CustomTrackersSection } from "./CustomTrackersSection"

// Main navigation items
const navigation: { name: string; id: PageType; icon: typeof Home }[] = [
  { name: "Home", id: "home", icon: Home },
  { name: "Calendar", id: "calendar", icon: Calendar },
  { name: "Assets", id: "assets", icon: ImageIcon },
  { name: "Custom Trackers", id: "custom-trackers", icon: Settings },
]

// Tracking sub-navigation items
const trackingNavigation = [
  { name: "Weight", id: "weight", icon: Scale },
  { name: "Exercise", id: "exercise", icon: Dumbbell },
  { name: "Diet", id: "diet", icon: Salad },
  { name: "Tasks", id: "tasks", icon: CheckSquare },
  { name: "Mood", id: "mood", icon: Smile },
  { name: "Social", id: "social", icon: Users },
  { name: "Books", id: "books", icon: Book },
  { name: "TV Shows", id: "tv", icon: Tv },
  { name: "Gaming", id: "gaming", icon: Gamepad2 },
  { name: "Media", id: "media", icon: Smartphone },
]

export function Sidebar() {
  const { setActiveTracker, currentPage, setCurrentPage } = useAppStore()
  const { data: trackers = [] } = useTrackers()
  const { data: stats } = useStats()
  const [activeTrackingItem, setActiveTrackingItem] = useState<string | null>(null)

  const trackerByName = Object.fromEntries(trackers.map((t) => [t.name.toLowerCase().replace(/\s+/g, ""), t.id])) as Record<string, number>
  const [trackingExpanded, setTrackingExpanded] = useState(true)

  const isTrackingActive = activeTrackingItem !== null

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
                    setActiveTrackingItem(null)
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
                {trackingNavigation.map((item) => {
                  const isActive = activeTrackingItem === item.id
                  return (
                    <li key={item.name}>
                      <button
                        onClick={() => {
                          setActiveTrackingItem(item.id)
                          setCurrentPage("home")
                          const key = item.name.toLowerCase().replace(/\s+/g, "")
                          const id = trackerByName[item.id] ?? trackerByName[key] ?? null
                          setActiveTracker(id ?? null)
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                          "hover:bg-[hsl(210_20%_15%)] group",
                          isActive && "bg-[hsl(266_73%_63%/0.1)] text-[hsl(266_73%_63%)] hover:bg-[hsl(266_73%_63%/0.2)]"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "w-4 h-4 transition-colors",
                            isActive
                              ? "text-[hsl(266_73%_63%)]"
                              : "text-[hsl(210_12%_47%)] group-hover:text-[hsl(210_25%_97%)]"
                          )}
                        />
                        <span className="font-medium">{item.name}</span>
                      </button>
                    </li>
                  )
                })}

                {/* Custom Trackers Section */}
                <CustomTrackersSection 
                  activeTrackingItem={activeTrackingItem}
                  setActiveTrackingItem={setActiveTrackingItem}
                  setCurrentPage={setCurrentPage}
                  setActiveTracker={setActiveTracker}
                />
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
