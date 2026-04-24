/**
 * Contrato único de la API expuesta por preload (`window.api`).
 * Renderer y preload importan este tipo; la implementación vive en preload + ipc-handlers.
 */
import type {
  Asset,
  Contact,
  ContactInteraction,
  ContactInteractionInsert,
  ContactInsert,
  ContactUpdate,
  Entry,
  EntryInsert,
  EnhancedCorrelationResult,
  Reminder,
  ReminderInsert,
  Tracker,
} from '../../db/src/index'

export type DashboardWidgetLayout = {
  id: string
  trackerId: number
  position: number
  size: string
}

export type DashboardStats = {
  currentStreak: number
  bestStreak: number
  totalActivities: number
  totalEntriesMonth: number
}

export type CalendarMonthPayload = {
  year: number
  month: number
  entriesByDate: Record<
    string,
    Array<{
      id: number
      trackerId: number
      value: number | null
      note: string | null
      timestamp: number
      dateStr: string
    }>
  >
  activeDays: number[]
}

export type MoodDailyAggregate = { date: string; value: number; count: number }

export type CreateTrackerPayload = {
  name: string
  type: string
  icon?: string
  color?: string
  config?: Record<string, unknown>
}

export type UpdateTrackerPayload = {
  order?: number
  isFavorite?: boolean
  name?: string
  icon?: string | null
  color?: string | null
  type?: string
  config?: Record<string, unknown>
}

export type UpsertReminderPayload = ReminderInsert & { id?: number }

export type ExerciseDbStatus = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  count: number
  error: string | null
  progress: number
}

/** Fila de la tabla local de ejercicios (sin esquema Drizzle dedicado en repo). */
export type ExerciseRow = Record<string, unknown>

export type AssetWithUrls = Asset & { assetUrl: string; thumbnailUrl: string }

/** add-entry calcula dateStr en main a partir de timestamp. */
export type AddEntryPayload = Omit<EntryInsert, 'dateStr'>

export interface ChimeroElectronApi {
  getTrackers: () => Promise<Tracker[]>
  createTracker: (data: CreateTrackerPayload) => Promise<Tracker | null>
  deleteTracker: (id: number) => Promise<boolean>
  getEntries: (options?: { limit?: number; trackerId?: number }) => Promise<Entry[]>
  addEntry: (data: AddEntryPayload) => Promise<Entry | null>
  updateEntry: (
    id: number,
    updates: { value?: number | null; note?: string | null; timestamp?: number; assetId?: number | null }
  ) => Promise<Entry | null>
  deleteEntry: (id: number) => Promise<boolean>
  getRecentTrackers: (limit?: number) => Promise<Tracker[]>
  getFavoriteTrackers: () => Promise<Tracker[]>
  toggleTrackerFavorite: (trackerId: number) => Promise<Tracker | null>
  getDashboardStats: () => Promise<DashboardStats>
  getCalendarMonth: (year: number, month: number) => Promise<CalendarMonthPayload>
  getMoodDailyAggregates: (options?: { trackerId?: number; days?: number }) => Promise<MoodDailyAggregate[]>
  getTaskEntries: (trackerId: number, options?: { limit?: number }) => Promise<Entry[]>
  getAssets: (options?: { limit?: number; offset?: number }) => Promise<AssetWithUrls[]>
  openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<{ path: string | null }>
  uploadAsset: (sourcePath: string) => Promise<AssetWithUrls | null>
  updateAsset: (id: number, updates: { originalName?: string | null }) => Promise<AssetWithUrls | null>
  deleteAsset: (id: number) => Promise<boolean>
  downloadAsset: (id: number, suggestedName: string) => Promise<{ ok: boolean; path?: string; error?: string; canceled?: boolean }>
  getDashboardLayout: () => Promise<DashboardWidgetLayout[] | null>
  saveDashboardLayout: (layout: DashboardWidgetLayout[]) => Promise<boolean>
  updateTracker: (id: number, updates: UpdateTrackerPayload) => Promise<Tracker | null>
  reorderTrackers: (ids: number[]) => Promise<boolean>
  getReminders: () => Promise<Reminder[]>
  upsertReminder: (data: UpsertReminderPayload) => Promise<Reminder | null>
  deleteReminder: (id: number) => Promise<boolean>
  toggleReminder: (id: number, enabled: boolean) => Promise<Reminder | null>
  completeReminder: (id: number) => Promise<Reminder | null>
  uncompleteReminder: (id: number) => Promise<Reminder | null>
  calculateImpact: (
    sourceTrackerId: number,
    targetTrackerId: number,
    offsetDays: number
  ) => Promise<EnhancedCorrelationResult | Partial<EnhancedCorrelationResult>>
  getContacts: () => Promise<Contact[]>
  getContact: (id: number) => Promise<Contact | null>
  createContact: (data: ContactInsert) => Promise<Contact | null>
  updateContact: (id: number, updates: ContactUpdate) => Promise<Contact | null>
  deleteContact: (id: number) => Promise<{ success: boolean }>
  createContactInteraction: (data: ContactInteractionInsert) => Promise<ContactInteraction | null>
  getContactInteractions: (contactId: number) => Promise<ContactInteraction[]>
  searchExercises: (query: string, limit?: number) => Promise<ExerciseRow[]>
  getAllExercises: (limit?: number) => Promise<ExerciseRow[]>
  getExerciseDbStatus: () => Promise<ExerciseDbStatus>

  /** Maintenance operation: recalculates `entries.dateStr` from `timestamp` using local-time rule. */
  maintenanceRecalculateEntryDateStr: () => Promise<{ updated: number; total: number }>
}
