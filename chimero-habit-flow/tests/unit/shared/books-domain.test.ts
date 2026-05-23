import { describe, expect, it } from 'vitest'
import {
  buildBookHistoryReadModel,
  buildBookSelectedDayReadModel,
  buildBookStatisticsReadModel,
  normalizeBookTitle,
  normalizeBookTitleKey,
  validateBookRatingTenths,
} from '@contracts/domain'
import { formatBookRatingDisplay } from '@contracts/features/books'
import { buildBooksTrackerReadModel } from '@contracts/features/books'
import type { Entry } from '@contracts/contracts'

const entries: Entry[] = [
  {
    id: 1,
    trackerId: 5,
    value: null,
    note: 'legacy reading note',
    metadata: {},
    timestamp: Date.parse('2026-05-18T18:00:00'),
    dateStr: '2026-05-18',
  },
  {
    id: 2,
    trackerId: 5,
    value: null,
    note: 'The Left Hand of Darkness',
    metadata: {},
    timestamp: Date.parse('2026-05-19T08:00:00'),
    dateStr: '2026-05-19',
    book: {
      structured: true,
      bookId: 10,
      title: 'The Left Hand of Darkness',
      titleKey: 'the left hand of darkness',
      activityType: 'started',
    },
  },
  {
    id: 3,
    trackerId: 5,
    value: null,
    note: 'The Left Hand of Darkness',
    metadata: {},
    timestamp: Date.parse('2026-05-19T12:00:00'),
    dateStr: '2026-05-19',
    book: {
      structured: true,
      bookId: 10,
      title: 'The Left Hand of Darkness',
      titleKey: 'the left hand of darkness',
      activityType: 'read',
    },
  },
  {
    id: 4,
    trackerId: 5,
    value: null,
    note: 'The Left Hand of Darkness',
    metadata: {},
    timestamp: Date.parse('2026-05-20T09:00:00'),
    dateStr: '2026-05-20',
    book: {
      structured: true,
      bookId: 10,
      title: 'The Left Hand of Darkness',
      titleKey: 'the left hand of darkness',
      activityType: 'finished',
    },
  },
  {
    id: 5,
    trackerId: 5,
    value: null,
    note: 'Dune',
    metadata: {},
    timestamp: Date.parse('2026-05-20T12:00:00'),
    dateStr: '2026-05-20',
    book: {
      structured: true,
      bookId: 11,
      title: 'Dune',
      titleKey: 'dune',
      activityType: 'read',
    },
  },
]

describe('shared book domain helpers', () => {
  it('normalizes titles, keys, and rating tenths', () => {
    expect(normalizeBookTitle('  The   Left  Hand of Darkness ')).toBe('The Left Hand of Darkness')
    expect(normalizeBookTitleKey('  The   Left  Hand of Darkness ')).toBe('the left hand of darkness')
    expect(validateBookRatingTenths('42')).toBe(42)
    expect(() => validateBookRatingTenths(9)).toThrow('Rating must be an integer tenths value between 10 and 50')
    expect(formatBookRatingDisplay(43)).toBe('4.3 / 5.0')
    expect(formatBookRatingDisplay(null)).toBeNull()
  })

  it('keeps legacy books entries readable while excluding them from structured analytics', () => {
    const history = buildBookHistoryReadModel(entries)
    const stats = buildBookStatisticsReadModel(entries)
    const selected = buildBookSelectedDayReadModel(entries, {
      trackerId: 5,
      title: 'Books',
      selectedDate: '2026-05-19',
    })

    expect(history.entries.map((entry) => entry.entryId)).toEqual([5, 4, 3, 2, 1])
    expect(history.entries[0]).toMatchObject({
      entryId: 5,
      structured: true,
      activityType: 'read',
      bookId: 11,
    })
    expect(history.entries[4]).toMatchObject({
      entryId: 1,
      structured: false,
      legacyText: 'legacy reading note',
    })

    expect(stats).toMatchObject({
      entryCount: 5,
      structuredEntryCount: 4,
      legacyEntryCount: 1,
      uniqueBookCount: 2,
      startedCount: 1,
      readCount: 2,
      finishedCount: 1,
    })
    expect(stats.chartData).toEqual([
      { date: '2026-05-19', value: 2, count: 2 },
      { date: '2026-05-20', value: 2, count: 2 },
    ])

    expect(selected).toMatchObject({
      trackerId: 5,
      title: 'Books',
      currentBookTitle: 'Dune',
      currentActivityType: 'read',
      selectedDayBookTitle: 'The Left Hand of Darkness',
      selectedDayActivityType: 'read',
      structuredEntryCount: 4,
      legacyEntryCount: 1,
      uniqueBookCount: 2,
    })
    expect(selected.sparkline).toEqual([
      { date: '2026-05-19', value: 2 },
      { date: '2026-05-20', value: 2 },
    ])
  })

  it('treats service-written finish metadata as a structured finished activity in the tracker read model', () => {
    const legacyEntry = entries[0]
    const finishEntry: Entry = {
      id: 6,
      trackerId: 5,
      value: null,
      note: 'Book smoke final',
      metadata: {
        trackerKind: 'books',
        bookId: 42,
        activityType: 'finished',
      },
      timestamp: Date.parse('2026-05-21T10:00:00'),
      dateStr: '2026-05-21',
    }

    const model = buildBooksTrackerReadModel([legacyEntry, finishEntry], new Date('2026-05-21T12:00:00'))

    expect(model.finished[0]).toMatchObject({
      entryId: 6,
      action: 'finished',
      legacy: false,
      bookId: 42,
      title: 'Book smoke final',
    })
    expect(model).toMatchObject({
      structured: expect.arrayContaining([
        expect.objectContaining({
          entryId: 6,
          action: 'finished',
          legacy: false,
        }),
      ]),
      legacy: expect.arrayContaining([
        expect.objectContaining({
          entryId: 1,
        }),
      ]),
      shelfCounts: {
        want: 0,
        reading: 0,
        finished: 1,
      },
      finishedThisMonth: 1,
    })
  })
})
