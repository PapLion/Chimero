import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  useWorkoutHistoryMock: vi.fn(),
  useWorkoutStatisticsMock: vi.fn(),
  useWorkoutGraphMock: vi.fn(),
  useExerciseProgressMock: vi.fn(),
  useTagsMock: vi.fn(),
  useBookMock: vi.fn(),
  useToastMock: vi.fn(),
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
  useWorkoutHistory: mocks.useWorkoutHistoryMock,
  useWorkoutStatistics: mocks.useWorkoutStatisticsMock,
  useWorkoutGraph: mocks.useWorkoutGraphMock,
  useExerciseProgress: mocks.useExerciseProgressMock,
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

describe('TrackerDetailView health surface', () => {
  const selectedDate = new Date(2026, 4, 22, 12, 0, 0)

  beforeEach(() => {
    mocks.useAppStoreMock.mockReturnValue({ selectedDate })
    mocks.useEntriesMock.mockReturnValue({ data: [], isPending: false })
    mocks.useDeleteEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteFoodEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteIntakeEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteHealthSymptomEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useUpdateEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useWeightDetailMock.mockReturnValue({ data: undefined })
    mocks.useWorkoutHistoryMock.mockReturnValue({ data: { trackerId: 0, structuredSessions: [], legacySessions: [], totalSessions: 0, totalStructuredSessions: 0, totalLegacySessions: 0 } })
    mocks.useWorkoutStatisticsMock.mockReturnValue({ data: null })
    mocks.useWorkoutGraphMock.mockReturnValue({ data: null })
    mocks.useExerciseProgressMock.mockReturnValue({ data: null })
    mocks.useTagsMock.mockReturnValue({ data: [] })
    mocks.useToastMock.mockReturnValue({
      info: vi.fn(),
      success: vi.fn(),
      destructive: vi.fn(),
      error: vi.fn(),
    })
    mocks.isBooksTrackerMock.mockReturnValue(false)
    mocks.usesMediaStyleRenderingMock.mockReturnValue(false)
    mocks.useBookMock.mockReturnValue({ data: undefined, isPending: false, isError: false, refetch: vi.fn() })
  })

  it('renders structured Health as symptoms instead of task controls and shows note/context', () => {
    const tracker: Tracker = {
      id: 21,
      name: 'Health',
      type: 'list',
      icon: 'heart',
      color: null,
      order: 9,
      config: { identity: 'health' },
      archived: false,
      createdAt: null,
    }

    const entry: Entry = {
      id: 201,
      trackerId: tracker.id,
      value: null,
      note: 'after lunch',
      metadata: {
        trackerKind: 'health',
        health: {
          structured: true,
          symptomName: 'My head hurts',
          symptomKey: 'my head hurts',
          category: 'physical',
          severity: 7,
        },
      },
      timestamp: Date.UTC(2026, 4, 22, 12, 30, 0),
      dateStr: '2026-05-22',
      health: {
        structured: true,
        symptomId: 11,
        symptomName: 'My head hurts',
        symptomKey: 'my head hurts',
        category: 'physical',
        severity: 7,
      },
      tagIds: [],
    }

    mocks.useTrackersMock.mockReturnValue({ data: [tracker] })
    mocks.useEntriesMock.mockReturnValue({ data: [entry], isPending: false })
    mocks.getTrackerIdentityMock.mockReturnValue('health')

    render(<TrackerDetailView trackerId={tracker.id} selectedDate={selectedDate} assets={new Map()} />)

    expect(screen.getByText('My head hurts')).toBeTruthy()
    expect(screen.getByText(/physical/)).toBeTruthy()
    expect(screen.getByText('after lunch')).toBeTruthy()
    expect(screen.queryByText('ACTIONABLE')).toBeNull()
    expect(screen.queryByText('INCOMPLETE')).toBeNull()
    expect(screen.queryByText(/^Task$/)).toBeNull()
    expect(screen.queryByTitle('Postpone to next day')).toBeNull()
    expect(screen.queryByTitle('Mark complete')).toBeNull()
    expect(screen.queryByText('Tasks This Week')).toBeNull()
  })

  it('keeps real Tasks actionable with postpone and completion controls', () => {
    const tracker: Tracker = {
      id: 22,
      name: 'Tasks',
      type: 'list',
      icon: 'check-square',
      color: null,
      order: 4,
      config: { identity: 'tasks' },
      archived: false,
      createdAt: null,
    }

    const entry: Entry = {
      id: 202,
      trackerId: tracker.id,
      value: 0,
      note: 'Take out trash',
      metadata: {
        activeDate: '2026-05-22',
        postponements: [],
      },
      timestamp: Date.UTC(2026, 4, 22, 8, 0, 0),
      dateStr: '2026-05-22',
      tagIds: [],
    }

    mocks.useTrackersMock.mockReturnValue({ data: [tracker] })
    mocks.useEntriesMock.mockReturnValue({ data: [entry], isPending: false })
    mocks.getTrackerIdentityMock.mockReturnValue('tasks')

    render(<TrackerDetailView trackerId={tracker.id} selectedDate={selectedDate} assets={new Map()} />)

    expect(screen.getByText('Take out trash')).toBeTruthy()
    expect(screen.getByText('Actionable')).toBeTruthy()
    expect(screen.getByText('Incomplete')).toBeTruthy()
    expect(screen.getByTitle('Postpone to next day')).toBeTruthy()
    expect(screen.getByTitle('Mark complete')).toBeTruthy()
  })
})
