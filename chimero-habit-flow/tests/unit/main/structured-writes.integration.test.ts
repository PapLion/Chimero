/**
 * Structured writes against a real SQLite database: no mocked handle.
 *
 * Unit tests that fake `db.transaction` once hid a real failure — better-sqlite3
 * refuses transaction callbacks that return a promise — so every structured
 * service is exercised here end to end, together with the rollback guarantee.
 */
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_TRACKERS } from '@contracts/features/tracking'
import { attachDb, closeDb, transact } from '@packages/db/database'
import { createTestDb } from '../../helpers/test-db'
import * as books from '../../../apps/electron/src/main/features/books/service'
import * as food from '../../../apps/electron/src/main/features/food/service'
import * as gaming from '../../../apps/electron/src/main/features/gaming/service'
import * as health from '../../../apps/electron/src/main/features/health/service'
import * as intake from '../../../apps/electron/src/main/features/intake/service'
import * as tags from '../../../apps/electron/src/main/features/tags/service'
import * as weight from '../../../apps/electron/src/main/features/weight/service'
import * as workouts from '../../../apps/electron/src/main/features/workouts/service'

let raw: Database.Database
let trackerId: Record<string, number>
const at = (day: number, hour = 12) => new Date(2026, 0, day, hour).getTime()
const count = (table: string) => (raw.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n

beforeEach(() => {
  raw = createTestDb()
  attachDb(raw)
  trackerId = {}
  const insert = raw.prepare('INSERT INTO trackers (name, type, icon, color, "order", config, is_custom, archived) VALUES (?, ?, ?, ?, ?, ?, 0, 0)')
  for (const tracker of DEFAULT_TRACKERS) {
    const identity = String(tracker.config.identity)
    trackerId[identity] = Number(insert.run(tracker.name, tracker.type, tracker.icon, tracker.color, tracker.order, JSON.stringify(tracker.config)).lastInsertRowid)
  }
})

afterEach(() => {
  closeDb()
})

describe('structured writes on a real database', () => {
  it('books: start, read and finish move the book across shelves', async () => {
    const created = await books.createBook({ title: 'The Salt Road' })
    expect(created).toBeTruthy()
    const bookId = created!.book.id
    expect(await books.startBook({ trackerId: trackerId.books, bookId, timestamp: at(2) })).toBeTruthy()
    expect(await books.readBook({ trackerId: trackerId.books, bookId, timestamp: at(3) })).toBeTruthy()
    // A second reading record the same day is folded into the first.
    await books.readBook({ trackerId: trackerId.books, bookId, timestamp: at(3, 20) })
    expect(await books.finishBook({ trackerId: trackerId.books, bookId, timestamp: at(9) })).toBeTruthy()
    const book = await books.getBook(bookId)
    expect(book?.book.shelf).toBe('finished')
    expect(count('book_activities')).toBe(3)
  })

  it('weight: entries, tags and the goal round-trip', async () => {
    const tag = await tags.createTag({ name: 'morning' })
    const entry = await weight.addWeightEntry({ trackerId: trackerId.weight, weight: 176.4, weightUnit: 'lb', waist: 33, waistUnit: 'in', timestamp: at(4), tagIds: [tag!.id] })
    expect(entry).toBeTruthy()
    const id = entry!.entry.entryId
    expect(await weight.updateWeightEntry(id, { weight: 175.9 })).toBeTruthy()
    expect((raw.prepare('SELECT weight_value AS w FROM entry_weight WHERE entry_id = ?').get(id) as { w: number }).w).toBeCloseTo(175.9)
    expect(count('entries_to_tags')).toBe(1)

    expect(await weight.setWeightGoal({ trackerId: trackerId.weight, goalType: 'target', targetValue: 170, unit: 'lb', direction: 'decrease' })).toBeTruthy()
    expect((await weight.getWeightGoal(trackerId.weight))?.targetValue).toBe(170)
    expect(await weight.setWeightGoal({ trackerId: trackerId.weight, goalType: 'target', targetValue: 170, active: false })).toBeNull()
    expect(await weight.getWeightGoal(trackerId.weight)).toBeNull()

    expect(await weight.deleteWeightEntry(id)).toBe(true)
    expect(count('entries')).toBe(0)
    expect(count('entry_weight')).toBe(0)
    expect(count('entries_to_tags')).toBe(0)
  })

  it('food, health, intake and gaming each write their extension row', async () => {
    const meal = await food.addFoodEntry({ trackerId: trackerId.diet, foodName: 'Latte', calories: 190, mealType: 'breakfast', timestamp: at(5, 8) })
    const symptom = await health.addHealthSymptomEntry({ trackerId: trackerId.health, symptomName: 'Bloating', category: 'physical', severity: 4, timestamp: at(6, 10) })
    const dose = await intake.addIntakeEntry({ trackerId: trackerId.intake, itemName: 'Magnesium', itemType: 'supplement', dosage: 200, unit: 'mg', timestamp: at(5, 21) })
    const session = await gaming.addGamingEntry({ trackerId: trackerId.gaming, gameTitle: 'Lantern Tides', estimatedHours: 1.5, timestamp: at(5, 22) })
    for (const result of [meal, symptom, dose, session]) expect(result).toBeTruthy()
    expect(count('entry_food')).toBe(1)
    expect(count('entry_health')).toBe(1)
    expect(count('entry_intake')).toBe(1)
    expect(count('entry_gaming')).toBe(1)

    expect(await food.updateFoodEntry(meal!.entry.entryId, { calories: 210 })).toBeTruthy()
    expect(await intake.updateIntakeEntry(dose!.entry.entryId, { dosage: 400 })).toBeTruthy()
    expect(await health.deleteHealthSymptomEntry(symptom!.entry.entryId)).toBe(true)
    expect(await gaming.deleteGamingEntryData(session!.entry.entryId)).toBe(true)
    expect(count('entry_health')).toBe(0)
    expect(count('entry_gaming')).toBe(0)
    expect(count('entries')).toBe(2)
  })

  it('workouts: a session with sets saves, reloads, and becomes a routine', async () => {
    const detail = await workouts.createWorkoutSession({
      trackerId: trackerId.exercise,
      timestamp: at(7, 18),
      sessionName: 'Push',
      durationMinutes: 50,
      loadUnit: 'lb',
      exercises: [
        { exerciseId: 'Barbell_Bench_Press', name: 'Barbell Bench Press', orderIndex: 0, sets: [{ setIndex: 0, reps: 8, load: 135 }, { setIndex: 1, reps: 8, load: 135 }] },
        { exerciseId: 'custom:cable-fly', name: 'Cable fly', orderIndex: 1, sets: [{ setIndex: 0, reps: 12, load: 30 }] },
      ],
    })
    expect(detail).toBeTruthy()
    const entryId = detail!.session.entryId
    const reloaded = await workouts.getWorkoutSession(entryId)
    expect(reloaded?.session.exercises).toHaveLength(2)
    expect(reloaded?.session.exercises[0].sets).toHaveLength(2)

    const routine = await workouts.saveWorkoutAsRoutine({ sessionEntryId: entryId, name: 'Push day' })
    expect(routine).toBeTruthy()
    const plan = await workouts.instantiateWorkoutFromRoutine({ routineId: routine!.routine.id, timestamp: at(9, 18) })
    expect(plan?.exercises).toHaveLength(2)

    expect(await workouts.deleteWorkoutSession(entryId)).toBe(true)
    expect(count('workout_sets')).toBe(0)
  })
})

describe('transact', () => {
  it('rolls back every write when the work throws', async () => {
    await expect(
      transact(async (tx) => {
        tx.$client.prepare("INSERT INTO tags (name) VALUES ('kept?')").run()
        await Promise.resolve()
        throw new Error('stop')
      }),
    ).rejects.toThrow('stop')
    expect(count('tags')).toBe(0)
    expect(raw.inTransaction).toBe(false)
  })

  it('runs overlapping calls one after another', async () => {
    const order: string[] = []
    await Promise.all([
      transact(async () => {
        order.push('a:start')
        await Promise.resolve()
        order.push('a:end')
      }),
      transact(async () => {
        order.push('b:start')
        order.push('b:end')
      }),
    ])
    expect(order).toEqual(['a:start', 'a:end', 'b:start', 'b:end'])
  })
})
