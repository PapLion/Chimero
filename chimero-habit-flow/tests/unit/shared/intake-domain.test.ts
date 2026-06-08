import { describe, expect, it } from 'vitest'
import {
  buildIntakeDetailReadModel,
  buildIntakeHomeWidgetReadModel,
  buildIntakeStatisticsReadModel,
  computeDaysWithIntakes,
  computeDoseSummary,
  computeIntakeCount,
  computeIntakeItemFrequency,
  formatIntakeDosageDisplay,
  normalizeIntakeItemKey,
  normalizeIntakeItemName,
  normalizeIntakeItemVariant,
  validateDosageOptional,
  validateIntakeItemType,
  validateUnitOptional,
} from '@contracts/domain'
import type { Entry } from '@contracts/contracts'

const entries: Entry[] = [
  {
    id: 1,
    trackerId: 88,
    value: 4,
    note: 'legacy intake note',
    metadata: {},
    timestamp: Date.parse('2026-05-18T18:00:00'),
    dateStr: '2026-05-18',
  },
  {
    id: 2,
    trackerId: 88,
    value: null,
    note: 'Vitamin D context',
    metadata: {},
    timestamp: Date.parse('2026-05-19T07:00:00'),
    dateStr: '2026-05-19',
    intake: {
      structured: true,
      itemId: 201,
      itemName: 'Vitamin D',
      itemKey: 'vitamin d | vitamin',
      itemType: 'vitamin',
      variant: null,
      dosage: null,
      unit: null,
    },
  },
  {
    id: 3,
    trackerId: 88,
    value: null,
    note: 'Vitamin D morning dose',
    metadata: {},
    timestamp: Date.parse('2026-05-19T08:00:00'),
    dateStr: '2026-05-19',
    intake: {
      structured: true,
      itemId: 201,
      itemName: 'Vitamin D',
      itemKey: 'vitamin d | vitamin',
      itemType: 'vitamin',
      variant: null,
      dosage: 1000,
      unit: 'IU',
    },
  },
  {
    id: 4,
    trackerId: 88,
    value: null,
    note: 'Vitamin D evening dose',
    metadata: {},
    timestamp: Date.parse('2026-05-20T08:00:00'),
    dateStr: '2026-05-20',
    intake: {
      structured: true,
      itemId: 201,
      itemName: 'Vitamin D',
      itemKey: 'vitamin d | vitamin',
      itemType: 'vitamin',
      variant: null,
      dosage: 500,
      unit: 'IU',
    },
  },
  {
    id: 5,
    trackerId: 88,
    value: null,
    note: 'Vitamin D Company A',
    metadata: {},
    timestamp: Date.parse('2026-05-20T10:00:00'),
    dateStr: '2026-05-20',
    intake: {
      structured: true,
      itemId: 202,
      itemName: 'Vitamin D',
      itemKey: 'vitamin d | vitamin | company a',
      itemType: 'vitamin',
      variant: 'Company A',
      dosage: 1,
      unit: 'mg',
    },
  },
]

describe('intake domain helpers', () => {
  it('normalizes names, variants, dosage, units, and item keys', () => {
    expect(normalizeIntakeItemName('  Vitamin   D  ')).toBe('Vitamin D')
    expect(normalizeIntakeItemVariant('  Company   A  ')).toBe('Company A')
    expect(normalizeIntakeItemKey(' Vitamin D ', 'vitamin', ' Company A ')).toBe('vitamin d | vitamin | company a')
    expect(validateIntakeItemType(' supplement ')).toBe('supplement')
    expect(() => validateIntakeItemType('tea')).toThrow('Item type must be vitamin, medication, supplement, or other')
    expect(validateDosageOptional(null)).toBeNull()
    expect(validateDosageOptional('1000')).toBe(1000)
    expect(() => validateDosageOptional(0)).toThrow('Dosage must be a finite positive number')
    expect(validateUnitOptional(' IU ')).toBe('IU')
    expect(validateUnitOptional('   ')).toBeNull()
    expect(formatIntakeDosageDisplay(null, null)).toBe('--')
    expect(formatIntakeDosageDisplay(1000, 'IU')).toBe('1000 IU')
  })

  it('keeps legacy intake rows readable while separating structured counts from unit-specific dosage summaries', () => {
    const detail = buildIntakeDetailReadModel(entries)
    const stats = buildIntakeStatisticsReadModel(entries)
    const home = buildIntakeHomeWidgetReadModel(entries, {
      trackerId: 88,
      title: 'Vitamins & Medications',
      selectedDate: '2026-05-19',
    })

    expect(detail.current).toMatchObject({
      entryId: 5,
      structured: true,
      itemName: 'Vitamin D',
      variant: 'Company A',
      dosage: 1,
      unit: 'mg',
    })
    expect(detail.history.map((entry) => entry.entryId)).toEqual([5, 4, 3, 2, 1])
    expect(detail.history[4]).toMatchObject({
      entryId: 1,
      structured: false,
      legacyText: 'legacy intake note',
      legacyValue: 4,
    })
    expect(detail.history[3]).toMatchObject({
      entryId: 2,
      structured: true,
      dosage: null,
      unit: null,
    })

    expect(computeIntakeCount(detail.history)).toBe(4)
    expect(computeDaysWithIntakes(detail.history)).toBe(2)
    expect(computeIntakeItemFrequency(detail.history)).toEqual([
      {
        itemName: 'Vitamin D',
        itemKey: 'vitamin d | vitamin',
        itemType: 'vitamin',
        variant: null,
        entryCount: 3,
        daysWithIntakes: 2,
      },
      {
        itemName: 'Vitamin D',
        itemKey: 'vitamin d | vitamin | company a',
        itemType: 'vitamin',
        variant: 'Company A',
        entryCount: 1,
        daysWithIntakes: 1,
      },
    ])
    expect(computeDoseSummary(detail.history)).toEqual([
      {
        itemName: 'Vitamin D',
        itemKey: 'vitamin d | vitamin',
        itemType: 'vitamin',
        variant: null,
        unit: 'IU',
        totalDosage: 1500,
        dosageCount: 2,
        missingDosageCount: 0,
        entryCount: 2,
      },
      {
        itemName: 'Vitamin D',
        itemKey: 'vitamin d | vitamin | company a',
        itemType: 'vitamin',
        variant: 'Company A',
        unit: 'mg',
        totalDosage: 1,
        dosageCount: 1,
        missingDosageCount: 0,
        entryCount: 1,
      },
      {
        itemName: 'Vitamin D',
        itemKey: 'vitamin d | vitamin',
        itemType: 'vitamin',
        variant: null,
        unit: null,
        totalDosage: null,
        dosageCount: 0,
        missingDosageCount: 1,
        entryCount: 1,
      },
    ])

    expect(detail.intakeCount).toBe(4)
    expect(detail.structuredEntryCount).toBe(4)
    expect(detail.legacyEntryCount).toBe(1)
    expect(detail.daysWithIntakes).toBe(2)
    expect(detail.chartData).toEqual([
      { date: '2026-05-19', value: 2, count: 2 },
      { date: '2026-05-20', value: 2, count: 2 },
    ])

    expect(stats).toMatchObject({
      intakeCount: 4,
      structuredEntryCount: 4,
      legacyEntryCount: 1,
      daysWithIntakes: 2,
    })

    expect(home).toMatchObject({
      trackerId: 88,
      title: 'Vitamins & Medications',
      currentItemName: 'Vitamin D',
      currentItemType: 'vitamin',
      currentVariant: 'Company A',
      currentDosage: 1,
      currentUnit: 'mg',
      intakeCount: 4,
      daysWithIntakes: 2,
      legacyEntryCount: 1,
    })
    expect(home.selectedDayEntries.map((entry) => entry.entryId)).toEqual([3, 2])
    expect(home.sparkline).toEqual([
      { date: '2026-05-19', value: 2 },
      { date: '2026-05-20', value: 2 },
    ])
  })
})
