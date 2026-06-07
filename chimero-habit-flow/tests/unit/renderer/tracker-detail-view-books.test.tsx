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
  useDeleteHealthSymptomEntryMutationMock: vi.fn(),
  useUpdateEntryMutationMock: vi.fn(),
  useWeightDetailMock: vi.fn(),
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

describe('TrackerDetailView books rating surface', () => {
  const tracker: Tracker = {
    id: 5,
    name: 'Books',
    type: 'text',
    icon: 'book',
    color: null,
    order: 1,
    config: { identity: 'books' },
    archived: false,
    createdAt: null,
  }

  const selectedDate = new Date(2026, 4, 22, 12, 0, 0)

  beforeEach(() => {
    mocks.useAppStoreMock.mockReturnValue({ selectedDate })
    mocks.useTrackersMock.mockReturnValue({ data: [tracker] })
    mocks.useEntriesMock.mockReturnValue({ data: [], isPending: false })
    mocks.useDeleteEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteFoodEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteHealthSymptomEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useUpdateEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useWeightDetailMock.mockReturnValue({ data: undefined })
    mocks.useTagsMock.mockReturnValue({ data: [] })
    mocks.useToastMock.mockReturnValue({
      info: vi.fn(),
      success: vi.fn(),
      destructive: vi.fn(),
      error: vi.fn(),
    })
    mocks.getTrackerIdentityMock.mockReturnValue('books')
    mocks.isBooksTrackerMock.mockReturnValue(true)
    mocks.usesMediaStyleRenderingMock.mockReturnValue(false)
    mocks.useBookMock.mockReset()
  })

  it('shows the structured finished book rating as 4.3 / 5.0', () => {
    const entry: Entry = {
      id: 101,
      trackerId: tracker.id,
      value: null,
      note: 'Book smoke final',
      metadata: {
        trackerKind: 'books',
        bookId: 42,
        activityType: 'finished',
      },
      timestamp: Date.UTC(2026, 4, 22, 10, 0, 0),
      dateStr: '2026-05-22',
      book: {
        structured: true,
        bookId: 42,
        title: 'Book smoke final',
        titleKey: 'book-smoke-final',
        activityType: 'finished',
      },
    }

    mocks.useEntriesMock.mockReturnValue({ data: [entry], isPending: false })
    mocks.useBookMock.mockReturnValue({
      data: {
        book: {
          id: 42,
          title: 'Book smoke final',
          titleKey: 'book-smoke-final',
          shelf: 'finished',
          status: 'completed',
          startedDate: '2026-05-20',
          finishedDate: '2026-05-22',
          ratingTenths: 43,
          createdAt: 1,
          updatedAt: 2,
        },
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })

    render(<TrackerDetailView trackerId={tracker.id} selectedDate={selectedDate} assets={new Map()} />)

    expect(screen.getByText('4.3 / 5.0')).toBeTruthy()
  })

  it('does not show a fake rating when the structured book has no rating', () => {
    const entry: Entry = {
      id: 102,
      trackerId: tracker.id,
      value: null,
      note: 'Book smoke final',
      metadata: {
        trackerKind: 'books',
        bookId: 43,
        activityType: 'finished',
      },
      timestamp: Date.UTC(2026, 4, 22, 10, 0, 0),
      dateStr: '2026-05-22',
      book: {
        structured: true,
        bookId: 43,
        title: 'Book smoke final',
        titleKey: 'book-smoke-final',
        activityType: 'finished',
      },
    }

    mocks.useEntriesMock.mockReturnValue({ data: [entry], isPending: false })
    mocks.useBookMock.mockReturnValue({
      data: {
        book: {
          id: 43,
          title: 'Book smoke final',
          titleKey: 'book-smoke-final',
          shelf: 'finished',
          status: 'completed',
          startedDate: '2026-05-20',
          finishedDate: '2026-05-22',
          ratingTenths: null,
          createdAt: 1,
          updatedAt: 2,
        },
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })

    render(<TrackerDetailView trackerId={tracker.id} selectedDate={selectedDate} assets={new Map()} />)

    expect(screen.queryByText('4.3 / 5.0')).toBeNull()
  })

  it('does not render a structured rating for a legacy books entry', () => {
    const legacyEntry: Entry = {
      id: 103,
      trackerId: tracker.id,
      value: null,
      note: 'Legacy finished row',
      metadata: {
        trackerKind: 'books',
        title: 'Legacy finished row',
      },
      timestamp: Date.UTC(2026, 4, 22, 10, 0, 0),
      dateStr: '2026-05-22',
    }

    mocks.useEntriesMock.mockReturnValue({ data: [legacyEntry], isPending: false })

    render(<TrackerDetailView trackerId={tracker.id} selectedDate={selectedDate} assets={new Map()} />)

    expect(mocks.useBookMock).not.toHaveBeenCalled()
    expect(screen.queryByText('4.3 / 5.0')).toBeNull()
  })
})
