import { describe, expect, it } from 'vitest'
import {
  buildHealthDetailReadModel,
  buildHealthHomeWidgetReadModel,
  buildHealthStatisticsReadModel,
  computeDaysWithSymptoms,
  computeSeveritySummary,
  computeSymptomFrequency,
  formatSeverityDisplay,
  normalizeSymptomKey,
  validateSeverityOptional,
  validateSymptomCategory,
} from '@contracts/domain'
import type { Entry } from '@contracts/contracts'

const entries: Entry[] = [
  {
    id: 1,
    trackerId: 42,
    value: 1,
    note: 'legacy health note',
    metadata: {},
    timestamp: Date.parse('2026-05-18T08:00:00'),
    dateStr: '2026-05-18',
  },
  {
    id: 2,
    trackerId: 42,
    value: null,
    note: 'Headache context',
    metadata: {},
    timestamp: Date.parse('2026-05-19T08:00:00'),
    dateStr: '2026-05-19',
    tagIds: [3],
    assetId: 9,
    health: {
      structured: true,
      symptomId: 100,
      symptomName: 'Headache',
      symptomKey: 'headache',
      category: 'physical',
      severity: 7,
    },
  },
  {
    id: 3,
    trackerId: 42,
    value: null,
    note: 'Headache context again',
    metadata: {},
    timestamp: Date.parse('2026-05-19T09:00:00'),
    dateStr: '2026-05-19',
    health: {
      structured: true,
      symptomId: 100,
      symptomName: 'Headache',
      symptomKey: 'headache',
      category: 'physical',
      severity: 8,
    },
  },
  {
    id: 4,
    trackerId: 42,
    value: null,
    note: 'Anxiety context',
    metadata: {},
    timestamp: Date.parse('2026-05-20T10:00:00'),
    dateStr: '2026-05-20',
    health: {
      structured: true,
      symptomId: 101,
      symptomName: 'Anxiety',
      symptomKey: 'anxiety',
      category: 'mental',
      severity: null,
    },
  },
]

describe('health domain helpers', () => {
  it('normalizes symptom keys and validates category and severity inputs', () => {
    expect(normalizeSymptomKey('  Headache  ')).toBe('headache')
    expect(normalizeSymptomKey('  Light   Coughing ')).toBe('light coughing')

    expect(validateSymptomCategory(undefined)).toBe('general')
    expect(validateSymptomCategory(' physical ')).toBe('physical')
    expect(() => validateSymptomCategory('diagnostic')).toThrow('Symptom category must be physical, mental, general, or other')

    expect(validateSeverityOptional(null)).toBeNull()
    expect(validateSeverityOptional('1')).toBe(1)
    expect(validateSeverityOptional(10)).toBe(10)
    expect(() => validateSeverityOptional(0)).toThrow('Severity must be a whole number between 1 and 10')
    expect(() => validateSeverityOptional(11)).toThrow('Severity must be a whole number between 1 and 10')
    expect(() => validateSeverityOptional(1.5)).toThrow('Severity must be a whole number between 1 and 10')
    expect(() => validateSeverityOptional(Number.POSITIVE_INFINITY)).toThrow('Severity must be a whole number between 1 and 10')

    expect(formatSeverityDisplay(null)).toBe('--')
    expect(formatSeverityDisplay(8)).toBe('8/10')
  })

  it('keeps legacy rows readable while excluding them from structured symptom stats', () => {
    const detail = buildHealthDetailReadModel(entries)
    const stats = buildHealthStatisticsReadModel(entries)
    const home = buildHealthHomeWidgetReadModel(entries, {
      trackerId: 42,
      title: 'Health',
      selectedDate: '2026-05-19',
    })

    expect(detail.current).toMatchObject({
      entryId: 4,
      structured: true,
      symptomName: 'Anxiety',
      category: 'mental',
      severity: null,
    })
    expect(detail.history.map((entry) => entry.entryId)).toEqual([4, 3, 2, 1])
    expect(detail.history[3]).toMatchObject({
      entryId: 1,
      structured: false,
      legacyText: 'legacy health note',
      legacyValue: 1,
    })

    expect(computeSymptomFrequency(detail.history)).toEqual([
      {
        symptomName: 'Headache',
        symptomKey: 'headache',
        category: 'physical',
        entryCount: 2,
      },
      {
        symptomName: 'Anxiety',
        symptomKey: 'anxiety',
        category: 'mental',
        entryCount: 1,
      },
    ])
    expect(computeSeveritySummary(detail.history)).toEqual({
      averageSeverity: 7.5,
      maxSeverity: 8,
      severityCount: 2,
      missingSeverityCount: 1,
    })
    expect(computeDaysWithSymptoms(detail.history)).toBe(2)

    expect(detail.totalOccurrences).toBe(3)
    expect(detail.structuredEntryCount).toBe(3)
    expect(detail.legacyEntryCount).toBe(1)
    expect(detail.daysWithSymptoms).toBe(2)
    expect(detail.chartData).toEqual([
      { date: '2026-05-19', value: 2, count: 2 },
      { date: '2026-05-20', value: 1, count: 1 },
    ])

    expect(stats).toMatchObject({
      totalOccurrences: 3,
      structuredEntryCount: 3,
      legacyEntryCount: 1,
      daysWithSymptoms: 2,
    })

    expect(home).toMatchObject({
      trackerId: 42,
      title: 'Health',
      currentSymptomName: 'Anxiety',
      currentSeverity: null,
      totalOccurrences: 3,
      legacyEntryCount: 1,
      daysWithSymptoms: 2,
    })
    expect(home.selectedDayEntries.map((entry) => entry.entryId)).toEqual([3, 2])
    expect(home.sparkline).toEqual([
      { date: '2026-05-19', value: 2 },
      { date: '2026-05-20', value: 1 },
    ])
  })
})
