import { describe, expect, it } from 'vitest'
import {
  buildGamingDetailReadModel,
  buildGamingHomeWidgetReadModel,
  buildGamingStatisticsReadModel,
  normalizeGameKey,
  normalizeGamingTitle,
  validateEstimatedHours,
} from '@contracts/domain'
import type { Entry } from '@contracts/contracts'

const entries: Entry[] = [
  {
    id: 1,
    trackerId: 9,
    value: 4,
    note: 'legacy generic note',
    metadata: {},
    timestamp: Date.parse('2026-05-18T18:00:00'),
    dateStr: '2026-05-18',
  },
  {
    id: 2,
    trackerId: 9,
    value: null,
    note: 'Valorant',
    metadata: {},
    timestamp: Date.parse('2026-05-19T08:00:00'),
    dateStr: '2026-05-19',
    gaming: {
      structured: true,
      gameTitle: 'Valorant',
      gameKey: 'valorant',
      estimatedHours: 2.5,
    },
  },
  {
    id: 3,
    trackerId: 9,
    value: null,
    note: 'VALORANT',
    metadata: {},
    timestamp: Date.parse('2026-05-19T10:00:00'),
    dateStr: '2026-05-19',
    gaming: {
      structured: true,
      gameTitle: 'VALORANT',
      gameKey: 'valorant',
      estimatedHours: 1,
    },
  },
  {
    id: 4,
    trackerId: 9,
    value: null,
    note: 'Minecraft',
    metadata: {},
    timestamp: Date.parse('2026-05-19T12:00:00'),
    dateStr: '2026-05-19',
    assetId: 7,
    tagIds: [4],
    gaming: {
      structured: true,
      gameTitle: 'Minecraft',
      gameKey: 'minecraft',
      estimatedHours: 1,
    },
  },
  {
    id: 5,
    trackerId: 9,
    value: null,
    note: 'Hades',
    metadata: {},
    timestamp: Date.parse('2026-05-20T09:00:00'),
    dateStr: '2026-05-20',
    gaming: {
      structured: true,
      gameTitle: 'Hades',
      gameKey: 'hades',
      estimatedHours: 0.5,
    },
  },
]

describe('gaming domain helpers', () => {
  it('normalizes titles and derived grouping keys', () => {
    expect(normalizeGamingTitle('  VALORANT   ranked  ')).toBe('VALORANT ranked')
    expect(normalizeGameKey('  VALORANT   ranked  ')).toBe('valorant ranked')
  })

  it('validates estimated hours as a finite non-negative value', () => {
    expect(validateEstimatedHours('2.345')).toBe(2.35)
    expect(() => validateEstimatedHours(-1)).toThrow('Estimated hours must be a finite non-negative number')
  })

  it('keeps legacy gaming entries separate from structured hours and groups by normalized game key', () => {
    const statistics = buildGamingStatisticsReadModel(entries)

    expect(statistics.entryCount).toBe(5)
    expect(statistics.structuredEntryCount).toBe(4)
    expect(statistics.legacyEntryCount).toBe(1)
    expect(statistics.totalHours).toBe(5)
    expect(statistics.chartData).toEqual([
      { date: '2026-05-19', value: 4.5, count: 3 },
      { date: '2026-05-20', value: 0.5, count: 1 },
    ])
    expect(statistics.perGameHours).toEqual([
      { gameTitle: 'VALORANT', gameKey: 'valorant', hours: 3.5, entryCount: 2 },
      { gameTitle: 'Minecraft', gameKey: 'minecraft', hours: 1, entryCount: 1 },
      { gameTitle: 'Hades', gameKey: 'hades', hours: 0.5, entryCount: 1 },
    ])

    const detail = buildGamingDetailReadModel(entries)
    expect(detail.current).toMatchObject({
      entryId: 5,
      gameTitle: 'Hades',
      gameKey: 'hades',
      estimatedHours: 0.5,
      structured: true,
    })
    expect(detail.history[0]).toMatchObject({
      entryId: 5,
      structured: true,
    })
    expect(detail.history[4]).toMatchObject({
      entryId: 1,
      structured: false,
      legacyText: 'legacy generic note',
    })

    const home = buildGamingHomeWidgetReadModel(entries, {
      trackerId: 9,
      title: 'Gaming',
      selectedDate: '2026-05-19',
    })

    expect(home).toMatchObject({
      trackerId: 9,
      title: 'Gaming',
      currentGameTitle: 'Hades',
      currentEstimatedHours: 0.5,
      selectedDayGameTitle: 'Minecraft',
      selectedDayEstimatedHours: 1,
      totalHours: 5,
      legacyEntryCount: 1,
    })
    expect(home.sparkline).toEqual([
      { date: '2026-05-19', value: 4.5 },
      { date: '2026-05-20', value: 0.5 },
    ])
  })
})
