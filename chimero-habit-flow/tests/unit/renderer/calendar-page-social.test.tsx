import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  useTrackersMock: vi.fn(),
  useCalendarMonthMock: vi.fn(),
  useStatsMock: vi.fn(),
  useRemindersMock: vi.fn(),
  useEntriesMock: vi.fn(),
  useTagsMock: vi.fn(),
  useWorkoutCalendarMock: vi.fn(),
}))

vi.mock('@shared/queries', () => ({
  useTrackers: mocks.useTrackersMock,
  useCalendarMonth: mocks.useCalendarMonthMock,
  useStats: mocks.useStatsMock,
  useReminders: mocks.useRemindersMock,
  useEntries: mocks.useEntriesMock,
  useTags: mocks.useTagsMock,
  useWorkoutCalendar: mocks.useWorkoutCalendarMock,
}))

vi.mock('@features/calendar/components/TimelineView', () => ({
  TimelineView: () => null,
}))

vi.mock('@features/tags/components/TagChips', () => ({
  TagChips: () => null,
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: { children: ReactNode }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: { children: ReactNode }) => <span {...props}>{children}</span>,
  },
}))

import { CalendarPage } from '../../../apps/electron/src/renderer/src/features/calendar/page'

describe('CalendarPage social presentation', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))

    mocks.useTrackersMock.mockReturnValue({
      data: [
        {
          id: 4,
          name: 'Social',
          type: 'numeric',
          icon: 'users',
          color: '#22c55e',
          order: 1,
          config: { identity: 'social', unit: 'interactions' },
          archived: false,
          createdAt: null,
        },
      ],
    })
    mocks.useCalendarMonthMock.mockReturnValue({
      data: {
        year: 2026,
        month: 5,
        activeDays: [15],
        entriesByDate: {
          '2026-06-15': [
            {
              id: 42,
              trackerId: 4,
              value: 1,
              note: 'Planning the weekend',
              timestamp: Date.UTC(2026, 5, 15, 18, 30, 0),
              dateStr: '2026-06-15',
              assetId: 77,
              tagIds: [3, 8],
              social: {
                entryId: 42,
                trackerId: 4,
                timestamp: Date.UTC(2026, 5, 15, 18, 30, 0),
                dateStr: '2026-06-15',
                method: 'call',
                note: 'Planning the weekend',
                tagIds: [3, 8],
                assetId: 77,
                contacts: [
                  {
                    contactId: 11,
                    name: 'Jack Robert',
                    initials: 'JR',
                    avatarAssetId: 91,
                    moodImpact: 'positive',
                  },
                  {
                    contactId: 12,
                    name: 'Annabelle',
                    initials: 'A',
                    avatarAssetId: null,
                    moodImpact: 'neutral',
                  },
                ],
                structured: true,
              },
            },
            {
              id: 43,
              trackerId: 4,
              value: 1,
              note: 'Legacy note only',
              timestamp: Date.UTC(2026, 5, 15, 12, 15, 0),
              dateStr: '2026-06-15',
              assetId: null,
              tagIds: [],
              social: {
                entryId: 43,
                timestamp: Date.UTC(2026, 5, 15, 12, 15, 0),
                dateStr: '2026-06-15',
                note: 'Legacy note only',
                structured: false,
                legacyReason: 'generic_entry',
              },
            },
          ],
        },
      },
    })
    mocks.useStatsMock.mockReturnValue({ data: {} })
    mocks.useRemindersMock.mockReturnValue({ data: [] })
    mocks.useEntriesMock.mockReturnValue({
      data: [
        {
          id: 42,
          trackerId: 4,
          value: 1,
          note: 'Planning the weekend',
          metadata: {},
          timestamp: Date.UTC(2026, 5, 15, 18, 30, 0),
          dateStr: '2026-06-15',
          assetId: 77,
          tagIds: [3, 8],
          socialInteractions: [
            {
              contactId: 11,
              contactName: 'Jack Robert',
              contactInitials: 'JR',
              contactAvatarAssetId: 91,
              method: 'call',
              moodImpact: 'positive',
              note: 'Planning the weekend',
            },
            {
              contactId: 12,
              contactName: 'Annabelle',
              contactInitials: 'A',
              contactAvatarAssetId: null,
              method: 'call',
              moodImpact: 'neutral',
              note: 'Planning the weekend',
            },
          ],
        },
        {
          id: 43,
          trackerId: 4,
          value: 1,
          note: 'Legacy note only',
          metadata: {},
          timestamp: Date.UTC(2026, 5, 15, 12, 15, 0),
          dateStr: '2026-06-15',
          assetId: null,
          tagIds: [],
          socialInteractions: [],
        },
      ],
      isPending: false,
    })
    mocks.useTagsMock.mockReturnValue({ data: [] })
    mocks.useWorkoutCalendarMock.mockReturnValue({ data: { year: 2026, month: 5, activeDays: [], entriesByDate: {} } })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders structured Social contacts, method, mood labels, and legacy labeling in the selected day panel', () => {
    render(<CalendarPage />)

    fireEvent.click(screen.getByRole('button', { name: '15' }))

    expect(screen.getAllByText('Jack Robert').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Annabelle').length).toBeGreaterThan(0)
    expect(screen.getAllByText('JR').length).toBeGreaterThan(0)
    expect(screen.getAllByText('A').length).toBeGreaterThan(0)
    expect(screen.getByText(/Call/i)).toBeTruthy()
    expect(screen.getByText(/Positive/i)).toBeTruthy()
    expect(screen.getByText(/Neutral/i)).toBeTruthy()
    expect(screen.getByText('Planning the weekend')).toBeTruthy()
    expect(screen.getByText('Unstructured legacy social entry')).toBeTruthy()
    expect(screen.getAllByText('Legacy note only').length).toBeGreaterThan(0)
  })
})
