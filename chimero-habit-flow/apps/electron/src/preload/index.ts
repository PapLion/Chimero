import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getTrackers: () => ipcRenderer.invoke('get-trackers'),
  createTracker: (data: { name: string; type: string; icon?: string; color?: string; config?: Record<string, unknown> }) =>
    ipcRenderer.invoke('create-tracker', data),
  deleteTracker: (id: number) => ipcRenderer.invoke('delete-tracker', id),
  getEntries: (options?: { limit?: number; trackerId?: number }) =>
    ipcRenderer.invoke('get-entries', options),
  addEntry: (data: { trackerId: number; value?: number; metadata?: Record<string, unknown>; timestamp: number }) =>
    ipcRenderer.invoke('add-entry', data),
  getRecentTrackers: (limit?: number) => ipcRenderer.invoke('get-recent-trackers', limit ?? 10),
  getFavoriteTrackers: () => ipcRenderer.invoke('get-favorite-trackers'),
  toggleTrackerFavorite: (trackerId: number) => ipcRenderer.invoke('toggle-tracker-favorite', trackerId),
  getMoodDailyAggregates: (options?: { trackerId?: number; days?: number }) =>
    ipcRenderer.invoke('get-mood-daily-aggregates', options),
  getTaskEntries: (trackerId: number, options?: { limit?: number }) =>
    ipcRenderer.invoke('get-task-entries', trackerId, options),
  getAssets: (options?: { limit?: number; offset?: number }) =>
    ipcRenderer.invoke('get-assets', options),
  getDashboardLayout: () => ipcRenderer.invoke('get-dashboard-layout'),
  saveDashboardLayout: (layout: Array<{ id: string; trackerId: number; position: number; size: string }>) =>
    ipcRenderer.invoke('save-dashboard-layout', layout),
  updateTracker: (
    id: number,
    updates: { order?: number; isFavorite?: boolean; name?: string; icon?: string | null; color?: string | null; type?: string; config?: Record<string, unknown> }
  ) => ipcRenderer.invoke('update-tracker', id, updates),
}

// Exponer la API al mundo principal (Window object)
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        // Exponemos invoke de forma segura
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
        on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
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
  // @ts-expect-error fallback when contextIsolation is disabled
  window.api = api
}