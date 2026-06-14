import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Widget, Tracker } from '@shared/store'

const mocks = vi.hoisted(() => ({
  useWorkoutHomeMock: vi.fn(),
  useSortableMock: vi.fn(),
  getTrackerIdentityMock: vi.fn(),
  isBooksTrackerMock: vi.fn(),
  usesMediaStyleRenderingMock: vi.fn(),
}))

vi.mock('@shared/queries', () => ({
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

describe('WidgetCard exercise surface', () => {
  const tracker: Tracker = {
    id: 27,
    name: 'Exercise',
    type: 'numeric',
    icon: 'dumbbell',
    color: '#22c55e',
    order: 1,
    config: { identity: 'exercise', unit: 'sets' },
    archived: false,
    createdAt: null,
  }

  const widget: Widget = {
    id: 'widget-exercise',
    trackerId: tracker.id,
    position: 0,
    size: 'large',
  }

  const selectedDate = new Date(2026, 5, 11, 12, 0, 0)

  beforeEach(() => {
    mocks.useWorkoutHomeMock.mockReturnValue({
      data: {
        trackerId: tracker.id,
        title: 'Exercise',
        loadUnit: 'kg',
        lastSession: {
          structured: true,
          entryId: 88,
          trackerId: tracker.id,
          routineId: 41,
          timestamp: Date.UTC(2026, 5, 11, 13, 0),
          dateStr: '2026-06-11',
          sessionName: 'Full Body 1',
          title: 'Full Body 1',
          note: 'Session felt strong',
          loadUnit: 'kg',
          durationMinutes: 55,
          totalSets: 8,
          totalVolume: 1920,
          completedAt: Date.UTC(2026, 5, 11, 13, 55),
          routine: null,
          exercises: [],
        },
        daysSinceLastSession: 2,
        sessionsThisWeek: 3,
        activeWeekStreak: 4,
        latestVolume: 1920,
        recentRoutines: [
          {
            id: 41,
            trackerId: tracker.id,
            name: 'Full Body 1',
            notes: 'Push / pull split',
            loadUnit: 'kg',
            createdAt: null,
            updatedAt: null,
            exercises: [],
          },
        ],
      },
    })
    mocks.useSortableMock.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    })
    mocks.getTrackerIdentityMock.mockReturnValue('exercise')
    mocks.isBooksTrackerMock.mockReturnValue(false)
    mocks.usesMediaStyleRenderingMock.mockReturnValue(false)
  })

  it('renders workout home summary instead of a generic counter', () => {
    render(<WidgetCard widget={widget} tracker={tracker} entries={[]} assets={new Map()} selectedDate={selectedDate} />)

    expect(screen.getByText('Last session')).toBeTruthy()
    expect(screen.getAllByText('Full Body 1').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('1920.0 kg').length).toBeGreaterThan(0)
    expect(screen.getByText('This week')).toBeTruthy()
    expect(screen.getByText('Streak')).toBeTruthy()
    expect(screen.getByText('Days since')).toBeTruthy()
    expect(screen.getByText('Recent routines')).toBeTruthy()
  })
})
