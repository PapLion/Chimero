"use client"

import { cn } from "../lib/utils"
import { type PageType } from "../lib/store"
import { useTrackers } from "../lib/queries"
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
        <span className="text-[10px] uppercase tracking-wider text-[hsl(210_12%_47%)] font-medium">
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
              onClick={() => {
                setActiveTrackingItem(`custom-${tracker.id}`)
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
                  "w-4 h-4 transition-colors",
                  isActive ? "text-[hsl(266_73%_63%)]" : "group-hover:text-[hsl(210_25%_97%)]"
                )}
                style={{ color: isActive ? undefined : tracker.color }}
              />
              <span className="font-medium">{tracker.name}</span>
            </button>
          </li>
        )
      })}
    </>
  )
}
