import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  useAppStoreMock: vi.fn(),
  useTrackersMock: vi.fn(),
  useRecentTrackersMock: vi.fn(),
  useFavoriteTrackersMock: vi.fn(),
  useEntriesMock: vi.fn(),
  useBooksMock: vi.fn(),
  useAddEntryMutationMock: vi.fn(),
  useAddWeightEntryMutationMock: vi.fn(),
  useAddGamingEntryMutationMock: vi.fn(),
  useAddFoodEntryMutationMock: vi.fn(),
  useAddIntakeEntryMutationMock: vi.fn(),
  useAddHealthSymptomEntryMutationMock: vi.fn(),
  useCreateBookMutationMock: vi.fn(),
  useStartBookMutationMock: vi.fn(),
  useReadBookMutationMock: vi.fn(),
  useFinishBookMutationMock: vi.fn(),
  useQuickEntryContextMock: vi.fn(),
  useUpsertReminderMutationMock: vi.fn(),
  useAssetsMock: vi.fn(),
  useTagsMock: vi.fn(),
  useCreateTagMutationMock: vi.fn(),
  useWorkoutRoutinesMock: vi.fn(),
  useCreateWorkoutSessionMutationMock: vi.fn(),
  useDeleteWorkoutRoutineMutationMock: vi.fn(),
  useInstantiateWorkoutFromRoutineMutationMock: vi.fn(),
  useSaveWorkoutAsRoutineMutationMock: vi.fn(),
  useToastMock: vi.fn(),
  setQuickEntryOpenMock: vi.fn(),
  addEntryMutateAsyncMock: vi.fn(),
  createWorkoutSessionMutateAsyncMock: vi.fn(),
  saveWorkoutAsRoutineMutateAsyncMock: vi.fn(),
}))

vi.mock('@shared/store', () => ({
  useAppStore: mocks.useAppStoreMock,
}))

vi.mock('@shared/queries', () => ({
  useTrackers: mocks.useTrackersMock,
  useRecentTrackers: mocks.useRecentTrackersMock,
  useFavoriteTrackers: mocks.useFavoriteTrackersMock,
  useEntries: mocks.useEntriesMock,
  useBooks: mocks.useBooksMock,
  useAddEntryMutation: mocks.useAddEntryMutationMock,
  useAddWeightEntryMutation: mocks.useAddWeightEntryMutationMock,
  useAddGamingEntryMutation: mocks.useAddGamingEntryMutationMock,
  useAddFoodEntryMutation: mocks.useAddFoodEntryMutationMock,
  useAddIntakeEntryMutation: mocks.useAddIntakeEntryMutationMock,
  useAddHealthSymptomEntryMutation: mocks.useAddHealthSymptomEntryMutationMock,
  useCreateBookMutation: mocks.useCreateBookMutationMock,
  useStartBookMutation: mocks.useStartBookMutationMock,
  useReadBookMutation: mocks.useReadBookMutationMock,
  useFinishBookMutation: mocks.useFinishBookMutationMock,
  useQuickEntryContext: mocks.useQuickEntryContextMock,
  useUpsertReminderMutation: mocks.useUpsertReminderMutationMock,
  useAssets: mocks.useAssetsMock,
  useTags: mocks.useTagsMock,
  useCreateTagMutation: mocks.useCreateTagMutationMock,
  useWorkoutRoutines: mocks.useWorkoutRoutinesMock,
  useCreateWorkoutSessionMutation: mocks.useCreateWorkoutSessionMutationMock,
  useDeleteWorkoutRoutineMutation: mocks.useDeleteWorkoutRoutineMutationMock,
  useInstantiateWorkoutFromRoutineMutation: mocks.useInstantiateWorkoutFromRoutineMutationMock,
  useSaveWorkoutAsRoutineMutation: mocks.useSaveWorkoutAsRoutineMutationMock,
}))

vi.mock('@shared/components/toast', () => ({
  formatToastError: (value: unknown) => String(value),
  useToast: mocks.useToastMock,
}))

vi.mock('@contracts/features/tracking', () => ({
  getTrackerIdentity: vi.fn(() => 'exercise'),
  isBooksTracker: vi.fn(() => false),
}))

vi.mock('@features/contacts/components/ContactBubblesGrid', () => ({
  ContactBubblesGrid: () => <div data-testid="contact-bubbles-grid">Contact bubbles</div>,
}))

vi.mock('@features/exercises/components/ExerciseSearch', () => ({
  ExerciseSearch: ({ onExerciseSelect }: { onExerciseSelect: (exercise: { exerciseId: string; name: string; category: string; level: string; equipment: string | null; primaryMuscles: string[]; secondaryMuscles: string[]; force: string | null; mechanic: string | null; sets?: number; reps?: number; weight?: number }) => void }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onExerciseSelect({
            exerciseId: 'bench-press',
            name: 'Bench Press',
            category: 'strength',
            level: 'intermediate',
            equipment: 'barbell',
            primaryMuscles: ['chest'],
            secondaryMuscles: ['triceps', 'shoulders'],
            force: 'push',
            mechanic: 'compound',
            sets: 3,
            reps: 8,
            weight: 80,
          })
        }
      >
        Select exercise
      </button>
    </div>
  ),
}))

vi.mock('@features/tags/components/TagChips', () => ({
  TagSelector: () => <div data-testid="tag-selector">Tag selector</div>,
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

vi.mock('@features/tracking/components/CyberpunkSelect', () => ({
  CyberpunkSelect: ({ placeholder, value }: { placeholder?: string; value?: string }) => (
    <div data-testid="cyberpunk-select">{value ?? placeholder ?? 'select'}</div>
  ),
}))

import { QuickEntry } from '../../../apps/electron/src/renderer/src/features/entry/components/QuickEntry'

describe('QuickEntry exercise surface', () => {
  beforeEach(() => {
    mocks.useAppStoreMock.mockReturnValue({
      commandBarOpen: true,
      activeTracker: 14,
      setQuickEntryOpen: mocks.setQuickEntryOpenMock,
    })

    mocks.useTrackersMock.mockReturnValue({
      data: [
        {
          id: 14,
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
      isLoading: false,
    })

    mocks.useRecentTrackersMock.mockReturnValue({ data: [] })
    mocks.useFavoriteTrackersMock.mockReturnValue({ data: [] })
    mocks.useEntriesMock.mockReturnValue({ data: [] })
    mocks.useBooksMock.mockReturnValue({ data: [] })
    mocks.useQuickEntryContextMock.mockReturnValue({ data: null })
    mocks.useAssetsMock.mockReturnValue({ data: [] })
    mocks.useTagsMock.mockReturnValue({ data: [] })
    mocks.useWorkoutRoutinesMock.mockReturnValue({ data: { routines: [] } })
    mocks.useAddEntryMutationMock.mockReturnValue({ mutateAsync: mocks.addEntryMutateAsyncMock, isPending: false })
    mocks.useAddWeightEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useAddGamingEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useAddFoodEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useAddIntakeEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useAddHealthSymptomEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useCreateBookMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useStartBookMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useReadBookMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useFinishBookMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useUpsertReminderMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useCreateTagMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useCreateWorkoutSessionMutationMock.mockReturnValue({ mutateAsync: mocks.createWorkoutSessionMutateAsyncMock, isPending: false })
    mocks.useDeleteWorkoutRoutineMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useInstantiateWorkoutFromRoutineMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useSaveWorkoutAsRoutineMutationMock.mockReturnValue({ mutateAsync: mocks.saveWorkoutAsRoutineMutateAsyncMock, isPending: false })
    mocks.useToastMock.mockReturnValue({
      info: vi.fn(),
      success: vi.fn(),
      destructive: vi.fn(),
      error: vi.fn(),
    })
    mocks.setQuickEntryOpenMock.mockClear()
    mocks.addEntryMutateAsyncMock.mockClear()
    mocks.createWorkoutSessionMutateAsyncMock.mockResolvedValue({
      session: {
        structured: true,
        entryId: 999,
        trackerId: 14,
        routineId: null,
        timestamp: Date.now(),
        dateStr: '2026-06-11',
        sessionName: 'Push day',
        title: 'Push day',
        note: 'First working set felt smooth',
        loadUnit: 'kg',
        durationMinutes: null,
        totalSets: 3,
        totalVolume: 2400,
        completedAt: Date.now(),
        routine: null,
        exercises: [],
      },
      tags: [],
    })
    mocks.saveWorkoutAsRoutineMutateAsyncMock.mockResolvedValue({
      routine: {
        id: 44,
        trackerId: 14,
        name: 'Push day',
        notes: 'First working set felt smooth',
        loadUnit: 'kg',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        exercises: [],
      },
    })
  })

  it('shows workout note fields and sends a structured workout session payload', async () => {
    render(<QuickEntry />)

    expect(screen.getByText('Workout routine')).toBeTruthy()
    expect(screen.getByText('Note / context')).toBeTruthy()
    expect(screen.getByText('Load unit')).toBeTruthy()
    expect(screen.getByText(/select at least one exercise to save the workout session/i)).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('e.g., Push day, Leg day'), { target: { value: 'Push day' } })
    fireEvent.change(screen.getByPlaceholderText('What did you train or want to remember?'), {
      target: { value: 'First working set felt smooth' },
    })

    fireEvent.click(screen.getByRole('button', { name: /select exercise/i }))
    fireEvent.click(screen.getByRole('button', { name: /save workout/i }))

    await waitFor(() => {
      expect(mocks.createWorkoutSessionMutateAsyncMock).toHaveBeenCalledTimes(1)
      expect(mocks.createWorkoutSessionMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          trackerId: 14,
          timestamp: expect.any(Number),
          sessionName: 'Push day',
          note: 'First working set felt smooth',
          loadUnit: 'kg',
          exercises: expect.arrayContaining([
            expect.objectContaining({
              exerciseId: 'bench-press',
              name: 'Bench Press',
              bodyPartSnapshot: ['chest'],
              secondaryBodyPartSnapshot: ['triceps', 'shoulders'],
              sets: expect.arrayContaining([
                expect.objectContaining({ setIndex: 1, reps: 8, load: 80 }),
              ]),
            }),
          ]),
        }),
      )
      expect(mocks.saveWorkoutAsRoutineMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionEntryId: 999,
          name: 'Push day',
          notes: 'First working set felt smooth',
        }),
      )
      expect(mocks.setQuickEntryOpenMock).toHaveBeenCalledWith(false)
    })
  })
})

afterAll(() => {
  vi.resetModules()
})
