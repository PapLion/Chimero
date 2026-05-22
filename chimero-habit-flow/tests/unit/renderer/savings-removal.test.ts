import { describe, expect, it } from 'vitest'

import { getEntryConfig } from '../../../apps/electron/src/renderer/src/features/entry/entry-config'
import { PRESETS } from '../../../apps/electron/src/renderer/src/features/trackers/modals/CreateTrackerDialog'
import type { Tracker } from '@contracts/contracts'

describe('Savings and Finance removal', () => {
  it('does not offer a Finance preset', () => {
    expect(PRESETS.map((preset) => preset.name)).not.toContain('Finance')
  })

  it('uses generic numeric entry copy for legacy finance-like custom trackers', () => {
    const legacyFinanceTracker: Tracker = {
      id: 42,
      name: 'Finance',
      type: 'numeric',
      icon: 'wallet',
      color: '#22c55e',
      order: 0,
      config: { unit: '$' },
      archived: false,
      createdAt: null,
    }

    expect(getEntryConfig(legacyFinanceTracker)).toMatchObject({
      mainPlaceholder: 'Enter value...',
      mainType: 'number',
      notePlaceholder: 'Optional note or comment...',
    })
  })
})
