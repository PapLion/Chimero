import { describe, expect, it } from 'vitest'

import { mapEntry } from '../../../apps/electron/src/main/shared/mappers'

describe('Exercise entry mapping', () => {
  it('preserves structured workout sessions from metadata', () => {
    const entry = mapEntry({
      id: 88,
      tracker_id: 14,
      value: 2,
      note: 'Leg day',
      metadata: JSON.stringify({
        workoutSession: {
          structured: true,
          routine: { name: 'Strength A', notes: 'Focus on tempo' },
          title: 'Strength A',
          note: 'Heavy compounds',
          loadUnit: 'kg',
          startedAt: Date.UTC(2026, 5, 11, 13, 0),
          completedAt: Date.UTC(2026, 5, 11, 14, 5),
          exercises: [
            {
              exerciseId: 'back-squat',
              exerciseName: 'Back Squat',
              category: 'strength',
              level: 'intermediate',
              equipment: 'barbell',
              bodyPartSnapshot: ['quads', 'glutes'],
              secondaryBodyPartSnapshot: ['hamstrings'],
              force: 'push',
              mechanic: 'compound',
              notes: 'Controlled eccentric',
              sets: [
                { setIndex: 1, reps: 5, load: 100, weight: 100, weightUnit: 'kg' },
                { setIndex: 2, reps: 5, load: 100, weight: 100, weightUnit: 'kg' },
              ],
            },
          ],
        },
      }),
      timestamp: Date.UTC(2026, 5, 11, 14, 0),
      date_str: '2026-06-11',
      asset_id: null,
    })

    expect(entry.workout).toEqual({
      structured: true,
      entryId: 88,
      trackerId: 14,
      routineId: null,
      timestamp: Date.UTC(2026, 5, 11, 13, 0),
      dateStr: '2026-06-11',
      sessionName: 'Strength A',
      title: 'Strength A',
      note: 'Heavy compounds',
      loadUnit: 'kg',
      durationMinutes: null,
      totalSets: 2,
      totalVolume: 1000,
      completedAt: Date.UTC(2026, 5, 11, 14, 5),
      routine: null,
      exercises: [
        {
          exerciseId: 'back-squat',
          exerciseName: 'Back Squat',
          category: 'strength',
          level: 'intermediate',
          equipment: 'barbell',
          bodyPartSnapshot: ['quads', 'glutes'],
          secondaryBodyPartSnapshot: ['hamstrings'],
          force: 'push',
          mechanic: 'compound',
          notes: 'Controlled eccentric',
          sets: [
            { setIndex: 1, reps: 5, load: 100, weight: 100, weightUnit: 'kg', notes: null, isWarmup: false },
            { setIndex: 2, reps: 5, load: 100, weight: 100, weightUnit: 'kg', notes: null, isWarmup: false },
          ],
        },
      ],
    })
  })

  it('leaves ambiguous legacy exercise metadata unstructured', () => {
    const entry = mapEntry({
      id: 89,
      tracker_id: 14,
      value: 1,
      note: 'Upper body',
      metadata: {
        exercises: [
          {
            name: 'Bench Press',
            sets: 3,
            reps: 8,
            weight: 80,
          },
        ],
      },
      timestamp: Date.UTC(2026, 5, 12, 9, 30),
      date_str: '2026-06-12',
      asset_id: null,
    })

    expect(entry.workout).toBeUndefined()
  })
})
