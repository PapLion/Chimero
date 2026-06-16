import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Widget, Tracker } from '@shared/store'

const mocks = vi.hoisted(() => ({
  useBooksMock: vi.fn(),
  useMoodDailyAggregatesMock: vi.fn(),
  useUpdateEntryMutationMock: vi.fn(),
  useWeightDetailMock: vi.fn(),
  useWorkoutHomeMock: vi.fn(),
  useSortableMock: vi.fn(),
  getTrackerIdentityMock: vi.fn(),
  isBooksTrackerMock: vi.fn(),
  usesMediaStyleRenderingMock: vi.fn(),
}))

vi.mock('@shared/queries', () => ({
  useBooks: mocks.useBooksMock,
  useMoodDailyAggregates: mocks.useMoodDailyAggregatesMock,
  useUpdateEntryMutation: mocks.useUpdateEntryMutationMock,
  useWeightDetail: mocks.useWeightDetailMock,
  useWorkoutHome: mocks.useWorkoutHomeMock,
}))

vi.mock('@contracts/features/tracking', () => ({
  getTrackerIdentity: mocks.getTrackerIdentityMock,
  isBooksTracker: mocks.isBooksTrackerMock,
  usesMediaStyleRendering: mocks.usesMediaStyleRenderingMock,
}))

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: mocks.useSortableMock,
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}))

import { WidgetCard } from '../../../apps/electron/src/renderer/src/features/dashboard/components/WidgetCard'

describe('WidgetCard social surface', () => {
  const tracker: Tracker = {
    id: 4,
    name: 'Social',
    type: 'numeric',
    icon: 'users',
    color: '#22c55e',
    order: 1,
    config: { identity: 'social', unit: 'interactions' },
    archived: false,
    createdAt: null,
  }

  const widget: Widget = {
    id: 'widget-social',
    trackerId: tracker.id,
    position: 0,
    size: 'large',
  }

  const selectedDate = new Date(2026, 5, 15, 12, 0, 0)

  beforeEach(() => {
    mocks.useBooksMock.mockReturnValue({ data: [] })
    mocks.useMoodDailyAggregatesMock.mockReturnValue({ data: [] })
    mocks.useUpdateEntryMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false })
    mocks.useWeightDetailMock.mockReturnValue({ data: null })
    mocks.useWorkoutHomeMock.mockReturnValue({ data: null })
    mocks.useSortableMock.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    })
    mocks.getTrackerIdentityMock.mockReturnValue('social')
    mocks.isBooksTrackerMock.mockReturnValue(false)
    mocks.usesMediaStyleRenderingMock.mockReturnValue(false)
  })

  it('renders structured contacts and method details instead of parsing names from notes', () => {
    render(
      <WidgetCard
        widget={widget}
        tracker={tracker}
        entries={[
          {
            id: 42,
            trackerId: 4,
            value: 1,
            note: 'Planning the weekend',
            metadata: {},
            timestamp: Date.UTC(2026, 5, 15, 18, 30, 0),
            dateStr: '2026-06-15',
            assetId: 77,
            tagIds: [3, 8],
            socialInteractions: [
              {
                contactId: 11,
                contactName: 'Jack Robert',
                contactInitials: 'JR',
                contactAvatarAssetId: 91,
                method: 'call',
                moodImpact: 'positive',
                note: 'Planning the weekend',
              },
              {
                contactId: 12,
                contactName: 'Annabelle',
                contactInitials: 'A',
                contactAvatarAssetId: null,
                method: 'call',
                moodImpact: 'neutral',
                note: 'Planning the weekend',
              },
            ],
          },
        ]}
        assets={new Map()}
        selectedDate={selectedDate}
      />,
    )

    expect(screen.getAllByText('Jack Robert').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Annabelle').length).toBeGreaterThan(0)
    expect(screen.getAllByText('JR').length).toBeGreaterThan(0)
    expect(screen.getAllByText('A').length).toBeGreaterThan(0)
    expect(screen.getByText(/Call/i)).toBeTruthy()
    expect(screen.getByText(/Positive/i)).toBeTruthy()
    expect(screen.getByText(/Neutral/i)).toBeTruthy()
    expect(screen.getByText('Planning the weekend')).toBeTruthy()
  })
})
