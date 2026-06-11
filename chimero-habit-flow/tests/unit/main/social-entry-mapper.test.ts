import { describe, expect, it } from 'vitest'

import { mapEntry } from '../../../apps/electron/src/main/shared/mappers'

describe('Social entry mapping', () => {
  it('preserves structured social interactions on mapped entries', () => {
    const entry = mapEntry({
      id: 42,
      tracker_id: 7,
      value: 1,
      note: 'text check-in',
      metadata: '{}',
      timestamp: Date.UTC(2026, 5, 11, 14, 30),
      date_str: '2026-06-11',
      asset_id: null,
      socialInteractions: [
        {
          contactId: 10,
          contactName: 'Jack Robert',
          contactInitials: 'JR',
          method: 'text',
          moodImpact: 'positive',
          note: 'text check-in',
        },
      ],
    })

    expect(entry.socialInteractions).toEqual([
      {
        contactId: 10,
        contactName: 'Jack Robert',
        contactInitials: 'JR',
        method: 'text',
        moodImpact: 'positive',
        note: 'text check-in',
      },
    ])
  })
})
