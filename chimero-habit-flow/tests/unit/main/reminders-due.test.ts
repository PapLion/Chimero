import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ Notification: class {} }))
vi.mock('@packages/db/database', () => ({ getRawDb: () => null }))

const { isReminderDue } = await import('../../../apps/electron/src/main/features/reminders/service')

// Tuesday 17 November 2026, local time.
const at = (hour: number, minute: number, day = 17) => new Date(2026, 10, day, hour, minute)
const base = { id: 1, title: 'Stretch', description: null, time: '09:00', date: null, days: null, last_triggered: null, completed_at: null }

describe('reminder schedule', () => {
  it('fires from its time until the grace window closes', () => {
    expect(isReminderDue(base, at(8, 59))).toBe(false)
    expect(isReminderDue(base, at(9, 0))).toBe(true)
    expect(isReminderDue(base, at(9, 15))).toBe(true)
    expect(isReminderDue(base, at(9, 16))).toBe(false)
  })

  it('fires once a day', () => {
    const firedToday = { ...base, last_triggered: Math.floor(at(9, 0).getTime() / 1000) }
    expect(isReminderDue(firedToday, at(9, 5))).toBe(false)
    const firedYesterday = { ...base, last_triggered: Math.floor(at(9, 0, 16).getTime() / 1000) }
    expect(isReminderDue(firedYesterday, at(9, 5))).toBe(true)
  })

  it('respects weekdays and one-off dates', () => {
    expect(isReminderDue({ ...base, days: JSON.stringify([2]) }, at(9, 1))).toBe(true) // Tuesday
    expect(isReminderDue({ ...base, days: JSON.stringify([1, 3]) }, at(9, 1))).toBe(false)
    expect(isReminderDue({ ...base, date: '2026-11-17' }, at(9, 1))).toBe(true)
    expect(isReminderDue({ ...base, date: '2026-11-18' }, at(9, 1))).toBe(false)
  })

  it('stays quiet once ticked: for good if one-off, for the day if repeating', () => {
    const tickedToday = at(8, 0).getTime()
    expect(isReminderDue({ ...base, date: '2026-11-17', completed_at: tickedToday }, at(9, 1))).toBe(false)
    expect(isReminderDue({ ...base, days: JSON.stringify([2]), completed_at: tickedToday }, at(9, 1))).toBe(false)
    expect(isReminderDue({ ...base, days: JSON.stringify([2]), completed_at: at(8, 0, 10).getTime() }, at(9, 1))).toBe(true)
  })

  it('ignores a malformed time', () => {
    expect(isReminderDue({ ...base, time: 'soon' }, at(9, 1))).toBe(false)
  })
})
