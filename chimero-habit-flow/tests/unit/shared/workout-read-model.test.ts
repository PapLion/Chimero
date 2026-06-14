import { describe, expect, it } from 'vitest'
import { buildWorkoutSessionReadModel, buildExerciseProgressReadModel } from '../../../packages/shared/src/domain/workout'

describe('workout read models', () => {
  it('keeps bodyweight-only sessions volume-free instead of fabricating zero volume', () => {
    const session = buildWorkoutSessionReadModel({
      entryId: 12,
      trackerId: 7,
      timestamp: Date.UTC(2026, 5, 11, 13, 0, 0),
      dateStr: '2026-06-11',
      note: 'Bodyweight only',
      sessionRow: {
        loadUnit: 'kg',
        sessionName: 'Bodyweight Day',
        exercises: [
          {
            id: 1,
            exerciseId: 'bodyweight-squat',
            exerciseName: 'Bodyweight Squat',
            categorySnapshot: 'strength',
            levelSnapshot: 'beginner',
            equipmentSnapshot: 'bodyweight',
            bodyPartSnapshot: ['quads'],
            secondaryBodyPartSnapshot: ['glutes'],
            forceSnapshot: 'push',
            mechanicSnapshot: 'compound',
          },
        ],
      },
      sessionExercises: [
        {
          id: 1,
          exerciseId: 'bodyweight-squat',
          exerciseName: 'Bodyweight Squat',
          categorySnapshot: 'strength',
          levelSnapshot: 'beginner',
          equipmentSnapshot: 'bodyweight',
          bodyPartSnapshot: ['quads'],
          secondaryBodyPartSnapshot: ['glutes'],
          forceSnapshot: 'push',
          mechanicSnapshot: 'compound',
        },
      ],
      sessionSets: [
        {
          sessionExerciseId: 1,
          setIndex: 1,
          reps: 12,
          load: null,
        },
      ],
    })

    expect(session).toBeDefined()
    expect(session?.totalVolume).toBeNull()
    expect(session?.exercises[0].sets[0].weight).toBeNull()
  })

  it('exposes separate progression series for session volume, heaviest load, and best set volume', () => {
    const benchSession = buildWorkoutSessionReadModel({
      entryId: 13,
      trackerId: 7,
      timestamp: Date.UTC(2026, 5, 12, 13, 0, 0),
      dateStr: '2026-06-12',
      sessionRow: {
        loadUnit: 'kg',
        sessionName: 'Bench Day',
        exercises: [
          {
            id: 2,
            exerciseId: 'bench-press',
            exerciseName: 'Bench Press',
            categorySnapshot: 'strength',
            levelSnapshot: 'intermediate',
            equipmentSnapshot: 'barbell',
            bodyPartSnapshot: ['chest'],
            secondaryBodyPartSnapshot: ['triceps'],
            forceSnapshot: 'push',
            mechanicSnapshot: 'compound',
          },
        ],
      },
      sessionExercises: [
        {
          id: 2,
          exerciseId: 'bench-press',
          exerciseName: 'Bench Press',
          categorySnapshot: 'strength',
          levelSnapshot: 'intermediate',
          equipmentSnapshot: 'barbell',
          bodyPartSnapshot: ['chest'],
          secondaryBodyPartSnapshot: ['triceps'],
          forceSnapshot: 'push',
          mechanicSnapshot: 'compound',
        },
      ],
      sessionSets: [
        {
          sessionExerciseId: 2,
          setIndex: 1,
          reps: 8,
          load: 80,
        },
      ],
    })

    const bodyweightSession = buildWorkoutSessionReadModel({
      entryId: 14,
      trackerId: 7,
      timestamp: Date.UTC(2026, 5, 13, 13, 0, 0),
      dateStr: '2026-06-13',
      sessionRow: {
        loadUnit: 'kg',
        sessionName: 'Squat Day',
        exercises: [
          {
            id: 3,
            exerciseId: 'bodyweight-squat',
            exerciseName: 'Bodyweight Squat',
            categorySnapshot: 'strength',
            levelSnapshot: 'beginner',
            equipmentSnapshot: 'bodyweight',
            bodyPartSnapshot: ['quads'],
            secondaryBodyPartSnapshot: ['glutes'],
            forceSnapshot: 'push',
            mechanicSnapshot: 'compound',
          },
        ],
      },
      sessionExercises: [
        {
          id: 3,
          exerciseId: 'bodyweight-squat',
          exerciseName: 'Bodyweight Squat',
          categorySnapshot: 'strength',
          levelSnapshot: 'beginner',
          equipmentSnapshot: 'bodyweight',
          bodyPartSnapshot: ['quads'],
          secondaryBodyPartSnapshot: ['glutes'],
          forceSnapshot: 'push',
          mechanicSnapshot: 'compound',
        },
      ],
      sessionSets: [
        {
          sessionExerciseId: 3,
          setIndex: 1,
          reps: 12,
          load: null,
        },
      ],
    })

    const progress = buildExerciseProgressReadModel({
      exerciseId: 'bench-press',
      exerciseName: 'Bench Press',
      loadUnit: 'kg',
      sessions: [benchSession!, bodyweightSession!],
    })

    expect(progress.points).toEqual([{ date: '2026-06-12', value: 640 }])
    expect(progress.heaviestLoadPoints).toEqual([{ date: '2026-06-12', value: 80 }])
    expect(progress.bestSetVolumePoints).toEqual([{ date: '2026-06-12', value: 640 }])
    expect(progress.sessionCount).toBe(1)
  })
})
