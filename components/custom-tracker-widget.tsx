"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, TrendingUp, Target, BarChart3 } from "lucide-react"
import type { CustomTrackerConfig } from "@/types"
import { useAppData } from "@/contexts/app-data-context"
import Link from "next/link"
import * as Icons from "lucide-react"
import { cn } from "@/lib/utils"

interface CustomTrackerWidgetProps {
  tracker: CustomTrackerConfig
  className?: string
}

export function CustomTrackerWidget({ tracker, className }: CustomTrackerWidgetProps) {
  const { getTrackerEntries } = useAppData()
  const entries = getTrackerEntries(tracker.id)

  // Get the icon component dynamically
  const IconComponent = tracker.icon
    ? (Icons[tracker.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>)
    : BarChart3

  // Calculate stats based on entries
  const todayEntries = entries.filter((entry) => {
    const today = new Date()
    const entryDate = new Date(entry.timestamp)
    return entryDate.toDateString() === today.toDateString()
  })

  // Get latest value for the goal field
  const latestEntry = entries[entries.length - 1]
  const currentValue = tracker.goalField && latestEntry ? (latestEntry.data[tracker.goalField] as number) : 0

  const goalProgress = tracker.hasGoal && tracker.goalValue ? (currentValue / tracker.goalValue) * 100 : 0

  return (
    <Card className={cn("hover:shadow-lg transition-shadow border-2 border-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: tracker.color ? `${tracker.color}20` : "hsl(var(--primary) / 0.1)" }}
          >
            <IconComponent className="w-4 h-4" style={{ color: tracker.color || "hsl(var(--primary))" }} />
          </div>
          <span>{tracker.name}</span>
        </CardTitle>
        <Link href={`/tracking/custom/${tracker.id}`}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tracker.hasGoal && tracker.goalValue && (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{currentValue}</span>
                <span className="text-sm text-muted-foreground">/ {tracker.goalValue}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(goalProgress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${Math.min(goalProgress, 100)}%`,
                      backgroundColor: tracker.color || "hsl(var(--primary))",
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {!tracker.hasGoal && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{entries.length}</span>
              <span className="text-sm text-muted-foreground">total entries</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{todayEntries.length} today</span>
            </div>
            {tracker.goalType && (
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span>{tracker.goalType}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
