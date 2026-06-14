/**
 * TanStack Query hooks for Chimero - fetches real data via IPC.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type { Tracker, Entry } from './store'
import type { BaseEntryRequest, Book, BookActivityResponse, BookResponse, ContactInteractionInsert, ContactProfileBlockInput, ContactReminderSettingsInput, ContactUpdate, CreateBookActivityRequest, CreateBookRequest, CreateFoodEntryRequest, CreateGamingEntryRequest, CreateHealthSymptomRequest, CreateIntakeEntryRequest, CreateWeightEntryRequest, CreateWorkoutRoutineRequest, CreateWorkoutSessionRequest, DeleteWorkoutRoutineResponse, EntryUpdateRequest, ExerciseProgressReadModel, FoodDetailResponse, FoodEntryResponse, GamingDetailResponse, GamingEntryResponse, HealthDetailResponse, HealthHomeWidgetReadModel, HealthSymptomResponse, InstantiateWorkoutFromRoutineRequest, IntakeDetailResponse, IntakeEntryResponse, IntakeHomeWidgetReadModel, ListWorkoutRoutinesResponse, SaveWorkoutAsRoutineRequest, SetTrackerGoalRequest, TrackerConfig, UpdateBookActivityRequest, UpdateBookRequest, UpdateFoodEntryRequest, UpdateGamingEntryRequest, UpdateHealthSymptomRequest, UpdateIntakeEntryRequest, UpdateWeightEntryRequest, UpdateWorkoutRoutineRequest, UpdateWorkoutSessionRequest, WorkoutCalendarReadModel, WorkoutGraphReadModel, WorkoutHistoryReadModel, WorkoutHomeReadModel, WorkoutRoutineDetailResponse, WorkoutSessionDetailResponse, WorkoutStatisticsReadModel } from '@contracts/contracts'
import type { AssetWithUrls } from '@contracts/features/assets'

export const queryKeys = {
  trackers: ['trackers'] as const,
  entries: (opts?: { trackerId?: number }) => ['entries', opts] as const,
  entriesRoot: ['entries'] as const,
  recentTrackers: (limit?: number) => ['recent-trackers', limit] as const,
  recentTrackersRoot: ['recent-trackers'] as const,
  favoriteTrackers: ['favorite-trackers'] as const,
  quickEntryContext: ['quick-entry-context'] as const,
  stats: ['stats'] as const,
  statsQuery: (opts?: { trackerIds?: number[]; tagIds?: number[]; startDate?: string; endDate?: string; groupBy?: 'day' | 'week' | 'month' }) => ['stats-query', opts] as const,
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
  tags: ['tags'] as const,
  tagTree: ['tag-tree'] as const,
  weightDetail: (trackerId: number) => ['weight-detail', trackerId] as const,
  weightDetailRoot: ['weight-detail'] as const,
  weightGoal: (trackerId: number) => ['weight-goal', trackerId] as const,
  gamingDetail: (trackerId: number) => ['gaming-detail', trackerId] as const,
  gamingDetailRoot: ['gaming-detail'] as const,
  foodDetail: (trackerId: number) => ['food-detail', trackerId] as const,
  foodDetailRoot: ['food-detail'] as const,
  intakeDetail: (trackerId: number) => ['intake-detail', trackerId] as const,
  intakeDetailRoot: ['intake-detail'] as const,
  intakeHome: (trackerId: number, selectedDate?: string) => ['intake-home', trackerId, selectedDate] as const,
  intakeHomeRoot: ['intake-home'] as const,
  healthDetail: (trackerId: number) => ['health-detail', trackerId] as const,
  healthDetailRoot: ['health-detail'] as const,
  healthHome: (trackerId: number, selectedDate?: string) => ['health-home', trackerId, selectedDate] as const,
  healthHomeRoot: ['health-home'] as const,
  booksRoot: ['books'] as const,
  book: (bookId: number) => ['book', bookId] as const,
  bookRoot: ['book'] as const,
  workoutSession: (entryId: number) => ['workout-session', entryId] as const,
  workoutSessionRoot: ['workout-session'] as const,
  workoutHistory: (trackerId: number, limit?: number) => ['workout-history', trackerId, limit] as const,
  workoutHistoryRoot: ['workout-history'] as const,
  workoutRoutines: (trackerId: number) => ['workout-routines', trackerId] as const,
  workoutRoutinesRoot: ['workout-routines'] as const,
  workoutRoutine: (routineId: number) => ['workout-routine', routineId] as const,
  workoutRoutineRoot: ['workout-routine'] as const,
  workoutHome: (trackerId: number) => ['workout-home', trackerId] as const,
  workoutHomeRoot: ['workout-home'] as const,
  workoutStatistics: (trackerId: number) => ['workout-statistics', trackerId] as const,
  workoutStatisticsRoot: ['workout-statistics'] as const,
  workoutGraph: (trackerId: number) => ['workout-graph', trackerId] as const,
  workoutGraphRoot: ['workout-graph'] as const,
  workoutCalendar: (trackerId: number, year: number, month: number) => ['workout-calendar', trackerId, year, month] as const,
  workoutCalendarRoot: ['workout-calendar'] as const,
  exerciseProgress: (trackerId: number, exerciseId: string) => ['exercise-progress', trackerId, exerciseId] as const,
  exerciseProgressRoot: ['exercise-progress'] as const,
  // Contacts
  contacts: ['contacts'] as const,
  contactsSorted: (sortBy?: 'name' | 'most-talked-to' | 'least-talked-to') => ['contacts', sortBy ?? 'name'] as const,
  contact: (id: number) => ['contact', id] as const,
  contactInteractions: (contactId: number) => ['contact-interactions', contactId] as const,
  contactReminderSettings: (contactId: number) => ['contact-reminder-settings', contactId] as const,
  contactProfileBlocks: (contactId: number) => ['contact-profile-blocks', contactId] as const,
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

export function useQuickEntryContext(enabled = true) {
  return useQuery({
    queryKey: queryKeys.quickEntryContext,
    queryFn: () => api.getQuickEntryContext(),
    enabled,
    staleTime: 15_000,
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

export function useStatsQuery(options?: { trackerIds?: number[]; tagIds?: number[]; startDate?: string; endDate?: string; groupBy?: 'day' | 'week' | 'month' }) {
  return useQuery({
    queryKey: queryKeys.statsQuery(options),
    queryFn: () => api.getStats(options),
    staleTime: 60_000,
  })
}

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: () => api.getTags(),
    staleTime: 60_000,
  })
}

export function useCreateTagMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string | null }) => api.createTag(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags })
      qc.invalidateQueries({ queryKey: queryKeys.tagTree })
      qc.invalidateQueries({ queryKey: queryKeys.quickEntryContext })
    },
  })
}

export function useTagTree() {
  return useQuery({
    queryKey: queryKeys.tagTree,
    queryFn: () => api.getTagTree(),
    staleTime: 60_000,
  })
}

export function useWeightDetail(trackerId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.weightDetail(trackerId),
    queryFn: () => api.getWeightDetail(trackerId),
    enabled: enabled && !!trackerId,
    staleTime: 15_000,
  })
}

export function useWeightGoal(trackerId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.weightGoal(trackerId),
    queryFn: () => api.getWeightGoal(trackerId),
    enabled: enabled && !!trackerId,
    staleTime: 30_000,
  })
}

export function useGamingDetail(trackerId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.gamingDetail(trackerId),
    queryFn: () => api.getGamingDetail(trackerId) as Promise<GamingDetailResponse>,
    enabled: enabled && !!trackerId,
    staleTime: 15_000,
  })
}

export function useFoodDetail(trackerId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.foodDetail(trackerId),
    queryFn: () => api.getFoodDetail(trackerId) as Promise<FoodDetailResponse>,
    enabled: enabled && !!trackerId,
    staleTime: 15_000,
  })
}

export function useIntakeDetail(trackerId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.intakeDetail(trackerId),
    queryFn: () => api.getIntakeDetail(trackerId) as Promise<IntakeDetailResponse>,
    enabled: enabled && !!trackerId,
    staleTime: 15_000,
  })
}

export function useIntakeHomeWidget(trackerId: number, selectedDate?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.intakeHome(trackerId, selectedDate),
    queryFn: () => api.getIntakeHomeWidget(trackerId, { selectedDate }) as Promise<IntakeHomeWidgetReadModel>,
    enabled: enabled && !!trackerId,
    staleTime: 15_000,
  })
}

export function useHealthDetail(trackerId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.healthDetail(trackerId),
    queryFn: () => api.getHealthDetail(trackerId) as Promise<HealthDetailResponse>,
    enabled: enabled && !!trackerId,
    staleTime: 15_000,
  })
}

export function useHealthHomeWidget(trackerId: number, selectedDate?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.healthHome(trackerId, selectedDate),
    queryFn: () => api.getHealthHomeWidget(trackerId, { selectedDate }) as Promise<HealthHomeWidgetReadModel>,
    enabled: enabled && !!trackerId,
    staleTime: 15_000,
  })
}

export function useBook(bookId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: bookId == null ? queryKeys.bookRoot : queryKeys.book(bookId),
    queryFn: () => api.getBook(bookId as number),
    enabled: enabled && bookId != null,
    staleTime: 15_000,
  })
}

export function useBooks(enabled = true) {
  return useQuery({
    queryKey: queryKeys.booksRoot,
    queryFn: () => api.getBooks() as Promise<Book[]>,
    enabled,
    staleTime: 15_000,
  })
}

export function useWorkoutSession(entryId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: entryId == null ? queryKeys.workoutSessionRoot : queryKeys.workoutSession(entryId),
    queryFn: () => api.getWorkoutSession(entryId as number) as Promise<WorkoutSessionDetailResponse | null>,
    enabled: enabled && entryId != null,
    staleTime: 15_000,
  })
}

export function useWorkoutHistory(trackerId: number, enabled = true, limit = 365) {
  return useQuery({
    queryKey: queryKeys.workoutHistory(trackerId, limit),
    queryFn: () => api.getWorkoutHistory(trackerId, { limit }) as Promise<WorkoutHistoryReadModel>,
    enabled: enabled && !!trackerId,
    staleTime: 15_000,
  })
}

export function useWorkoutRoutines(trackerId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.workoutRoutines(trackerId),
    queryFn: () => api.getWorkoutRoutines(trackerId) as Promise<ListWorkoutRoutinesResponse>,
    enabled: enabled && !!trackerId,
    staleTime: 15_000,
  })
}

export function useWorkoutRoutine(routineId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: routineId == null ? queryKeys.workoutRoutineRoot : queryKeys.workoutRoutine(routineId),
    queryFn: () => api.getWorkoutRoutine(routineId as number) as Promise<WorkoutRoutineDetailResponse | null>,
    enabled: enabled && routineId != null,
    staleTime: 15_000,
  })
}

export function useWorkoutHome(trackerId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.workoutHome(trackerId),
    queryFn: () => api.getWorkoutHome(trackerId) as Promise<WorkoutHomeReadModel | null>,
    enabled: enabled && !!trackerId,
    staleTime: 15_000,
  })
}

export function useWorkoutStatistics(trackerId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.workoutStatistics(trackerId),
    queryFn: () => api.getWorkoutStatistics(trackerId) as Promise<WorkoutStatisticsReadModel | null>,
    enabled: enabled && !!trackerId,
    staleTime: 15_000,
  })
}

export function useWorkoutGraph(trackerId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.workoutGraph(trackerId),
    queryFn: () => api.getWorkoutGraph(trackerId) as Promise<WorkoutGraphReadModel | null>,
    enabled: enabled && !!trackerId,
    staleTime: 15_000,
  })
}

export function useWorkoutCalendar(trackerId: number, year: number, month: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.workoutCalendar(trackerId, year, month),
    queryFn: () => api.getWorkoutCalendar(trackerId, year, month) as Promise<WorkoutCalendarReadModel>,
    enabled: enabled && !!trackerId,
    staleTime: 15_000,
  })
}

export function useExerciseProgress(trackerId: number, exerciseId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.exerciseProgress(trackerId, exerciseId),
    queryFn: () => api.getExerciseProgress(trackerId, exerciseId) as Promise<ExerciseProgressReadModel | null>,
    enabled: enabled && !!trackerId && !!exerciseId,
    staleTime: 15_000,
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
  return useQuery<AssetWithUrls[]>({
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
    mutationFn: (data: BaseEntryRequest) =>
      api.addEntry(data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch all entry-related data so widgets update immediately
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.moodAggregatesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.taskEntriesRoot })
      if (variables.socialInteractions && variables.socialInteractions.length > 0) {
        qc.invalidateQueries({ queryKey: queryKeys.contacts })
        variables.socialInteractions.forEach((interaction) => {
          qc.invalidateQueries({ queryKey: queryKeys.contactInteractions(interaction.contactId) })
        })
      }
      // Ensure active queries refetch immediately for a snappy dashboard experience
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
      qc.refetchQueries({ queryKey: queryKeys.stats, type: 'active' })
    },
  })
}

export function useAddWeightEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWeightEntryRequest) => api.addWeightEntry(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.weightDetail(variables.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.weightGoal(variables.trackerId) })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useAddGamingEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGamingEntryRequest) => api.addGamingEntry(data) as Promise<GamingEntryResponse | null>,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.gamingDetail(variables.trackerId) })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useAddFoodEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFoodEntryRequest) => api.addFoodEntry(data) as Promise<FoodEntryResponse | null>,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.foodDetail(variables.trackerId) })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useAddIntakeEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIntakeEntryRequest) => api.addIntakeEntry(data) as Promise<IntakeEntryResponse | null>,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.intakeDetail(variables.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.intakeHomeRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useCreateBookMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBookRequest) => api.createBook(data) as Promise<BookResponse | null>,
    onSuccess: (result) => {
      if (result?.book.id != null) {
        qc.invalidateQueries({ queryKey: queryKeys.book(result.book.id) })
      }
      qc.invalidateQueries({ queryKey: queryKeys.booksRoot })
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

function useBookActivityMutation(
  mutate: (data: CreateBookActivityRequest) => Promise<BookActivityResponse | null>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mutate,
    onSuccess: (result) => {
      if (result?.book.id != null) {
        qc.invalidateQueries({ queryKey: queryKeys.book(result.book.id) })
      }
      qc.invalidateQueries({ queryKey: queryKeys.booksRoot })
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useStartBookMutation() {
  return useBookActivityMutation((data) => api.startBook(data) as Promise<BookActivityResponse | null>)
}

export function useReadBookMutation() {
  return useBookActivityMutation((data) => api.readBook(data) as Promise<BookActivityResponse | null>)
}

export function useFinishBookMutation() {
  return useBookActivityMutation((data) => api.finishBook(data) as Promise<BookActivityResponse | null>)
}

export function useUpdateBookMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookId, updates }: { bookId: number; updates: UpdateBookRequest }) =>
      api.updateBook(bookId, updates) as Promise<BookResponse | null>,
    onSuccess: (result, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.book(variables.bookId) })
      if (result?.book.id != null) {
        qc.invalidateQueries({ queryKey: queryKeys.book(result.book.id) })
      }
      qc.invalidateQueries({ queryKey: queryKeys.booksRoot })
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useUpdateBookReadActivityMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, updates }: { entryId: number; updates: UpdateBookActivityRequest }) =>
      api.updateBookReadActivity(entryId, updates) as Promise<BookActivityResponse | null>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useDeleteBookReadActivityMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: number) => api.deleteBookReadActivity(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useCreateWorkoutSessionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWorkoutSessionRequest) => api.createWorkoutSession(data) as Promise<WorkoutSessionDetailResponse | null>,
    onSuccess: (_, variables) => {
      const sessionDate = new Date(variables.timestamp)
      qc.invalidateQueries({ queryKey: queryKeys.workoutHistory(variables.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutHome(variables.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutStatistics(variables.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutGraph(variables.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutCalendar(variables.trackerId, sessionDate.getFullYear(), sessionDate.getMonth()) })
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
    },
  })
}

export function useUpdateWorkoutSessionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, updates }: { entryId: number; updates: UpdateWorkoutSessionRequest }) =>
      api.updateWorkoutSession(entryId, updates) as Promise<WorkoutSessionDetailResponse | null>,
    onSuccess: (result) => {
      if (!result) return
      qc.invalidateQueries({ queryKey: queryKeys.workoutSession(result.session.entryId) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutHistory(result.session.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutHome(result.session.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutStatistics(result.session.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutGraph(result.session.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
    },
  })
}

export function useDeleteWorkoutSessionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: number) => api.deleteWorkoutSession(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutHistoryRoot })
      qc.invalidateQueries({ queryKey: queryKeys.workoutHomeRoot })
      qc.invalidateQueries({ queryKey: queryKeys.workoutStatisticsRoot })
      qc.invalidateQueries({ queryKey: queryKeys.workoutGraphRoot })
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
    },
  })
}

export function useCreateWorkoutRoutineMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWorkoutRoutineRequest) => api.createWorkoutRoutine(data) as Promise<WorkoutRoutineDetailResponse | null>,
    onSuccess: (result) => {
      if (!result) return
      qc.invalidateQueries({ queryKey: queryKeys.workoutRoutines(result.routine.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutRoutine(result.routine.id) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutHome(result.routine.trackerId) })
    },
  })
}

export function useUpdateWorkoutRoutineMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ routineId, updates }: { routineId: number; updates: UpdateWorkoutRoutineRequest }) =>
      api.updateWorkoutRoutine(routineId, updates) as Promise<WorkoutRoutineDetailResponse | null>,
    onSuccess: (result) => {
      if (!result) return
      qc.invalidateQueries({ queryKey: queryKeys.workoutRoutines(result.routine.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutRoutine(result.routine.id) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutHome(result.routine.trackerId) })
    },
  })
}

export function useDeleteWorkoutRoutineMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (routineId: number) => api.deleteWorkoutRoutine(routineId) as Promise<DeleteWorkoutRoutineResponse>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workoutRoutinesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.workoutHomeRoot })
    },
  })
}

export function useInstantiateWorkoutFromRoutineMutation() {
  return useMutation({
    mutationFn: (data: InstantiateWorkoutFromRoutineRequest) => api.instantiateWorkoutFromRoutine(data),
  })
}

export function useSaveWorkoutAsRoutineMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SaveWorkoutAsRoutineRequest) => api.saveWorkoutAsRoutine(data) as Promise<WorkoutRoutineDetailResponse | null>,
    onSuccess: (result) => {
      if (!result) return
      qc.invalidateQueries({ queryKey: queryKeys.workoutRoutines(result.routine.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutRoutine(result.routine.id) })
      qc.invalidateQueries({ queryKey: queryKeys.workoutHome(result.routine.trackerId) })
    },
  })
}

export function useUpdateWeightEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, updates }: { entryId: number; updates: UpdateWeightEntryRequest }) =>
      api.updateWeightEntry(entryId, updates),
    onSuccess: (result) => {
      const trackerId = result?.entry.trackerId
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      if (trackerId) qc.invalidateQueries({ queryKey: queryKeys.weightDetail(trackerId) })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useUpdateGamingEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, updates }: { entryId: number; updates: UpdateGamingEntryRequest }) =>
      api.updateGamingEntry(entryId, updates) as Promise<GamingEntryResponse | null>,
    onSuccess: (result) => {
      const trackerId = result?.entry.trackerId
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      if (trackerId) qc.invalidateQueries({ queryKey: queryKeys.gamingDetail(trackerId) })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useUpdateFoodEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, updates }: { entryId: number; updates: UpdateFoodEntryRequest }) =>
      api.updateFoodEntry(entryId, updates) as Promise<FoodEntryResponse | null>,
    onSuccess: (result) => {
      const trackerId = result?.entry.trackerId
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      if (trackerId) qc.invalidateQueries({ queryKey: queryKeys.foodDetail(trackerId) })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useUpdateIntakeEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, updates }: { entryId: number; updates: UpdateIntakeEntryRequest }) =>
      api.updateIntakeEntry(entryId, updates) as Promise<IntakeEntryResponse | null>,
    onSuccess: (result) => {
      const trackerId = result?.entry.trackerId
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      if (trackerId) qc.invalidateQueries({ queryKey: queryKeys.intakeDetail(trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.intakeHomeRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useDeleteIntakeEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: number) => api.deleteIntakeEntry(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.intakeDetailRoot })
      qc.invalidateQueries({ queryKey: queryKeys.intakeHomeRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useDeleteFoodEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: number) => api.deleteFoodEntry(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.foodDetailRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useAddHealthSymptomEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateHealthSymptomRequest) => api.addHealthSymptomEntry(data) as Promise<HealthSymptomResponse | null>,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.healthDetail(variables.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.healthHomeRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useUpdateHealthSymptomEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, updates }: { entryId: number; updates: UpdateHealthSymptomRequest }) =>
      api.updateHealthSymptomEntry(entryId, updates) as Promise<HealthSymptomResponse | null>,
    onSuccess: (result) => {
      const trackerId = result?.entry.trackerId
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      if (trackerId) qc.invalidateQueries({ queryKey: queryKeys.healthDetail(trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.healthHomeRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useDeleteHealthSymptomEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: number) => api.deleteHealthSymptomEntry(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.healthDetailRoot })
      qc.invalidateQueries({ queryKey: queryKeys.healthHomeRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

export function useSetWeightGoalMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SetTrackerGoalRequest) => api.setWeightGoal(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.weightGoal(variables.trackerId) })
      qc.invalidateQueries({ queryKey: queryKeys.weightDetail(variables.trackerId) })
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
      updates: { order?: number; isFavorite?: boolean; name?: string; icon?: string | null; color?: string | null; type?: string; config?: TrackerConfig }
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
    mutationFn: (data: { name: string; type: string; icon?: string; color?: string; config?: TrackerConfig }) =>
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

export function useUpdateEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: EntryUpdateRequest }) =>
      api.updateEntry(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.entriesRoot })
      qc.invalidateQueries({ queryKey: queryKeys.recentTrackersRoot })
      qc.invalidateQueries({ queryKey: queryKeys.stats })
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.weightDetailRoot })
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
      qc.invalidateQueries({ queryKey: queryKeys.calendarMonthRoot })
      qc.invalidateQueries({ queryKey: queryKeys.taskEntriesRoot })
      qc.refetchQueries({ queryKey: queryKeys.entriesRoot, type: 'active' })
    },
  })
}

// === CONTACTS (Personal CRM) ===

export function useContacts(options?: { sortBy?: 'name' | 'most-talked-to' | 'least-talked-to' }) {
  return useQuery({
    queryKey: queryKeys.contactsSorted(options?.sortBy),
    queryFn: () => api.getContacts(options),
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

export function useContactInteractions(contactId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.contactInteractions(contactId),
    queryFn: () => api.getContactInteractions(contactId),
    enabled: enabled && !!contactId,
    staleTime: 15_000,
  })
}

export function useContactReminderSettings(contactId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.contactReminderSettings(contactId),
    queryFn: () => api.getContactReminderSettings(contactId),
    enabled: enabled && !!contactId,
    staleTime: 30_000,
  })
}

export function useContactProfileBlocks(contactId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.contactProfileBlocks(contactId),
    queryFn: () => api.getContactProfileBlocks(contactId),
    enabled: enabled && !!contactId,
    staleTime: 15_000,
  })
}

export function useCreateContactMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; avatarAssetId?: number | null; birthday?: string | null; dateMet?: string | null; likes?: string[] | null; dislikes?: string[] | null; traits?: string[] | null; hasKids?: boolean | null; kidsNotes?: string | null; notes?: string | null }) =>
      api.createContact(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contacts })
    },
  })
}

export function useUpdateContactMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: ContactUpdate }) =>
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
    mutationFn: (data: ContactInteractionInsert) =>
      api.createContactInteraction(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.contactInteractions(variables.contactId) })
      qc.invalidateQueries({ queryKey: queryKeys.contacts })
    },
  })
}

export function useUpsertContactReminderSettingsMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ContactReminderSettingsInput) => api.upsertContactReminderSettings(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.contactReminderSettings(variables.contactId) })
      qc.invalidateQueries({ queryKey: queryKeys.contacts })
    },
  })
}

export function useCreateContactProfileBlockMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ContactProfileBlockInput) => api.createContactProfileBlock(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.contactProfileBlocks(variables.contactId) })
    },
  })
}

export function useUpdateContactProfileBlockMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates, contactId }: { id: number; updates: Partial<ContactProfileBlockInput>; contactId: number }) =>
      api.updateContactProfileBlock(id, updates).then((block) => ({ block, contactId })),
    onSuccess: ({ contactId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.contactProfileBlocks(contactId) })
    },
  })
}

export function useDeleteContactProfileBlockMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, contactId }: { id: number; contactId: number }) =>
      api.deleteContactProfileBlock(id).then((ok) => ({ ok, contactId })),
    onSuccess: ({ contactId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.contactProfileBlocks(contactId) })
    },
  })
}

export function useReorderContactProfileBlocksMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ contactId, ids }: { contactId: number; ids: number[] }) =>
      api.reorderContactProfileBlocks(contactId, ids),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.contactProfileBlocks(variables.contactId) })
    },
  })
}

// === EXERCISE DB ===

export function useSearchExercises(query: string, limit?: number) {
  return useQuery({
    queryKey: ['exercises', 'search', query, limit],
    queryFn: () => api.searchExercises(query, limit),
    enabled: query.trim().length > 0,
    staleTime: Infinity, // Los ejercicios no cambian
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
      // Poll every 1.5s while loading or idle, stop when ready or error
      return status === 'ready' || status === 'error' ? false : 1500
    },
    staleTime: 0, // Always refetch — status changes over time
  })
}
