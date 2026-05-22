import { describe, expect, it } from 'vitest'

import { getEntryConfig } from '../../../apps/electron/src/renderer/src/features/entry/entry-config'
import {
  getTrackerIdentity,
  usesMediaStyleRendering,
} from '../../../packages/shared/src/features/tracking'
import type { Tracker } from '@contracts/contracts'

function tracker(overrides: Partial<Tracker>): Tracker {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? 'Custom',
    type: overrides.type ?? 'text',
    icon: overrides.icon ?? null,
    color: overrides.color ?? '#0ea5e9',
    order: overrides.order ?? 0,
    config: overrides.config ?? {},
    archived: false,
    createdAt: null,
  }
}

describe('TV and Media tracker identity', () => {
  it('routes TV Quick Entry with TV-specific copy', () => {
    expect(getEntryConfig(tracker({ name: 'TV', icon: 'tv' }))).toMatchObject({
      mainLabel: 'TV Title',
      mainPlaceholder: 'What did you watch?',
      noteLabel: 'Episode / Rating',
    })
  })

  it('routes Media Quick Entry separately from TV', () => {
    expect(getEntryConfig(tracker({ name: 'Media', icon: 'music' }))).toMatchObject({
      mainLabel: 'Media Title',
      mainPlaceholder: 'What media did you log?',
      noteLabel: 'Rating / Progress',
    })
  })

  it('keeps legacy Media/TV on compatible shared generic media copy', () => {
    expect(getEntryConfig(tracker({ name: 'Media/TV', icon: 'tv' }))).toMatchObject({
      mainLabel: 'Media / TV Title',
      mainPlaceholder: 'What did you watch or log?',
    })
  })

  it('does not classify unrelated music-icon trackers as Media', () => {
    const musicPractice = tracker({ name: 'Piano Practice', icon: 'music' })

    expect(getTrackerIdentity(musicPractice)).toBe('generic')
    expect(usesMediaStyleRendering(musicPractice)).toBe(false)
    expect(getEntryConfig(musicPractice)).toMatchObject({
      mainPlaceholder: 'Enter title or note...',
      mainType: 'text',
    })
  })

  it('classifies TV and Media as separate media-style identities for Bento and Entries surfaces', () => {
    expect(getTrackerIdentity(tracker({ name: 'TV', icon: 'tv' }))).toBe('tv')
    expect(getTrackerIdentity(tracker({ name: 'Media', icon: 'music' }))).toBe('media')
    expect(usesMediaStyleRendering(tracker({ name: 'TV', icon: 'tv' }))).toBe(true)
    expect(usesMediaStyleRendering(tracker({ name: 'Media', icon: 'music' }))).toBe(true)
  })
})
