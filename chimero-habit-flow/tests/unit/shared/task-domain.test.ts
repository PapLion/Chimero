import { describe, expect, it } from 'vitest'
import {
  buildTaskDayReadModel,
  getTaskActiveDate,
  getTaskStateForDate,
  isTaskActionableOnDate,
  isTaskPostponedOnDate,
  parseTaskStateMetadata,
  postponeTaskToNextDay,
  unpostponeTask,
} from '@contracts/domain'
import type { Entry } from '@contracts/contracts'

const baseTask: Entry = {
  id: 101,
  trackerId: 4,
  value: 0,
  note: 'File taxes',
  metadata: {},
  timestamp: Date.parse('2026-05-18T09:00:00'),
  dateStr: '2026-05-18',
  assetId: 9,
  tagIds: [7],
}

describe('shared task postpone domain', () => {
  it('treats legacy task entries without metadata as actionable on their base date', () => {
    expect(parseTaskStateMetadata(baseTask.metadata)).toBeNull()
    expect(getTaskActiveDate(baseTask)).toBe('2026-05-18')
    expect(getTaskStateForDate(baseTask, '2026-05-18')).toBe('actionable')
    expect(isTaskActionableOnDate(baseTask, '2026-05-18')).toBe(true)
    expect(isTaskActionableOnDate(baseTask, '2026-05-19')).toBe(false)

    const day = buildTaskDayReadModel([baseTask], '2026-05-18')
    expect(day.actionable).toHaveLength(1)
    expect(day.actionable[0].completed).toBe(false)
  })

  it('restores a postponed task to its base date when unpostponed', () => {
    const metadata = postponeTaskToNextDay(baseTask, '2026-05-18', 1_777_000)
    const postponedTask = { ...baseTask, metadata }

    const restored = unpostponeTask(postponedTask)

    expect(restored).toEqual({
      activeDate: '2026-05-18',
      postponements: [],
    })
  })

  it('postpones Monday to Tuesday without duplicating the entry identity', () => {
    const metadata = postponeTaskToNextDay(baseTask, '2026-05-18', 1_777_000)
    const postponedTask = { ...baseTask, metadata }

    expect(metadata).toEqual({
      activeDate: '2026-05-19',
      postponements: [{ fromDate: '2026-05-18', toDate: '2026-05-19', timestamp: 1_777_000 }],
    })
    expect(isTaskPostponedOnDate(postponedTask, '2026-05-18')).toBe(true)
    expect(isTaskActionableOnDate(postponedTask, '2026-05-18')).toBe(false)
    expect(isTaskActionableOnDate(postponedTask, '2026-05-19')).toBe(true)
  })

  it('preserves repeated postpone history from Monday to Tuesday to Wednesday', () => {
    const tuesdayMetadata = postponeTaskToNextDay(baseTask, '2026-05-18', 1_777_000)
    const tuesdayTask = { ...baseTask, metadata: tuesdayMetadata }
    const wednesdayMetadata = postponeTaskToNextDay(tuesdayTask, '2026-05-19', 1_778_000)
    const wednesdayTask = { ...baseTask, metadata: wednesdayMetadata }

    expect(wednesdayMetadata).toEqual({
      activeDate: '2026-05-20',
      postponements: [
        { fromDate: '2026-05-18', toDate: '2026-05-19', timestamp: 1_777_000 },
        { fromDate: '2026-05-19', toDate: '2026-05-20', timestamp: 1_778_000 },
      ],
    })
    expect(getTaskStateForDate(wednesdayTask, '2026-05-18')).toBe('postponed')
    expect(getTaskStateForDate(wednesdayTask, '2026-05-19')).toBe('postponed')
    expect(getTaskStateForDate(wednesdayTask, '2026-05-20')).toBe('actionable')
  })

  it('rejects invalid or duplicate postpone transitions', () => {
    expect(() => postponeTaskToNextDay(baseTask, '2026-05-19', 1_777_000)).toThrow('current active date')

    const metadata = postponeTaskToNextDay(baseTask, '2026-05-18', 1_777_000)
    const postponedTask = { ...baseTask, metadata }
    expect(() => postponeTaskToNextDay(postponedTask, '2026-05-18', 1_778_000)).toThrow('current active date')
  })

  it('builds a day read model with postponed tasks distinct from completed actionable tasks', () => {
    const completedActiveTask: Entry = {
      ...baseTask,
      id: 102,
      value: 1,
      note: 'Submit report',
      metadata: {
        activeDate: '2026-05-20',
        postponements: [{ fromDate: '2026-05-19', toDate: '2026-05-20', timestamp: 1_778_000 }],
      },
    }
    const postponedTask: Entry = {
      ...baseTask,
      value: 1,
      metadata: {
        activeDate: '2026-05-20',
        postponements: [{ fromDate: '2026-05-18', toDate: '2026-05-19', timestamp: 1_777_000 }],
      },
    }

    const monday = buildTaskDayReadModel([postponedTask, completedActiveTask], '2026-05-18')
    const wednesday = buildTaskDayReadModel([postponedTask, completedActiveTask], '2026-05-20')

    expect(monday.postponed).toHaveLength(1)
    expect(monday.postponed[0]).toMatchObject({
      entryId: 101,
      state: 'postponed',
      completed: true,
      text: 'File taxes',
      activeDate: '2026-05-20',
    })
    expect(monday.actionable).toHaveLength(0)
    expect(wednesday.actionable.map((task) => task.entryId)).toEqual([101, 102])
    expect(wednesday.actionable.find((task) => task.entryId === 102)?.completed).toBe(true)
  })
})
