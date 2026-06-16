import { describe, expect, it } from 'vitest'
import type { Entry } from '@contracts/contracts'
import { buildSocialHomeReadModel, buildStructuredSocialSummary } from '@contracts/domain'

function createStructuredEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 101,
    trackerId: 4,
    value: 1,
    note: 'Planning the weekend',
    metadata: {},
    timestamp: Date.UTC(2026, 5, 15, 18, 30, 0),
    dateStr: '2026-06-15',
    assetId: 44,
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
    ...overrides,
  }
}

describe('social read models', () => {
  it('builds a structured summary with deterministic contact order and canonical fields', () => {
    const summary = buildStructuredSocialSummary(createStructuredEntry())

    expect(summary).toEqual({
      entryId: 101,
      trackerId: 4,
      timestamp: Date.UTC(2026, 5, 15, 18, 30, 0),
      dateStr: '2026-06-15',
      method: 'call',
      note: 'Planning the weekend',
      tagIds: [3, 8],
      assetId: 44,
      contacts: [
        {
          contactId: 11,
          name: 'Jack Robert',
          initials: 'JR',
          avatarAssetId: 91,
          moodImpact: 'positive',
        },
        {
          contactId: 12,
          name: 'Annabelle',
          initials: 'A',
          avatarAssetId: null,
          moodImpact: 'neutral',
        },
      ],
      structured: true,
    })
  })

  it('classifies generic Social entries as legacy and keeps them out of structured metrics', () => {
    const summary = buildStructuredSocialSummary({
      id: 202,
      trackerId: 4,
      value: 1,
      note: 'Legacy note only',
      metadata: {},
      timestamp: Date.UTC(2026, 5, 14, 12, 0, 0),
      dateStr: '2026-06-14',
      assetId: null,
      tagIds: [],
      socialInteractions: [],
    })

    expect(summary).toEqual({
      entryId: 202,
      trackerId: 4,
      timestamp: Date.UTC(2026, 5, 14, 12, 0, 0),
      dateStr: '2026-06-14',
      note: 'Legacy note only',
      structured: false,
      legacyReason: 'generic_entry',
    })
  })

  it('builds Home metrics from structured entries without parsing notes', () => {
    const entries: Entry[] = [
      createStructuredEntry(),
      createStructuredEntry({
        id: 102,
        timestamp: Date.UTC(2026, 5, 15, 20, 15, 0),
        dateStr: '2026-06-15',
        note: 'Project catch-up',
        socialInteractions: [
          {
            contactId: 11,
            contactName: 'Jack Robert',
            contactInitials: 'JR',
            contactAvatarAssetId: 91,
            method: 'video',
            moodImpact: 'negative',
            note: 'Project catch-up',
          },
        ],
      }),
      {
        id: 103,
        trackerId: 4,
        value: 1,
        note: 'Legacy note only',
        metadata: {},
        timestamp: Date.UTC(2026, 5, 15, 21, 0, 0),
        dateStr: '2026-06-15',
        assetId: null,
        tagIds: [],
        socialInteractions: [],
      },
    ]

    const model = buildSocialHomeReadModel(entries, new Date(Date.UTC(2026, 5, 15, 12, 0, 0)))

    expect(model.todayEntryCount).toBe(2)
    expect(model.todayDistinctContactCount).toBe(2)
    expect(model.legacyEntryCount).toBe(1)
    expect(model.latestStructuredInteraction?.entryId).toBe(102)
    expect(model.latestStructuredInteraction?.method).toBe('video')
    expect(model.latestStructuredInteraction?.contacts.map((contact) => contact.contactId)).toEqual([11])
    expect(model.recentContacts).toEqual([
      {
        contactId: 11,
        name: 'Jack Robert',
        initials: 'JR',
        avatarAssetId: 91,
        lastInteractionAt: Date.UTC(2026, 5, 15, 20, 15, 0),
        moodImpact: 'negative',
      },
      {
        contactId: 12,
        name: 'Annabelle',
        initials: 'A',
        avatarAssetId: null,
        lastInteractionAt: Date.UTC(2026, 5, 15, 18, 30, 0),
        moodImpact: 'neutral',
      },
    ])
  })
})
