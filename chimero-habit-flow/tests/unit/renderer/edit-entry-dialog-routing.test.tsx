import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  useTrackersMock: vi.fn(),
  useAssetsMock: vi.fn(),
  useTagsMock: vi.fn(),
  useUpdateEntryMutationMock: vi.fn(),
  useUpdateWeightEntryMutationMock: vi.fn(),
  useUpdateGamingEntryMutationMock: vi.fn(),
  useUpdateFoodEntryMutationMock: vi.fn(),
  useUpdateIntakeEntryMutationMock: vi.fn(),
  useUpdateHealthSymptomEntryMutationMock: vi.fn(),
  useUpdateWorkoutSessionMutationMock: vi.fn(),
  useCreateTagMutationMock: vi.fn(),
  useToastMock: vi.fn(),
}))

vi.mock('@shared/queries', () => ({
  useTrackers: mocks.useTrackersMock,
  useAssets: mocks.useAssetsMock,
  useTags: mocks.useTagsMock,
  useUpdateEntryMutation: mocks.useUpdateEntryMutationMock,
  useUpdateWeightEntryMutation: mocks.useUpdateWeightEntryMutationMock,
  useUpdateGamingEntryMutation: mocks.useUpdateGamingEntryMutationMock,
  useUpdateFoodEntryMutation: mocks.useUpdateFoodEntryMutationMock,
  useUpdateIntakeEntryMutation: mocks.useUpdateIntakeEntryMutationMock,
  useUpdateHealthSymptomEntryMutation: mocks.useUpdateHealthSymptomEntryMutationMock,
  useUpdateWorkoutSessionMutation: mocks.useUpdateWorkoutSessionMutationMock,
  useCreateTagMutation: mocks.useCreateTagMutationMock,
}))

vi.mock('@shared/components/toast', () => ({
  formatToastError: (value: unknown) => String(value),
  useToast: mocks.useToastMock,
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
      refetchQueries: vi.fn(),
    }),
  }
})

vi.mock('@features/entry/modals/StructuredWorkoutEditDialog', () => ({
  StructuredWorkoutEditDialog: () => <div data-testid="structured-workout-editor">Structured workout editor</div>,
}))

vi.mock('@features/entry/modals/StructuredSocialEditDialog', () => ({
  StructuredSocialEditDialog: () => <div data-testid="structured-social-editor">Structured social editor</div>,
}))

import { EditEntryDialog } from '../../../apps/electron/src/renderer/src/features/entry/modals/EditEntryDialog'
import type { Entry, Tracker } from '@contracts/contracts'

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

const socialTracker: Tracker = {
  id: 7,
  name: 'Social',
  type: 'numeric',
  icon: 'users',
  color: '#8b5cf6',
  order: 2,
  config: { identity: 'social', unit: 'interactions' },
  archived: false,
  createdAt: null,
}

const structuredEntry: Entry = {
  id: 88,
  trackerId: 14,
  value: 3,
  note: 'Structured workout',
  metadata: {},
  timestamp: Date.UTC(2026, 5, 11, 13, 30),
  dateStr: '2026-06-11',
  assetId: null,
  tagIds: [],
  workout: {
    structured: true,
    entryId: 88,
    trackerId: 14,
    routineId: null,
    timestamp: Date.UTC(2026, 5, 11, 13, 30),
    dateStr: '2026-06-11',
    sessionName: 'Push day',
    title: 'Push day',
    note: 'Structured workout',
    loadUnit: 'kg',
    durationMinutes: null,
    totalSets: 0,
    totalVolume: null,
    completedAt: null,
    routine: null,
    exercises: [],
  },
}

const legacyEntry: Entry = {
  ...structuredEntry,
  workout: undefined,
}

const structuredSocialEntry: Entry = {
  id: 91,
  trackerId: socialTracker.id,
  value: null,
  note: 'Planning the weekend',
  metadata: {},
  timestamp: Date.UTC(2026, 5, 11, 18, 0),
  dateStr: '2026-06-11',
  assetId: null,
  tagIds: [],
  socialInteractions: [
    {
      contactId: 1,
      contactName: 'Jack Robert',
      contactInitials: 'JR',
      method: 'call',
      moodImpact: 'positive',
      note: 'Planning the weekend',
    },
    {
      contactId: 2,
      contactName: 'Annabelle',
      contactInitials: 'A',
      method: 'call',
      moodImpact: 'neutral',
      note: 'Planning the weekend',
    },
  ],
}

const legacySocialEntry: Entry = {
  ...structuredSocialEntry,
  id: 92,
  socialInteractions: undefined,
}

describe('EditEntryDialog exercise routing', () => {
  beforeEach(() => {
    mocks.useTrackersMock.mockReturnValue({
      data: [tracker, socialTracker],
    })
    mocks.useAssetsMock.mockReturnValue({ data: [] })
    mocks.useTagsMock.mockReturnValue({ data: [] })
    mocks.useUpdateEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useUpdateWeightEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useUpdateGamingEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useUpdateFoodEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useUpdateIntakeEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useUpdateHealthSymptomEntryMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useUpdateWorkoutSessionMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useCreateTagMutationMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useToastMock.mockReturnValue({
      info: vi.fn(),
      success: vi.fn(),
      destructive: vi.fn(),
      error: vi.fn(),
    })
  })

  it('opens the structured workout editor for structured sessions', () => {
    render(<EditEntryDialog entry={structuredEntry} open onOpenChange={vi.fn()} />)

    expect(screen.getByTestId('structured-workout-editor')).toBeTruthy()
  })

  it('keeps legacy exercise entries on the generic edit path', () => {
    render(<EditEntryDialog entry={legacyEntry} open onOpenChange={vi.fn()} />)

    expect(screen.getByText('Edit entry')).toBeTruthy()
    expect(screen.queryByTestId('structured-workout-editor')).toBeNull()
  })

  it('routes structured Social entries to the dedicated Social editor', () => {
    render(<EditEntryDialog entry={structuredSocialEntry} open onOpenChange={vi.fn()} />)

    expect(screen.getByTestId('structured-social-editor')).toBeTruthy()
    expect(screen.queryByText('Edit entry')).toBeNull()
  })

  it('keeps legacy Social entries on the generic edit path', () => {
    render(<EditEntryDialog entry={legacySocialEntry} open onOpenChange={vi.fn()} />)

    expect(screen.getByText('Edit entry')).toBeTruthy()
    expect(screen.queryByTestId('structured-social-editor')).toBeNull()
  })
})
