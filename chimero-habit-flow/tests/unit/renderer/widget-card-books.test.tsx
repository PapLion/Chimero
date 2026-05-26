import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { Entry, Tracker, Widget } from '@shared/store'

const mocks = vi.hoisted(() => ({
  useBooksMock: vi.fn(),
  useSortableMock: vi.fn(),
  getTrackerIdentityMock: vi.fn(),
  isBooksTrackerMock: vi.fn(),
  usesMediaStyleRenderingMock: vi.fn(),
}))

vi.mock('@shared/queries', () => ({
  useBooks: mocks.useBooksMock,
}))

vi.mock('@contracts/features/tracking', () => ({
  getTrackerIdentity: mocks.getTrackerIdentityMock,
  isBooksTracker: mocks.isBooksTrackerMock,
  usesMediaStyleRendering: mocks.usesMediaStyleRenderingMock,
}))

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: mocks.useSortableMock,
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}))

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Area: () => null,
  Tooltip: () => null,
}))

import { WidgetCard } from '../../../apps/electron/src/renderer/src/features/dashboard/components/WidgetCard'

describe('WidgetCard books surface', () => {
  const tracker: Tracker = {
    id: 9,
    name: 'Books',
    type: 'text',
    icon: 'book',
    color: null,
    order: 1,
    config: { identity: 'books' },
    archived: false,
    createdAt: null,
  }

  const widget: Widget = {
    id: 'widget-books',
    trackerId: tracker.id,
    position: 0,
    size: 'large',
  }

  const selectedDate = new Date(2026, 4, 25, 12, 0, 0)

  beforeEach(() => {
    mocks.useBooksMock.mockReturnValue({ data: [] })
    mocks.useSortableMock.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    })
    mocks.getTrackerIdentityMock.mockReturnValue('books')
    mocks.isBooksTrackerMock.mockReturnValue(true)
    mocks.usesMediaStyleRenderingMock.mockReturnValue(false)
  })

  it('renders a want-to-read shelf and every same-day structured activity', () => {
    const entries: Entry[] = [
      {
        id: 201,
        trackerId: tracker.id,
        value: null,
        note: 'Started smoke one',
        metadata: { trackerKind: 'books', bookId: 30, activityType: 'started' },
        timestamp: Date.UTC(2026, 4, 25, 8, 0, 0),
        dateStr: '2026-05-25',
        book: {
          structured: true,
          bookId: 30,
          title: 'Started smoke one',
          titleKey: 'started-smoke-one',
          activityType: 'started',
        },
      },
      {
        id: 202,
        trackerId: tracker.id,
        value: null,
        note: 'Started smoke two',
        metadata: { trackerKind: 'books', bookId: 31, activityType: 'started' },
        timestamp: Date.UTC(2026, 4, 25, 9, 0, 0),
        dateStr: '2026-05-25',
        book: {
          structured: true,
          bookId: 31,
          title: 'Started smoke two',
          titleKey: 'started-smoke-two',
          activityType: 'started',
        },
      },
      {
        id: 203,
        trackerId: tracker.id,
        value: null,
        note: 'Finished smoke',
        metadata: { trackerKind: 'books', bookId: 32, activityType: 'finished' },
        timestamp: Date.UTC(2026, 4, 25, 10, 0, 0),
        dateStr: '2026-05-25',
        book: {
          structured: true,
          bookId: 32,
          title: 'Finished smoke',
          titleKey: 'finished-smoke',
          activityType: 'finished',
        },
      },
    ]

    mocks.useBooksMock.mockReturnValue({
      data: [
        {
          id: 10,
          title: 'Want shelf smoke',
          titleKey: 'want shelf smoke',
          shelf: 'tbr',
          status: 'planned',
          startedDate: null,
          finishedDate: null,
          ratingTenths: null,
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: 32,
          title: 'Finished smoke',
          titleKey: 'finished smoke',
          shelf: 'finished',
          status: 'completed',
          startedDate: '2026-05-24',
          finishedDate: '2026-05-25',
          ratingTenths: 43,
          createdAt: 1,
          updatedAt: 2,
        },
      ],
    })

    render(<WidgetCard widget={widget} tracker={tracker} entries={entries} assets={new Map()} selectedDate={selectedDate} />)

    expect(screen.getByText('Want shelf smoke')).toBeTruthy()
    expect(screen.getByText('Started smoke one')).toBeTruthy()
    expect(screen.getByText('Started smoke two')).toBeTruthy()
    expect(screen.getAllByText('4.3 / 5.0').length).toBeGreaterThan(0)
  })
})
