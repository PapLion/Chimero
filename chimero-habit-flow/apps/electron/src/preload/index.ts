import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getTrackers: () => ipcRenderer.invoke('get-trackers'),
  createTracker: (data: { name: string; type: string; icon?: string; color?: string; config?: Record<string, unknown> }) =>
    ipcRenderer.invoke('create-tracker', data),
  deleteTracker: (id: number) => ipcRenderer.invoke('delete-tracker', id),
  getEntries: (options?: { limit?: number; trackerId?: number }) =>
    ipcRenderer.invoke('get-entries', options),
  addEntry: (data: { trackerId: number; value?: number | null; note?: string | null; metadata?: Record<string, unknown>; timestamp: number; assetId?: number | null }) =>
    ipcRenderer.invoke('add-entry', data),
  updateEntry: (id: number, updates: { value?: number | null; note?: string | null; timestamp?: number; assetId?: number | null }) =>
    ipcRenderer.invoke('update-entry', id, updates),
  deleteEntry: (id: number) => ipcRenderer.invoke('delete-entry', id),
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
    updates: { order?: number; isFavorite?: boolean; name?: string; icon?: string | null; color?: string | null; type?: string; config?: Record<string, unknown> }
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
  // Contacts (Personal CRM)
  getContacts: () => ipcRenderer.invoke('get-contacts'),
  getContact: (id: number) => ipcRenderer.invoke('get-contact', id),
  createContact: (data: { name: string; avatarAssetId?: number | null; birthday?: string | null; dateMet?: string | null; notes?: string | null }) =>
    ipcRenderer.invoke('create-contact', data),
  updateContact: (id: number, updates: { name?: string; avatarAssetId?: number | null; birthday?: string | null; dateMet?: string | null; dateLastTalked?: string | null; traits?: string[] | null; notes?: string | null }) =>
    ipcRenderer.invoke('update-contact', id, updates),
  deleteContact: (id: number) => ipcRenderer.invoke('delete-contact', id),
  createContactInteraction: (data: { contactId: number; entryId?: number | null; mood: "positive" | "negative" | "neutral"; notes?: string | null }) =>
    ipcRenderer.invoke('create-contact-interaction', data),
  getContactInteractions: (contactId: number) => ipcRenderer.invoke('get-contact-interactions', contactId),
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
    ; (window as Window & { api: typeof api }).api = api
}