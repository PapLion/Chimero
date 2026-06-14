import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Dialog, DialogContent } from '@packages/ui/dialog'

const mocks = vi.hoisted(() => ({
  useWorkoutSessionMock: vi.fn(),
  useUpdateWorkoutSessionMutationMock: vi.fn(),
  useAssetsMock: vi.fn(),
  useTagsMock: vi.fn(),
  useCreateTagMutationMock: vi.fn(),
  useToastMock: vi.fn(),
  addExerciseMock: vi.fn(),
  updateWorkoutSessionMutateAsyncMock: vi.fn(),
  createTagMutateAsyncMock: vi.fn(),
}))

vi.mock('@shared/queries', () => ({
  useWorkoutSession: mocks.useWorkoutSessionMock,
  useUpdateWorkoutSessionMutation: mocks.useUpdateWorkoutSessionMutationMock,
  useAssets: mocks.useAssetsMock,
  useTags: mocks.useTagsMock,
  useCreateTagMutation: mocks.useCreateTagMutationMock,
}))

vi.mock('@shared/components/toast', () => ({
  formatToastError: (value: unknown) => String(value),
  useToast: mocks.useToastMock,
}))

vi.mock('@features/exercises/components/ExerciseSearch', () => ({
  ExerciseSearch: ({ onExerciseSelect }: { onExerciseSelect: (exercise: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onExerciseSelect({
          exerciseId: 'lat-pulldown',
          name: 'Lat Pulldown',
          category: 'strength',
          level: 'intermediate',
          equipment: 'machine',
          primaryMuscles: ['back'],
          secondaryMuscles: ['biceps'],
          force: 'pull',
          mechanic: 'compound',
          sets: 2,
          reps: 10,
          weight: 60,
        })
      }
    >
      Add exercise
    </button>
  ),
}))

vi.mock('@features/tags/components/TagChips', () => ({
  TagSelector: ({ selectedTagIds }: { selectedTagIds: number[] }) => (
    <div data-testid="tag-selector">{selectedTagIds.join(',')}</div>
  ),
}))

vi.mock('@features/tracking/components/CyberpunkSelect', () => ({
  CyberpunkSelect: ({ value }: { value: string | number | null }) => <div data-testid="cyberpunk-select">{String(value)}</div>,
}))

vi.mock('@shared/api', () => ({
  api: {
    openFileDialog: vi.fn(),
    uploadAsset: vi.fn(),
  },
}))

import { StructuredWorkoutEditDialog } from '../../../apps/electron/src/renderer/src/features/entry/modals/StructuredWorkoutEditDialog'
import type { Entry, Tracker, WorkoutSessionDetailResponse } from '@contracts/contracts'

function buildSession(overrides?: Partial<WorkoutSessionDetailResponse['session']>): WorkoutSessionDetailResponse {
  return {
    session: {
      structured: true,
      entryId: 88,
      trackerId: 14,
      routineId: 21,
      timestamp: Date.UTC(2026, 5, 11, 13, 30),
      dateStr: '2026-06-11',
      sessionName: 'Push day',
      title: 'Push day',
      note: 'I need to grow my arms',
      loadUnit: 'kg',
      durationMinutes: 70,
      totalSets: 3,
      totalVolume: 1645,
      completedAt: Date.UTC(2026, 5, 11, 14, 40),
      routine: {
        id: 21,
        trackerId: 14,
        name: 'Full Body 1',
        notes: 'Upper focus',
        loadUnit: 'kg',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        exercises: [],
      },
      exercises: [
        {
          exerciseId: 'bench-press',
          sourceExerciseId: null,
          exerciseName: 'Bench Press',
          category: 'strength',
          level: 'intermediate',
          equipment: 'barbell',
          bodyPartSnapshot: ['chest'],
          secondaryBodyPartSnapshot: ['triceps', 'shoulders'],
          force: 'push',
          mechanic: 'compound',
          notes: null,
          sets: [
            { setIndex: 1, reps: 6, load: 100, weight: 100, weightUnit: 'kg', notes: null, isWarmup: false },
            { setIndex: 2, reps: 6, load: 102.5, weight: 102.5, weightUnit: 'kg', notes: null, isWarmup: false },
          ],
        },
        {
          exerciseId: 'sit-up',
          sourceExerciseId: null,
          exerciseName: 'Sit-Up',
          category: 'bodyweight',
          level: 'beginner',
          equipment: null,
          bodyPartSnapshot: ['core'],
          secondaryBodyPartSnapshot: [],
          force: 'pull',
          mechanic: 'compound',
          notes: null,
          sets: [
            { setIndex: 1, reps: 5, load: null, weight: null, weightUnit: 'kg', notes: null, isWarmup: false },
          ],
        },
      ],
      ...overrides,
    },
    tags: [
      { id: 7, name: 'Upper', color: null },
    ],
  }
}

const tracker: Tracker = {
  id: 14,
  name: 'Exercise',
  type: 'numeric',
  icon: 'dumbbell',
  color: '#22c55e',
  order: 1,
  config: { identity: 'exercise' },
  archived: false,
  createdAt: null,
}

const entry: Entry = {
  id: 88,
  trackerId: 14,
  value: 3,
  note: 'I need to grow my arms',
  metadata: {},
  timestamp: Date.UTC(2026, 5, 11, 13, 30),
  dateStr: '2026-06-11',
  assetId: 55,
  tagIds: [7],
  workout: buildSession().session,
}

describe('StructuredWorkoutEditDialog', () => {
  beforeEach(() => {
    mocks.useWorkoutSessionMock.mockReturnValue({
      data: buildSession(),
      isLoading: false,
      isError: false,
      error: null,
    })
    mocks.useUpdateWorkoutSessionMutationMock.mockReturnValue({
      mutateAsync: mocks.updateWorkoutSessionMutateAsyncMock,
      isPending: false,
    })
    mocks.useAssetsMock.mockReturnValue({
      data: [
        { id: 55, thumbnailUrl: 'https://example.com/workout.png', assetUrl: 'https://example.com/workout.png', originalName: 'workout.png' },
      ],
    })
    mocks.useTagsMock.mockReturnValue({
      data: [
        { id: 7, name: 'Upper', color: null },
        { id: 9, name: 'Push', color: null },
      ],
    })
    mocks.useCreateTagMutationMock.mockReturnValue({
      mutateAsync: mocks.createTagMutateAsyncMock,
      isPending: false,
    })
    mocks.useToastMock.mockReturnValue({
      info: vi.fn(),
      success: vi.fn(),
      destructive: vi.fn(),
      error: vi.fn(),
    })
    mocks.addExerciseMock.mockReset()
    mocks.updateWorkoutSessionMutateAsyncMock.mockReset()
    mocks.createTagMutateAsyncMock.mockReset()
  })

  it('preloads the structured workout session and saves nested edits without losing null bodyweight loads', async () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open>
        <DialogContent>
          <StructuredWorkoutEditDialog entry={entry} tracker={tracker} open onOpenChange={onOpenChange} />
        </DialogContent>
      </Dialog>,
    )

    expect(await screen.findByText('Edit workout')).toBeTruthy()
    expect(screen.getByDisplayValue('Push day')).toBeTruthy()
    expect(screen.getByDisplayValue('I need to grow my arms')).toBeTruthy()
    expect(screen.getByDisplayValue('70')).toBeTruthy()
    expect(screen.getByText('Full Body 1')).toBeTruthy()
    expect(screen.getByText('kg')).toBeTruthy()
    expect(screen.getByDisplayValue('Bench Press')).toBeTruthy()
    expect(screen.getByDisplayValue('Sit-Up')).toBeTruthy()
    expect(screen.getByTestId('tag-selector').textContent).toContain('7')
    expect(screen.getByText('workout.png')).toBeTruthy()

    fireEvent.change(screen.getByDisplayValue('Push day'), { target: { value: 'Push day updated' } })
    fireEvent.change(screen.getByDisplayValue('I need to grow my arms'), { target: { value: 'I need to grow bigger arms' } })
    fireEvent.change(screen.getByDisplayValue('70'), { target: { value: '75' } })

    const benchRepInput = screen.getAllByDisplayValue('6')[0]
    const benchLoadInput = screen.getAllByDisplayValue('100')[0]
    fireEvent.change(benchRepInput, { target: { value: '8' } })
    fireEvent.change(benchLoadInput, { target: { value: '105' } })

    fireEvent.click(screen.getAllByRole('button', { name: '+' })[0])

    fireEvent.click(screen.getByRole('button', { name: 'Save workout' }))

    await waitFor(() => {
      expect(mocks.updateWorkoutSessionMutateAsyncMock).toHaveBeenCalledTimes(1)
    })

    expect(mocks.updateWorkoutSessionMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entryId: 88,
        updates: expect.objectContaining({
          sessionName: 'Push day updated',
          note: 'I need to grow bigger arms',
          durationMinutes: 75,
          loadUnit: 'kg',
          routineId: 21,
          assetId: 55,
          tagIds: [7],
          exercises: expect.arrayContaining([
            expect.objectContaining({
              exerciseId: 'bench-press',
              name: 'Bench Press',
              sets: expect.arrayContaining([
                expect.objectContaining({ setIndex: 1, reps: 8, load: 105 }),
                expect.objectContaining({ setIndex: 3, reps: null, load: null }),
              ]),
            }),
            expect.objectContaining({
              exerciseId: 'sit-up',
              sets: expect.arrayContaining([
                expect.objectContaining({ setIndex: 1, reps: 5, load: null }),
              ]),
            }),
          ]),
        }),
      }),
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('resets stale draft state when a different structured session is loaded', async () => {
    const onOpenChange = vi.fn()
    const firstSession = buildSession()
    const secondSession = buildSession({
      entryId: 99,
      timestamp: Date.UTC(2026, 5, 12, 12, 0),
      sessionName: 'Leg day',
      title: 'Leg day',
      note: 'Squats felt heavy',
      durationMinutes: 50,
      totalSets: 1,
      totalVolume: 700,
      exercises: [
        {
          exerciseId: 'back-squat',
          sourceExerciseId: null,
          exerciseName: 'Back Squat',
          category: 'strength',
          level: 'intermediate',
          equipment: 'barbell',
          bodyPartSnapshot: ['quads'],
          secondaryBodyPartSnapshot: ['glutes'],
          force: 'push',
          mechanic: 'compound',
          notes: null,
          sets: [
            { setIndex: 1, reps: 5, load: 140, weight: 140, weightUnit: 'kg', notes: null, isWarmup: false },
          ],
        },
      ],
    })

    mocks.useWorkoutSessionMock.mockReturnValue({
      data: firstSession,
      isLoading: false,
      isError: false,
      error: null,
    })

    const { rerender } = render(
      <Dialog open>
        <DialogContent>
          <StructuredWorkoutEditDialog entry={entry} tracker={tracker} open onOpenChange={onOpenChange} />
        </DialogContent>
      </Dialog>,
    )
    expect(await screen.findByDisplayValue('Push day')).toBeTruthy()

    fireEvent.change(screen.getByDisplayValue('Push day'), { target: { value: 'Typed stale value' } })

    mocks.useWorkoutSessionMock.mockReturnValue({
      data: secondSession,
      isLoading: false,
      isError: false,
      error: null,
    })

    rerender(
      <Dialog open>
        <DialogContent>
          <StructuredWorkoutEditDialog entry={{ ...entry, id: 99, workout: secondSession.session }} tracker={tracker} open onOpenChange={onOpenChange} />
        </DialogContent>
      </Dialog>,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Leg day')).toBeTruthy()
    })
    expect(screen.queryByDisplayValue('Typed stale value')).toBeNull()
    expect(screen.getByDisplayValue('Squats felt heavy')).toBeTruthy()
  })

  it('allows adding and removing exercises in the structured editor', async () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open>
        <DialogContent>
          <StructuredWorkoutEditDialog entry={entry} tracker={tracker} open onOpenChange={onOpenChange} />
        </DialogContent>
      </Dialog>,
    )

    expect(await screen.findByDisplayValue('Push day')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }))
    expect(screen.getByDisplayValue('Lat Pulldown')).toBeTruthy()

    const addedExerciseInput = screen.getByDisplayValue('Lat Pulldown')
    const exerciseCard = addedExerciseInput.closest('div.space-y-3')
    expect(exerciseCard).toBeTruthy()
    fireEvent.click(within(exerciseCard as HTMLElement).getByRole('button', { name: 'Remove exercise Lat Pulldown' }))

    await waitFor(() => {
      expect(screen.queryByDisplayValue('Lat Pulldown')).toBeNull()
    })
  })
})
