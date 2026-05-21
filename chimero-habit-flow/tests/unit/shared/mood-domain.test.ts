import { describe, expect, it } from 'vitest'
import {
  clampMoodScore,
  computeMoodDailyAggregate,
  computeMoodStats,
  moodScoreToColor,
  moodScoreToLabel,
  moodScoreToVisualState,
  normalizeMoodScore,
} from '@contracts/domain'
import type { MoodEntryReadModel } from '@contracts/contracts'

const entries: MoodEntryReadModel[] = [
  {
    entryId: 1,
    trackerId: 10,
    moodScore: 3,
    note: 'before work',
    timestamp: Date.parse('2026-05-21T08:00:00'),
    dateStr: '2026-05-21',
    assetId: null,
    tagIds: [1],
  },
  {
    entryId: 2,
    trackerId: 10,
    moodScore: 8,
    note: 'after work',
    timestamp: Date.parse('2026-05-21T18:00:00'),
    dateStr: '2026-05-21',
    assetId: 9,
    tagIds: [2, 3],
  },
  {
    entryId: 3,
    trackerId: 10,
    moodScore: 10,
    note: null,
    timestamp: Date.parse('2026-05-22T09:00:00'),
    dateStr: '2026-05-22',
    assetId: null,
    tagIds: [],
  },
]

describe('shared mood domain', () => {
  it('normalizes and clamps Mood scores to the canonical 1-10 scale', () => {
    expect(normalizeMoodScore('7.6')).toBe(8)
    expect(normalizeMoodScore(null)).toBe(1)
    expect(clampMoodScore(-2)).toBe(1)
    expect(clampMoodScore(11.2)).toBe(10)
  })

  it('maps 1-10 scores to visual states, colors, and labels', () => {
    expect(moodScoreToVisualState(2)).toBe('low')
    expect(moodScoreToVisualState(5)).toBe('neutral')
    expect(moodScoreToVisualState(9)).toBe('high')
    expect(moodScoreToColor(8)).toBe('#22c55e')
    expect(moodScoreToLabel(3)).toBe('Low')
  })

  it('keeps multiple same-day Mood entries separate while aggregating the day safely', () => {
    const aggregate = computeMoodDailyAggregate(entries.filter((entry) => entry.dateStr === '2026-05-21'))

    expect(aggregate).toMatchObject({
      date: '2026-05-21',
      count: 2,
      averageScore: 5.5,
      highScore: 8,
      lowScore: 3,
      latestScore: 8,
    })
    expect(aggregate?.entries.map((entry) => entry.note)).toEqual(['before work', 'after work'])
  })

  it('computes simple Mood statistics from generic entry values', () => {
    const stats = computeMoodStats(entries)

    expect(stats).toMatchObject({
      count: 3,
      averageScore: 7,
      highScore: 10,
      lowScore: 3,
      latestScore: 10,
    })
    expect(stats.chartData).toEqual([
      { date: '2026-05-21', value: 5.5, count: 2 },
      { date: '2026-05-22', value: 10, count: 1 },
    ])
  })
})
