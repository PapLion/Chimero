import type { Entry, Tracker, TrackerAggregation } from "@packages/db"
import { dateToDateStrLocal, type DateStr } from "shared"

export function getTrackerAggregation(tracker: Tracker): TrackerAggregation {
  const configured = (tracker.config?.aggregation ?? null) as TrackerAggregation | null
  if (configured) return configured

  const trackerNameLower = tracker.name.toLowerCase()
  const isWeightTracker = trackerNameLower.includes("weight") || trackerNameLower.includes("peso")
  const isRatingType = tracker.type === "rating"

  if (isWeightTracker || isRatingType) return "last"
  return "sum"
}

export function filterEntriesForDateStr(entries: Entry[], dateStr: DateStr): Entry[] {
  return entries.filter((e) => e.dateStr === dateStr || dateToDateStrLocal(new Date(e.timestamp)) === dateStr)
}

export function aggregateEntriesForDateStr(entries: Entry[], tracker: Tracker, dateStr: DateStr): number | null {
  const dayEntries = filterEntriesForDateStr(entries, dateStr).sort((a, b) => a.timestamp - b.timestamp)
  if (dayEntries.length === 0) return null

  const agg = getTrackerAggregation(tracker)
  switch (agg) {
    case "last":
      return dayEntries[dayEntries.length - 1]?.value ?? null
    case "avg": {
      const vals = dayEntries.map((e) => e.value).filter((v): v is number => typeof v === "number")
      if (vals.length === 0) return null
      return vals.reduce((a, b) => a + b, 0) / vals.length
    }
    case "count":
      return dayEntries.length
    case "sum":
    default:
      return dayEntries.reduce((acc, e) => acc + (e.value ?? 0), 0)
  }
}

