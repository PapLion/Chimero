import { describe, expect, it } from 'vitest'

import { DEFAULT_TRACKERS } from '../../../apps/electron/src/main/features/tracking/handler'

describe('default trackers', () => {
  it('does not seed unsupported Savings or Finance trackers', () => {
    const defaultNames = DEFAULT_TRACKERS.map((tracker) => tracker.name.toLowerCase())

    expect(defaultNames).not.toContain('savings')
    expect(defaultNames).not.toContain('finance')
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
      'Media/TV',
      'Diet / Calories',
    ])
  })
})
