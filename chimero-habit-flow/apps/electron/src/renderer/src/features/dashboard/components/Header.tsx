"use client"

import { useEffect, useState } from "react"
import { cn } from "@shared/utils"
import { useAppStore } from "@shared/store"
import { useTrackers, useStats } from "@shared/queries"
import { Bell, ChevronLeft, ChevronRight, Home } from "lucide-react"
import { Button } from "@packages/ui/button"

type DateMotion = "previous" | "next" | "today"

export function Header() {
  const { activeTracker, toggleNotifications, selectedDate, goToPreviousDay, goToNextDay, goToToday } = useAppStore()
  const { data: trackers = [] } = useTrackers()
  const { data: stats } = useStats()
  const [dateMotion, setDateMotion] = useState<DateMotion>("today")
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
  const dateKey = selectedDate.toDateString()
  const dateMotionClass = cn(
    "will-change-transform",
    dateMotion === "previous" && "animate-in fade-in-0 slide-in-from-left-2 zoom-in-95 duration-150 ease-out",
    dateMotion === "next" && "animate-in fade-in-0 slide-in-from-right-2 zoom-in-95 duration-150 ease-out",
    dateMotion === "today" && "animate-in fade-in-0 zoom-in-95 duration-140 ease-out"
  )

  const handlePreviousDay = () => {
    setDateMotion("previous")
    goToPreviousDay()
  }

  const handleNextDay = () => {
    setDateMotion("next")
    goToNextDay()
  }

  const handleGoToToday = () => {
    setDateMotion("today")
    goToToday()
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => setDateMotion("today"), 160)
    return () => window.clearTimeout(timeout)
  }, [dateKey])

  return (
    <header className="surface-panel-strong drag-region grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-l-none border-x-0 border-t-0 px-4 py-3 sm:px-5 min-[1800px]:grid-cols-[minmax(0,1fr)_minmax(0,440px)_minmax(0,1fr)] min-[1800px]:gap-4 min-[1800px]:px-6 min-[1800px]:py-4">
      <div className="no-drag hidden min-w-0 items-stretch gap-3 justify-self-start min-[1800px]:flex min-[1800px]:max-w-full">
        <div className="metric-chip min-w-0 flex-1 basis-[114px] px-4 py-3 text-center">
          <div className="section-kicker">Activities</div>
          <div className="mt-1 font-display text-2xl font-semibold tracking-tight text-[hsl(var(--primary))]">
            {stats?.totalActivities ?? 0}
          </div>
        </div>
        <div className="metric-chip min-w-0 flex-1 basis-[142px] px-4 py-3 text-center">
          <div className="section-kicker">This month</div>
          <div className="mt-1 font-display text-2xl font-semibold tracking-tight text-[hsl(var(--accent))]">
            {stats?.totalEntriesMonth ?? 0}
          </div>
        </div>
      </div>

      <div className="no-drag flex w-full min-w-0 items-center justify-center gap-2 justify-self-stretch sm:gap-3 min-[1800px]:justify-self-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousDay}
          className="shell-interactive h-10 w-10 rounded-full border border-[hsl(var(--border)/0.7)] bg-white/5 text-[hsl(var(--foreground))] hover:border-[hsl(var(--border)/0.82)] hover:bg-white/8"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="surface-chip min-w-0 flex-1 max-w-[32rem] justify-center px-3 py-2.5 text-center sm:px-4 sm:py-3 min-[1800px]:flex-none">
          <div className="min-w-0 max-w-full" aria-live="polite" aria-atomic="true">
            {activeTrackerData ? (
              <>
                <h2 className="truncate font-display text-base font-semibold tracking-tight text-[hsl(var(--foreground))] sm:text-[1.15rem] md:text-[1.25rem] min-[1800px]:text-[1.35rem]">
                  {activeTrackerData.name}
                </h2>
                <p key={dateKey} className={cn("mt-0.5 truncate text-sm text-[hsl(var(--muted-foreground))]", dateMotionClass)}>
                  {formatDate(selectedDate)}
                </p>
              </>
            ) : (
              <div key={dateKey} className={cn("min-w-0", dateMotionClass)}>
                <h2 className="truncate font-display text-base font-semibold tracking-tight text-[hsl(var(--foreground))] sm:text-[1.15rem] md:text-[1.25rem] min-[1800px]:text-[1.35rem]">
                  {formatDate(selectedDate)}
                </h2>
                {isToday ? (
                  <p className="mt-0.5 truncate text-xs text-[hsl(var(--muted-foreground))] sm:text-sm">A calm, focused view of today</p>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGoToToday}
                    className="shell-interactive mt-1 h-7 rounded-full px-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  >
                    <Home className="mr-1 h-3 w-3" />
                    Back to Today
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextDay}
          className="shell-interactive h-10 w-10 rounded-full border border-[hsl(var(--border)/0.7)] bg-white/5 text-[hsl(var(--foreground))] hover:border-[hsl(var(--border)/0.82)] hover:bg-white/8"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <button
        onClick={toggleNotifications}
        className="shell-interactive no-drag relative flex h-11 w-11 items-center justify-center justify-self-end rounded-full border border-[hsl(var(--border)/0.7)] bg-white/5 text-[hsl(var(--muted-foreground))] shadow-sm hover:border-[hsl(var(--border)/0.82)] hover:bg-white/8 hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.4)]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_12px_hsl(var(--primary)/0.45)]" />
        )}
      </button>
    </header>
  )
}
