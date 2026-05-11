"use client"

import React, { useState, useMemo, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useTrackers, useEntries } from "@shared/queries"
import { cn } from "@shared/utils"
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
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
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
        <div className="surface-panel-strong flex items-center justify-between gap-4 rounded-[1.5rem] p-5">
          <div>
            <h1 className="page-title">Timeline</h1>
            <p className="page-subtitle">Track your activities over time</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousYear}
              className="surface-chip p-2 text-[hsl(var(--foreground))] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.78)] hover:bg-[hsl(var(--card)/0.94)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-[100px] text-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={selectedYear}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block text-xl font-display font-bold text-[hsl(var(--foreground))]"
                >
                  {selectedYear}
                </motion.span>
              </AnimatePresence>
            </div>
            <button
              onClick={goToNextYear}
              disabled={selectedYear >= currentYear}
              className={cn(
                "surface-chip p-2 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
                selectedYear >= currentYear
                  ? "cursor-not-allowed opacity-50"
                  : "text-[hsl(var(--foreground))] hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.78)] hover:bg-[hsl(var(--card)/0.94)]"
              )}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Tracker toggles - solo se renderiza cuando showHeader=true (modo standalone) */}
      {showHeader && allTrackersWithEntries.length > 0 && (
        <div className="surface-panel flex flex-wrap items-center gap-3 rounded-[1.25rem] p-4">
          <Eye className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Trackers:</span>
          {allTrackersWithEntries.map((tracker) => {
            const isHidden = hiddenTrackers.has(tracker.id)
            return (
              <button
                key={tracker.id}
                onClick={() => toggleTracker(tracker.id)}
                className={cn(
                  "surface-chip flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.3)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
                  isHidden
                    ? "border-[hsl(var(--border)/0.68)] bg-[hsl(var(--card)/0.7)] text-[hsl(var(--muted-foreground))] opacity-60"
                    : "border-[hsl(var(--border)/0.68)] bg-[hsl(var(--card)/0.9)] text-[hsl(var(--foreground))] shadow-[0_8px_20px_rgba(2,6,23,0.08)] hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.82)] hover:bg-[hsl(var(--card)/0.96)] hover:shadow-[0_10px_22px_rgba(2,6,23,0.12)]"
                )}
                style={
                  !isHidden && tracker.color
                    ? { backgroundColor: `${tracker.color}14`, borderColor: `${tracker.color}44`, color: tracker.color }
                    : undefined
                }
                aria-pressed={!isHidden}
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

      <AnimatePresence mode="wait" initial={false}>
        {!hasEntriesThisYear ? (
          <motion.div
            key={`empty-${selectedYear}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="surface-card rounded-2xl py-12 text-center"
          >
            <p className="text-[hsl(var(--muted-foreground))]">No entries recorded for {selectedYear}</p>
          </motion.div>
        ) : allHidden ? (
          <motion.div
            key={`hidden-${selectedYear}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="surface-card rounded-2xl py-12 text-center"
          >
            <p className="text-[hsl(var(--muted-foreground))]">Select at least one tracker to view the timeline</p>
          </motion.div>
        ) : (
          <motion.div
            key={`grid-${selectedYear}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="surface-panel-strong rounded-[1.5rem] p-4 overflow-x-auto"
          >
            <div className="min-w-[800px]">
              <div className="mb-2 ml-[150px] flex">
                {months.map((month) => (
                  <div
                    key={month}
                    className="flex-1 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]"
                  >
                    {month}
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                {trackersWithEntries.map((tracker) => {
                  const monthMap = entriesByTrackerMonth.get(tracker.id)
                  const trackerColor = tracker.color || "hsl(266_73%_63%)"

                  return (
                    <div key={tracker.id} className="flex items-center">
                      <div className="w-[150px] flex-shrink-0 pr-4">
                        <span
                          className="block truncate text-sm font-medium text-[hsl(var(--foreground))]"
                          title={tracker.name}
                        >
                          {tracker.name}
                        </span>
                      </div>

                      <div className="flex flex-1">
                        {months.map((_, monthIndex) => {
                          const entryCount = monthMap?.get(monthIndex) || 0
                          const hasEntries = entryCount > 0

                          return (
                            <div
                              key={monthIndex}
                              className={cn(
                                "h-10 flex-1 overflow-hidden rounded-md border border-[hsl(var(--border)/0.68)] transition-all duration-200",
                                hasEntries
                                  ? "cursor-default hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.82)] hover:shadow-[0_10px_20px_rgba(2,6,23,0.12)]"
                                  : "bg-[hsl(var(--card)/0.74)]"
                              )}
                              style={hasEntries ? { backgroundColor: trackerColor } : undefined}
                              onMouseEnter={(e) =>
                                hasEntries &&
                                handleCellHover(tracker.name, months[monthIndex], entryCount, e)
                              }
                              onMouseLeave={handleCellLeave}
                            >
                              {hasEntries && (
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="text-xs font-bold text-white drop-shadow-sm">
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
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tooltip && (
          <motion.div
            key="timeline-tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="surface-card fixed z-50 pointer-events-none rounded-xl px-3 py-2"
            style={{
              left: tooltip.x,
              top: tooltip.y - 8,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">{tooltip.trackerName}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {tooltip.month} — {tooltip.entryCount} {tooltip.entryCount === 1 ? "entry" : "entries"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
