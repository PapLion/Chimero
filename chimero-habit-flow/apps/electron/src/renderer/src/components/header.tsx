"use client"

import { useAppStore } from "../lib/store"
import { Bell, Search } from "lucide-react"
import { Input } from "@packages/ui/input"

export function Header() {
  const { activeTracker, trackers } = useAppStore()

  const activeTrackerData = activeTracker
    ? trackers.find((t) => t.id === activeTracker)
    : null

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {activeTrackerData ? activeTrackerData.name : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-64 pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-sm font-medium text-primary">U</span>
        </div>
      </div>
    </header>
  )
}
