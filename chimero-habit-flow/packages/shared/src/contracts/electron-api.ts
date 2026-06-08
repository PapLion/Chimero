import type {
  Asset,
  BaseEntryRequest,
  Contact,
  ContactInteraction,
  ContactInsert,
  ContactUpdate,
  ContactInteractionInsert,
  CorrelationQueryRequest,
  CorrelationResultResponse,
  CreateIntakeEntryRequest,
  CreateFoodEntryRequest,
  CreateWeightEntryRequest,
  CreateGamingEntryRequest,
  CreateBookRequest,
  CreateBookActivityRequest,
  CreateHealthSymptomRequest,
  Entry,
  Book,
  EntryUpdateRequest,
  BookActivityResponse,
  BookHistoryItem,
  BookResponse,
  BookSelectedDaySummaryReadModel,
  BookStatisticsReadModel,
  HealthDetailResponse,
  HealthHomeWidgetReadModel,
  HealthSymptomResponse,
  FoodDetailResponse,
  FoodEntryResponse,
  IntakeDetailResponse,
  IntakeEntryResponse,
  IntakeHomeWidgetReadModel,
  Reminder,
  ReminderInsert,
  QuickEntryContextResponse,
  ResolveTagInheritanceResponse,
  ResolvedTagTreeResponse,
  SetTrackerGoalRequest,
  StatsQueryRequest,
  StatsQueryResponse,
  Tag,
  TagRelationship,
  Tracker,
  TrackerConfig,
  TrackerGoalResponse,
  UpdateFoodEntryRequest,
  UpdateIntakeEntryRequest,
  UpdateWeightEntryRequest,
  UpdateGamingEntryRequest,
  UpdateBookActivityRequest,
  UpdateBookRequest,
  UpdateHealthSymptomRequest,
  WeightDetailResponse,
  WeightEntryResponse,
  GamingDetailResponse,
  GamingEntryResponse,
} from './app-types'
import type { DashboardLayoutItem, DashboardStats } from '../features/dashboard'
import type { CalendarMonthData } from '../features/calendar'
import type { AssetWithUrls } from '../features/assets'
import type { Exercise, ExerciseDbSnapshot } from '../features/exercises'
import type { EnhancedCorrelationResult } from '../features/tracking'

export interface ElectronApi {
  getTrackers: () => Promise<Tracker[]>
  createTracker: (data: { name: string; type: string; icon?: string; color?: string; config?: TrackerConfig }) => Promise<Tracker | null>
  deleteTracker: (id: number) => Promise<boolean>
  getEntries: (options?: { limit?: number; trackerId?: number }) => Promise<Entry[]>
  addEntry: (data: BaseEntryRequest) => Promise<Entry | null>
  updateEntry: (id: number, updates: EntryUpdateRequest) => Promise<Entry | null>
  deleteEntry: (id: number) => Promise<boolean>
  getQuickEntryContext: () => Promise<QuickEntryContextResponse>
  getRecentTrackers: (limit?: number) => Promise<Tracker[]>
  getFavoriteTrackers: () => Promise<Tracker[]>
  toggleTrackerFavorite: (trackerId: number) => Promise<Tracker | null>
  getDashboardStats: () => Promise<DashboardStats>
  getCalendarMonth: (year: number, month: number) => Promise<CalendarMonthData>
  getMoodDailyAggregates: (options?: { trackerId?: number; days?: number }) => Promise<{ date: string; value: number; count: number }[]>
  getTaskEntries: (trackerId: number, options?: { limit?: number }) => Promise<Entry[]>
  getAssets: (options?: { limit?: number; offset?: number }) => Promise<AssetWithUrls[]>
  openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<{ path: string | null }>
  uploadAsset: (sourcePath: string) => Promise<AssetWithUrls | null>
  updateAsset: (id: number, updates: { originalName?: string | null }) => Promise<Asset | null>
  deleteAsset: (id: number) => Promise<boolean>
  downloadAsset: (id: number, suggestedName: string) => Promise<{ ok: boolean; path?: string; error?: string; canceled?: boolean }>
  getDashboardLayout: () => Promise<DashboardLayoutItem[] | null>
  saveDashboardLayout: (layout: DashboardLayoutItem[]) => Promise<boolean>
  updateTracker: (
    id: number,
    updates: { order?: number; isFavorite?: boolean; name?: string; icon?: string | null; color?: string | null; type?: string; config?: TrackerConfig }
  ) => Promise<Tracker | null>
  reorderTrackers: (ids: number[]) => Promise<boolean>
  getReminders: () => Promise<Reminder[]>
  upsertReminder: (data: ReminderInsert & { id?: number }) => Promise<Reminder | null>
  deleteReminder: (id: number) => Promise<boolean>
  toggleReminder: (id: number, enabled: boolean) => Promise<Reminder | null>
  completeReminder: (id: number) => Promise<Reminder | null>
  uncompleteReminder: (id: number) => Promise<Reminder | null>
  calculateImpact: (sourceTrackerId: number, targetTrackerId: number, offsetDays: number) => Promise<EnhancedCorrelationResult | Partial<EnhancedCorrelationResult>>
  getStats: (request?: StatsQueryRequest) => Promise<StatsQueryResponse>
  getCorrelationResult: (request: CorrelationQueryRequest) => Promise<CorrelationResultResponse>
  getTags: () => Promise<Tag[]>
  createTag: (data: { name: string; color?: string | null }) => Promise<Tag | null>
  updateTag: (id: number, updates: { name?: string; color?: string | null }) => Promise<Tag | null>
  deleteTag: (id: number) => Promise<boolean>
  getTagTree: () => Promise<ResolvedTagTreeResponse>
  updateTagRelationships: (input: TagRelationship[] | { relationships: TagRelationship[] }) => Promise<ResolvedTagTreeResponse>
  resolveTagInheritance: (input: number[] | { tagIds: number[] }) => Promise<ResolveTagInheritanceResponse>
  addWeightEntry: (data: CreateWeightEntryRequest) => Promise<WeightEntryResponse | null>
  updateWeightEntry: (entryId: number, updates: UpdateWeightEntryRequest) => Promise<WeightEntryResponse | null>
  deleteWeightEntry: (entryId: number) => Promise<boolean>
  getWeightDetail: (trackerId: number, options?: { limit?: number }) => Promise<WeightDetailResponse>
  addFoodEntry: (data: CreateFoodEntryRequest) => Promise<FoodEntryResponse | null>
  updateFoodEntry: (entryId: number, updates: UpdateFoodEntryRequest) => Promise<FoodEntryResponse | null>
  deleteFoodEntry: (entryId: number) => Promise<boolean>
  getFoodDetail: (trackerId: number, options?: { limit?: number }) => Promise<FoodDetailResponse>
  addIntakeEntry: (data: CreateIntakeEntryRequest) => Promise<IntakeEntryResponse | null>
  updateIntakeEntry: (entryId: number, updates: UpdateIntakeEntryRequest) => Promise<IntakeEntryResponse | null>
  deleteIntakeEntry: (entryId: number) => Promise<boolean>
  getIntakeDetail: (trackerId: number, options?: { limit?: number }) => Promise<IntakeDetailResponse>
  getIntakeHomeWidget: (trackerId: number, options?: { selectedDate?: string; limit?: number }) => Promise<IntakeHomeWidgetReadModel>
  addHealthSymptomEntry: (data: CreateHealthSymptomRequest) => Promise<HealthSymptomResponse | null>
  updateHealthSymptomEntry: (entryId: number, updates: UpdateHealthSymptomRequest) => Promise<HealthSymptomResponse | null>
  deleteHealthSymptomEntry: (entryId: number) => Promise<boolean>
  getHealthDetail: (trackerId: number, options?: { limit?: number }) => Promise<HealthDetailResponse>
  getHealthHomeWidget: (trackerId: number, options?: { selectedDate?: string; limit?: number }) => Promise<HealthHomeWidgetReadModel>
  getWeightGoal: (trackerId: number) => Promise<TrackerGoalResponse>
  setWeightGoal: (data: SetTrackerGoalRequest) => Promise<TrackerGoalResponse>
  addGamingEntry: (data: CreateGamingEntryRequest) => Promise<GamingEntryResponse | null>
  updateGamingEntry: (entryId: number, updates: UpdateGamingEntryRequest) => Promise<GamingEntryResponse | null>
  getGamingDetail: (trackerId: number, options?: { limit?: number }) => Promise<GamingDetailResponse>
  getBook: (bookId: number) => Promise<BookResponse | null>
  getBooks: () => Promise<Book[]>
  createBook: (data: CreateBookRequest) => Promise<BookResponse | null>
  startBook: (data: CreateBookActivityRequest) => Promise<BookActivityResponse | null>
  readBook: (data: CreateBookActivityRequest) => Promise<BookActivityResponse | null>
  finishBook: (data: CreateBookActivityRequest) => Promise<BookActivityResponse | null>
  updateBook: (bookId: number, updates: UpdateBookRequest) => Promise<BookResponse | null>
  updateBookReadActivity: (entryId: number, updates: UpdateBookActivityRequest) => Promise<BookActivityResponse | null>
  deleteBookReadActivity: (entryId: number) => Promise<boolean>
  getBookHistory: (trackerId: number, options?: { limit?: number }) => Promise<BookHistoryItem[]>
  getBookStats: (trackerId: number, options?: { limit?: number }) => Promise<BookStatisticsReadModel>
  getBookSelectedDaySummary: (trackerId: number, selectedDate: string, options?: { limit?: number }) => Promise<BookSelectedDaySummaryReadModel>
  getContacts: () => Promise<Contact[]>
  getContact: (id: number) => Promise<Contact | null>
  createContact: (data: ContactInsert) => Promise<Contact | null>
  updateContact: (id: number, updates: ContactUpdate) => Promise<Contact | null>
  deleteContact: (id: number) => Promise<{ success: boolean }>
  createContactInteraction: (data: ContactInteractionInsert) => Promise<ContactInteraction | null>
  getContactInteractions: (contactId: number) => Promise<ContactInteraction[]>
  searchExercises: (query: string, limit?: number) => Promise<Exercise[]>
  getAllExercises: (limit?: number) => Promise<Exercise[]>
  getExerciseDbStatus: () => Promise<ExerciseDbSnapshot>
}
