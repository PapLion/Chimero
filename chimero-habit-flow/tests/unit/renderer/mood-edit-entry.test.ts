import { describe, expect, it } from 'vitest'
import { getRatingOptionsForEntry } from '../../../apps/electron/src/renderer/src/features/entry/modals/EditEntryDialog'
import type { Tracker } from '@contracts/contracts'

const moodTracker: Tracker = {
  id: 10,
  name: 'Mood',
  type: 'rating',
  icon: 'smile',
  color: '#f59e0b',
  order: 1,
  config: { max: 10 },
  archived: false,
  createdAt: null,
}

const genericRatingTracker: Tracker = {
  ...moodTracker,
  id: 20,
  name: 'Generic Rating',
  icon: 'star',
  config: { max: 5 },
}

describe('Mood Edit Entry controls', () => {
  it('uses 1-10 rating buttons for Mood entries', () => {
    expect(getRatingOptionsForEntry(moodTracker)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('keeps non-Mood generic ratings on their existing 1-5 behavior', () => {
    expect(getRatingOptionsForEntry(genericRatingTracker)).toEqual([1, 2, 3, 4, 5])
  })
})
