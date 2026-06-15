import type { CreateSocialEntryRequest, SocialMethod, SocialMoodImpact } from "@contracts/contracts"
import { validateSocialMethod, validateSocialMoodImpact } from "@contracts/domain"

export type SocialQuickEntryContactDraft = {
  contactId: number
  moodImpact: SocialMoodImpact
}

export type SocialQuickEntryDraft = {
  trackerId: number
  contacts: SocialQuickEntryContactDraft[]
  method: SocialMethod
  note: string
  tagIds: number[]
  assetId: number | null
}

function normalizeContactDrafts(contacts: SocialQuickEntryContactDraft[]): SocialQuickEntryContactDraft[] {
  const seen = new Set<number>()
  const normalized: SocialQuickEntryContactDraft[] = []

  for (const contact of contacts) {
    if (!Number.isInteger(contact.contactId) || contact.contactId <= 0) {
      continue
    }
    if (seen.has(contact.contactId)) {
      throw new Error("Duplicate contact selection is not allowed.")
    }
    seen.add(contact.contactId)
    normalized.push({
      contactId: contact.contactId,
      moodImpact: contact.moodImpact,
    })
  }

  return normalized
}

export function validateSocialQuickEntryDraft(draft: SocialQuickEntryDraft): string | null {
  if (!Number.isInteger(draft.trackerId) || draft.trackerId <= 0) {
    return "Select the Social tracker."
  }

  if (!draft.contacts.length) {
    return "Select at least one contact to save a Social check-in."
  }

  const uniqueIds = new Set<number>()
  for (const contact of draft.contacts) {
    if (!Number.isInteger(contact.contactId) || contact.contactId <= 0) {
      return "One selected contact is no longer available."
    }
    if (uniqueIds.has(contact.contactId)) {
      return "Each selected contact can only appear once."
    }
    uniqueIds.add(contact.contactId)

    if (!validateSocialMoodImpact(contact.moodImpact)) {
      return "Pick a valid mood impact for each contact."
    }
  }

  if (!validateSocialMethod(draft.method)) {
    return "Pick a valid Social method."
  }

  return null
}

export function buildSocialQuickEntryRequest(
  draft: SocialQuickEntryDraft,
  timestamp: number,
): CreateSocialEntryRequest {
  const contacts = normalizeContactDrafts(draft.contacts)
  const note = draft.note.trim()

  return {
    trackerId: draft.trackerId,
    timestamp,
    note: note || null,
    tagIds: draft.tagIds,
    assetId: draft.assetId,
    socialInteractions: contacts.map((contact) => ({
      contactId: contact.contactId,
      moodImpact: contact.moodImpact,
      method: draft.method,
      notes: note || null,
    })),
  }
}
