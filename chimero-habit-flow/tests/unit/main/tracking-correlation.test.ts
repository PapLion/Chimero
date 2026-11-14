import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateImpact, getStats } from '../../../apps/electron/src/main/features/tracking/service'

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }))
vi.mock('@packages/db/database', () => ({ getDb: mocks.getDb }))

function database(...results: unknown[][]) {
  const select = vi.fn(() => {
    const rows = results.shift() ?? []
    const query = { from: vi.fn(), where: vi.fn(), orderBy: vi.fn(() => rows) }
    query.from.mockReturnValue(query)
    query.where.mockReturnValue(query)
    return query
  })
  mocks.getDb.mockReturnValue({ select })
}

beforeEach(() => vi.clearAllMocks())

describe('recorded-day correlation', () => {
  it('averages multiple target observations and retains any source activity on the day', async () => {
    database([
      { dateStr: '2026-11-01', hasEntry: true },
      { dateStr: '2026-11-01', hasEntry: false },
      { dateStr: '2026-11-02', hasEntry: false },
    ], [
      { dateStr: '2026-11-01', value: 6 },
      { dateStr: '2026-11-01', value: 10 },
      { dateStr: '2026-11-02', value: 4 },
    ])
    const result = await calculateImpact(1, 2, 0, { minSampleSize: 1 })
    expect(result.impactedAvg).toBe(8)
    expect(result.baselineAvg).toBe(4)
    expect(result.triggeredDays).toBe(1)
  })

  it('does not invent a baseline or a confident effect from missing days', async () => {
    database([{ dateStr: '2026-11-01', hasEntry: true }], [
      { dateStr: '2026-11-01', value: 8 },
      { dateStr: '2026-11-02', value: 3 },
    ])
    const result = await calculateImpact(1, 2)
    expect(result.baselineDays).toBe(0)
    expect(result.impact).toBe(0)
    expect(result.confidence).toBe(0)
    expect(result.metadata.hasSufficientData).toBe(false)
    expect(result.insightType).toBe('neutral_correlation')
  })

  it('aligns calendar dates across a month boundary with an offset', async () => {
    database([{ dateStr: '2026-10-31', hasEntry: true }], [{ dateStr: '2026-11-01', value: 7 }])
    expect((await calculateImpact(1, 2, 1)).impactedAvg).toBe(7)
  })

  it('does not report a percentage change from a zero baseline', async () => {
    database([{ dateStr: '2026-11-01', hasEntry: true }, { dateStr: '2026-11-02', hasEntry: false }], [
      { dateStr: '2026-11-01', value: 8 }, { dateStr: '2026-11-02', value: 0 },
    ])
    expect((await calculateImpact(1, 2)).impact).toBe(0)
  })

  it('rejects invalid minimum samples', async () => {
    await expect(calculateImpact(1, 2, 0, { minSampleSize: -1 })).rejects.toThrow('Minimum sample size')
  })

  it('groups Monday observations into their own week in every timezone', async () => {
    database([{ id: 1, trackerId: 1, value: 2, dateStr: '2026-11-02' }])
    expect((await getStats({ groupBy: 'week' })).series[0].date).toBe('2026-11-02')
  })
})
