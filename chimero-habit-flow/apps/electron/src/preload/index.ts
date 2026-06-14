import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronApi, TrackerConfig, CreateWorkoutRoutineRequest, CreateWorkoutSessionRequest, InstantiateWorkoutFromRoutineRequest, SaveWorkoutAsRoutineRequest, UpdateWorkoutRoutineRequest, UpdateWorkoutSessionRequest } from '@contracts/contracts'

const api: ElectronApi = {
  getTrackers: () => ipcRenderer.invoke('get-trackers'),
  createTracker: (data: { name: string; type: string; icon?: string; color?: string; config?: TrackerConfig }) =>
    ipcRenderer.invoke('create-tracker', data),
  deleteTracker: (id: number) => ipcRenderer.invoke('delete-tracker', id),
  getEntries: (options?: { limit?: number; trackerId?: number }) =>
    ipcRenderer.invoke('get-entries', options),
  addEntry: (data: { trackerId: number; value?: number | null; note?: string | null; metadata?: Record<string, unknown>; timestamp: number; assetId?: number | null; tagIds?: number[]; socialInteractions?: Array<{ contactId: number; method?: string | null; moodImpact?: "positive" | "negative" | "neutral" | null; mood?: "positive" | "negative" | "neutral" | null; notes?: string | null }> }) =>
    ipcRenderer.invoke('add-entry', data),
  updateEntry: (id: number, updates: { value?: number | null; note?: string | null; metadata?: Record<string, unknown>; timestamp?: number; assetId?: number | null; tagIds?: number[]; socialInteractions?: Array<{ contactId: number; method?: string | null; moodImpact?: "positive" | "negative" | "neutral" | null; mood?: "positive" | "negative" | "neutral" | null; notes?: string | null }> }) =>
    ipcRenderer.invoke('update-entry', id, updates),
  deleteEntry: (id: number) => ipcRenderer.invoke('delete-entry', id),
  getQuickEntryContext: () => ipcRenderer.invoke('get-quick-entry-context'),
  getRecentTrackers: (limit?: number) => ipcRenderer.invoke('get-recent-trackers', limit ?? 10),
  getFavoriteTrackers: () => ipcRenderer.invoke('get-favorite-trackers'),
  toggleTrackerFavorite: (trackerId: number) => ipcRenderer.invoke('toggle-tracker-favorite', trackerId),
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  getCalendarMonth: (year: number, month: number) => ipcRenderer.invoke('get-calendar-month', year, month),
  getMoodDailyAggregates: (options?: { trackerId?: number; days?: number }) =>
    ipcRenderer.invoke('get-mood-daily-aggregates', options),
  getTaskEntries: (trackerId: number, options?: { limit?: number }) =>
    ipcRenderer.invoke('get-task-entries', trackerId, options),
  getAssets: (options?: { limit?: number; offset?: number }) =>
    ipcRenderer.invoke('get-assets', options),
  openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('open-file-dialog', options),
  uploadAsset: (sourcePath: string) => ipcRenderer.invoke('upload-asset', sourcePath),
  updateAsset: (id: number, updates: { originalName?: string | null }) =>
    ipcRenderer.invoke('update-asset', id, updates),
  deleteAsset: (id: number) => ipcRenderer.invoke('delete-asset', id),
  downloadAsset: (id: number, suggestedName: string) => ipcRenderer.invoke('download-asset', id, suggestedName),
  getDashboardLayout: () => ipcRenderer.invoke('get-dashboard-layout'),
  saveDashboardLayout: (layout: Array<{ id: string; trackerId: number; position: number; size: string }>) =>
    ipcRenderer.invoke('save-dashboard-layout', layout),
  updateTracker: (
    id: number,
    updates: { order?: number; isFavorite?: boolean; name?: string; icon?: string | null; color?: string | null; type?: string; config?: TrackerConfig }
  ) => ipcRenderer.invoke('update-tracker', id, updates),
  reorderTrackers: (ids: number[]) => ipcRenderer.invoke('reorder-trackers', ids),
  getReminders: () => ipcRenderer.invoke('get-reminders'),
  upsertReminder: (data: { id?: number; title: string; trackerId?: number | null; time: string; date?: string | null; days?: number[] | null; enabled?: boolean }) =>
    ipcRenderer.invoke('upsert-reminder', data),
  deleteReminder: (id: number) => ipcRenderer.invoke('delete-reminder', id),
  toggleReminder: (id: number, enabled: boolean) => ipcRenderer.invoke('toggle-reminder', id, enabled),
  completeReminder: (id: number) => ipcRenderer.invoke('complete-reminder', id),
  uncompleteReminder: (id: number) => ipcRenderer.invoke('uncomplete-reminder', id),
  calculateImpact: (sourceTrackerId: number, targetTrackerId: number, offsetDays: number) =>
    ipcRenderer.invoke('calculate-impact', sourceTrackerId, targetTrackerId, offsetDays),
  getStats: (request) => ipcRenderer.invoke('get-stats', request),
  getCorrelationResult: (request) => ipcRenderer.invoke('get-correlation-result', request),
  // Tags
  getTags: () => ipcRenderer.invoke('get-tags'),
  createTag: (data) => ipcRenderer.invoke('create-tag', data),
  updateTag: (id, updates) => ipcRenderer.invoke('update-tag', id, updates),
  deleteTag: (id) => ipcRenderer.invoke('delete-tag', id),
  getTagTree: () => ipcRenderer.invoke('get-tag-tree'),
  updateTagRelationships: (input) => ipcRenderer.invoke('update-tag-relationships', input),
  resolveTagInheritance: (input) => ipcRenderer.invoke('resolve-tag-inheritance', input),
  // Weight
  addWeightEntry: (data) => ipcRenderer.invoke('add-weight-entry', data),
  updateWeightEntry: (entryId, updates) => ipcRenderer.invoke('update-weight-entry', entryId, updates),
  deleteWeightEntry: (entryId) => ipcRenderer.invoke('delete-weight-entry', entryId),
  getWeightDetail: (trackerId, options) => ipcRenderer.invoke('get-weight-detail', trackerId, options),
  getWeightGoal: (trackerId) => ipcRenderer.invoke('get-weight-goal', trackerId),
  setWeightGoal: (data) => ipcRenderer.invoke('set-weight-goal', data),
  // Gaming
  addGamingEntry: (data) => ipcRenderer.invoke('add-gaming-entry', data),
  updateGamingEntry: (entryId, updates) => ipcRenderer.invoke('update-gaming-entry', entryId, updates),
  getGamingDetail: (trackerId, options) => ipcRenderer.invoke('get-gaming-detail', trackerId, options),
  // Food
  addFoodEntry: (data) => ipcRenderer.invoke('add-food-entry', data),
  updateFoodEntry: (entryId, updates) => ipcRenderer.invoke('update-food-entry', entryId, updates),
  deleteFoodEntry: (entryId) => ipcRenderer.invoke('delete-food-entry', entryId),
  getFoodDetail: (trackerId, options) => ipcRenderer.invoke('get-food-detail', trackerId, options),
  addIntakeEntry: (data) => ipcRenderer.invoke('add-intake-entry', data),
  updateIntakeEntry: (entryId, updates) => ipcRenderer.invoke('update-intake-entry', entryId, updates),
  deleteIntakeEntry: (entryId) => ipcRenderer.invoke('delete-intake-entry', entryId),
  getIntakeDetail: (trackerId, options) => ipcRenderer.invoke('get-intake-detail', trackerId, options),
  getIntakeHomeWidget: (trackerId, options) => ipcRenderer.invoke('get-intake-home', trackerId, options),
  addHealthSymptomEntry: (data) => ipcRenderer.invoke('add-health-symptom-entry', data),
  updateHealthSymptomEntry: (entryId, updates) => ipcRenderer.invoke('update-health-symptom-entry', entryId, updates),
  deleteHealthSymptomEntry: (entryId) => ipcRenderer.invoke('delete-health-symptom-entry', entryId),
  getHealthDetail: (trackerId, options) => ipcRenderer.invoke('get-health-detail', trackerId, options),
  getHealthHomeWidget: (trackerId, options) => ipcRenderer.invoke('get-health-home', trackerId, options),
  getBook: (bookId: number) => ipcRenderer.invoke('get-book', bookId),
  getBooks: () => ipcRenderer.invoke('get-books'),
  createBook: (data) => ipcRenderer.invoke('create-book', data),
  startBook: (data) => ipcRenderer.invoke('start-book', data),
  readBook: (data) => ipcRenderer.invoke('read-book', data),
  finishBook: (data) => ipcRenderer.invoke('finish-book', data),
  updateBook: (bookId, updates) => ipcRenderer.invoke('update-book', bookId, updates),
  updateBookReadActivity: (entryId, updates) => ipcRenderer.invoke('update-book-read-activity', entryId, updates),
  deleteBookReadActivity: (entryId) => ipcRenderer.invoke('delete-book-read-activity', entryId),
  getBookHistory: (trackerId, options) => ipcRenderer.invoke('get-book-history', trackerId, options),
  getBookStats: (trackerId, options) => ipcRenderer.invoke('get-book-stats', trackerId, options),
  getBookSelectedDaySummary: (trackerId, selectedDate, options) =>
    ipcRenderer.invoke('get-book-selected-day-summary', trackerId, selectedDate, options),
  getWorkoutSession: (entryId: number) => ipcRenderer.invoke('get-workout-session', entryId),
  getWorkoutHistory: (trackerId: number, options?: { limit?: number }) => ipcRenderer.invoke('get-workout-history', trackerId, options),
  createWorkoutSession: (data: CreateWorkoutSessionRequest) => ipcRenderer.invoke('create-workout-session', data),
  updateWorkoutSession: (entryId: number, updates: UpdateWorkoutSessionRequest) => ipcRenderer.invoke('update-workout-session', entryId, updates),
  deleteWorkoutSession: (entryId: number) => ipcRenderer.invoke('delete-workout-session', entryId),
  getWorkoutRoutines: (trackerId: number) => ipcRenderer.invoke('get-workout-routines', trackerId),
  getWorkoutRoutine: (routineId: number) => ipcRenderer.invoke('get-workout-routine', routineId),
  createWorkoutRoutine: (data: CreateWorkoutRoutineRequest) => ipcRenderer.invoke('create-workout-routine', data),
  updateWorkoutRoutine: (routineId: number, updates: UpdateWorkoutRoutineRequest) => ipcRenderer.invoke('update-workout-routine', routineId, updates),
  deleteWorkoutRoutine: (routineId: number) => ipcRenderer.invoke('delete-workout-routine', routineId),
  instantiateWorkoutFromRoutine: (data: InstantiateWorkoutFromRoutineRequest) => ipcRenderer.invoke('instantiate-workout-from-routine', data),
  saveWorkoutAsRoutine: (data: SaveWorkoutAsRoutineRequest) => ipcRenderer.invoke('save-workout-as-routine', data),
  getWorkoutHome: (trackerId: number) => ipcRenderer.invoke('get-workout-home', trackerId),
  getWorkoutStatistics: (trackerId: number) => ipcRenderer.invoke('get-workout-statistics', trackerId),
  getWorkoutGraph: (trackerId: number) => ipcRenderer.invoke('get-workout-graph', trackerId),
  getWorkoutCalendar: (trackerId: number, year: number, month: number) => ipcRenderer.invoke('get-workout-calendar', trackerId, year, month),
  getExerciseProgress: (trackerId: number, exerciseId: string) => ipcRenderer.invoke('get-exercise-progress', trackerId, exerciseId),
  // Contacts (Personal CRM)
  getContacts: (options?: { sortBy?: 'name' | 'most-talked-to' | 'least-talked-to' }) => ipcRenderer.invoke('get-contacts', options),
  getContact: (id: number) => ipcRenderer.invoke('get-contact', id),
  createContact: (data: { name: string; avatarAssetId?: number | null; birthday?: string | null; dateMet?: string | null; likes?: string[] | null; dislikes?: string[] | null; traits?: string[] | null; hasKids?: boolean | null; kidsNotes?: string | null; notes?: string | null }) =>
    ipcRenderer.invoke('create-contact', data),
  updateContact: (id: number, updates: { name?: string; avatarAssetId?: number | null; birthday?: string | null; dateMet?: string | null; dateLastTalked?: string | null; lastTalkedAt?: number | null; likes?: string[] | null; dislikes?: string[] | null; traits?: string[] | null; hasKids?: boolean | null; kidsNotes?: string | null; notes?: string | null }) =>
    ipcRenderer.invoke('update-contact', id, updates),
  deleteContact: (id: number) => ipcRenderer.invoke('delete-contact', id),
  createContactInteraction: (data: { contactId: number; entryId?: number | null; method?: string | null; moodImpact?: "positive" | "negative" | "neutral" | null; mood?: "positive" | "negative" | "neutral" | null; notes?: string | null }) =>
    ipcRenderer.invoke('create-contact-interaction', data),
  getContactInteractions: (contactId: number) => ipcRenderer.invoke('get-contact-interactions', contactId),
  getContactReminderSettings: (contactId: number) => ipcRenderer.invoke('get-contact-reminder-settings', contactId),
  upsertContactReminderSettings: (data) => ipcRenderer.invoke('upsert-contact-reminder-settings', data),
  getContactProfileBlocks: (contactId: number) => ipcRenderer.invoke('get-contact-profile-blocks', contactId),
  createContactProfileBlock: (data) => ipcRenderer.invoke('create-contact-profile-block', data),
  updateContactProfileBlock: (id, updates) => ipcRenderer.invoke('update-contact-profile-block', id, updates),
  deleteContactProfileBlock: (id) => ipcRenderer.invoke('delete-contact-profile-block', id),
  reorderContactProfileBlocks: (contactId, ids) => ipcRenderer.invoke('reorder-contact-profile-blocks', contactId, ids),
  // Exercise DB
  searchExercises: (query: string, limit?: number) => ipcRenderer.invoke('search-exercises', { query, limit }),
  getAllExercises: (limit?: number) => ipcRenderer.invoke('get-all-exercises', { limit }),
  getExerciseDbStatus: () => ipcRenderer.invoke('get-exercise-db-status'),
}

// Exponer la API al mundo principal (Window object)
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        // Exponemos invoke de forma segura
        invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
        on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => {
          ipcRenderer.on(channel, listener)
          return () => ipcRenderer.removeListener(channel, listener)
        }
      }
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error fallback when contextIsolation is disabled
  window.electron = { ipcRenderer: { invoke: ipcRenderer.invoke.bind(ipcRenderer), on: ipcRenderer.on.bind(ipcRenderer) } }
    ; (window as Window & { api: ElectronApi }).api = api
}
