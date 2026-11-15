import type { Entry, Tracker } from '@contracts/contracts'
import { api } from '@/lib/api'
import { useData } from '@/lib/queries'
import { identityOf, kindOf } from '@/lib/trackers'

/** Every entry recorded on one day, newest first. */
export function useDayEntries(date: string) {
  return useData(['entries', 'day', date], () => api.getEntries({ from: date, to: date, limit: 1000 }))
}

export function useSeries(metricIds: string[], from: string, to: string) {
  const ids = [...metricIds].sort()
  return useData(['series', from, to, ids.join(',')], () => api.getSeries({ from, to, metricIds: ids }), { enabled: ids.length > 0, placeholderData: (previous) => previous })
}

/** The metric a tracker is summarised by on the dashboard. */
export function primaryMetricId(tracker: Tracker): string {
  const key = (() => {
    switch (identityOf(tracker)) {
      case 'weight':
        return 'weight'
      case 'mood':
        return 'avg'
      case 'exercise':
        return 'trained'
      case 'social':
        return 'interactions'
      case 'tasks':
        return 'completed'
      case 'books':
        return 'read'
      case 'gaming':
        return 'hours'
      case 'diet':
        return 'items'
      case 'health':
        return 'count'
      case 'intake':
        return 'count'
      case 'tv':
      case 'media':
        return 'count'
      default:
        return { numeric: 'value', range: 'value', binary: 'done', text: 'count' }[kindOf(tracker)]
    }
  })()
  return `t:${tracker.id}:${key}`
}

export function entriesOf(entries: Entry[] | undefined, trackerId: number): Entry[] {
  return (entries ?? []).filter((entry) => entry.trackerId === trackerId)
}
