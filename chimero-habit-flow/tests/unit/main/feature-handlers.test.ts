import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  handleMock: vi.fn(),
  showOpenDialogMock: vi.fn(),
  showSaveDialogMock: vi.fn(),
  getPathMock: vi.fn(() => 'C:\\Users\\Dani\\AppData\\Local\\Chimero'),
  fetchMock: vi.fn(),
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: mocks.handleMock,
  },
  dialog: {
    showOpenDialog: mocks.showOpenDialogMock,
    showSaveDialog: mocks.showSaveDialogMock,
  },
  app: {
    getPath: mocks.getPathMock,
  },
  net: {
    fetch: mocks.fetchMock,
  },
}))

vi.mock('@packages/db/database', () => ({
  getDb: vi.fn(),
}))

const featureCases = [
  {
    name: 'tracking',
    modulePath: '../../../apps/electron/src/main/features/tracking/handler',
    exportName: 'registerTrackingHandlers',
    channels: [
      'get-trackers',
      'create-tracker',
      'delete-tracker',
      'get-recent-trackers',
      'get-favorite-trackers',
      'toggle-tracker-favorite',
      'get-dashboard-stats',
      'get-dashboard-layout',
      'save-dashboard-layout',
      'reorder-trackers',
      'update-tracker',
      'calculate-impact',
      'get-stats',
      'get-correlation-result',
      'get-mood-daily-aggregates',
    ],
  },
  {
    name: 'tags',
    modulePath: '../../../apps/electron/src/main/features/tags/handler',
    exportName: 'registerTagHandlers',
    channels: [
      'get-tags',
      'create-tag',
      'update-tag',
      'delete-tag',
      'get-tag-tree',
      'update-tag-relationships',
      'resolve-tag-inheritance',
    ],
  },
  {
    name: 'weight',
    modulePath: '../../../apps/electron/src/main/features/weight/handler',
    exportName: 'registerWeightHandlers',
    channels: [
      'add-weight-entry',
      'update-weight-entry',
      'delete-weight-entry',
      'get-weight-detail',
      'get-weight-goal',
      'set-weight-goal',
    ],
  },
  {
    name: 'entry',
    modulePath: '../../../apps/electron/src/main/features/entry/handler',
    exportName: 'registerEntryHandlers',
    channels: [
      'get-entries',
      'add-entry',
      'update-entry',
      'delete-entry',
      'get-task-entries',
      'get-quick-entry-context',
    ],
  },
  {
    name: 'gaming',
    modulePath: '../../../apps/electron/src/main/features/gaming/handler',
    exportName: 'registerGamingHandlers',
    channels: [
      'add-gaming-entry',
      'update-gaming-entry',
      'get-gaming-detail',
    ],
  },
  {
    name: 'books',
    modulePath: '../../../apps/electron/src/main/features/books/handler',
    exportName: 'registerBooksHandlers',
    channels: [
      'create-book',
      'start-book',
      'read-book',
      'finish-book',
      'update-book',
      'update-book-read-activity',
      'delete-book-read-activity',
      'get-book-history',
      'get-book-stats',
      'get-book-selected-day-summary',
    ],
  },
  {
    name: 'reminders',
    modulePath: '../../../apps/electron/src/main/features/reminders/handler',
    exportName: 'registerReminderHandlers',
    channels: [
      'get-reminders',
      'upsert-reminder',
      'delete-reminder',
      'toggle-reminder',
      'complete-reminder',
      'uncomplete-reminder',
    ],
  },
  {
    name: 'assets',
    modulePath: '../../../apps/electron/src/main/features/assets/handler',
    exportName: 'registerAssetHandlers',
    channels: [
      'open-file-dialog',
      'upload-asset',
      'get-assets',
      'update-asset',
      'delete-asset',
      'download-asset',
    ],
  },
  {
    name: 'contacts',
    modulePath: '../../../apps/electron/src/main/features/contacts/handler',
    exportName: 'registerContactHandlers',
    channels: [
      'get-contacts',
      'get-contact',
      'create-contact',
      'update-contact',
      'delete-contact',
      'create-contact-interaction',
      'get-contact-interactions',
    ],
  },
  {
    name: 'calendar',
    modulePath: '../../../apps/electron/src/main/features/calendar/handler',
    exportName: 'registerCalendarHandlers',
    channels: ['get-calendar-month'],
  },
  {
    name: 'exercises',
    modulePath: '../../../apps/electron/src/main/features/exercises/handler',
    exportName: 'registerExerciseHandlers',
    channels: [
      'search-exercises',
      'get-all-exercises',
      'get-exercise-db-status',
    ],
  },
] as const

describe('backend feature handler modules', () => {
  beforeEach(() => {
    mocks.handleMock.mockClear()
    mocks.showOpenDialogMock.mockClear()
    mocks.showSaveDialogMock.mockClear()
    mocks.getPathMock.mockClear()
    mocks.fetchMock.mockClear()
  })

  for (const feature of featureCases) {
    it(`registers ${feature.name} IPC handlers`, async () => {
      const module = await import(feature.modulePath)
      expect(typeof module[feature.exportName]).toBe('function')

      module[feature.exportName]()

      const registeredChannels = mocks.handleMock.mock.calls.map(([channel]) => channel)
      for (const channel of feature.channels) {
        expect(registeredChannels).toContain(channel)
      }
    })
  }
})
