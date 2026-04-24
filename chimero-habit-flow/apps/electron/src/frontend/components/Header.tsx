"use client"

import { useAppStore } from "../lib/store"
import { useTrackers, useStats } from "../lib/queries"
import { Bell, ChevronLeft, ChevronRight, Home } from "lucide-react"
import { Button } from "@packages/ui/button"

export function Header() {
  const { activeTracker, toggleNotifications, selectedDate, goToPreviousDay, goToNextDay, goToToday } = useAppStore()
  const { data: trackers = [] } = useTrackers()
  const { data: stats } = useStats()
  const unreadCount = 0

  const activeTrackerData = activeTracker
    ? trackers.find((t) => t.id === activeTracker)
    : null

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  return (
    <header className="drag-region flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm">
      {/* Left: Stats Block */}
      <div className="no-drag hidden lg:flex items-center gap-6">
        <div className="text-center">
          <div className="text-2xl font-display font-bold text-accent">{stats?.totalActivities ?? 0}</div>
          <div className="text-xs text-muted-foreground">Activities</div>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center">
          <div className="text-2xl font-display font-bold text-primary">{stats?.totalEntriesMonth ?? 0}</div>
          <div className="text-xs text-muted-foreground">Entries this month</div>
        </div>
      </div>

      {/* Center: Date Navigation */}
      <div className="no-drag flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goToPreviousDay} 
          className="rounded-full hover:bg-muted"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="text-center">
          <h2 className="text-xl md:text-2xl font-display font-bold tracking-tight text-foreground">
            {activeTrackerData ? activeTrackerData.name : formatDate(selectedDate)}
          </h2>
          {isToday && !activeTrackerData && (
            <p className="text-sm text-muted-foreground mt-0.5">Today&apos;s Overview</p>
          )}
          {activeTrackerData && (
            <p className="text-sm text-muted-foreground mt-0.5">{formatDate(selectedDate)}</p>
          )}
          {!isToday && !activeTrackerData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="mt-1 h-6 text-xs text-muted-foreground hover:text-foreground"
            >
              <Home className="w-3 h-3 mr-1" />
              Back to Today
            </Button>
          )}
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={goToNextDay} 
          className="rounded-full hover:bg-muted"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Right: Notifications */}
      <button 
        onClick={toggleNotifications}
        className="no-drag relative p-2 rounded-full hover:bg-muted transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
        )}
      </button>
    </header>
  )
}
