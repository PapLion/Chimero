"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Calendar,
  ImageIcon,
  Flame,
  ChevronDown,
  ChevronRight,
  Weight,
  Dumbbell,
  Salad,
  CheckSquare,
  Tv,
  Book,
  Gamepad2,
  Smartphone,
  Smile,
  Users,
  SettingsIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { useAppData } from "@/contexts/app-data-context"
import * as Icons from "lucide-react"

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Assets", href: "/assets", icon: ImageIcon },
  { name: "Custom Trackers", href: "/trackers", icon: SettingsIcon },
]

const trackingNavigation = [
  { name: "Weight", href: "/tracking/weight", icon: Weight },
  { name: "Exercise", href: "/tracking/exercise", icon: Dumbbell },
  { name: "Diet", href: "/tracking/diet", icon: Salad },
  { name: "Tasks", href: "/tracking/tasks", icon: CheckSquare },
  { name: "Mood", href: "/tracking/mood", icon: Smile },
  { name: "Social", href: "/tracking/social", icon: Users },
  { name: "Books", href: "/tracking/books", icon: Book },
  { name: "TV Shows", href: "/tracking/tv", icon: Tv },
  { name: "Gaming", href: "/tracking/gaming", icon: Gamepad2 },
  { name: "Media", href: "/tracking/media", icon: Smartphone },
]

export function Sidebar() {
  const pathname = usePathname()
  const { customTrackers } = useAppData()
  const [trackingExpanded, setTrackingExpanded] = useState(pathname.startsWith("/tracking"))

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-sidebar-foreground">HabitFlow</h1>
            <p className="text-xs text-muted-foreground">Track your life</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    "hover:bg-sidebar-accent group",
                    isActive && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-sidebar-foreground",
                    )}
                  />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            )
          })}

          <li className="pt-2">
            <button
              onClick={() => setTrackingExpanded(!trackingExpanded)}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                "hover:bg-sidebar-accent group",
                pathname.startsWith("/tracking") && "bg-sidebar-accent",
              )}
            >
              <div className="flex items-center gap-3">
                <Flame
                  className={cn(
                    "w-5 h-5 transition-colors",
                    pathname.startsWith("/tracking")
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-sidebar-foreground",
                  )}
                />
                <span className="font-medium text-sidebar-foreground">Tracking</span>
              </div>
              {trackingExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {trackingExpanded && (
              <ul className="mt-1 ml-4 space-y-1 border-l border-sidebar-border pl-2">
                {trackingNavigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                          "hover:bg-sidebar-accent group",
                          isActive && "bg-primary/10 text-primary hover:bg-primary/20",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "w-4 h-4 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground",
                          )}
                        />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    </li>
                  )
                })}

                {customTrackers.length > 0 && (
                  <>
                    <li className="my-2 border-t border-sidebar-border pt-2">
                      <span className="px-3 py-1 text-xs font-medium text-muted-foreground">Custom Trackers</span>
                    </li>
                    {customTrackers.map((tracker) => {
                      const isActive = pathname === `/tracking/custom/${tracker.id}`
                      const IconComponent = tracker.icon
                        ? (Icons[tracker.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>)
                        : Icons.BarChart3

                      return (
                        <li key={tracker.id}>
                          <Link
                            href={`/tracking/custom/${tracker.id}`}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                              "hover:bg-sidebar-accent group",
                              isActive && "bg-primary/10 text-primary hover:bg-primary/20",
                            )}
                          >
                            <IconComponent
                              className={cn(
                                "w-4 h-4 transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground",
                              )}
                              style={isActive ? { color: tracker.color } : undefined}
                            />
                            <span className="font-medium truncate">{tracker.name}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </>
                )}
              </ul>
            )}
          </li>
        </ul>
      </nav>

      <div className="p-6 border-t border-sidebar-border">
        <div className="bg-sidebar-accent rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Current Streak</span>
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold text-primary">14</span>
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
