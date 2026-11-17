import type { Entry, SocialEntrySummary, SocialHomeReadModel, SocialLegacyReason, SocialSummaryContact, StructuredSocialSummary } from '../contracts/app-types'
import { getContactInitials, normalizeSocialMethod, normalizeSocialMoodImpact } from './contacts'

function dateToDateStr(timestamp: number): string {
  const value = new Date(timestamp)
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`
}

function matchesDate(entry: Pick<Entry, 'dateStr' | 'timestamp'>, selectedDate: Date): boolean {
  const selectedDateStr = dateToDateStr(selectedDate.getTime())
  if (entry.dateStr) return entry.dateStr === selectedDateStr
  return dateToDateStr(entry.timestamp) === selectedDateStr
}

function toSummaryContact(
  interaction: NonNullable<Entry['socialInteractions']>[number],
  avatarAssetId: number | null,
): SocialSummaryContact {
  const interactionAvatarAssetId = interaction.contactAvatarAssetId ?? null
  const name = (interaction.contactName ?? '').trim() || `Contact ${interaction.contactId}`
  const initials = (interaction.contactInitials ?? '').trim() || getContactInitials(name) || '?'
  return {
    contactId: interaction.contactId,
    name,
    initials,
    avatarAssetId: interactionAvatarAssetId ?? avatarAssetId,
    moodImpact: normalizeSocialMoodImpact(interaction.moodImpact) ?? 'neutral',
  }
}

function sortRecentContacts<T extends { lastInteractionAt: number; name: string; contactId: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (
    b.lastInteractionAt - a.lastInteractionAt
    || a.name.localeCompare(b.name)
    || a.contactId - b.contactId
  ))
}

function pickStructuredInteractions(entry: Pick<Entry, 'socialInteractions'>): NonNullable<Entry['socialInteractions']> {
  const interactions = entry.socialInteractions ?? []
  const unique = new Map<number, NonNullable<Entry['socialInteractions']>[number]>()
  for (const interaction of interactions) {
    if (!interaction || !Number.isInteger(interaction.contactId) || interaction.contactId <= 0) continue
    if (!normalizeSocialMoodImpact(interaction.moodImpact)) continue
    if (!normalizeSocialMethod(interaction.method)) continue
    if (!unique.has(interaction.contactId)) {
      unique.set(interaction.contactId, interaction)
    }
  }
  return [...unique.values()]
}

export function buildStructuredSocialSummary(
  entry: Pick<Entry, 'id' | 'trackerId' | 'timestamp' | 'dateStr' | 'note' | 'assetId' | 'tagIds' | 'socialInteractions'>,
  contactAssets?: Map<number, number | null>,
): SocialEntrySummary {
  const structuredInteractions = pickStructuredInteractions(entry)
  if (structuredInteractions.length === 0) {
    return {
      entryId: entry.id,
      trackerId: entry.trackerId,
      timestamp: entry.timestamp,
      dateStr: entry.dateStr,
      note: entry.note ?? null,
      structured: false,
      legacyReason: 'generic_entry',
    }
  }

  const firstMethod = normalizeSocialMethod(structuredInteractions[0]?.method)
  if (!firstMethod) {
    return {
      entryId: entry.id,
      trackerId: entry.trackerId,
      timestamp: entry.timestamp,
      dateStr: entry.dateStr,
      note: entry.note ?? null,
      structured: false,
      legacyReason: 'generic_entry',
    }
  }

  const contacts = structuredInteractions.map((interaction) => toSummaryContact(interaction, contactAssets?.get(interaction.contactId) ?? null))

  return {
    entryId: entry.id,
    trackerId: entry.trackerId,
    timestamp: entry.timestamp,
    dateStr: entry.dateStr,
    method: firstMethod,
    note: entry.note ?? null,
    tagIds: entry.tagIds ?? [],
    assetId: entry.assetId ?? null,
    contacts,
    structured: true,
  }
}

export function buildLegacySocialSummary(
  entry: Pick<Entry, 'id' | 'trackerId' | 'timestamp' | 'dateStr' | 'note'>,
  legacyReason: SocialLegacyReason = 'generic_entry',
): Extract<SocialEntrySummary, { structured: false }> {
  return {
    entryId: entry.id,
    trackerId: entry.trackerId,
    timestamp: entry.timestamp,
    dateStr: entry.dateStr,
    note: entry.note ?? null,
    structured: false,
    legacyReason,
  }
}

export function buildSocialHomeReadModel(
  entries: Array<Pick<Entry, 'id' | 'trackerId' | 'timestamp' | 'dateStr' | 'note' | 'socialInteractions'>>,
  selectedDate: Date,
): SocialHomeReadModel {
  const selectedEntries = entries.filter((entry) => matchesDate(entry, selectedDate))
  const structuredSummaries = selectedEntries
    .map((entry) => buildStructuredSocialSummary({
      id: entry.id,
      trackerId: entry.trackerId,
      timestamp: entry.timestamp,
      dateStr: entry.dateStr,
      note: entry.note,
      assetId: null,
      tagIds: [],
      socialInteractions: entry.socialInteractions,
    }))
    .filter((summary): summary is StructuredSocialSummary => summary.structured)

  const legacyEntryCount = selectedEntries.length - structuredSummaries.length
  const todayDistinctContactCount = new Set(structuredSummaries.flatMap((summary) => summary.contacts.map((contact) => contact.contactId))).size
  const latestStructuredInteraction = structuredSummaries
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp || b.entryId - a.entryId)[0] ?? null

  const recentContacts = sortRecentContacts(
    structuredSummaries.flatMap((summary) => summary.contacts.map((contact) => ({
      ...contact,
      lastInteractionAt: summary.timestamp,
    }))),
  )
    .reduce<Array<{ contactId: number; name: string; initials: string; avatarAssetId: number | null; lastInteractionAt: number }>>((acc, contact) => {
      const existingIndex = acc.findIndex((item) => item.contactId === contact.contactId)
      if (existingIndex >= 0) {
        if (contact.lastInteractionAt > acc[existingIndex].lastInteractionAt) {
          acc[existingIndex] = contact
        }
        return acc
      }
      acc.push(contact)
      return acc
    }, [])
    .sort((a, b) => (
      b.lastInteractionAt - a.lastInteractionAt
      || a.name.localeCompare(b.name)
      || a.contactId - b.contactId
    ))

  return {
    todayEntryCount: structuredSummaries.length,
    todayDistinctContactCount,
    latestStructuredInteraction,
    recentContacts,
    legacyEntryCount,
  }
}
