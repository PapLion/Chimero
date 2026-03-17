"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useTrackers, useEntries } from "../lib/queries"
import { cn } from "../lib/utils"
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react"

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export interface TimelineViewProps {
  year?: number
  showHeader?: boolean
  hiddenTrackers?: Set<number>
}

interface TooltipData {
  trackerName: string
  month: string
  entryCount: number
  x: number
  y: number
}

export function TimelineView({ year: initialYear, showHeader = true, hiddenTrackers: externalHiddenTrackers }: TimelineViewProps) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(initialYear ?? currentYear)
  const [internalHiddenTrackers, setInternalHiddenTrackers] = useState<Set<number>>(new Set())
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  // Usar el externo si viene, si no usar el interno
  const hiddenTrackers = externalHiddenTrackers ?? internalHiddenTrackers

  // Sync internal selectedYear with prop year when showHeader is false (controlled mode)
  useEffect(() => {
    if (!showHeader && initialYear !== undefined) {
      setSelectedYear(initialYear)
    }
  }, [initialYear, showHeader])

  const { data: trackers = [] } = useTrackers()
  const { data: entries = [] } = useEntries()

  // Filter entries for the selected year and group by tracker + month
  const entriesByTrackerMonth = useMemo(() => {
    const map = new Map<number, Map<number, number>>() // trackerId -> month -> count

    entries.forEach((entry) => {
      const entryDate = new Date(entry.timestamp)
      const entryYear = entryDate.getFullYear()

      if (entryYear !== selectedYear) return

      const month = entryDate.getMonth()
      const trackerId = entry.trackerId

      if (!map.has(trackerId)) {
        map.set(trackerId, new Map())
      }
      const monthMap = map.get(trackerId)!
      monthMap.set(month, (monthMap.get(month) || 0) + 1)
    })

    return map
  }, [entries, selectedYear])

  // Get trackers that have entries in the selected year
  const trackersWithEntries = useMemo(() => {
    return trackers.filter((tracker) => {
      const monthMap = entriesByTrackerMonth.get(tracker.id)
      if (!monthMap) return false
      let totalEntries = 0
      for (const count of monthMap.values()) {
        totalEntries += count
      }
      return totalEntries > 0 && !hiddenTrackers.has(tracker.id)
    })
  }, [trackers, entriesByTrackerMonth, hiddenTrackers])

  // Get all trackers with entries (for toggles) - includes hidden ones
  const allTrackersWithEntries = useMemo(() => {
    return trackers.filter((tracker) => {
      const monthMap = entriesByTrackerMonth.get(tracker.id)
      if (!monthMap) return false
      let totalEntries = 0
      for (const count of monthMap.values()) {
        totalEntries += count
      }
      return totalEntries > 0
    })
  }, [trackers, entriesByTrackerMonth])

  const toggleTracker = (trackerId: number) => {
    // Solo funciona con estado interno (cuando showHeader=true o no hay externalHiddenTrackers)
    setInternalHiddenTrackers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(trackerId)) {
        newSet.delete(trackerId)
      } else {
        newSet.add(trackerId)
      }
      return newSet
    })
  }

  const goToPreviousYear = () => {
    setSelectedYear((y) => y - 1)
  }

  const goToNextYear = () => {
    if (selectedYear < currentYear) {
      setSelectedYear((y) => y + 1)
    }
  }

  const handleCellHover = (
    trackerName: string,
    month: string,
    entryCount: number,
    event: React.MouseEvent
  ) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    setTooltip({
      trackerName,
      month,
      entryCount,
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
  }

  const handleCellLeave = () => {
    setTooltip(null)
  }

  const hasEntriesThisYear = allTrackersWithEntries.length > 0
  const allHidden = allTrackersWithEntries.length > 0 && 
    allTrackersWithEntries.every((t) => hiddenTrackers.has(t.id))

  return (
    <div className="space-y-6">
      {/* Header with year selector - only when showHeader is true */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-[hsl(210_25%_97%)]">Timeline</h1>
            <p className="text-[hsl(210_12%_47%)]">Track your activities over time</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousYear}
              className="p-2 rounded-lg bg-[hsl(210_20%_15%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(266_73%_63%)] hover:text-white transition-colors border border-[hsl(210_18%_22%)]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-[100px] text-center">
              <span className="text-xl font-display font-bold text-[hsl(210_25%_97%)]">
                {selectedYear}
              </span>
            </div>
            <button
              onClick={goToNextYear}
              disabled={selectedYear >= currentYear}
              className={cn(
                "p-2 rounded-lg border transition-colors border-[hsl(210_18%_22%)]",
                selectedYear >= currentYear
                  ? "bg-[hsl(210_20%_15%)] text-[hsl(210_12%_47%)] cursor-not-allowed"
                  : "bg-[hsl(210_20%_15%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(266_73%_63%)] hover:text-white"
              )}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Tracker toggles - solo se renderiza cuando showHeader=true (modo standalone) */}
      {showHeader && allTrackersWithEntries.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <Eye className="w-4 h-4 text-[hsl(210_12%_47%)]" />
          <span className="text-sm text-[hsl(210_12%_47%)]">Trackers:</span>
          {allTrackersWithEntries.map((tracker) => {
            const isHidden = hiddenTrackers.has(tracker.id)
            return (
              <button
                key={tracker.id}
                onClick={() => toggleTracker(tracker.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border flex items-center gap-1.5",
                  isHidden
                    ? "bg-transparent text-[hsl(210_12%_47%)] border-[hsl(210_18%_22%)] opacity-50"
                    : "bg-[hsl(266_73%_63%)] text-white border-[hsl(266_73%_63%)]"
                )}
                style={
                  !isHidden && tracker.color
                    ? { backgroundColor: tracker.color, borderColor: tracker.color }
                    : undefined
                }
              >
                {tracker.name}
                {isHidden ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Empty states */}
      {!hasEntriesThisYear && (
        <div className="text-center py-12 bg-[hsl(210_25%_11%)] rounded-2xl border border-[hsl(210_18%_22%)]">
          <p className="text-[hsl(210_12%_47%)]">No entries recorded for {selectedYear}</p>
        </div>
      )}

      {hasEntriesThisYear && allHidden && (
        <div className="text-center py-12 bg-[hsl(210_25%_11%)] rounded-2xl border border-[hsl(210_18%_22%)]">
          <p className="text-[hsl(210_12%_47%)]">Select at least one tracker to view the timeline</p>
        </div>
      )}

      {/* Timeline grid */}
      {hasEntriesThisYear && !allHidden && (
        <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-4 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Month headers */}
            <div className="flex mb-2 ml-[150px]">
              {months.map((month) => (
                <div
                  key={month}
                  className="flex-1 text-center text-xs font-medium text-[hsl(210_12%_47%)]"
                >
                  {month}
                </div>
              ))}
            </div>

            {/* Tracker rows */}
            <div className="space-y-1">
              {trackersWithEntries.map((tracker) => {
                const monthMap = entriesByTrackerMonth.get(tracker.id)
                const trackerColor = tracker.color || "hsl(266_73%_63%)"

                return (
                  <div key={tracker.id} className="flex items-center">
                    {/* Tracker name */}
                    <div className="w-[150px] flex-shrink-0 pr-4">
                      <span
                        className="text-sm font-medium text-[hsl(210_25%_97%)] truncate block"
                        title={tracker.name}
                      >
                        {tracker.name}
                      </span>
                    </div>

                    {/* Month cells */}
                    <div className="flex-1 flex">
                      {months.map((_, monthIndex) => {
                        const entryCount = monthMap?.get(monthIndex) || 0
                        const hasEntries = entryCount > 0

                        return (
                          <div
                            key={monthIndex}
                            className={cn(
                              "flex-1 h-10 border border-[hsl(210_18%_22%)] transition-all duration-200",
                              hasEntries
                                ? "cursor-pointer hover:opacity-80"
                                : "bg-transparent"
                            )}
                            style={
                              hasEntries
                                ? { backgroundColor: trackerColor }
                                : { backgroundColor: "transparent" }
                            }
                            onMouseEnter={(e) =>
                              hasEntries &&
                              handleCellHover(
                                tracker.name,
                                months[monthIndex],
                                entryCount,
                                e
                              )
                            }
                            onMouseLeave={handleCellLeave}
                          >
                            {hasEntries && (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-xs font-bold text-white drop-shadow-md">
                                  {entryCount > 1 ? entryCount : ""}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="text-sm font-medium text-[hsl(210_25%_97%)]">{tooltip.trackerName}</p>
          <p className="text-xs text-[hsl(210_12%_47%)]">
            {tooltip.month} — {tooltip.entryCount} {tooltip.entryCount === 1 ? "entry" : "entries"}
          </p>
        </div>
      )}
    </div>
  )
}
