import { describe, expect, it } from 'vitest'
import { buildCalendarDayEntry } from '@contracts/domain'

describe('calendar task day read model', () => {
  it('marks projected task calendar entries as postponed or actionable without losing the base date', () => {
    const postponed = buildCalendarDayEntry({
      id: 101,
      trackerId: 4,
      value: 0,
      note: 'File taxes',
      timestamp: Date.parse('2026-05-18T09:00:00'),
      dateStr: '2026-05-18',
      task: {
        state: 'postponed',
        baseDate: '2026-05-18',
        activeDate: '2026-05-20',
        completed: false,
        postponements: [
          { fromDate: '2026-05-18', toDate: '2026-05-19', timestamp: 1_777_000 },
          { fromDate: '2026-05-19', toDate: '2026-05-20', timestamp: 1_778_000 },
        ],
      },
    })
    const actionable = buildCalendarDayEntry({
      id: 101,
      trackerId: 4,
      value: 0,
      note: 'File taxes',
      timestamp: Date.parse('2026-05-18T09:00:00'),
      dateStr: '2026-05-20',
      task: {
        state: 'actionable',
        baseDate: '2026-05-18',
        activeDate: '2026-05-20',
        completed: false,
        postponements: [
          { fromDate: '2026-05-18', toDate: '2026-05-19', timestamp: 1_777_000 },
          { fromDate: '2026-05-19', toDate: '2026-05-20', timestamp: 1_778_000 },
        ],
      },
    })

    expect(postponed).toMatchObject({
      id: 101,
      dateStr: '2026-05-18',
      taskState: 'postponed',
      taskBaseDate: '2026-05-18',
      taskActiveDate: '2026-05-20',
      taskCompleted: false,
    })
    expect(actionable).toMatchObject({
      id: 101,
      dateStr: '2026-05-20',
      taskState: 'actionable',
      taskBaseDate: '2026-05-18',
      taskActiveDate: '2026-05-20',
    })
  })
})
