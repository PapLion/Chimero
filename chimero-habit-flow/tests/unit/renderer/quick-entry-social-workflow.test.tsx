import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  useAppStoreMock: vi.fn(),
  useTrackersMock: vi.fn(),
  useRecentTrackersMock: vi.fn(),
  useFavoriteTrackersMock: vi.fn(),
  useEntriesMock: vi.fn(),
  useBooksMock: vi.fn(),
  useQuickEntryContextMock: vi.fn(),
  useContactsMock: vi.fn(),
  useAssetsMock: vi.fn(),
  useTagsMock: vi.fn(),
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
  useUpsertReminderMutationMock: vi.fn(),
  useCreateTagMutationMock: vi.fn(),
  useWorkoutRoutinesMock: vi.fn(),
  useCreateWorkoutSessionMutationMock: vi.fn(),
  useDeleteWorkoutRoutineMutationMock: vi.fn(),
  useInstantiateWorkoutFromRoutineMutationMock: vi.fn(),
  useSaveWorkoutAsRoutineMutationMock: vi.fn(),
  useToastMock: vi.fn(),
  setQuickEntryOpenMock: vi.fn(),
  addEntryMutateAsyncMock: vi.fn(),
  toastMock: {
    info: vi.fn(),
    success: vi.fn(),
    destructive: vi.fn(),
    error: vi.fn(),
  },
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
  useQuickEntryContext: mocks.useQuickEntryContextMock,
  useContacts: mocks.useContactsMock,
  useAssets: mocks.useAssetsMock,
  useTags: mocks.useTagsMock,
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
  useUpsertReminderMutation: mocks.useUpsertReminderMutationMock,
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
  getTrackerIdentity: vi.fn(() => 'social'),
  isBooksTracker: vi.fn(() => false),
}))

vi.mock('@features/tags/components/TagChips', () => ({
  TagSelector: ({
    tags,
    selectedTagIds,
    onChange,
  }: {
    tags: Array<{ id: number; name: string }>
    selectedTagIds: number[]
    onChange: (tagIds: number[]) => void
  }) => (
    <div data-testid="tag-selector">
      {tags.map((tag) => {
        const selected = selectedTagIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onChange(selected ? selectedTagIds.filter((id) => id !== tag.id) : [...selectedTagIds, tag.id])}
          >
            {tag.name}
          </button>
        )
      })}
    </div>
  ),
}))

import { QuickEntry } from '../../../apps/electron/src/renderer/src/features/entry/components/QuickEntry'

const socialTracker = {
  id: 7,
  name: 'Social',
  type: 'numeric',
  icon: 'users',
  color: '#8b5cf6',
  order: 1,
  config: { identity: 'social', unit: 'interactions' },
  archived: false,
  createdAt: null,
}

const jackContact = { id: 1, name: 'Jack Robert', avatarAssetId: 91 }
const annabelleContact = { id: 2, name: 'Annabelle', avatarAssetId: null }

const sharedTags = [
  { id: 55, name: 'Jack', color: null },
  { id: 56, name: 'Weekend', color: null },
]

const sharedAssets = [
  { id: 91, thumbnailUrl: 'https://example.com/jack-avatar.png', assetUrl: 'https://example.com/jack-avatar.png', originalName: 'Jack avatar' },
  { id: 42, thumbnailUrl: 'https://example.com/weekend.png', assetUrl: 'https://example.com/weekend.png', originalName: 'Weekend screenshot' },
]

function setBaseMocks() {
  mocks.useAppStoreMock.mockReturnValue({
    commandBarOpen: true,
    activeTracker: 7,
    setQuickEntryOpen: mocks.setQuickEntryOpenMock,
  })
  mocks.useTrackersMock.mockReturnValue({
    data: [socialTracker],
    isLoading: false,
  })
  mocks.useRecentTrackersMock.mockReturnValue({ data: [] })
  mocks.useFavoriteTrackersMock.mockReturnValue({ data: [] })
  mocks.useEntriesMock.mockReturnValue({ data: [] })
  mocks.useBooksMock.mockReturnValue({ data: [] })
  mocks.useQuickEntryContextMock.mockReturnValue({ data: null })
  mocks.useContactsMock.mockReturnValue({
    data: [jackContact, annabelleContact],
    isLoading: false,
  })
  mocks.useAssetsMock.mockReturnValue({ data: sharedAssets })
  mocks.useTagsMock.mockReturnValue({ data: sharedTags })
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
  mocks.useWorkoutRoutinesMock.mockReturnValue({ data: { routines: [] } })
  mocks.useCreateWorkoutSessionMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mocks.useDeleteWorkoutRoutineMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mocks.useInstantiateWorkoutFromRoutineMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mocks.useSaveWorkoutAsRoutineMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mocks.useToastMock.mockReturnValue(mocks.toastMock)
}

describe('QuickEntry social workflow', () => {
  beforeEach(() => {
    mocks.setQuickEntryOpenMock.mockClear()
    mocks.addEntryMutateAsyncMock.mockReset()
    setBaseMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders Social contact selection, method selection, note/context, tags, and attachments', async () => {
    render(<QuickEntry />)

    expect(await screen.findByText('Method')).toBeTruthy()
    expect(screen.getByText('Note / context')).toBeTruthy()
    expect(screen.getByText(/select at least one contact to save a social check-in/i)).toBeTruthy()
    expect((screen.getByRole('button', { name: /save entry/i }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /jack robert, not selected/i }))
    fireEvent.click(screen.getByRole('button', { name: /annabelle, not selected/i }))

    expect(screen.getByText('Selected contacts')).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: 'Positive' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Text' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Call' }))

    fireEvent.change(screen.getByPlaceholderText('What did you talk about?'), {
      target: { value: '  Planning the weekend  ' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Jack' }))
    fireEvent.click(screen.getByRole('button', { name: /weekend/i }))

    fireEvent.click(screen.getByRole('button', { name: /attach image/i }))
    fireEvent.click(await screen.findByRole('button', { name: /weekend screenshot/i }))

    await waitFor(() => {
      expect((screen.getByRole('button', { name: /save entry/i }) as HTMLButtonElement).disabled).toBe(false)
    })
  })

  it('submits a Social check-in through the visible Save Entry button without requiring a numeric value', async () => {
    render(<QuickEntry />)

    fireEvent.click(screen.getByRole('button', { name: /jack robert, not selected/i }))
    fireEvent.click(screen.getByRole('button', { name: /annabelle, not selected/i }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Positive' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Text' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Call' }))
    fireEvent.change(screen.getByPlaceholderText('What did you talk about?'), {
      target: { value: 'Planning the weekend' },
    })

    fireEvent.click(screen.getByRole('button', { name: /save entry/i }))

    await waitFor(() => {
      expect(mocks.addEntryMutateAsyncMock).toHaveBeenCalledTimes(1)
    })

    expect(mocks.addEntryMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trackerId: 7,
        value: null,
        note: 'Planning the weekend',
        socialInteractions: [
          expect.objectContaining({
            contactId: 1,
            moodImpact: 'positive',
            method: 'call',
            notes: 'Planning the weekend',
          }),
          expect.objectContaining({
            contactId: 2,
            moodImpact: 'neutral',
            method: 'call',
            notes: 'Planning the weekend',
          }),
        ],
      }),
    )
  })
})
