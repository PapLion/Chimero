import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { getExerciseDbStatus, initExerciseDb, searchExercises } from '../../../apps/electron/src/main/features/exercises/service'

describe('bundled exercise catalogue', () => {
  beforeAll(async () => {
    await initExerciseDb(resolve(__dirname, '../../../apps/electron/resources/exercises.json'))
  })

  it('loads offline from the bundled file', () => {
    expect(getExerciseDbStatus().status).toBe('ready')
    expect(searchExercises('', 5)).toHaveLength(5)
  })

  it('puts the everyday variant of a common lift first', () => {
    expect(searchExercises('bench press', 1)[0]?.id).toBe('Barbell_Bench_Press_-_Medium_Grip')
    expect(searchExercises('squat', 1)[0]?.id).toBe('Barbell_Squat')
    expect(searchExercises('deadlift', 1)[0]?.id).toBe('Barbell_Deadlift')
  })

  it('requires every word to match and still finds specific variants', () => {
    expect(searchExercises('bench chains', 3).map((e) => e.name)).toContain('Bench Press with Chains')
    expect(searchExercises('zzzz nothing', 5)).toEqual([])
  })
})
