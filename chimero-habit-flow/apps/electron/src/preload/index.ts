import { contextBridge, ipcRenderer } from 'electron'
import type { ChimeroElectronApi } from 'shared'

/** Implementación IPC; el contrato tipado vive en `shared` (main + preload + renderer). */
const api: ChimeroElectronApi = {
  getTrackers: () => ipcRenderer.invoke('get-trackers'),
  createTracker: (data) => ipcRenderer.invoke('create-tracker', data),
  deleteTracker: (id) => ipcRenderer.invoke('delete-tracker', id),
  getEntries: (options) => ipcRenderer.invoke('get-entries', options),
  addEntry: (data) => ipcRenderer.invoke('add-entry', data),
  updateEntry: (id, updates) => ipcRenderer.invoke('update-entry', id, updates),
  deleteEntry: (id) => ipcRenderer.invoke('delete-entry', id),
  getRecentTrackers: (limit) => ipcRenderer.invoke('get-recent-trackers', limit ?? 10),
  getFavoriteTrackers: () => ipcRenderer.invoke('get-favorite-trackers'),
  toggleTrackerFavorite: (trackerId) => ipcRenderer.invoke('toggle-tracker-favorite', trackerId),
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  getCalendarMonth: (year, month) => ipcRenderer.invoke('get-calendar-month', year, month),
  getMoodDailyAggregates: (options) => ipcRenderer.invoke('get-mood-daily-aggregates', options),
  getTaskEntries: (trackerId, options) => ipcRenderer.invoke('get-task-entries', trackerId, options),
  getAssets: (options) => ipcRenderer.invoke('get-assets', options),
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  uploadAsset: (sourcePath) => ipcRenderer.invoke('upload-asset', sourcePath),
  updateAsset: (id, updates) => ipcRenderer.invoke('update-asset', id, updates),
  deleteAsset: (id) => ipcRenderer.invoke('delete-asset', id),
  downloadAsset: (id, suggestedName) => ipcRenderer.invoke('download-asset', id, suggestedName),
  getDashboardLayout: () => ipcRenderer.invoke('get-dashboard-layout'),
  saveDashboardLayout: (layout) => ipcRenderer.invoke('save-dashboard-layout', layout),
  updateTracker: (id, updates) => ipcRenderer.invoke('update-tracker', id, updates),
  reorderTrackers: (ids) => ipcRenderer.invoke('reorder-trackers', ids),
  getReminders: () => ipcRenderer.invoke('get-reminders'),
  upsertReminder: (data) => ipcRenderer.invoke('upsert-reminder', data),
  deleteReminder: (id) => ipcRenderer.invoke('delete-reminder', id),
  toggleReminder: (id, enabled) => ipcRenderer.invoke('toggle-reminder', id, enabled),
  completeReminder: (id) => ipcRenderer.invoke('complete-reminder', id),
  uncompleteReminder: (id) => ipcRenderer.invoke('uncomplete-reminder', id),
  calculateImpact: (sourceTrackerId, targetTrackerId, offsetDays) =>
    ipcRenderer.invoke('calculate-impact', sourceTrackerId, targetTrackerId, offsetDays),
  getContacts: () => ipcRenderer.invoke('get-contacts'),
  getContact: (id) => ipcRenderer.invoke('get-contact', id),
  createContact: (data) => ipcRenderer.invoke('create-contact', data),
  updateContact: (id, updates) => ipcRenderer.invoke('update-contact', id, updates),
  deleteContact: (id) => ipcRenderer.invoke('delete-contact', id),
  createContactInteraction: (data) => ipcRenderer.invoke('create-contact-interaction', data),
  getContactInteractions: (contactId) => ipcRenderer.invoke('get-contact-interactions', contactId),
  searchExercises: (query, limit) => ipcRenderer.invoke('search-exercises', { query, limit }),
  getAllExercises: (limit) => ipcRenderer.invoke('get-all-exercises', { limit }),
  getExerciseDbStatus: () => ipcRenderer.invoke('get-exercise-db-status'),
  maintenanceRecalculateEntryDateStr: () => ipcRenderer.invoke('maintenance-recalculate-entry-datestr'),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
        on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => {
          ipcRenderer.on(channel, listener)
          return () => ipcRenderer.removeListener(channel, listener)
        },
      },
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error fallback when contextIsolation is disabled
  window.electron = {
    ipcRenderer: { invoke: ipcRenderer.invoke.bind(ipcRenderer), on: ipcRenderer.on.bind(ipcRenderer) },
  }
  ;(window as Window & { api: ChimeroElectronApi }).api = api
}
