"use client"

import { useState } from "react"
import { cn } from "@shared/utils"
import { useAppStore, type PageType } from "@shared/store"
import { useTrackers, useStats } from "@shared/queries"
import { Home, Calendar, ImageIcon, Flame, ChevronDown, ChevronRight, Settings, Book, Dumbbell, Gamepad2, Smile, Scale, Heart, Coffee, Moon, Sun, Zap, Target, Music, Camera, Wallet, Users, CheckSquare, Tv, Salad, Smartphone, FlaskConical, type LucideIcon } from "lucide-react"

const mainNavigation: { name: string; id: PageType; icon: typeof Home }[] = [
  { name: "Home", id: "home", icon: Home },
  { name: "Calendar", id: "calendar", icon: Calendar },
  { name: "Insight Lab", id: "stats", icon: FlaskConical },
]

const managementNavigation: { name: string; id: PageType; icon: typeof Home }[] = [
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

  const renderNavItem = (item: typeof mainNavigation[0]) => {
    const isActive = currentPage === item.id && !isTrackingActive
    
    return (
      <li key={item.name}>
        <button
          onClick={() => {
            setCurrentPage(item.id)
            setActiveTracker(null)
          }}
          className={cn(
            "shell-interactive group flex w-full items-center justify-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left lg:justify-start lg:px-4",
            "hover:border-[hsl(var(--border)/0.7)] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.4)]",
            isActive && "border-[hsl(var(--border)/0.9)] bg-white/8 text-[hsl(var(--foreground))] shadow-sm"
          )}
        >
          <item.icon
            className={cn(
              "h-5 w-5 transition-colors",
              isActive
                ? "text-[hsl(var(--foreground))]"
                : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]"
            )}
          />
          <span className="hidden font-medium lg:inline">{item.name}</span>
        </button>
      </li>
    )
  }

  return (
    <aside className="surface-panel-strong flex h-full min-h-0 w-[var(--dashboard-sidebar-width)] shrink-0 flex-col rounded-r-none border-r border-[hsl(var(--border)/0.68)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]">
      <div className="drag-region shrink-0 px-3 pt-4 lg:px-4">
        <div className="surface-panel-strong no-drag flex items-center justify-center gap-3 rounded-3xl px-2 py-3 lg:justify-start lg:px-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] shadow-lg shadow-primary/10">
            <Flame className="h-5 w-5" />
          </div>
          <div className="hidden min-w-0 lg:block">
            <h1 className="font-display text-lg font-semibold tracking-tight text-[hsl(var(--foreground))]">HabitFlow</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Track the rhythm of your day</p>
          </div>
        </div>
      </div>

      <nav className="no-drag min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 lg:px-4">
        <ul className="space-y-2">
          <li className="hidden px-3 pb-1 pt-2 section-kicker lg:list-item">Navigate</li>
          {mainNavigation.map(renderNavItem)}

          <li className="pt-4">
            <button
              onClick={() => setTrackingExpanded(!trackingExpanded)}
              className={cn(
                "shell-interactive group flex w-full items-center justify-center gap-3 rounded-2xl border border-[hsl(var(--border)/0.55)] px-3 py-3 text-left lg:justify-between lg:px-4",
                "bg-white/[0.04] hover:border-[hsl(var(--border)/0.8)] hover:bg-white/[0.06]",
                isTrackingActive && "border-[hsl(var(--border)/0.9)] bg-white/[0.08]"
              )}
            >
              <div className="flex items-center gap-3">
                <Flame
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isTrackingActive
                      ? "text-[hsl(var(--primary))]"
                      : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]"
                  )}
                />
                <span className="hidden font-medium text-[hsl(var(--foreground))] lg:inline">Tracking</span>
              </div>
              <span className="hidden lg:inline-flex">
                {trackingExpanded ? (
                  <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                )}
              </span>
            </button>

            {trackingExpanded && (
              <ul className="mt-3 space-y-1 border-l-0 border-[hsl(var(--border)/0.7)] pl-0 lg:border-l lg:pl-3">
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
                          "shell-interactive group flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm lg:justify-start",
                          "hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.4)]",
                          isActive && "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]"
                          )}
                          style={!isActive && tracker.color ? { color: tracker.color } : undefined}
                        />
                        <span className="hidden truncate font-medium lg:inline">{tracker.name}</span>
                      </button>
                    </li>
                  )
                })}
                {trackers.length === 0 && (
                  <li className="hidden px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] lg:list-item">
                    No trackers yet. Add one in Custom Trackers.
                  </li>
                )}
              </ul>
            )}
          </li>
        </ul>
      </nav>

      <div className="no-drag shrink-0 border-t border-[hsl(var(--border)/0.7)] p-3 lg:p-4">
        <ul className="mb-0 space-y-2 lg:mb-4">
          <li className="hidden px-3 pb-1 pt-2 section-kicker lg:list-item">Workspace</li>
          {managementNavigation.map(renderNavItem)}
        </ul>

        <div className="surface-panel hidden rounded-3xl p-4 lg:block">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Current streak</span>
            <Flame className="h-4 w-4 text-[hsl(var(--primary))]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold tracking-tight text-[hsl(var(--primary))]">{stats?.currentStreak ?? 0}</span>
            <span className="text-sm text-[hsl(var(--muted-foreground))]">days</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
