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
      addEntry: (data: { trackerId: number; value?: number | null; note?: string | null; metadata?: Record<string, unknown>; timestamp: number; assetId?: number | null }) => Promise<unknown>
      updateEntry: (id: number, updates: { value?: number | null; note?: string | null }) => Promise<unknown>
      getRecentTrackers: (limit?: number) => Promise<unknown[]>
      getFavoriteTrackers: () => Promise<unknown[]>
      toggleTrackerFavorite: (trackerId: number) => Promise<unknown>
      getDashboardStats: () => Promise<{ currentStreak: number; bestStreak: number; totalActivities: number; totalEntriesMonth: number }>
      getCalendarMonth: (year: number, month: number) => Promise<{ year: number; month: number; entriesByDate: Record<string, { id: number; trackerId: number; value: number | null; note: string | null; timestamp: number; dateStr: string }[]>; activeDays: number[] }>
      getMoodDailyAggregates: (options?: { trackerId?: number; days?: number }) => Promise<{ date: string; value: number; count: number }[]>
      getTaskEntries: (trackerId: number, options?: { limit?: number }) => Promise<unknown[]>
      getAssets: (options?: { limit?: number; offset?: number }) => Promise<unknown[]>
      openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<{ path: string | null }>
      uploadAsset: (sourcePath: string) => Promise<unknown>
      updateAsset: (id: number, updates: { originalName?: string | null }) => Promise<unknown>
      deleteAsset: (id: number) => Promise<boolean>
      downloadAsset: (id: number, suggestedName: string) => Promise<{ ok: boolean; path?: string; error?: string; canceled?: boolean }>
      getDashboardLayout: () => Promise<Array<{ id: string; trackerId: number; position: number; size: string }> | null>
      saveDashboardLayout: (layout: Array<{ id: string; trackerId: number; position: number; size: string }>) => Promise<boolean>
      updateTracker: (
        id: number,
        updates: { order?: number; isFavorite?: boolean; name?: string; icon?: string | null; color?: string | null; type?: string; config?: Record<string, unknown> }
      ) => Promise<unknown>
      reorderTrackers: (ids: number[]) => Promise<boolean>
      getReminders: () => Promise<unknown[]>
      upsertReminder: (data: { id?: number; title: string; description?: string | null; trackerId?: number | null; time: string; date?: string | null; days?: number[] | null; enabled?: boolean }) => Promise<unknown>
      deleteReminder: (id: number) => Promise<boolean>
      toggleReminder: (id: number, enabled: boolean) => Promise<unknown>
      completeReminder: (id: number) => Promise<unknown>
      uncompleteReminder: (id: number) => Promise<unknown>
    }
  }
}

export const api = typeof window !== 'undefined' ? window.api : ({} as Window['api'])
