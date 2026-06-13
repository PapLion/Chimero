import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { Entry, Tracker } from '@shared/store'

const mocks = vi.hoisted(() => ({
  useAppStoreMock: vi.fn(),
  useTrackersMock: vi.fn(),
  useEntriesMock: vi.fn(),
  useDeleteEntryMutationMock: vi.fn(),
  useDeleteFoodEntryMutationMock: vi.fn(),
  useDeleteIntakeEntryMutationMock: vi.fn(),
  useDeleteHealthSymptomEntryMutationMock: vi.fn(),
  useUpdateEntryMutationMock: vi.fn(),
  useWeightDetailMock: vi.fn(),
  useTagsMock: vi.fn(),
  useBookMock: vi.fn(),
  useToastMock: vi.fn(),
  setCurrentPageMock: vi.fn(),
  setSelectedContactIdMock: vi.fn(),
  getTrackerIdentityMock: vi.fn(),
  isBooksTrackerMock: vi.fn(),
  usesMediaStyleRenderingMock: vi.fn(),
}))

vi.mock('@shared/store', () => ({
  useAppStore: mocks.useAppStoreMock,
}))

vi.mock('@shared/queries', () => ({
  useTrackers: mocks.useTrackersMock,
  useEntries: mocks.useEntriesMock,
  useDeleteEntryMutation: mocks.useDeleteEntryMutationMock,
  useDeleteFoodEntryMutation: mocks.useDeleteFoodEntryMutationMock,
  useDeleteIntakeEntryMutation: mocks.useDeleteIntakeEntryMutationMock,
  useDeleteHealthSymptomEntryMutation: mocks.useDeleteHealthSymptomEntryMutationMock,
  useUpdateEntryMutation: mocks.useUpdateEntryMutationMock,
  useWeightDetail: mocks.useWeightDetailMock,
  useTags: mocks.useTagsMock,
  useBook: mocks.useBookMock,
}))

vi.mock('@shared/components/toast', () => ({
  formatToastError: (value: unknown) => String(value),
  useToast: mocks.useToastMock,
}))

vi.mock('@contracts/features/tracking', () => ({
  getTrackerIdentity: mocks.getTrackerIdentityMock,
  isBooksTracker: mocks.isBooksTrackerMock,
  usesMediaStyleRendering: mocks.usesMediaStyleRenderingMock,
}))

vi.mock('@features/entry/modals/EditEntryDialog', () => ({
  EditEntryDialog: () => null,
}))

vi.mock('@features/books/components/BookEntryDialog', () => ({
  BookEntryDialog: () => null,
}))

vi.mock('@shared/components/ConfirmDeleteDialog', () => ({
  ConfirmDeleteDialog: () => null,
}))

vi.mock('@features/tags/components/TagChips', () => ({
  TagChips: () => null,
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: { children: ReactNode }) => <div {...props}>{children}</div>,
  },
}))

vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Area: () => null,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Bar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Cell: () => null,
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
}))

import { TrackerDetailView } from '../../../apps/electron/src/renderer/src/features/tracking/components/TrackerDetailView'

describe('TrackerDetailView exercise surface', () => {
  const selectedDate = new Date(2026, 5, 11, 12, 0, 0)
  const tracker: Tracker = {
    id: 14,
    name: 'Exercise',
    type: 'numeric',
    icon: 'dumbbell',
    color: '#22c55e',
    order: 2,
    config: { identity: 'exercise', unit: 'sets' },
    archived: false,
    createdAt: null,
  }
  const entry: Entry = {
    id: 88,
    trackerId: tracker.id,
    value: 1,
    note: 'First working set felt smooth',
    metadata: {},
    timestamp: Date.UTC(2026, 5, 11, 13, 0),
    dateStr: '2026-06-11',
    assetId: null,
    tagIds: [],
    workout: {
      structured: true,
      entryId: 88,
      trackerId: tracker.id,
      timestamp: Date.UTC(2026, 5, 11, 13, 0),
      dateStr: '2026-06-11',
      title: 'Push day',
      note: 'First working set felt smooth',
      routine: { name: 'Push day', notes: null },
      totalSets: 3,
      exercises: [
        {
          exerciseId: 'bench-press',
          exerciseName: 'Bench Press',
          category: 'strength',
          level: 'intermediate',
          equipment: 'barbell',
          primaryMuscles: ['chest'],
          secondaryMuscles: ['triceps', 'shoulders'],
          force: 'push',
          mechanic: 'compound',
          notes: null,
          sets: [
            { setIndex: 1, reps: 8, weight: 80, weightUnit: 'kg' },
            { setIndex: 2, reps: 8, weight: 80, weightUnit: 'kg' },
            { setIndex: 3, reps: 8, weight: 80, weightUnit: 'kg' },
          ],
        },
      ],
    },
  }

  beforeEach(() => {
    mocks.useAppStoreMock.mockReturnValue({
      selectedDate,
      setCurrentPage: mocks.setCurrentPageMock,
      setSelectedContactId: mocks.setSelectedContactIdMock,
    })
    mocks.useTrackersMock.mockReturnValue({ data: [tracker] })
    mocks.useEntriesMock.mockReturnValue({ data: [entry], isPending: false })
    mocks.useDeleteEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteFoodEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteIntakeEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteHealthSymptomEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useUpdateEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useWeightDetailMock.mockReturnValue({ data: undefined })
    mocks.useTagsMock.mockReturnValue({ data: [] })
    mocks.useToastMock.mockReturnValue({ info: vi.fn(), success: vi.fn(), destructive: vi.fn(), error: vi.fn() })
    mocks.getTrackerIdentityMock.mockReturnValue('exercise')
    mocks.isBooksTrackerMock.mockReturnValue(false)
    mocks.usesMediaStyleRenderingMock.mockReturnValue(false)
    mocks.useBookMock.mockReturnValue({ data: undefined, isPending: false, isError: false, refetch: vi.fn() })
    mocks.setCurrentPageMock.mockClear()
    mocks.setSelectedContactIdMock.mockClear()
  })

  it('renders structured workout sessions with routine and set details', async () => {
    render(<TrackerDetailView trackerId={tracker.id} selectedDate={selectedDate} assets={new Map()} />)

    expect(screen.getAllByText('Push day').length).toBeGreaterThan(0)
    expect(screen.getByText('Bench Press')).toBeTruthy()
    expect(screen.getByText('Routine: Push day')).toBeTruthy()
    expect(screen.getAllByText(/3 sets/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Set 1 · 8 reps · 80 kg/i)).toBeTruthy()
  })
})

afterAll(() => {
  vi.resetModules()
})
