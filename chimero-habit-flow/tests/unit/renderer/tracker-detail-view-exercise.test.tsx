import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { Entry, Tracker } from '@shared/store'

const mocks = vi.hoisted(() => ({
  useAppStoreMock: vi.fn(),
  useTrackersMock: vi.fn(),
  useEntriesMock: vi.fn(),
  useWorkoutHistoryMock: vi.fn(),
  useWorkoutStatisticsMock: vi.fn(),
  useWorkoutGraphMock: vi.fn(),
  useExerciseProgressMock: vi.fn(),
  useDeleteEntryMutationMock: vi.fn(),
  useDeleteFoodEntryMutationMock: vi.fn(),
  useDeleteIntakeEntryMutationMock: vi.fn(),
  useDeleteHealthSymptomEntryMutationMock: vi.fn(),
  useUpdateEntryMutationMock: vi.fn(),
  useWeightDetailMock: vi.fn(),
  useTagsMock: vi.fn(),
  useBookMock: vi.fn(),
  useToastMock: vi.fn(),
  setCurrentPageMock: vi.fn(),
  setSelectedContactIdMock: vi.fn(),
  getTrackerIdentityMock: vi.fn(),
  isBooksTrackerMock: vi.fn(),
  usesMediaStyleRenderingMock: vi.fn(),
}))

vi.mock('@shared/store', () => ({
  useAppStore: mocks.useAppStoreMock,
}))

vi.mock('@shared/queries', () => ({
  useTrackers: mocks.useTrackersMock,
  useEntries: mocks.useEntriesMock,
  useWorkoutHistory: mocks.useWorkoutHistoryMock,
  useWorkoutStatistics: mocks.useWorkoutStatisticsMock,
  useWorkoutGraph: mocks.useWorkoutGraphMock,
  useExerciseProgress: mocks.useExerciseProgressMock,
  useDeleteEntryMutation: mocks.useDeleteEntryMutationMock,
  useDeleteFoodEntryMutation: mocks.useDeleteFoodEntryMutationMock,
  useDeleteIntakeEntryMutation: mocks.useDeleteIntakeEntryMutationMock,
  useDeleteHealthSymptomEntryMutation: mocks.useDeleteHealthSymptomEntryMutationMock,
  useUpdateEntryMutation: mocks.useUpdateEntryMutationMock,
  useWeightDetail: mocks.useWeightDetailMock,
  useTags: mocks.useTagsMock,
  useBook: mocks.useBookMock,
}))

vi.mock('@shared/components/toast', () => ({
  formatToastError: (value: unknown) => String(value),
  useToast: mocks.useToastMock,
}))

vi.mock('@features/tracking/components/CyberpunkSelect', () => ({
  CyberpunkSelect: ({ value, onValueChange, options, placeholder }: {
    value: string | number | null
    onValueChange: (value: string | number | null) => void
    options: Array<{ value: string | number; label: string }>
    placeholder?: string
  }) => (
    <select
      aria-label={placeholder ?? 'Select'}
      value={value ?? ''}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="">{placeholder ?? 'Select'}</option>
      {options.map((option) => (
        <option key={String(option.value)} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

vi.mock('@contracts/features/tracking', () => ({
  getTrackerIdentity: mocks.getTrackerIdentityMock,
  isBooksTracker: mocks.isBooksTrackerMock,
  usesMediaStyleRendering: mocks.usesMediaStyleRenderingMock,
}))

vi.mock('@features/entry/modals/EditEntryDialog', () => ({
  EditEntryDialog: () => null,
}))

vi.mock('@features/books/components/BookEntryDialog', () => ({
  BookEntryDialog: () => null,
}))

vi.mock('@shared/components/ConfirmDeleteDialog', () => ({
  ConfirmDeleteDialog: () => null,
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

vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Area: () => null,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Bar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Cell: () => null,
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
}))

import { TrackerDetailView } from '../../../apps/electron/src/renderer/src/features/tracking/components/TrackerDetailView'

describe('TrackerDetailView exercise surface', () => {
  const selectedDate = new Date(2026, 5, 11, 12, 0, 0)
  const tracker: Tracker = {
    id: 14,
    name: 'Exercise',
    type: 'numeric',
    icon: 'dumbbell',
    color: '#22c55e',
    order: 2,
    config: { identity: 'exercise', unit: 'sets' },
    archived: false,
    createdAt: null,
  }
  const entry: Entry = {
    id: 88,
    trackerId: tracker.id,
    value: 1,
    note: 'First working set felt smooth',
    metadata: {},
    timestamp: Date.UTC(2026, 5, 11, 13, 0),
    dateStr: '2026-06-11',
    assetId: null,
    tagIds: [],
    workout: {
      structured: true,
      entryId: 88,
      trackerId: tracker.id,
      timestamp: Date.UTC(2026, 5, 11, 13, 0),
      dateStr: '2026-06-11',
      title: 'Push day',
      note: 'First working set felt smooth',
      routine: { name: 'Push day', notes: null },
      totalSets: 4,
      exercises: [
        {
          exerciseId: 'bench-press',
          exerciseName: 'Bench Press',
          category: 'strength',
          level: 'intermediate',
          equipment: 'barbell',
          primaryMuscles: ['chest'],
          secondaryMuscles: ['triceps', 'shoulders'],
          force: 'push',
          mechanic: 'compound',
          notes: null,
          sets: [
            { setIndex: 1, reps: 8, weight: 80, weightUnit: 'kg' },
            { setIndex: 2, reps: 8, weight: 80, weightUnit: 'kg' },
            { setIndex: 3, reps: 8, weight: 80, weightUnit: 'kg' },
          ],
        },
        {
          exerciseId: 'bodyweight-squat',
          exerciseName: 'Bodyweight Squat',
          category: 'strength',
          level: 'beginner',
          equipment: 'bodyweight',
          primaryMuscles: ['quads'],
          secondaryMuscles: ['glutes'],
          force: 'push',
          mechanic: 'compound',
          notes: null,
          sets: [
            { setIndex: 1, reps: 12, weight: null, weightUnit: null },
          ],
        },
      ],
    },
  }
  const legacyEntry: Entry = {
    id: 89,
    trackerId: tracker.id,
    value: null,
    note: 'Legacy note only workout',
    metadata: {},
    timestamp: Date.UTC(2026, 5, 11, 18, 0),
    dateStr: '2026-06-11',
    assetId: null,
    tagIds: [],
  }

  beforeEach(() => {
    mocks.useAppStoreMock.mockReturnValue({
      selectedDate,
      setCurrentPage: mocks.setCurrentPageMock,
      setSelectedContactId: mocks.setSelectedContactIdMock,
    })
    mocks.useTrackersMock.mockReturnValue({ data: [tracker] })
    mocks.useEntriesMock.mockReturnValue({ data: [entry, legacyEntry], isPending: false })
    mocks.useWorkoutHistoryMock.mockReturnValue({
      data: {
        trackerId: tracker.id,
        structuredSessions: [
          {
            structured: true,
            entryId: entry.id,
            trackerId: tracker.id,
            routineId: 41,
            timestamp: entry.timestamp,
            dateStr: entry.dateStr,
            sessionName: 'Push day',
            title: 'Push day',
            note: 'First working set felt smooth',
            loadUnit: 'kg',
            durationMinutes: 55,
            totalSets: 4,
            totalVolume: 1920,
            completedAt: entry.timestamp,
            routine: { id: 41, trackerId: tracker.id, name: 'Push day', notes: 'Upper body day', loadUnit: 'kg', createdAt: null, updatedAt: null, exercises: [] },
            exercises: entry.workout!.exercises.map((exercise) => ({
              exerciseId: exercise.exerciseId,
              sourceExerciseId: null,
              exerciseName: exercise.exerciseName,
              category: exercise.category,
              level: exercise.level,
              equipment: exercise.equipment,
              bodyPartSnapshot: exercise.primaryMuscles,
              secondaryBodyPartSnapshot: exercise.secondaryMuscles,
              force: exercise.force,
              mechanic: exercise.mechanic,
              notes: exercise.notes,
              sets: exercise.sets.map((set) => ({
                setIndex: set.setIndex,
                reps: set.reps,
                load: set.weight,
                weight: set.weight,
                weightUnit: set.weightUnit,
                notes: null,
                isWarmup: false,
              })),
            })),
          },
        ],
        legacySessions: [legacyEntry],
        totalSessions: 2,
        totalStructuredSessions: 1,
        totalLegacySessions: 1,
      },
    })
    mocks.useWorkoutStatisticsMock.mockReturnValue({
      data: {
        trackerId: tracker.id,
        totalSessions: 1,
        sessionsThisWeek: 1,
        daysSinceLastWorkout: 1,
        activeWeekStreak: 2,
        weeklyVolume: 1920,
        averageSessionVolume: 1920,
        averageDurationMinutes: 55,
        frequentExercises: [
          { exerciseId: 'bench-press', exerciseName: 'Bench Press', sessions: 1 },
          { exerciseId: 'bodyweight-squat', exerciseName: 'Bodyweight Squat', sessions: 1 },
        ],
        recentPrs: [
          { exerciseId: 'bench-press', exerciseName: 'Bench Press', kind: 'heaviest-load', value: 80, loadUnit: 'kg' },
          { exerciseId: 'bench-press', exerciseName: 'Bench Press', kind: 'best-volume', value: 640, loadUnit: 'kg' },
        ],
      },
    })
    mocks.useWorkoutGraphMock.mockReturnValue({
      data: {
        trackerId: tracker.id,
        weeklyVolume: [{ date: '2026-06-08', value: 1920, loadUnit: 'kg' }],
        sessionVolume: [{ date: '2026-06-11', value: 1920, loadUnit: 'kg' }],
        exerciseHeaviestLoad: [{ exerciseId: 'bench-press', exerciseName: 'Bench Press', value: 80, loadUnit: 'kg' }],
        bestSetVolume: [{ exerciseId: 'bench-press', exerciseName: 'Bench Press', value: 640, loadUnit: 'kg' }],
        exerciseVolumeOverTime: [
          {
            exerciseId: 'bench-press',
            exerciseName: 'Bench Press',
            points: [{ date: '2026-06-11', value: 1920, loadUnit: 'kg' }],
          },
          {
            exerciseId: 'bodyweight-squat',
            exerciseName: 'Bodyweight Squat',
            points: [],
          },
        ],
      },
    })
    mocks.useExerciseProgressMock.mockReturnValue({
      data: {
        exerciseId: 'bench-press',
        exerciseName: 'Bench Press',
        loadUnit: 'kg',
        points: [{ date: '2026-06-11', value: 1920 }],
        heaviestLoadPoints: [{ date: '2026-06-11', value: 80 }],
        bestSetVolumePoints: [{ date: '2026-06-11', value: 640 }],
        heaviestLoad: 80,
        bestSetVolume: 640,
        sessionCount: 1,
      },
    })
    mocks.useDeleteEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteFoodEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteIntakeEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteHealthSymptomEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useUpdateEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useWeightDetailMock.mockReturnValue({ data: undefined })
    mocks.useTagsMock.mockReturnValue({ data: [] })
    mocks.useToastMock.mockReturnValue({ info: vi.fn(), success: vi.fn(), destructive: vi.fn(), error: vi.fn() })
    mocks.getTrackerIdentityMock.mockReturnValue('exercise')
    mocks.isBooksTrackerMock.mockReturnValue(false)
    mocks.usesMediaStyleRenderingMock.mockReturnValue(false)
    mocks.useBookMock.mockReturnValue({ data: undefined, isPending: false, isError: false, refetch: vi.fn() })
    mocks.setCurrentPageMock.mockClear()
    mocks.setSelectedContactIdMock.mockClear()
  })

  it('renders structured workout sessions with routine and set details', async () => {
    render(<TrackerDetailView trackerId={tracker.id} selectedDate={selectedDate} assets={new Map()} />)

    expect(screen.getAllByText('Push day').length).toBeGreaterThan(0)
    expect(screen.getByText('Bench Press')).toBeTruthy()
    expect(screen.getByText('Routine: Push day')).toBeTruthy()
    expect(screen.getAllByText((_, node) => node?.textContent?.includes('4 sets') ?? false).length).toBeGreaterThan(0)
    expect(screen.getByText(/Set 1 · 8 reps · 80 kg/i)).toBeTruthy()
    expect(screen.getByText(/Set 1 · 12 reps · bodyweight/i)).toBeTruthy()
    expect(screen.getByText(/Legacy \/ unstructured/i)).toBeTruthy()
  })

  it('renders structured workout stats and graphs instead of generic counts', async () => {
    render(<TrackerDetailView trackerId={tracker.id} selectedDate={selectedDate} assets={new Map()} />)

    expect(screen.getByRole('button', { name: 'Statistics' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Graphs' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Statistics' }))
    expect(await screen.findByText('Structured Sessions')).toBeTruthy()
    expect(screen.getByText('Weekly Volume')).toBeTruthy()
    expect(screen.getByText('Average Session Volume')).toBeTruthy()
    expect(screen.getByText('Average Duration')).toBeTruthy()
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0)
    expect(screen.getByText('Bodyweight Squat')).toBeTruthy()
    expect(screen.getByText('heaviest load')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Graphs' }))
    expect(await screen.findByText('Weekly Volume')).toBeTruthy()
    expect(screen.getAllByText((_, node) => node?.textContent?.includes('Session Volume') ?? false).length).toBeGreaterThan(0)
    expect(await screen.findByText('Exercise Progress')).toBeTruthy()
    expect(await screen.findByLabelText('Select exercise')).toBeTruthy()
  })
})

afterAll(() => {
  vi.resetModules()
})
