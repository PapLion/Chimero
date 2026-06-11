import { describe, expect, it } from 'vitest'
import {
  buildBirthdayAwareness,
  buildCheckInAttention,
  computeContactFrequency,
  computeDaysWithSocialContact,
  computeMethodFrequency,
  computeMoodImpactDistribution,
  daysSinceLastTalked,
  getContactInitials,
  getInitials,
  reorderContactProfileBlocks,
  separateSocialEntries,
  sortContactsByTalkFrequency,
  sortProfileBlocksByOrder,
  sortContactsByInteractionFrequency,
  validateSocialMethod,
  validateSocialMoodImpact,
} from '@contracts/domain'
import type { Contact, ContactInteraction, ContactProfileBlock, ContactReminderSettings } from '@contracts/contracts'

const contacts: Contact[] = [
  { id: 1, name: 'Ada Lovelace', birthday: '1815-12-10', lastTalkedAt: Date.parse('2026-06-01T12:00:00Z'), createdAt: null },
  { id: 2, name: 'Grace Hopper', birthday: '1906-12-09', lastTalkedAt: Date.parse('2026-05-20T12:00:00Z'), createdAt: null },
  { id: 3, name: 'Katherine Johnson', birthday: null, lastTalkedAt: null, createdAt: null },
]

const interactions: ContactInteraction[] = [
  { id: 1, contactId: 2, entryId: 10, method: 'call', moodImpact: 'positive', timestamp: Date.parse('2026-06-01T10:00:00Z') },
  { id: 2, contactId: 2, entryId: 11, method: 'text', moodImpact: 'neutral', timestamp: Date.parse('2026-06-02T10:00:00Z') },
  { id: 3, contactId: 1, entryId: 12, method: 'in-person', moodImpact: 'positive', timestamp: Date.parse('2026-06-03T10:00:00Z') },
]

describe('contact CRM read models', () => {
  it('derives initials with stable fallbacks', () => {
    expect(getContactInitials('Ada Lovelace')).toBe('AL')
    expect(getInitials('grace')).toBe('GR')
    expect(getInitials('   ')).toBe('')
  })

  it('validates structured Social method and mood values', () => {
    expect(validateSocialMethod('call')).toBe(true)
    expect(validateSocialMethod('letter')).toBe(false)
    expect(validateSocialMoodImpact('positive')).toBe(true)
    expect(validateSocialMoodImpact('excited')).toBe(false)
  })

  it('derives birthday awareness without claiming a reminder was delivered', () => {
    const awareness = buildBirthdayAwareness(contacts[0], new Date('2026-12-01T12:00:00Z'), 14)

    expect(awareness).toEqual({
      hasBirthday: true,
      isToday: false,
      daysUntilBirthday: 9,
      isSoon: true,
    })
  })

  it('derives days since last talked from lastTalkedAt', () => {
    expect(daysSinceLastTalked(contacts[0], new Date('2026-06-09T12:00:00Z'))).toBe(8)
    expect(daysSinceLastTalked(contacts[2], new Date('2026-06-09T12:00:00Z'))).toBeNull()
  })

  it('derives check-in attention from settings and days since last talked', () => {
    const settings: ContactReminderSettings = {
      contactId: 1,
      birthdayReminderEnabled: true,
      birthdayReminderDaysBefore: 14,
      checkInReminderEnabled: true,
      checkInAfterDays: 7,
      createdAt: null,
      updatedAt: null,
    }

    expect(buildCheckInAttention(contacts[0], settings, new Date('2026-06-09T12:00:00Z'))).toEqual({
      enabled: true,
      daysSinceLastTalked: 8,
      checkInAfterDays: 7,
      needsAttention: true,
    })
  })

  it('sorts contacts by structured interaction frequency', () => {
    expect(sortContactsByInteractionFrequency(contacts, interactions, 'most').map((contact) => contact.id)).toEqual([2, 1, 3])
    expect(sortContactsByInteractionFrequency(contacts, interactions, 'least').map((contact) => contact.id)).toEqual([3, 1, 2])
    expect(sortContactsByTalkFrequency(contacts, interactions, 'most').map((contact) => contact.id)).toEqual([2, 1, 3])
    expect(computeContactFrequency(interactions)).toEqual(new Map([
      [2, 2],
      [1, 1],
    ]))
  })

  it('derives Social method, mood, and active-day distributions from structured interactions only', () => {
    const legacyInteraction: ContactInteraction = {
      id: 4,
      contactId: 1,
      entryId: null,
      method: 'call',
      moodImpact: 'negative',
      timestamp: Date.parse('2026-06-03T10:00:00Z'),
    }

    expect(computeMethodFrequency([...interactions, legacyInteraction])).toEqual(new Map([
      ['call', 1],
      ['text', 1],
      ['in-person', 1],
    ]))
    expect(computeMoodImpactDistribution([...interactions, legacyInteraction])).toEqual(new Map([
      ['positive', 2],
      ['neutral', 1],
    ]))
    expect(computeDaysWithSocialContact([...interactions, legacyInteraction])).toBe(3)
  })

  it('reorders persisted profile blocks and normalizes order indexes', () => {
    const blocks: ContactProfileBlock[] = [
      { id: 1, contactId: 1, title: 'Notes', body: 'A', blockType: 'note', orderIndex: 0, createdAt: null, updatedAt: null },
      { id: 2, contactId: 1, title: 'Likes', body: 'B', blockType: 'text', orderIndex: 1, createdAt: null, updatedAt: null },
      { id: 3, contactId: 1, title: 'Plans', body: 'C', blockType: 'text', orderIndex: 2, createdAt: null, updatedAt: null },
    ]

    expect(reorderContactProfileBlocks(blocks, [3, 1, 2]).map((block) => [block.id, block.orderIndex])).toEqual([
      [3, 0],
      [1, 1],
      [2, 2],
    ])
    expect(sortProfileBlocksByOrder(blocks).map((block) => block.id)).toEqual([1, 2, 3])
  })

  it('separates structured Social entries from legacy generic entries', () => {
    const entries = [
      { id: 1, socialInteractions: [{ contactId: 1, moodImpact: 'positive' }] },
      { id: 2, note: 'legacy note' },
      { id: 3, socialInteractions: [] },
    ]

    expect(separateSocialEntries(entries)).toEqual({
      structured: [entries[0]],
      legacy: [entries[1], entries[2]],
    })
  })
})
