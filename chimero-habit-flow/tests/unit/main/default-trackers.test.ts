import { describe, expect, it } from 'vitest'

import {
  DEFAULT_TRACKERS,
  planDefaultTrackerSeedActions,
} from '../../../apps/electron/src/main/features/tracking/handler'

describe('default trackers', () => {
  it('does not seed unsupported Savings or Finance trackers', () => {
    const defaultNames = DEFAULT_TRACKERS.map((tracker) => tracker.name.toLowerCase())

    expect(defaultNames).not.toContain('savings')
    expect(defaultNames).not.toContain('finance')
  })

  it('removes empty unsupported default Savings or Finance rows from existing seeds', () => {
    const plan = planDefaultTrackerSeedActions({
      trackers: [
        { id: 101, name: 'Savings', order: 10, isCustom: false, entryCount: 0 },
        { id: 102, name: 'Finance', order: 11, isCustom: false, entryCount: 0 },
      ],
      populatedLegacyMediaTv: false,
    })

    expect(plan.unsupportedTrackerIdsToRemove).toEqual([101, 102])
    expect(plan.toInsert.map((tracker) => tracker.name.toLowerCase())).not.toContain('savings')
    expect(plan.toInsert.map((tracker) => tracker.name.toLowerCase())).not.toContain('finance')
  })

  it('preserves unsupported Savings rows that contain user data or were user-created', () => {
    const plan = planDefaultTrackerSeedActions({
      trackers: [
        { id: 101, name: 'Savings', order: 10, isCustom: false, entryCount: 3 },
        { id: 102, name: 'Savings', order: 11, isCustom: true, entryCount: 0 },
      ],
      populatedLegacyMediaTv: false,
    })

    expect(plan.unsupportedTrackerIdsToRemove).toEqual([])
  })

  it('keeps supported tracker defaults available', () => {
    expect(DEFAULT_TRACKERS.map((tracker) => tracker.name)).toEqual([
      'Weight',
      'Mood',
      'Exercise',
      'Social',
      'Tasks',
      'Books',
      'Gaming',
      'TV',
      'Media',
      'Health',
      'Diet / Calories',
    ])
  })

  it('creates separate TV and Media defaults instead of merged Media/TV', () => {
    const defaultNames = DEFAULT_TRACKERS.map((tracker) => tracker.name)

    expect(defaultNames).toContain('TV')
    expect(defaultNames).toContain('Media')
    expect(defaultNames).not.toContain('Media/TV')
  })

  it('adds TV when an existing database only has Media', () => {
    const plan = planDefaultTrackerSeedActions({
      trackers: [{ id: 1, name: 'Media', order: 7 }],
      populatedLegacyMediaTv: false,
    })

    expect(plan.toInsert.map((tracker) => tracker.name)).toContain('TV')
    expect(plan.toInsert.map((tracker) => tracker.name)).not.toContain('Media')
    expect(plan.legacyAction).toBe('none')
  })

  it('adds Media when an existing database only has TV', () => {
    const plan = planDefaultTrackerSeedActions({
      trackers: [{ id: 1, name: 'TV', order: 7 }],
      populatedLegacyMediaTv: false,
    })

    expect(plan.toInsert.map((tracker) => tracker.name)).toContain('Media')
    expect(plan.toInsert.map((tracker) => tracker.name)).not.toContain('TV')
    expect(plan.legacyAction).toBe('none')
  })

  it('keeps separate TV and Media databases unchanged', () => {
    const plan = planDefaultTrackerSeedActions({
      trackers: [
        { id: 1, name: 'TV', order: 7 },
        { id: 2, name: 'Media', order: 8 },
      ],
      populatedLegacyMediaTv: false,
    })

    expect(plan.toInsert.map((tracker) => tracker.name)).not.toContain('TV')
    expect(plan.toInsert.map((tracker) => tracker.name)).not.toContain('Media')
    expect(plan.legacyAction).toBe('none')
  })

  it('preserves populated legacy Media/TV and does not add duplicate visible TV or Media surfaces', () => {
    const plan = planDefaultTrackerSeedActions({
      trackers: [{ id: 1, name: 'Media/TV', order: 7 }],
      populatedLegacyMediaTv: true,
    })

    expect(plan.toInsert.map((tracker) => tracker.name)).not.toContain('TV')
    expect(plan.toInsert.map((tracker) => tracker.name)).not.toContain('Media')
    expect(plan.legacyAction).toBe('preserve-populated')
  })

  it('replaces empty legacy Media/TV with separate TV and Media defaults', () => {
    const plan = planDefaultTrackerSeedActions({
      trackers: [{ id: 1, name: 'Media/TV', order: 7 }],
      populatedLegacyMediaTv: false,
    })

    expect(plan.toInsert.map((tracker) => tracker.name)).toEqual(expect.arrayContaining(['TV', 'Media']))
    expect(plan.legacyAction).toBe('remove-empty')
    expect(plan.legacyTrackerIdsToRemove).toEqual([1])
  })
})
