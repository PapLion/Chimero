import { beforeEach, describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { analyze, getSeries, listMetrics, overview, scan } from '../../../apps/electron/src/main/features/analytics/service'
import { eachDay } from '@contracts/domain/analytics/series'
import { addEntry, addTracker, createTestDb } from '../../helpers/test-db'

const prefs = { weightUnit: 'kg', measureUnit: 'cm' } as const
const range = { from: '2026-03-01', to: '2026-04-29' }
const days = eachDay(range.from, range.to)

describe('analytics service', () => {
  let db: Database.Database
  let weight: number
  let mood: number
  let exercise: number
  let gaming: number
  let health: number
  let food: number
  let sleep: number

  beforeEach(() => {
    db = createTestDb()
    weight = addTracker(db, 'Weight', 'numeric', { identity: 'weight' })
    mood = addTracker(db, 'Mood', 'range', { identity: 'mood', max: 10 })
    exercise = addTracker(db, 'Exercise', 'numeric', { identity: 'exercise' })
    gaming = addTracker(db, 'Gaming', 'text', { identity: 'gaming' })
    health = addTracker(db, 'Health', 'text', { identity: 'health' })
    food = addTracker(db, 'Food', 'numeric', { identity: 'diet' })
    sleep = addTracker(db, 'Sleep', 'numeric', { unit: 'h', aggregate: 'mean', valueKind: 'measure', fields: [{ key: 'quality', label: 'Quality', type: 'number' }, { key: 'dream', label: 'Remembered a dream', type: 'boolean' }] }, true)
  })

  function seed() {
    const symptom = Number(db.prepare("INSERT INTO symptoms (tracker_id, name, symptom_key, category) VALUES (?, 'Headache', 'headache', 'physical')").run(health).lastInsertRowid)
    const wheat = Number(db.prepare("INSERT INTO tags (name) VALUES ('Wheat')").run().lastInsertRowid)
    const pasta = Number(db.prepare("INSERT INTO tags (name) VALUES ('Pasta')").run().lastInsertRowid)
    db.prepare('INSERT INTO tag_relationships (parent_tag_id, child_tag_id) VALUES (?, ?)').run(wheat, pasta)
    days.forEach((date, i) => {
      const trained = i % 2 === 0
      // weight in pounds on odd days to exercise unit conversion
      const w = addEntry(db, weight, date, null)
      if (i % 2) db.prepare("INSERT INTO entry_weight (entry_id, weight_value, weight_unit) VALUES (?, ?, 'lb')").run(w, (80 - i * 0.1) / 0.45359237)
      else db.prepare("INSERT INTO entry_weight (entry_id, weight_value, weight_unit, waist_value, waist_unit) VALUES (?, ?, 'kg', 90, 'cm')").run(w, 80 - i * 0.1)
      // two mood readings; higher on training days
      addEntry(db, mood, date, trained ? 8 : 5, { hour: 9 })
      addEntry(db, mood, date, trained ? 7 : 4, { hour: 20 })
      if (trained) {
        const session = addEntry(db, exercise, date, null)
        db.prepare("INSERT INTO workout_sessions (entry_id, duration_minutes, load_unit) VALUES (?, 45, 'kg')").run(session)
        const ex = Number(db.prepare("INSERT INTO workout_session_exercises (session_entry_id, exercise_key, exercise_name) VALUES (?, 'squat', 'Squat')").run(session).lastInsertRowid)
        db.prepare('INSERT INTO workout_sets (session_exercise_id, set_index, reps, load) VALUES (?, 0, 5, 100), (?, 1, 5, 100)').run(ex, ex)
      }
      if (i % 5 === 0) {
        const g = addEntry(db, gaming, date, null)
        db.prepare("INSERT INTO entry_gaming (entry_id, game_title, game_key, estimated_hours) VALUES (?, 'Hades', 'hades', 2.5)").run(g)
      }
      // pasta every third day; headache the day after
      if (i % 3 === 0) {
        const f = addEntry(db, food, date, null)
        db.prepare("INSERT INTO entry_food (entry_id, food_name, food_key, calories) VALUES (?, 'Carbonara', 'carbonara', 700)").run(f)
        db.prepare('INSERT INTO entries_to_tags (entry_id, tag_id) VALUES (?, ?)').run(f, pasta)
      }
      if (i % 3 === 1) {
        const h = addEntry(db, health, date, null)
        db.prepare('INSERT INTO entry_health (entry_id, symptom_id, severity) VALUES (?, ?, 6)').run(h, symptom)
      }
      if (i >= 30) addEntry(db, sleep, date, 6 + (i % 3), { metadata: { fields: { quality: 5 + (i % 3), dream: i % 4 === 0 } } })
    })
    return { symptom, wheat, pasta }
  }

  it('lists nothing for an empty database', () => {
    expect(listMetrics(db, prefs)).toEqual([])
    expect(scan(db, prefs, range)).toMatchObject({ findings: [], metricsConsidered: 0 })
    expect(overview(db, range, '2026-04-29')).toMatchObject({ totalEntries: 0, activeDays: 0, currentStreak: 0, firstEntryDate: null })
  })

  it('derives metrics for structured, tagged and custom trackers', () => {
    const { symptom, wheat, pasta } = seed()
    const ids = listMetrics(db, prefs).map((m) => m.id)
    expect(ids).toEqual(expect.arrayContaining([
      `t:${weight}:weight`, `t:${weight}:waist`, `t:${mood}:avg`, `t:${mood}:low`,
      `t:${exercise}:trained`, `t:${exercise}:minutes`, `t:${exercise}:volume`,
      `t:${gaming}:hours`, `t:${gaming}:game:hades`, `t:${health}:any`, `t:${health}:symptom:${symptom}`,
      `t:${food}:items`, `t:${food}:calories`, `t:${food}:food:carbonara`,
      `t:${sleep}:value`, `t:${sleep}:f:quality`, `t:${sleep}:f:dream`, `tag:${wheat}`, `tag:${pasta}`,
    ]))
  })

  it('converts units and averages several readings per day', () => {
    seed()
    const { series, summaries } = getSeries(db, prefs, range, [`t:${weight}:weight`, `t:${mood}:avg`, `t:${exercise}:volume`, `t:${gaming}:hours`])
    const [w, m, volume, hours] = series
    expect(w.points).toHaveLength(60)
    expect(w.points[1].value).toBeCloseTo(79.9, 2) // stored in lb, reported in kg
    expect(summaries[0].trendPerDay).toBeCloseTo(-0.1, 3)
    expect(m.points[0].value).toBe(7.5)
    expect(m.points[1].value).toBe(4.5)
    expect(volume.points[0].value).toBe(1000)
    expect(volume.points[1].value).toBe(0) // rest day is a real zero
    expect(hours.points).toHaveLength(60)
    expect(summaries[3].total).toBe(30)
    expect(summaries[3].recordedDays).toBe(12)

    const inPounds = getSeries(db, { weightUnit: 'lb', measureUnit: 'in' }, range, [`t:${weight}:weight`, `t:${exercise}:volume`])
    expect(inPounds.series[0].points[0].value).toBeCloseTo(176.37, 1)
    expect(inPounds.series[1].points[0].value).toBeCloseTo(2204.6, 0)
    expect(inPounds.series[0].metric.unit).toBe('lb')
  })

  it('does not invent zeros before a tracker was first used', () => {
    seed()
    const { series } = getSeries(db, prefs, range, [`t:${sleep}:value`, `t:${sleep}:f:dream`])
    expect(series[0].points[0].date).toBe(days[30])
    expect(series[1].points[0].date).toBe(days[30])
  })

  it('answers "is my mood better on days I train?" from stored records', () => {
    seed()
    const result = analyze(db, prefs, { ...range, a: `t:${exercise}:trained`, b: `t:${mood}:avg` })
    expect(result).toMatchObject({ status: 'ok', n: 60, direction: 'positive', strength: 'strong', reliability: 'solid' })
    expect(result?.split).toMatchObject({ mode: 'occurrence', high: { n: 30, mean: 7.5 }, low: { n: 30, mean: 4.5 }, diff: 3 })
    expect(result?.spearman?.p).toBeLessThan(0.001)
  })

  it('inherits parent tags and finds next-day relationships', () => {
    const { symptom, wheat } = seed()
    const sameDay = analyze(db, prefs, { ...range, a: `tag:${wheat}`, b: `t:${health}:symptom:${symptom}`, lagDays: 0 })
    const nextDay = analyze(db, prefs, { ...range, a: `tag:${wheat}`, b: `t:${health}:symptom:${symptom}`, lagDays: 1 })
    expect(nextDay?.pearson?.value).toBeCloseTo(1, 6)
    expect(nextDay?.split).toMatchObject({ outcomeIsRate: true, high: { mean: 1 }, low: { mean: 0 } })
    expect(sameDay?.direction).toBe('negative')
  })

  it('returns null for unknown metrics and insufficient for thin data', () => {
    seed()
    expect(analyze(db, prefs, { ...range, a: 't:999:value', b: `t:${mood}:avg` })).toBeNull()
    const thin = analyze(db, prefs, { from: '2026-03-01', to: '2026-03-03', a: `t:${exercise}:trained`, b: `t:${mood}:avg` })
    expect(thin).toMatchObject({ status: 'insufficient', n: 3, spearman: null })
  })

  it('scans across trackers, deterministically, skipping same-tracker pairs', () => {
    seed()
    const first = scan(db, prefs, range)
    expect(scan(db, prefs, range)).toEqual(first)
    expect(first.findings.length).toBeGreaterThan(0)
    expect(first.findings.length).toBeLessThanOrEqual(24)
    for (const finding of first.findings) {
      expect(finding.a.group).not.toBe(finding.b.group)
      expect(Math.abs(finding.rho)).toBeGreaterThanOrEqual(0.3)
      expect(finding.p).toBeLessThanOrEqual(0.05)
      expect(finding.n).toBeGreaterThanOrEqual(10)
    }
    expect(first.findings.some((f) => [f.a.id, f.b.id].includes(`t:${exercise}:trained`) && [f.a.id, f.b.id].includes(`t:${mood}:avg`))).toBe(true)
  })

  it('ignores archived trackers and reports activity per day', () => {
    seed()
    db.prepare('UPDATE trackers SET archived = 1 WHERE id = ?').run(gaming)
    expect(listMetrics(db, prefs).some((m) => m.trackerId === gaming)).toBe(false)
    const result = overview(db, range, '2026-04-29')
    expect(result.activeDays).toBe(60)
    expect(result.currentStreak).toBe(60)
    expect(result.bestStreak).toBe(60)
    expect(result.days[0].byTracker[mood]).toBe(2)
    expect(result.days[0].byTracker[gaming]).toBeUndefined()
    expect(result.firstEntryDate).toBe('2026-03-01')
  })
})
