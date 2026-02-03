/**
 * TanStack Query hooks for Chimero - fetches real data via IPC.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type { Tracker, Entry } from './store'

export const queryKeys = {
  trackers: ['trackers'] as const,
  entries: (opts?: { trackerId?: number }) => ['entries', opts] as const,
  recentTrackers: (limit?: number) => ['recent-trackers', limit] as const,
  favoriteTrackers: ['favorite-trackers'] as const,
  stats: ['stats'] as const,
  calendarMonth: (year: number, month: number) => ['calendar-month', year, month] as const,
  moodAggregates: (trackerId?: number, days?: number) => ['mood-aggregates', trackerId, days] as const,
  taskEntries: (trackerId: number) => ['task-entries', trackerId] as const,
  assets: (opts?: { limit?: number; offset?: number }) => ['assets', opts] as const,
  reminders: ['reminders'] as const,
  dashboardLayout: ['dashboard-layout'] as const,
}

export function useTrackers() {
  return useQuery({
    queryKey: queryKeys.trackers,
    queryFn: () => api.getTrackers() as Promise<Tracker[]>,
    staleTime: 30_000,
  })
}

export function useEntries(options?: { limit?: number; trackerId?: number }) {
  return useQuery({
    queryKey: queryKeys.entries(options),
    queryFn: () => api.getEntries(options) as Promise<Entry[]>,
    staleTime: 10_000,
  })
}

export function useRecentTrackers(limit = 10) {
  return useQuery({
    queryKey: queryKeys.recentTrackers(limit),
    queryFn: () => api.getRecentTrackers(limit) as Promise<Tracker[]>,
    staleTime: 15_000,
  })
}

export function useFavoriteTrackers() {
  return useQuery({
    queryKey: queryKeys.favoriteTrackers,
    queryFn: () => api.getFavoriteTrackers() as Promise<Tracker[]>,
    staleTime: 30_000,
  })
}

export function useMoodDailyAggregates(trackerId?: number, days = 30) {
  return useQuery({
    queryKey: queryKeys.moodAggregates(trackerId, days),
    queryFn: () => api.getMoodDailyAggregates({ trackerId, days }),
    staleTime: 60_000,
  })
}

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api.getDashboardStats(),
    staleTime: 60_000,
  })
}

export function useCalendarMonth(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.calendarMonth(year, month),
    queryFn: () => api.getCalendarMonth(year, month),
    staleTime: 30_000,
  })
}

export function useTaskEntries(trackerId: number) {
  return useQuery({
    queryKey: queryKeys.taskEntries(trackerId),
    queryFn: () => api.getTaskEntries(trackerId) as Promise<Entry[]>,
    enabled: !!trackerId,
    staleTime: 15_000,
  })
}

export function useAssets(options?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: queryKeys.assets(options),
    queryFn: () => api.getAssets(options),
    staleTime: 60_000,
  })
}

export function useDashboardLayout() {
  return useQuery({
    queryKey: queryKeys.dashboardLayout,
    queryFn: () => api.getDashboardLayout(),
    staleTime: 60_000,
  })
}

export function useReminders() {
  return useQuery({
    queryKey: queryKeys.reminders,
    queryFn: () => api.getReminders(),
    staleTime: 30_000,
  })
}

export function useAddEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { trackerId: number; value?: number; metadata?: Record<string, unknown>; timestamp: number }) =>
      api.addEntry(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] })
      qc.invalidateQueries({ queryKey: ['recent-trackers'] })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: ['calendar-month'] })
      qc.invalidateQueries({ queryKey: ['mood-aggregates'] })
      qc.invalidateQueries({ queryKey: ['task-entries'] })
    },
  })
}

export function useSaveDashboardLayoutMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (layout: Array<{ id: string; trackerId: number; position: number; size: string }>) =>
      api.saveDashboardLayout(layout),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dashboardLayout })
    },
  })
}

export function useUpdateTrackerMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number
      updates: { order?: number; isFavorite?: boolean; name?: string; icon?: string | null; color?: string | null; type?: string; config?: Record<string, unknown> }
    }) => api.updateTracker(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackers })
      qc.invalidateQueries({ queryKey: queryKeys.favoriteTrackers })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackers() })
    },
  })
}

export function useCreateTrackerMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; type: string; icon?: string; color?: string; config?: Record<string, unknown> }) =>
      api.createTracker(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackers })
      qc.invalidateQueries({ queryKey: queryKeys.dashboardLayout })
    },
  })
}

export function useDeleteTrackerMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteTracker(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackers })
      qc.invalidateQueries({ queryKey: queryKeys.dashboardLayout })
      qc.invalidateQueries({ queryKey: queryKeys.entries() })
    },
  })
}

export function useUploadAssetMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { path } = await api.openFileDialog()
      if (!path) return null
      return api.uploadAsset(path)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assets() })
    },
  })
}

export function useUpdateAssetMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, originalName }: { id: number; originalName?: string | null }) =>
      api.updateAsset(id, { originalName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assets() })
    },
  })
}

export function useDeleteAssetMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteAsset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assets() })
    },
  })
}

export function useUpsertReminderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { id?: number; title: string; description?: string | null; trackerId?: number | null; time: string; date?: string | null; days?: number[] | null; enabled?: boolean }) =>
      api.upsertReminder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reminders })
    },
  })
}

export function useDeleteReminderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteReminder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reminders })
    },
  })
}

export function useToggleReminderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => api.toggleReminder(id, enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reminders })
    },
  })
}

export function useCompleteReminderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.completeReminder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reminders })
      qc.refetchQueries({ queryKey: queryKeys.reminders })
    },
  })
}

export function useUncompleteReminderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.uncompleteReminder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reminders })
      qc.refetchQueries({ queryKey: queryKeys.reminders })
    },
  })
}
