/**
 * API layer for Chimero - calls IPC via window.api.
 * Used with TanStack Query for caching and invalidation.
 */

declare global {
  interface Window {
    api: {
      getTrackers: () => Promise<unknown[]>
      createTracker: (data: { name: string; type: string; icon?: string; color?: string; config?: Record<string, unknown> }) => Promise<unknown>
      deleteTracker: (id: number) => Promise<boolean>
      getEntries: (options?: { limit?: number; trackerId?: number }) => Promise<unknown[]>
      addEntry: (data: { trackerId: number; value?: number; metadata?: Record<string, unknown>; timestamp: number }) => Promise<unknown>
      getRecentTrackers: (limit?: number) => Promise<unknown[]>
      getFavoriteTrackers: () => Promise<unknown[]>
      toggleTrackerFavorite: (trackerId: number) => Promise<unknown>
      getMoodDailyAggregates: (options?: { trackerId?: number; days?: number }) => Promise<{ date: string; value: number; count: number }[]>
      getTaskEntries: (trackerId: number, options?: { limit?: number }) => Promise<unknown[]>
      getAssets: (options?: { limit?: number; offset?: number }) => Promise<unknown[]>
      getDashboardLayout: () => Promise<Array<{ id: string; trackerId: number; position: number; size: string }> | null>
      saveDashboardLayout: (layout: Array<{ id: string; trackerId: number; position: number; size: string }>) => Promise<boolean>
      updateTracker: (
        id: number,
        updates: { order?: number; isFavorite?: boolean; name?: string; icon?: string | null; color?: string | null; type?: string; config?: Record<string, unknown> }
      ) => Promise<unknown>
    }
  }
}

export const api = typeof window !== 'undefined' ? window.api : ({} as Window['api'])
