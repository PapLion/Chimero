"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardHeader() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const goToPreviousDay = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() - 1)
      return newDate
    })
  }

  const goToNextDay = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + 1)
      return newDate
    })
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  const isToday = currentDate.toDateString() === new Date().toDateString()

  return (
    <div className="flex items-center justify-between">
      <div className="hidden lg:flex items-center gap-6 mx-0 ml-7">
        <div className="text-center">
          <div className="text-2xl font-display font-bold text-accent">8</div>
          <div className="text-xs text-muted-foreground">Activities</div>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center">
          <div className="text-2xl font-display font-bold text-primary">12h</div>
          <div className="text-xs text-muted-foreground">Tracked</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goToPreviousDay} className="rounded-full hover:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">{formatDate(currentDate)}</h2>
          {isToday && <p className="text-sm text-muted-foreground mt-1">Today's Overview</p>}
        </div>

        <Button variant="ghost" size="icon" onClick={goToNextDay} className="rounded-full hover:bg-muted">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
