import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getWebDbSyncMock: vi.fn(),
}))

vi.mock('../../../apps/web/server/db', () => ({
  getWebDbSync: mocks.getWebDbSyncMock,
}))

type JsonRecord = Record<string, unknown>

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase()
}

function createWorkoutDb() {
  const state = {
    transactionCalls: 0,
    persistCalls: 0,
    nextSessionExerciseId: 101,
    nextSetId: 201,
    nextRoutineExerciseId: 301,
    entries: new Map<number, JsonRecord>([
      [
        17,
        {
          id: 17,
          tracker_id: 3,
          value: 5,
          note: 'Press, squat, and bodyweight volume smoke',
          metadata: JSON.stringify({
            trackerKind: 'exercise',
            workoutSession: {
              structured: true,
              sessionName: 'Full Body 1',
              note: 'Press, squat, and bodyweight volume smoke',
              loadUnit: 'kg',
              totalSets: 5,
            },
          }),
          timestamp: Date.UTC(2026, 5, 13, 19, 30),
          date_str: '2026-06-13',
          asset_id: null,
        },
      ],
    ]),
    sessions: new Map<number, JsonRecord>([
      [
        17,
        {
          entry_id: 17,
          routine_id: 21,
          session_name: 'Full Body 1',
          duration_minutes: null,
          load_unit: 'kg',
          created_at: Date.UTC(2026, 5, 13, 19, 30),
          updated_at: Date.UTC(2026, 5, 13, 19, 30),
        },
      ],
    ]),
    sessionExercises: new Map<number, JsonRecord>([
      [
        1,
        {
          id: 1,
          session_entry_id: 17,
          exercise_key: 'bench-press',
          source_exercise_id: null,
          exercise_name: 'Bench Press',
          category_snapshot: 'strength',
          level_snapshot: 'beginner',
          equipment_snapshot: 'barbell',
          body_part_snapshot: JSON.stringify(['chest']),
          secondary_body_part_snapshot: JSON.stringify(['triceps']),
          force_snapshot: 'push',
          mechanic_snapshot: 'compound',
          order_index: 0,
        },
      ],
      [
        2,
        {
          id: 2,
          session_entry_id: 17,
          exercise_key: 'sit-up',
          source_exercise_id: null,
          exercise_name: '3/4 Sit-Up',
          category_snapshot: 'strength',
          level_snapshot: 'beginner',
          equipment_snapshot: 'body only',
          body_part_snapshot: JSON.stringify(['abdominals']),
          secondary_body_part_snapshot: JSON.stringify([]),
          force_snapshot: 'pull',
          mechanic_snapshot: 'compound',
          order_index: 1,
        },
      ],
    ]),
    sessionSets: new Map<number, JsonRecord>([
      [11, { id: 11, session_exercise_id: 1, set_index: 1, reps: 8, load: 80 }],
      [12, { id: 12, session_exercise_id: 1, set_index: 2, reps: 8, load: 80 }],
      [13, { id: 13, session_exercise_id: 1, set_index: 3, reps: 8, load: 80 }],
      [14, { id: 14, session_exercise_id: 2, set_index: 1, reps: 15, load: null }],
      [15, { id: 15, session_exercise_id: 2, set_index: 2, reps: 15, load: null }],
    ]),
    routines: new Map<number, JsonRecord>([
      [
        21,
        {
          id: 21,
          tracker_id: 3,
          name: 'Full Body 1',
          notes: 'Upper focus',
          load_unit: 'kg',
          created_at: Date.UTC(2026, 5, 10, 8, 0),
          updated_at: Date.UTC(2026, 5, 13, 7, 0),
        },
      ],
    ]),
    routineExercises: new Map<number, JsonRecord>([
      [
        31,
        {
          id: 31,
          routine_id: 21,
          exercise_key: 'bench-press',
          source_exercise_id: null,
          exercise_name: 'Bench Press',
          category_snapshot: 'strength',
          level_snapshot: 'beginner',
          equipment_snapshot: 'barbell',
          body_part_snapshot: JSON.stringify(['chest']),
          secondary_body_part_snapshot: JSON.stringify(['triceps']),
          force_snapshot: 'push',
          mechanic_snapshot: 'compound',
          order_index: 0,
          target_sets: 3,
          target_reps: 8,
          default_load: 80,
        },
      ],
      [
        32,
        {
          id: 32,
          routine_id: 21,
          exercise_key: 'squat',
          source_exercise_id: null,
          exercise_name: 'Squat',
          category_snapshot: 'strength',
          level_snapshot: 'beginner',
          equipment_snapshot: 'barbell',
          body_part_snapshot: JSON.stringify(['quadriceps']),
          secondary_body_part_snapshot: JSON.stringify(['glutes', 'hamstrings']),
          force_snapshot: 'push',
          mechanic_snapshot: 'compound',
          order_index: 1,
          target_sets: 5,
          target_reps: 5,
          default_load: 120,
        },
      ],
    ]),
    entryTags: new Map<number, number[]>([[17, [7]]]),
  }

  function buildSessionRow(entryId: number): JsonRecord | undefined {
    const entry = state.entries.get(entryId)
    const session = state.sessions.get(entryId)
    if (!entry || !session) return undefined
    return {
      ...entry,
      routine_id: session.routine_id,
      session_name: session.session_name,
      duration_minutes: session.duration_minutes,
      load_unit: session.load_unit,
      created_at: session.created_at,
      updated_at: session.updated_at,
      session_id: session.entry_id,
    }
  }

  function buildRoutineRow(routineId: number): JsonRecord | undefined {
    return state.routines.get(routineId)
  }

  function cloneRow(row: JsonRecord): JsonRecord {
    return JSON.parse(JSON.stringify(row)) as JsonRecord
  }

  function prepare(sql: string) {
    const normalized = normalizeSql(sql)
    return {
      get(...params: unknown[]) {
        if (normalized === 'select e.*, ws.routine_id, ws.session_name, ws.duration_minutes, ws.load_unit, ws.created_at, ws.updated_at, ws.entry_id as session_id from entries e left join workout_sessions ws on ws.entry_id = e.id where e.id = ? limit 1') {
          return buildSessionRow(Number(params[0]))
        }
        if (normalized === 'select * from workout_routines where id = ? limit 1') {
          return buildRoutineRow(Number(params[0]))
        }
        return undefined
      },
      all(...params: unknown[]) {
        if (normalized === 'select id from workout_session_exercises where session_entry_id = ?') {
          return Array.from(state.sessionExercises.values())
            .filter((row) => Number(row.session_entry_id) === Number(params[0]))
            .map((row) => ({ id: Number(row.id) }))
        }
        if (normalized === 'select * from workout_session_exercises where session_entry_id = ? order by order_index asc, id asc') {
          return Array.from(state.sessionExercises.values())
            .filter((row) => Number(row.session_entry_id) === Number(params[0]))
            .sort((left, right) => Number(left.order_index) - Number(right.order_index) || Number(left.id) - Number(right.id))
            .map(cloneRow)
        }
        if (normalized.startsWith('select * from workout_sets where session_exercise_id in (')) {
          const ids = params.map((value) => Number(value))
          return Array.from(state.sessionSets.values())
            .filter((row) => ids.includes(Number(row.session_exercise_id)))
            .sort((left, right) => Number(left.set_index) - Number(right.set_index) || Number(left.id) - Number(right.id))
            .map(cloneRow)
        }
        if (normalized === 'select * from workout_routine_exercises where routine_id = ? order by order_index asc, id asc') {
          return Array.from(state.routineExercises.values())
            .filter((row) => Number(row.routine_id) === Number(params[0]))
            .sort((left, right) => Number(left.order_index) - Number(right.order_index) || Number(left.id) - Number(right.id))
            .map(cloneRow)
        }
        return []
      },
      run(...params: unknown[]) {
        if (normalized === 'update entries set value = ?, note = ?, metadata = ?, timestamp = ?, date_str = ?, asset_id = coalesce(?, asset_id) where id = ?') {
          const [value, note, metadata, timestamp, dateStr, assetId, entryId] = params
          const entry = state.entries.get(Number(entryId))
          if (entry) {
            entry.value = value
            entry.note = note
            entry.metadata = metadata
            entry.timestamp = timestamp
            entry.date_str = dateStr
            if (assetId !== null && assetId !== undefined) entry.asset_id = assetId
          }
          return { changes: entry ? 1 : 0, lastInsertRowid: 0 }
        }
        if (normalized === 'update workout_sessions set routine_id = ?, session_name = ?, duration_minutes = ?, load_unit = ? where entry_id = ?') {
          const [routineId, sessionName, durationMinutes, loadUnit, entryId] = params
          const session = state.sessions.get(Number(entryId))
          if (session) {
            session.routine_id = routineId
            session.session_name = sessionName
            session.duration_minutes = durationMinutes
            session.load_unit = loadUnit
          }
          return { changes: session ? 1 : 0, lastInsertRowid: 0 }
        }
        if (normalized.startsWith('delete from workout_sets where session_exercise_id in (')) {
          const ids = params.map((value) => Number(value))
          for (const [setId, setRow] of [...state.sessionSets.entries()]) {
            if (ids.includes(Number(setRow.session_exercise_id))) state.sessionSets.delete(setId)
          }
          return { changes: 1, lastInsertRowid: 0 }
        }
        if (normalized === 'delete from workout_session_exercises where session_entry_id = ?') {
          const entryId = Number(params[0])
          for (const [exerciseId, exerciseRow] of [...state.sessionExercises.entries()]) {
            if (Number(exerciseRow.session_entry_id) === entryId) state.sessionExercises.delete(exerciseId)
          }
          return { changes: 1, lastInsertRowid: 0 }
        }
        if (normalized === 'insert into workout_session_exercises ( session_entry_id, exercise_key, source_exercise_id, exercise_name, category_snapshot, level_snapshot, equipment_snapshot, body_part_snapshot, secondary_body_part_snapshot, force_snapshot, mechanic_snapshot, order_index ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)') {
          const [sessionEntryId, exerciseKey, sourceExerciseId, exerciseName, categorySnapshot, levelSnapshot, equipmentSnapshot, bodyPartSnapshot, secondaryBodyPartSnapshot, forceSnapshot, mechanicSnapshot, orderIndex] = params
          const id = state.nextSessionExerciseId++
          state.sessionExercises.set(id, {
            id,
            session_entry_id: Number(sessionEntryId),
            exercise_key: String(exerciseKey),
            source_exercise_id: sourceExerciseId ?? null,
            exercise_name: String(exerciseName),
            category_snapshot: categorySnapshot ?? null,
            level_snapshot: levelSnapshot ?? null,
            equipment_snapshot: equipmentSnapshot ?? null,
            body_part_snapshot: bodyPartSnapshot ?? null,
            secondary_body_part_snapshot: secondaryBodyPartSnapshot ?? null,
            force_snapshot: forceSnapshot ?? null,
            mechanic_snapshot: mechanicSnapshot ?? null,
            order_index: Number(orderIndex),
          })
          return { changes: 1, lastInsertRowid: id }
        }
        if (normalized === 'insert into workout_sets (session_exercise_id, set_index, reps, load) values (?, ?, ?, ?)') {
          const [sessionExerciseId, setIndex, reps, load] = params
          const id = state.nextSetId++
          state.sessionSets.set(id, {
            id,
            session_exercise_id: Number(sessionExerciseId),
            set_index: Number(setIndex),
            reps: reps ?? null,
            load: load ?? null,
          })
          return { changes: 1, lastInsertRowid: id }
        }
        if (normalized === 'delete from entries_to_tags where entry_id = ?') {
          state.entryTags.delete(Number(params[0]))
          return { changes: 1, lastInsertRowid: 0 }
        }
        if (normalized === 'insert into entries_to_tags (entry_id, tag_id) values (?, ?)') {
          const [entryId, tagId] = params
          const tags = state.entryTags.get(Number(entryId)) ?? []
          if (!tags.includes(Number(tagId))) tags.push(Number(tagId))
          state.entryTags.set(Number(entryId), tags)
          return { changes: 1, lastInsertRowid: 0 }
        }
        if (normalized === 'update workout_routines set name = ?, notes = ?, load_unit = ?, updated_at = ? where id = ?') {
          const [name, notes, loadUnit, updatedAt, routineId] = params
          const routine = state.routines.get(Number(routineId))
          if (routine) {
            routine.name = name
            routine.notes = notes
            routine.load_unit = loadUnit
            routine.updated_at = updatedAt
          }
          return { changes: routine ? 1 : 0, lastInsertRowid: 0 }
        }
        if (normalized === 'delete from workout_routine_exercises where routine_id = ?') {
          const routineId = Number(params[0])
          for (const [exerciseId, exerciseRow] of [...state.routineExercises.entries()]) {
            if (Number(exerciseRow.routine_id) === routineId) state.routineExercises.delete(exerciseId)
          }
          return { changes: 1, lastInsertRowid: 0 }
        }
        if (normalized === 'insert into workout_routine_exercises ( routine_id, exercise_key, source_exercise_id, exercise_name, category_snapshot, level_snapshot, equipment_snapshot, body_part_snapshot, secondary_body_part_snapshot, force_snapshot, mechanic_snapshot, order_index, target_sets, target_reps, default_load ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)') {
          const [routineId, exerciseKey, sourceExerciseId, exerciseName, categorySnapshot, levelSnapshot, equipmentSnapshot, bodyPartSnapshot, secondaryBodyPartSnapshot, forceSnapshot, mechanicSnapshot, orderIndex, targetSets, targetReps, defaultLoad] = params
          const id = state.nextRoutineExerciseId++
          state.routineExercises.set(id, {
            id,
            routine_id: Number(routineId),
            exercise_key: String(exerciseKey),
            source_exercise_id: sourceExerciseId ?? null,
            exercise_name: String(exerciseName),
            category_snapshot: categorySnapshot ?? null,
            level_snapshot: levelSnapshot ?? null,
            equipment_snapshot: equipmentSnapshot ?? null,
            body_part_snapshot: bodyPartSnapshot ?? null,
            secondary_body_part_snapshot: secondaryBodyPartSnapshot ?? null,
            force_snapshot: forceSnapshot ?? null,
            mechanic_snapshot: mechanicSnapshot ?? null,
            order_index: Number(orderIndex),
            target_sets: Number(targetSets),
            target_reps: targetReps ?? null,
            default_load: defaultLoad ?? null,
          })
          return { changes: 1, lastInsertRowid: id }
        }
        return { changes: 0, lastInsertRowid: 0 }
      },
    }
  }

  return {
    state,
    prepare,
    transaction<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult) {
      return (...args: TArgs) => {
        state.transactionCalls += 1
        const result = fn(...args)
        state.persistCalls += 1
        return result
      }
    },
    persist() {
      state.persistCalls += 1
    },
  }
}

describe('web workout updates', () => {
  beforeEach(() => {
    mocks.getWebDbSyncMock.mockReset()
  })

  it('persists structured workout session updates through the dedicated path', async () => {
    const db = createWorkoutDb()
    mocks.getWebDbSyncMock.mockReturnValue(db)

    const { updateWorkoutSession } = await import('../../../apps/web/server/features/workouts')

    const result = updateWorkoutSession(17, {
      timestamp: Date.UTC(2026, 5, 13, 20, 0),
      sessionName: 'Push day updated',
      note: 'Debug note',
      routineId: 21,
      durationMinutes: 45,
      loadUnit: 'kg',
      tagIds: [9],
      exercises: [
        {
          exerciseId: 'bench-press',
          sourceExerciseId: null,
          name: 'Bench Press',
          category: 'strength',
          level: 'beginner',
          equipment: 'barbell',
          bodyPartSnapshot: ['chest'],
          secondaryBodyPartSnapshot: ['triceps'],
          force: 'push',
          mechanic: 'compound',
          orderIndex: 0,
          sets: [
            { setIndex: 1, reps: 9, load: 85, notes: null, isWarmup: false },
            { setIndex: 2, reps: 8, load: 80, notes: null, isWarmup: false },
            { setIndex: 3, reps: 8, load: 80, notes: null, isWarmup: false },
          ],
        },
        {
          exerciseId: 'sit-up',
          sourceExerciseId: null,
          name: '3/4 Sit-Up',
          category: 'strength',
          level: 'beginner',
          equipment: 'body only',
          bodyPartSnapshot: ['abdominals'],
          secondaryBodyPartSnapshot: [],
          force: 'pull',
          mechanic: 'compound',
          orderIndex: 1,
          sets: [
            { setIndex: 1, reps: 15, load: null, notes: null, isWarmup: false },
            { setIndex: 2, reps: 15, load: null, notes: null, isWarmup: false },
          ],
        },
      ],
    })

    expect(result?.session.sessionName).toBe('Push day updated')
    expect(result?.session.note).toBe('Debug note')
    expect(result?.session.durationMinutes).toBe(45)
    expect(result?.session.totalSets).toBe(5)
    expect(result?.session.exercises[0]?.sets[0]?.reps).toBe(9)
    expect(result?.session.exercises[0]?.sets[0]?.load).toBe(85)
    expect(result?.session.exercises[1]?.sets[0]?.load).toBeNull()
    expect(db.state.transactionCalls).toBe(1)
    expect(db.state.entries.get(17)?.note).toBe('Debug note')
    expect(db.state.sessions.get(17)?.session_name).toBe('Push day updated')
    expect(db.state.entryTags.get(17)).toEqual([9])
  })

  it('persists workout routine updates through the dedicated path', async () => {
    const db = createWorkoutDb()
    mocks.getWebDbSyncMock.mockReturnValue(db)

    const { updateWorkoutRoutine } = await import('../../../apps/web/server/features/workouts')

    const result = updateWorkoutRoutine(21, {
      name: 'Full Body 2',
      notes: 'Lower focus',
      loadUnit: 'lb',
      exercises: [
        {
          exerciseId: 'squat',
          sourceExerciseId: null,
          name: 'Squat',
          category: 'strength',
          level: 'beginner',
          equipment: 'barbell',
          bodyPartSnapshot: ['quadriceps'],
          secondaryBodyPartSnapshot: ['glutes', 'hamstrings'],
          force: 'push',
          mechanic: 'compound',
          orderIndex: 0,
          targetSets: 5,
          targetReps: 5,
          defaultLoad: 120,
        },
      ],
    })

    expect(result?.routine.name).toBe('Full Body 2')
    expect(result?.routine.notes).toBe('Lower focus')
    expect(result?.routine.loadUnit).toBe('lb')
    expect(db.state.transactionCalls).toBe(1)
    expect(db.state.routines.get(21)?.name).toBe('Full Body 2')
    expect(db.state.routines.get(21)?.load_unit).toBe('lb')
    expect(Array.from(db.state.routineExercises.values())).toHaveLength(1)
  })
})
