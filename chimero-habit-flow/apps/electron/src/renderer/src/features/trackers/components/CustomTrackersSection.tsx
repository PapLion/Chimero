"use client"

import { cn } from "@shared/utils"
import { type PageType } from "@shared/store"
import { useTrackers } from "@shared/queries"
import { Flame, Book, Dumbbell, Gamepad2, Smile, Scale, Heart, Coffee, Moon, Sun, Zap, Target, Music, Camera, Wallet, Users, CheckSquare, Tv, Salad, Smartphone, LucideIcon } from "lucide-react"

// Icon mapping for custom trackers
const iconMap: Record<string, LucideIcon> = {
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

interface CustomTrackersSectionProps {
  activeTrackingItem: string | null
  setActiveTrackingItem: (item: string | null) => void
  setCurrentPage: (page: PageType) => void
  setActiveTracker: (id: number | null) => void
}

export function CustomTrackersSection({
  activeTrackingItem,
  setActiveTrackingItem,
  setCurrentPage,
  setActiveTracker,
}: CustomTrackersSectionProps) {
  const { data: trackers = [] } = useTrackers()
  const customTrackers = trackers.filter((t) => t.isCustom)

  if (customTrackers.length === 0) {
    return null
  }

  return (
    <>
      {/* Separator */}
      <li className="py-2">
        <div className="border-t border-[hsl(210_18%_22%)] -ml-2" />
      </li>
      
      {/* Label */}
      <li className="px-3 py-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(210_12%_52%)]">
          Custom Trackers
        </span>
      </li>

      {/* Custom Tracker Items */}
      {customTrackers.map((tracker) => {
        const Icon = iconMap[tracker.icon ?? ""] || Flame
        const isActive = activeTrackingItem === `custom-${tracker.id}`

        return (
          <li key={tracker.id}>
            <button
              type="button"
              onClick={() => {
                setActiveTrackingItem(`custom-${tracker.id}`)
                setCurrentPage("home")
                setActiveTracker(tracker.id)
              }}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-left transition-all duration-200 ease-out",
                "hover:bg-[hsl(210_20%_15%)] hover:text-[hsl(210_25%_97%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(266_73%_63%/0.35)] focus-visible:ring-offset-0",
                isActive
                  ? "bg-[hsl(266_73%_63%/0.08)] text-[hsl(266_73%_63%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  : "text-[hsl(210_20%_71%)]"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-1 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition-all duration-200",
                  isActive ? "bg-[hsl(266_73%_63%)] opacity-100" : "bg-transparent opacity-0 group-hover:opacity-30",
                )}
              />
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors duration-200",
                  isActive
                    ? "text-[hsl(266_73%_63%)]"
                    : "text-[hsl(210_14%_58%)] group-hover:text-[hsl(210_25%_97%)]"
                )}
                style={{ color: isActive ? undefined : tracker.color ?? undefined }}
              />
              <span className="min-w-0 truncate font-medium">{tracker.name}</span>
            </button>
          </li>
        )
      })}
    </>
  )
}
