import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

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
  useToastMock: vi.fn(),
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
}))

vi.mock('@shared/components/toast', () => ({
  formatToastError: (value: unknown) => String(value),
  useToast: mocks.useToastMock,
}))

vi.mock('@contracts/features/tracking', () => ({
  getTrackerIdentity: vi.fn(() => 'social'),
  isBooksTracker: vi.fn(() => false),
}))

vi.mock('@features/contacts/components/ContactBubblesGrid', () => ({
  ContactBubblesGrid: () => <div data-testid="contact-bubbles-grid">Contact bubbles</div>,
}))

vi.mock('@features/exercises/components/ExerciseSearch', () => ({
  ExerciseSearch: () => <div data-testid="exercise-search" />,
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
  CyberpunkSelect: ({ placeholder }: { placeholder?: string }) => (
    <div data-testid="cyberpunk-select">{placeholder ?? 'select'}</div>
  ),
}))

import { QuickEntry } from '../../../apps/electron/src/renderer/src/features/entry/components/QuickEntry'

describe('QuickEntry social surface', () => {
  beforeEach(() => {
    mocks.useAppStoreMock.mockReturnValue({
      commandBarOpen: true,
      activeTracker: 7,
      setQuickEntryOpen: vi.fn(),
    })

    mocks.useTrackersMock.mockReturnValue({
      data: [
        {
          id: 7,
          name: 'Social',
          type: 'numeric',
          icon: 'users',
          color: '#8b5cf6',
          order: 1,
          config: { identity: 'social', unit: 'interactions' },
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
    mocks.useAddEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
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
    mocks.useToastMock.mockReturnValue({
      info: vi.fn(),
      success: vi.fn(),
      destructive: vi.fn(),
      error: vi.fn(),
    })
  })

  it('shows a visible note/context field for Social entries', async () => {
    render(<QuickEntry />)

    expect(await screen.findByText('Method')).toBeTruthy()
    expect(screen.getByText('Note / context')).toBeTruthy()
    expect(screen.getByPlaceholderText('What did you talk about?')).toBeTruthy()
    expect(screen.getByText(/Select at least one contact to enable Social check-in saving/i)).toBeTruthy()
  })
})
