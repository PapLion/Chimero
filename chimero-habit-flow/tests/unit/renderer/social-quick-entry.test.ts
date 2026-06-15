import { describe, expect, it } from 'vitest'
import { buildSocialQuickEntryRequest, validateSocialQuickEntryDraft } from '../../../apps/electron/src/renderer/src/features/entry/social-quick-entry'

describe('social quick entry draft contract', () => {
  it('validates and builds a canonical structured Social request', () => {
    const draft = {
      trackerId: 7,
      contacts: [
        { contactId: 11, moodImpact: 'positive' as const },
        { contactId: 12, moodImpact: 'neutral' as const },
      ],
      method: 'call' as const,
      note: '  Planning the weekend  ',
      tagIds: [3, 8],
      assetId: 44,
    }

    expect(validateSocialQuickEntryDraft(draft)).toBeNull()

    const request = buildSocialQuickEntryRequest(draft, 123456789)
    expect(request).toEqual({
      trackerId: 7,
      timestamp: 123456789,
      note: 'Planning the weekend',
      tagIds: [3, 8],
      assetId: 44,
      socialInteractions: [
        { contactId: 11, moodImpact: 'positive', method: 'call', notes: 'Planning the weekend' },
        { contactId: 12, moodImpact: 'neutral', method: 'call', notes: 'Planning the weekend' },
      ],
    })
  })

  it('rejects missing contacts, duplicate contacts, and invalid methods', () => {
    expect(validateSocialQuickEntryDraft({
      trackerId: 7,
      contacts: [],
      method: 'call',
      note: '',
      tagIds: [],
      assetId: null,
    })).toContain('Select at least one contact')

    expect(validateSocialQuickEntryDraft({
      trackerId: 7,
      contacts: [
        { contactId: 11, moodImpact: 'positive' },
        { contactId: 11, moodImpact: 'neutral' },
      ],
      method: 'call',
      note: '',
      tagIds: [],
      assetId: null,
    })).toContain('only appear once')

    expect(validateSocialQuickEntryDraft({
      trackerId: 7,
      contacts: [{ contactId: 11, moodImpact: 'positive' }],
      method: 'fax' as never,
      note: '',
      tagIds: [],
      assetId: null,
    })).toContain('valid Social method')

    expect(validateSocialQuickEntryDraft({
      trackerId: 7,
      contacts: [{ contactId: 11, moodImpact: 'ecstatic' as never }],
      method: 'call',
      note: '',
      tagIds: [],
      assetId: null,
    })).toContain('valid mood impact')
  })
})
