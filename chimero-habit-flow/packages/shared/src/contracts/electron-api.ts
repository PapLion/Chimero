import type {
  Asset,
  BaseEntryRequest,
  Contact,
  ContactInteraction,
  ContactProfileBlock,
  ContactProfileBlockInput,
  ContactInsert,
  ContactReminderSettings,
  ContactReminderSettingsInput,
  ContactUpdate,
  ContactInteractionInsert,
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
  CreateWorkoutRoutineRequest,
  CreateWorkoutSessionRequest,
  DeleteWorkoutRoutineResponse,
  ExerciseProgressReadModel,
  InstantiateWorkoutFromRoutineRequest,
  ListWorkoutRoutinesResponse,
  SaveWorkoutAsRoutineRequest,
  UpdateWorkoutRoutineRequest,
  UpdateWorkoutSessionRequest,
  WorkoutCalendarReadModel,
  WorkoutGraphReadModel,
  WorkoutHistoryReadModel,
  WorkoutHomeReadModel,
  WorkoutRoutineDetailResponse,
  WorkoutSessionDetailResponse,
  WorkoutStatisticsReadModel,
} from './app-types'
import type { AnalyticsRange, MetricDescriptor, OverviewResponse, PairAnalysis, PairRequest, ScanRequest, ScanResult, SeriesRequest, SeriesResponse } from './analytics'
import type { AppInfo, AppPreferences, DataFileResult } from './settings'
import type { DashboardLayoutV2 } from './dashboard'
import type { CalendarMonthData } from '../features/calendar'
import type { AssetWithUrls } from '../features/assets'
import type { Exercise, ExerciseDbSnapshot } from '../features/exercises'

export interface WindowState {
  maximized: boolean
  fullscreen: boolean
}

export interface ElectronApi {
  platform: string
  // Window
  minimizeWindow: () => Promise<void>
  toggleMaximizeWindow: () => Promise<boolean>
  closeWindow: () => Promise<void>
  isWindowMaximized: () => Promise<boolean>
  onWindowState: (listener: (state: WindowState) => void) => () => void
  onReminder: (listener: (reminder: { id: number; title: string }) => void) => () => void
  // Preferences, layout, data
  getPreferences: () => Promise<AppPreferences>
  updatePreferences: (patch: Partial<AppPreferences>) => Promise<AppPreferences>
  getAppInfo: () => Promise<AppInfo>
  getDashboardLayout: () => Promise<DashboardLayoutV2>
  saveDashboardLayout: (layout: DashboardLayoutV2) => Promise<DashboardLayoutV2>
  getDefaultDashboardLayout: () => Promise<DashboardLayoutV2>
  exportJson: (targetPath?: string) => Promise<DataFileResult>
  exportCsv: (targetPath?: string) => Promise<DataFileResult>
  backupDatabase: (targetPath?: string) => Promise<DataFileResult>
  restoreDatabase: (sourcePath?: string) => Promise<DataFileResult>
  openDataFolder: () => Promise<boolean>
  // Insight Lab
  getMetrics: () => Promise<MetricDescriptor[]>
  getSeries: (request: SeriesRequest) => Promise<SeriesResponse>
  analyzePair: (request: PairRequest) => Promise<PairAnalysis | null>
  scanRelationships: (request: ScanRequest) => Promise<ScanResult>
  getOverview: (range: AnalyticsRange) => Promise<OverviewResponse>
  // Trackers and entries
  getArchivedTrackers: () => Promise<Tracker[]>
  getTrackers: () => Promise<Tracker[]>
  createTracker: (data: { name: string; type: string; icon?: string; color?: string; config?: TrackerConfig }) => Promise<Tracker | null>
  deleteTracker: (id: number) => Promise<boolean>
  getEntries: (options?: { limit?: number; trackerId?: number; from?: string; to?: string; id?: number }) => Promise<Entry[]>
  addEntry: (data: BaseEntryRequest) => Promise<Entry | null>
  updateEntry: (id: number, updates: EntryUpdateRequest) => Promise<Entry | null>
  deleteEntry: (id: number) => Promise<boolean>
  getQuickEntryContext: () => Promise<QuickEntryContextResponse>
  getRecentTrackers: (limit?: number) => Promise<Tracker[]>
  getFavoriteTrackers: () => Promise<Tracker[]>
  toggleTrackerFavorite: (trackerId: number) => Promise<Tracker | null>
  getCalendarMonth: (year: number, month: number) => Promise<CalendarMonthData>
  getTaskEntries: (trackerId: number, options?: { limit?: number }) => Promise<Entry[]>
  getAssets: (options?: { limit?: number; offset?: number }) => Promise<AssetWithUrls[]>
  openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<{ path: string | null }>
  uploadAsset: (sourcePath: string) => Promise<AssetWithUrls | null>
  updateAsset: (id: number, updates: { originalName?: string | null }) => Promise<Asset | null>
  deleteAsset: (id: number) => Promise<boolean>
  downloadAsset: (id: number, suggestedName: string) => Promise<{ ok: boolean; path?: string; error?: string; canceled?: boolean }>
  updateTracker: (
    id: number,
    updates: { order?: number; isFavorite?: boolean; archived?: boolean; name?: string; icon?: string | null; color?: string | null; type?: string; config?: TrackerConfig }
  ) => Promise<Tracker | null>
  reorderTrackers: (ids: number[]) => Promise<boolean>
  getReminders: () => Promise<Reminder[]>
  upsertReminder: (data: ReminderInsert & { id?: number }) => Promise<Reminder | null>
  deleteReminder: (id: number) => Promise<boolean>
  toggleReminder: (id: number, enabled: boolean) => Promise<Reminder | null>
  completeReminder: (id: number) => Promise<Reminder | null>
  uncompleteReminder: (id: number) => Promise<Reminder | null>
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
  getWorkoutSession: (entryId: number) => Promise<WorkoutSessionDetailResponse | null>
  getWorkoutHistory: (trackerId: number, options?: { limit?: number }) => Promise<WorkoutHistoryReadModel>
  createWorkoutSession: (data: CreateWorkoutSessionRequest) => Promise<WorkoutSessionDetailResponse | null>
  updateWorkoutSession: (entryId: number, updates: UpdateWorkoutSessionRequest) => Promise<WorkoutSessionDetailResponse | null>
  deleteWorkoutSession: (entryId: number) => Promise<boolean>
  getWorkoutRoutines: (trackerId: number) => Promise<ListWorkoutRoutinesResponse>
  getWorkoutRoutine: (routineId: number) => Promise<WorkoutRoutineDetailResponse | null>
  createWorkoutRoutine: (data: CreateWorkoutRoutineRequest) => Promise<WorkoutRoutineDetailResponse | null>
  updateWorkoutRoutine: (routineId: number, updates: UpdateWorkoutRoutineRequest) => Promise<WorkoutRoutineDetailResponse | null>
  deleteWorkoutRoutine: (routineId: number) => Promise<DeleteWorkoutRoutineResponse>
  instantiateWorkoutFromRoutine: (data: InstantiateWorkoutFromRoutineRequest) => Promise<CreateWorkoutSessionRequest | null>
  saveWorkoutAsRoutine: (data: SaveWorkoutAsRoutineRequest) => Promise<WorkoutRoutineDetailResponse | null>
  getWorkoutHome: (trackerId: number) => Promise<WorkoutHomeReadModel | null>
  getWorkoutStatistics: (trackerId: number) => Promise<WorkoutStatisticsReadModel | null>
  getWorkoutGraph: (trackerId: number) => Promise<WorkoutGraphReadModel | null>
  getWorkoutCalendar: (trackerId: number, year: number, month: number) => Promise<WorkoutCalendarReadModel>
  getExerciseProgress: (trackerId: number, exerciseId: string) => Promise<ExerciseProgressReadModel | null>
  getContacts: (options?: { sortBy?: 'name' | 'most-talked-to' | 'least-talked-to' | 'most-recently-talked-to' }) => Promise<Contact[]>
  getContact: (id: number) => Promise<Contact | null>
  createContact: (data: ContactInsert) => Promise<Contact | null>
  updateContact: (id: number, updates: ContactUpdate) => Promise<Contact | null>
  deleteContact: (id: number) => Promise<{ success: boolean }>
  createContactInteraction: (data: ContactInteractionInsert) => Promise<ContactInteraction | null>
  getContactInteractions: (contactId: number) => Promise<ContactInteraction[]>
  getContactReminderSettings: (contactId: number) => Promise<ContactReminderSettings | null>
  upsertContactReminderSettings: (data: ContactReminderSettingsInput) => Promise<ContactReminderSettings | null>
  getContactProfileBlocks: (contactId: number) => Promise<ContactProfileBlock[]>
  createContactProfileBlock: (data: ContactProfileBlockInput) => Promise<ContactProfileBlock | null>
  updateContactProfileBlock: (id: number, updates: Partial<ContactProfileBlockInput>) => Promise<ContactProfileBlock | null>
  deleteContactProfileBlock: (id: number, contactId?: number) => Promise<boolean>
  reorderContactProfileBlocks: (contactId: number, ids: number[]) => Promise<ContactProfileBlock[]>
  searchExercises: (query: string, limit?: number) => Promise<Exercise[]>
  getAllExercises: (limit?: number) => Promise<Exercise[]>
  getExerciseDbStatus: () => Promise<ExerciseDbSnapshot>
}
