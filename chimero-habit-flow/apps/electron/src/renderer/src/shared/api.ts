/**
 * Runtime API layer for Chimero.
 *
 * Electron renderer: uses the preload-injected window.api IPC contract.
 * Browser renderer: uses same-origin HTTP endpoints under /api.
 */

import type { ElectronApi } from '@contracts/contracts'

declare global {
  interface Window {
    api?: ElectronApi
  }
}

type QueryValue = string | number | boolean | null | undefined
type QueryParams = Record<string, QueryValue | QueryValue[]>

function queryString(params?: QueryParams): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) search.append(key, String(item))
      }
    } else {
      search.set(key, String(value))
    }
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(path, {
    method: init.method ?? 'GET',
    headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const payload = await response.json() as { error?: string }
      if (payload.error) detail = payload.error
    } catch {
      // Keep status text when the response is not JSON.
    }
    throw new Error(`Web API request failed (${response.status}): ${detail}`)
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}

function unsupported<T>(message: string): Promise<T> {
  return Promise.reject(new Error(message))
}

const webApi: ElectronApi = {
  getTrackers: () => request('/api/trackers'),
  createTracker: (data) => request('/api/trackers', { method: 'POST', body: data }),
  deleteTracker: (id) => request(`/api/trackers/${id}`, { method: 'DELETE' }),
  getEntries: (options) => request(`/api/entries${queryString(options)}`),
  addEntry: (data) => request('/api/entries', { method: 'POST', body: data }),
  updateEntry: (id, updates) => request(`/api/entries/${id}`, { method: 'PUT', body: updates }),
  deleteEntry: (id) => request(`/api/entries/${id}`, { method: 'DELETE' }),
  getQuickEntryContext: () => request('/api/quick-entry/context'),
  getRecentTrackers: (limit) => request(`/api/trackers/recent${queryString({ limit })}`),
  getFavoriteTrackers: () => request('/api/trackers/favorites'),
  toggleTrackerFavorite: (trackerId) => request(`/api/trackers/${trackerId}/favorite`, { method: 'POST' }),
  getDashboardStats: () => request('/api/dashboard/stats'),
  getCalendarMonth: (year, month) => request(`/api/calendar/${year}/${month}`),
  getMoodDailyAggregates: (options) => request(`/api/mood/daily-aggregates${queryString(options)}`),
  getTaskEntries: (trackerId, options) => request(`/api/trackers/${trackerId}/task-entries${queryString(options)}`),
  getAssets: (options) => request(`/api/assets${queryString(options)}`),
  openFileDialog: () => unsupported('Native file dialogs are only available in Electron'),
  uploadAsset: () => unsupported('Path-based asset upload is only available in Electron'),
  updateAsset: (id, updates) => request(`/api/assets/${id}`, { method: 'PUT', body: updates }),
  deleteAsset: (id) => request(`/api/assets/${id}`, { method: 'DELETE' }),
  downloadAsset: () => unsupported('Native asset download dialogs are only available in Electron'),
  getDashboardLayout: () => request('/api/dashboard/layout'),
  saveDashboardLayout: (layout) => request('/api/dashboard/layout', { method: 'PUT', body: layout }),
  updateTracker: (id, updates) => request(`/api/trackers/${id}`, { method: 'PUT', body: updates }),
  reorderTrackers: (ids) => request('/api/trackers/reorder', { method: 'PUT', body: ids }),
  getReminders: () => request('/api/reminders'),
  upsertReminder: (data) => request('/api/reminders', { method: 'POST', body: data }),
  deleteReminder: (id) => request(`/api/reminders/${id}`, { method: 'DELETE' }),
  toggleReminder: (id, enabled) => request(`/api/reminders/${id}/toggle`, { method: 'POST', body: { enabled } }),
  completeReminder: (id) => request(`/api/reminders/${id}/complete`, { method: 'POST' }),
  uncompleteReminder: (id) => request(`/api/reminders/${id}/uncomplete`, { method: 'POST' }),
  calculateImpact: (sourceTrackerId, targetTrackerId, offsetDays) =>
    request('/api/correlation/impact', { method: 'POST', body: { sourceTrackerId, targetTrackerId, offsetDays } }),
  getStats: (statsRequest) => request('/api/stats', { method: 'POST', body: statsRequest ?? {} }),
  getCorrelationResult: (correlationRequest) => request('/api/correlation/result', { method: 'POST', body: correlationRequest }),
  getTags: () => request('/api/tags'),
  createTag: (data) => request('/api/tags', { method: 'POST', body: data }),
  updateTag: (id, updates) => request(`/api/tags/${id}`, { method: 'PUT', body: updates }),
  deleteTag: (id) => request(`/api/tags/${id}`, { method: 'DELETE' }),
  getTagTree: () => request('/api/tags/tree'),
  updateTagRelationships: (input) => request('/api/tags/relationships', { method: 'PUT', body: input }),
  resolveTagInheritance: (input) => request('/api/tags/resolve-inheritance', { method: 'POST', body: input }),
  addWeightEntry: (data) => request('/api/weight/entries', { method: 'POST', body: data }),
  updateWeightEntry: (entryId, updates) => request(`/api/weight/entries/${entryId}`, { method: 'PUT', body: updates }),
  deleteWeightEntry: (entryId) => request(`/api/weight/entries/${entryId}`, { method: 'DELETE' }),
  getWeightDetail: (trackerId, options) => request(`/api/weight/trackers/${trackerId}/detail${queryString(options)}`),
  getWeightGoal: (trackerId) => request(`/api/weight/trackers/${trackerId}/goal`),
  setWeightGoal: (data) => request(`/api/weight/trackers/${data.trackerId}/goal`, { method: 'PUT', body: data }),
  addGamingEntry: (data) => request('/api/gaming/entries', { method: 'POST', body: data }),
  updateGamingEntry: (entryId, updates) => request(`/api/gaming/entries/${entryId}`, { method: 'PUT', body: updates }),
  getGamingDetail: (trackerId, options) => request(`/api/gaming/trackers/${trackerId}/detail${queryString(options)}`),
  getBook: (bookId) => request(`/api/books/${bookId}`),
  getBooks: () => request('/api/books'),
  createBook: (data) => request('/api/books', { method: 'POST', body: data }),
  startBook: (data) => request('/api/books/start', { method: 'POST', body: data }),
  readBook: (data) => request('/api/books/read', { method: 'POST', body: data }),
  finishBook: (data) => request('/api/books/finish', { method: 'POST', body: data }),
  updateBook: (bookId, updates) => request(`/api/books/${bookId}`, { method: 'PUT', body: updates }),
  updateBookReadActivity: (entryId, updates) => request(`/api/books/read/${entryId}`, { method: 'PUT', body: updates }),
  deleteBookReadActivity: (entryId) => request(`/api/books/read/${entryId}`, { method: 'DELETE' }),
  getBookHistory: (trackerId, options) => request(`/api/books/trackers/${trackerId}/history${queryString(options)}`),
  getBookStats: (trackerId, options) => request(`/api/books/trackers/${trackerId}/stats${queryString(options)}`),
  getBookSelectedDaySummary: (trackerId, selectedDate, options) =>
    request(`/api/books/trackers/${trackerId}/selected-day/${selectedDate}${queryString(options)}`),
  getContacts: () => request('/api/contacts'),
  getContact: (id) => request(`/api/contacts/${id}`),
  createContact: (data) => request('/api/contacts', { method: 'POST', body: data }),
  updateContact: (id, updates) => request(`/api/contacts/${id}`, { method: 'PUT', body: updates }),
  deleteContact: (id) => request(`/api/contacts/${id}`, { method: 'DELETE' }),
  createContactInteraction: (data) => request(`/api/contacts/${data.contactId}/interactions`, { method: 'POST', body: data }),
  getContactInteractions: (contactId) => request(`/api/contacts/${contactId}/interactions`),
  searchExercises: (query, limit) => request(`/api/exercises/search${queryString({ query, limit })}`),
  getAllExercises: (limit) => request(`/api/exercises${queryString({ limit })}`),
  getExerciseDbStatus: () => request('/api/exercises/status'),
}

export const api: ElectronApi =
  typeof window !== 'undefined' && window.api ? window.api : webApi
