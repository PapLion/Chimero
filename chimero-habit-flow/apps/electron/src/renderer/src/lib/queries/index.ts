/**
 * All TanStack Query hooks - complete superset for backward compatibility.
 * New code should import from feature modules directly.
 * This file re-exports everything from both feature modules and inline hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import type { Tracker, Entry, Reminder } from '@packages/db'

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const queryKeys = {
  trackers: ['trackers'] as const,
  entries: (opts?: { trackerId?: number }) => ['entries', opts] as const,
  entriesRoot: ['entries'] as const,
  recentTrackers: (limit?: number) => ['recent-trackers', limit] as const,
  recentTrackersRoot: ['recent-trackers'] as const,
  favoriteTrackers: ['favorite-trackers'] as const,
  stats: ['stats'] as const,
  weightProgress: (trackerId: number) => ['weight-progress', trackerId] as const,
  weightProgressRoot: ['weight-progress'] as const,
  trackerChart: (trackerId: number, daysBack: number, granularity: string) => ['tracker-chart', trackerId, daysBack, granularity] as const,
  trackerChartRoot: ['tracker-chart'] as const,
  calendarMonth: (year: number, month: number) => ['calendar-month', year, month] as const,
  calendarMonthRoot: ['calendar-month'] as const,
  moodAggregates: (trackerId?: number, days?: number) => ['mood-aggregates', trackerId, days] as const,
  moodAggregatesRoot: ['mood-aggregates'] as const,
  taskEntries: (trackerId: number) => ['task-entries', trackerId] as const,
  taskEntriesRoot: ['task-entries'] as const,
  assets: (opts?: { limit?: number; offset?: number }) => ['assets', opts] as const,
  assetsRoot: ['assets'] as const,
  reminders: ['reminders'] as const,
  dashboardLayout: ['dashboard-layout'] as const,
  contacts: ['contacts'] as const,
  contact: (id: number) => ['contact', id] as const,
  contactInteractions: (contactId: number) => ['contact-interactions', contactId] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// Tracker Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useTrackers() {
  return useQuery({
    queryKey: queryKeys.trackers,
    queryFn: () => api.getTrackers() as Promise<Tracker[]>,
    staleTime: 30_000,
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

export function useMeditationStats(trackerId: number) {
  return useQuery({
    queryKey: ['meditation-stats', trackerId] as const,
    queryFn: () => api.getMeditationStats(trackerId),
    enabled: !!trackerId,
    staleTime: 60_000,
  })
}

export function useExerciseStats(trackerId: number) {
  return useQuery({
    queryKey: ['exercise-stats', trackerId] as const,
    queryFn: () => api.getExerciseStats(trackerId),
    enabled: !!trackerId,
    staleTime: 60_000,
  })
}

export function useHealthStats(trackerId: number) {
  return useQuery({
    queryKey: ['health-stats', trackerId] as const,
    queryFn: () => api.getHealthStats(trackerId),
    enabled: !!trackerId,
    staleTime: 60_000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Specialized Entry Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useSleepEntries(trackerId: number, options?: { startDate?: string; endDate?: string; limit?: number }) {
  return useQuery({
    queryKey: ['sleep-entries', trackerId, options] as const,
    queryFn: () => api.sleep.getEntries({ trackerId, ...options }) as Promise<unknown[]>,
    enabled: !!trackerId,
    staleTime: 30_000,
  })
}

export function useMeditationEntries(trackerId: number, options?: { startDate?: string; endDate?: string; limit?: number }) {
  return useQuery({
    queryKey: ['meditation-entries', trackerId, options] as const,
    queryFn: () => api.meditation.getEntries({ trackerId, ...options }) as Promise<unknown[]>,
    enabled: !!trackerId,
    staleTime: 30_000,
  })
}

export function useHealthEntries(trackerId: number, options?: { startDate?: string; endDate?: string; limit?: number }) {
  return useQuery({
    queryKey: ['health-entries', trackerId, options] as const,
    queryFn: () => api.health.getEntries({ trackerId, ...options }) as Promise<unknown[]>,
    enabled: !!trackerId,
    staleTime: 30_000,
  })
}

export function useDietEntries(trackerId: number, options?: { startDate?: string; endDate?: string; limit?: number }) {
  return useQuery({
    queryKey: ['diet-entries', trackerId, options] as const,
    queryFn: () => api.diet.getEntries({ trackerId, ...options }) as Promise<unknown[]>,
    enabled: !!trackerId,
    staleTime: 30_000,
  })
}

export function useGamingEntries(trackerId: number, options?: { startDate?: string; endDate?: string; limit?: number }) {
  return useQuery({
    queryKey: ['gaming-entries', trackerId, options] as const,
    queryFn: () => api.gaming.getEntries({ trackerId, ...options }) as Promise<unknown[]>,
    enabled: !!trackerId,
    staleTime: 30_000,
  })
}

export function useBookEntries(trackerId: number, options?: { startDate?: string; endDate?: string; limit?: number }) {
  return useQuery({
    queryKey: ['book-entries', trackerId, options] as const,
    queryFn: () => api.book.getEntries({ trackerId, ...options }) as Promise<unknown[]>,
    enabled: !!trackerId,
    staleTime: 30_000,
  })
}

export function useMoodEntries(trackerId: number, options?: { startDate?: string; endDate?: string; limit?: number }) {
  return useQuery({
    queryKey: ['mood-entries', trackerId, options] as const,
    queryFn: () => api.mood.getEntries({ trackerId, ...options }) as Promise<unknown[]>,
    enabled: !!trackerId,
    staleTime: 30_000,
  })
}

export function useExerciseEntries(trackerId: number, options?: { trackerId: number; startDate?: string; endDate?: string; exerciseName?: string; limit?: number }) {
  return useQuery({
    queryKey: ['exercise-entries', trackerId, options] as const,
    queryFn: () => api.exercise.getEntries({ trackerId, ...options }) as Promise<unknown[]>,
    enabled: !!trackerId,
    staleTime: 30_000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard/Stats Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api.getDashboardStats(),
    staleTime: 60_000,
  })
}

export function useWeightProgress(trackerId: number) {
  return useQuery({
    queryKey: queryKeys.weightProgress(trackerId),
    queryFn: () => api.getWeightProgress(trackerId),
    enabled: !!trackerId,
    staleTime: 60_000,
  })
}

export function useTrackerChartData(trackerId: number, daysBack: number, granularity: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.trackerChart(trackerId, daysBack, granularity),
    queryFn: () => api.getTrackerChartData({ trackerId, daysBack, granularity } as { trackerId: number; daysBack: number; granularity: 'daily' | 'weekly' | 'monthly' }),
    enabled: enabled && !!trackerId && daysBack > 0,
    staleTime: 60_000,
  })
}

export function useMoodDailyAggregates(trackerId?: number, days = 30) {
  return useQuery({
    queryKey: queryKeys.moodAggregates(trackerId, days),
    queryFn: () => api.getMoodDailyAggregates({ trackerId, days }),
    staleTime: 60_000,
  })
}

export function useMoodStats(trackerId: number) {
  return useQuery({
    queryKey: ['mood-stats', trackerId] as const,
    queryFn: () => api.getMoodStats(trackerId),
    enabled: !!trackerId,
    staleTime: 60_000,
  })
}

export function useBookStats(trackerId: number) {
  return useQuery({
    queryKey: ['book-stats', trackerId] as const,
    queryFn: () => api.getBookStats(trackerId),
    enabled: !!trackerId,
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

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useCalendarMonth(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.calendarMonth(year, month),
    queryFn: () => api.getCalendarMonth(year, month),
    staleTime: 30_000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useEntries(options?: { limit?: number; trackerId?: number }) {
  return useQuery({
    queryKey: queryKeys.entries(options),
    queryFn: () => api.getEntries(options) as Promise<Entry[]>,
    staleTime: 10_000,
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

// ─────────────────────────────────────────────────────────────────────────────
// Asset Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useAssets(options?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: queryKeys.assets(options),
    queryFn: () => api.getAssets(options),
    staleTime: 60_000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Reminder Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useReminders() {
  return useQuery({
    queryKey: queryKeys.reminders,
    queryFn: () => api.getReminders() as Promise<Reminder[]>,
    staleTime: 30_000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useContacts() {
  return useQuery({
    queryKey: queryKeys.contacts,
    queryFn: () => api.getContacts(),
    staleTime: 30_000,
  })
}

export function useContact(id: number) {
  return useQuery({
    queryKey: queryKeys.contact(id),
    queryFn: () => api.getContact(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useContactInteractions(contactId: number) {
  return useQuery({
    queryKey: queryKeys.contactInteractions(contactId),
    queryFn: () => api.getContactInteractions(contactId),
    enabled: !!contactId,
    staleTime: 15_000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useSearchExercises(query: string, limit?: number) {
  return useQuery({
    queryKey: ['exercises', 'search', query, limit],
    queryFn: () => api.searchExercises(query, limit),
    enabled: query.trim().length > 0,
    staleTime: Infinity,
  })
}

export function useAllExercises(limit?: number) {
  return useQuery({
    queryKey: ['exercises', 'all', limit],
    queryFn: () => api.getAllExercises(limit),
    staleTime: Infinity,
  })
}

export function useExerciseDbStatus() {
  return useQuery({
    queryKey: ['exercises', 'status'],
    queryFn: () => api.getExerciseDbStatus(),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'ready' || status === 'error' ? false : 1500
    },
    staleTime: 0,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations - Entry
// ─────────────────────────────────────────────────────────────────────────────

export function useAddEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { trackerId: number; value?: number | null; note?: string | null; metadata?: Record<string, unknown>; timestamp: number; assetId?: number | null }) =>
      api.addEntry(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.weightProgressRoot })
      qc.invalidateQueries({ queryKey: queryKeys.trackerChartRoot })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.moodAggregatesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.taskEntriesRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
      qc.refetchQueries({ queryKey: queryKeys.stats, type: 'active' })
    },
  })
}

export function useSaveDashboardLayoutMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (layout: unknown) => api.saveDashboardLayout(layout as { widgets?: unknown[] }),
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
    onMutate: async ({ id, updates }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: queryKeys.trackers }),
        qc.cancelQueries({ queryKey: queryKeys.recentTrackersRoot }),
        qc.cancelQueries({ queryKey: queryKeys.favoriteTrackers }),
      ])

      const nextType =
        updates.type === "counter"
          ? "numeric"
          : updates.type === "rating"
            ? "range"
            : updates.type === "list"
              ? "text"
              : updates.type

      const patchTracker = (tracker: Tracker) => {
        if (tracker.id !== id) return tracker
        return {
          ...tracker,
          ...(updates.order !== undefined ? { order: updates.order } : {}),
          ...(updates.isFavorite !== undefined ? { isFavorite: updates.isFavorite } : {}),
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.icon !== undefined ? { icon: updates.icon } : {}),
          ...(updates.color !== undefined ? { color: updates.color } : {}),
          ...(updates.config !== undefined
            ? { config: { ...tracker.config, ...updates.config } }
            : {}),
          ...(nextType !== undefined ? { type: nextType as Tracker["type"] } : {}),
        }
      }

      qc.setQueriesData({ queryKey: queryKeys.trackers }, (current: Tracker[] | undefined) =>
        current?.map(patchTracker) ?? current
      )
      qc.setQueriesData({ queryKey: queryKeys.recentTrackersRoot }, (current: Tracker[] | undefined) =>
        current?.map(patchTracker) ?? current
      )
      qc.setQueriesData({ queryKey: queryKeys.favoriteTrackers }, (current: Tracker[] | undefined) =>
        current?.map(patchTracker) ?? current
      )
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackers })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.favoriteTrackers })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackers })
      qc.invalidateQueries({ queryKey: queryKeys.favoriteTrackers })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.weightProgressRoot })
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
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
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
    mutationFn: (data: { id?: number; title: string; description?: string | null; trackerId?: number | null; time: string; date?: string | null; days?: number[] | null; enabled?: boolean; smartCheck?: boolean }) =>
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

export function useUpdateEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: { value?: number | null; note?: string | null; timestamp?: number; assetId?: number | null; metadata?: Record<string, unknown> } }) =>
      api.updateEntry(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.weightProgressRoot })
      qc.invalidateQueries({ queryKey: queryKeys.trackerChartRoot })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.taskEntriesRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useDeleteEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.weightProgressRoot })
      qc.invalidateQueries({ queryKey: queryKeys.trackerChartRoot })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.taskEntriesRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useCreateContactMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; avatarAssetId?: number | null; birthday?: string | null; dateMet?: string | null; notes?: string | null }) =>
      api.createContact(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contacts })
    },
  })
}

export function useUpdateContactMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: { name?: string; avatarAssetId?: number | null; birthday?: string | null; dateMet?: string | null; dateLastTalked?: string | null; traits?: string[] | null; notes?: string | null } }) =>
      api.updateContact(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contacts })
    },
  })
}

export function useDeleteContactMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteContact(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contacts })
    },
  })
}

export function useCreateContactInteractionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { contactId: number; entryId?: number | null; mood: "positive" | "negative" | "neutral"; notes?: string | null }) =>
      api.createContactInteraction(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.contactInteractions(variables.contactId) })
      qc.invalidateQueries({ queryKey: queryKeys.contacts })
    },
  })
}
