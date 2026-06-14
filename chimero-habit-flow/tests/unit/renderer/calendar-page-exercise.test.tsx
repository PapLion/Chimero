import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  useTrackersMock: vi.fn(),
  useCalendarMonthMock: vi.fn(),
  useStatsMock: vi.fn(),
  useRemindersMock: vi.fn(),
  useEntriesMock: vi.fn(),
  useTagsMock: vi.fn(),
  useWorkoutCalendarMock: vi.fn(),
}))

vi.mock('@shared/queries', () => ({
  useTrackers: mocks.useTrackersMock,
  useCalendarMonth: mocks.useCalendarMonthMock,
  useStats: mocks.useStatsMock,
  useReminders: mocks.useRemindersMock,
  useEntries: mocks.useEntriesMock,
  useTags: mocks.useTagsMock,
  useWorkoutCalendar: mocks.useWorkoutCalendarMock,
}))

vi.mock('@features/calendar/components/TimelineView', () => ({
  TimelineView: () => null,
}))

vi.mock('@features/tags/components/TagChips', () => ({
  TagChips: () => null,
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: { children: ReactNode }) => <div {...props}>{children}</div>,
  },
}))

import { CalendarPage } from '../../../apps/electron/src/renderer/src/features/calendar/page'

describe('CalendarPage exercise surface', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 11, 12, 0, 0))

    mocks.useTrackersMock.mockReturnValue({
      data: [
        {
          id: 27,
          name: 'Exercise',
          type: 'numeric',
          icon: 'dumbbell',
          color: '#22c55e',
          order: 1,
          config: { identity: 'exercise', unit: 'sets' },
          archived: false,
          createdAt: null,
        },
      ],
    })
    mocks.useCalendarMonthMock.mockReturnValue({
      data: {
        year: 2026,
        month: 5,
        activeDays: [11],
        entriesByDate: {
          '2026-06-11': [
            {
              id: 88,
              trackerId: 27,
              value: 1,
              unit: 'sets',
              note: 'Session felt strong',
              timestamp: Date.UTC(2026, 5, 11, 13, 0),
              dateStr: '2026-06-11',
              assetId: null,
              tagIds: [4],
            },
          ],
        },
      },
    })
    mocks.useStatsMock.mockReturnValue({ data: {} })
    mocks.useRemindersMock.mockReturnValue({ data: [] })
    mocks.useEntriesMock.mockReturnValue({
      data: [
        {
          id: 88,
          trackerId: 27,
          value: 1,
          note: 'Session felt strong',
          metadata: {},
          timestamp: Date.UTC(2026, 5, 11, 13, 0),
          dateStr: '2026-06-11',
          assetId: null,
          tagIds: [4],
          workout: {
            structured: true,
            entryId: 88,
            trackerId: 27,
            routineId: 41,
            timestamp: Date.UTC(2026, 5, 11, 13, 0),
            dateStr: '2026-06-11',
            sessionName: 'Full Body 1',
            title: 'Full Body 1',
            note: 'Session felt strong',
            loadUnit: 'kg',
            durationMinutes: 55,
            totalSets: 4,
            totalVolume: 1920,
            completedAt: Date.UTC(2026, 5, 11, 13, 55),
            routine: { id: 41, trackerId: 27, name: 'Full Body 1', notes: 'Push / pull split', loadUnit: 'kg', createdAt: null, updatedAt: null, exercises: [] },
            exercises: [
              {
                exerciseId: 'bench-press',
                sourceExerciseId: null,
                exerciseName: 'Bench Press',
                category: 'strength',
                level: 'intermediate',
                equipment: 'barbell',
                bodyPartSnapshot: ['chest'],
                secondaryBodyPartSnapshot: ['triceps'],
                force: 'push',
                mechanic: 'compound',
                notes: null,
                sets: [
                  { setIndex: 1, reps: 8, load: 80, weight: 80, weightUnit: 'kg', notes: null, isWarmup: false },
                ],
              },
              {
                exerciseId: 'bodyweight-squat',
                sourceExerciseId: null,
                exerciseName: 'Bodyweight Squat',
                category: 'strength',
                level: 'beginner',
                equipment: 'bodyweight',
                bodyPartSnapshot: ['quads'],
                secondaryBodyPartSnapshot: ['glutes'],
                force: 'push',
                mechanic: 'compound',
                notes: null,
                sets: [
                  { setIndex: 1, reps: 12, load: null, weight: null, weightUnit: null, notes: null, isWarmup: false },
                ],
              },
            ],
          },
        },
      ],
      isPending: false,
    })
    mocks.useTagsMock.mockReturnValue({ data: [] })
    mocks.useWorkoutCalendarMock.mockReturnValue({
      data: {
        year: 2026,
        month: 5,
        activeDays: [11],
        entriesByDate: {
          '2026-06-11': [
            {
              structured: true,
              entryId: 88,
              trackerId: 27,
              routineId: 41,
              timestamp: Date.UTC(2026, 5, 11, 13, 0),
              dateStr: '2026-06-11',
              sessionName: 'Full Body 1',
              title: 'Full Body 1',
              note: 'Session felt strong',
              loadUnit: 'kg',
              durationMinutes: 55,
              totalSets: 4,
              totalVolume: 1920,
              completedAt: Date.UTC(2026, 5, 11, 13, 55),
              routine: { id: 41, trackerId: 27, name: 'Full Body 1', notes: 'Push / pull split', loadUnit: 'kg', createdAt: null, updatedAt: null, exercises: [] },
              exercises: [
                {
                  exerciseId: 'bench-press',
                  sourceExerciseId: null,
                  exerciseName: 'Bench Press',
                  category: 'strength',
                  level: 'intermediate',
                  equipment: 'barbell',
                  bodyPartSnapshot: ['chest'],
                  secondaryBodyPartSnapshot: ['triceps'],
                  force: 'push',
                  mechanic: 'compound',
                  notes: null,
                  sets: [
                    { setIndex: 1, reps: 8, load: 80, weight: 80, weightUnit: 'kg', notes: null, isWarmup: false },
                  ],
                },
                {
                  exerciseId: 'bodyweight-squat',
                  sourceExerciseId: null,
                  exerciseName: 'Bodyweight Squat',
                  category: 'strength',
                  level: 'beginner',
                  equipment: 'bodyweight',
                  bodyPartSnapshot: ['quads'],
                  secondaryBodyPartSnapshot: ['glutes'],
                  force: 'push',
                  mechanic: 'compound',
                  notes: null,
                  sets: [
                    { setIndex: 1, reps: 12, load: null, weight: null, weightUnit: null, notes: null, isWarmup: false },
                  ],
                },
              ],
            },
          ],
        },
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders structured workout sessions in the selected-day calendar panel', () => {
    render(<CalendarPage />)

    fireEvent.click(screen.getByRole('button', { name: '11' }))

    expect(screen.getByText('Structured workouts')).toBeTruthy()
    expect(screen.getByText('Full Body 1')).toBeTruthy()
    expect(screen.getByText('Bench Press')).toBeTruthy()
    expect(screen.getByText(/Set 1 · 12 reps · bodyweight/i)).toBeTruthy()
    expect(screen.getByText('Volume 1920.0 kg')).toBeTruthy()
    expect(screen.getByText('Session felt strong')).toBeTruthy()
  })
})
