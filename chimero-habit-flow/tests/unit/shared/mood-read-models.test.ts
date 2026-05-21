import { describe, expect, it } from 'vitest'
import {
  buildMoodEntriesReadModel,
  buildMoodStatisticsReadModel,
  entryToMoodReadModel,
} from '@contracts/domain'
import type { Entry } from '@contracts/contracts'

const rawEntries: Entry[] = [
  {
    id: 101,
    trackerId: 10,
    value: 3,
    note: 'before work',
    metadata: {},
    timestamp: Date.parse('2026-05-21T08:00:00'),
    dateStr: '2026-05-21',
    assetId: null,
    tagIds: [1],
  },
  {
    id: 102,
    trackerId: 10,
    value: 8,
    note: 'after work',
    metadata: {},
    timestamp: Date.parse('2026-05-21T18:00:00'),
    dateStr: '2026-05-21',
    assetId: 44,
    tagIds: [2],
  },
]

describe('mood read models', () => {
  it('derives moodScore from generic entries.value and preserves note, tags, asset, and timestamp', () => {
    expect(entryToMoodReadModel(rawEntries[1])).toMatchObject({
      entryId: 102,
      trackerId: 10,
      moodScore: 8,
      note: 'after work',
      timestamp: Date.parse('2026-05-21T18:00:00'),
      dateStr: '2026-05-21',
      assetId: 44,
      tagIds: [2],
    })
  })

  it('keeps every Mood entry separately for the Entries tab', () => {
    const model = buildMoodEntriesReadModel(rawEntries)

    expect(model.entries).toHaveLength(2)
    expect(model.entries.map((entry) => entry.moodScore)).toEqual([8, 3])
  })

  it('builds statistics from 1-10 mood scores without collapsing same-day entries in the read model', () => {
    const model = buildMoodStatisticsReadModel(rawEntries)

    expect(model.count).toBe(2)
    expect(model.averageScore).toBe(5.5)
    expect(model.highScore).toBe(8)
    expect(model.lowScore).toBe(3)
    expect(model.chartData).toEqual([{ date: '2026-05-21', value: 5.5, count: 2 }])
  })
})
