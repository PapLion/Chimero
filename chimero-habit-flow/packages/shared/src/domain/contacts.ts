import type { Contact, ContactInteraction, ContactProfileBlock, ContactReminderSettings, SocialMethod, SocialMoodImpact } from '../contracts/app-types'

const DAY_MS = 24 * 60 * 60 * 1000
const SOCIAL_METHODS: SocialMethod[] = ['in-person', 'call', 'text', 'video', 'other']
const SOCIAL_MOOD_IMPACTS: SocialMoodImpact[] = ['positive', 'negative', 'neutral']

function startOfUtcDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
}

function parseDateOnly(value?: string | null): { month: number; day: number } | null {
  if (!value) return null
  const parts = value.split('-').map((part) => Number(part))
  if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return null
  return { month: parts[1] - 1, day: parts[2] }
}

export function getContactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export const getInitials = getContactInitials

export function validateSocialMethod(value: unknown): value is SocialMethod {
  return typeof value === 'string' && SOCIAL_METHODS.includes(value as SocialMethod)
}

export function validateSocialMoodImpact(value: unknown): value is SocialMoodImpact {
  return typeof value === 'string' && SOCIAL_MOOD_IMPACTS.includes(value as SocialMoodImpact)
}

function structuredInteractions<T extends Pick<ContactInteraction, 'entryId'>>(interactions: T[]): T[] {
  return interactions.filter((interaction) => interaction.entryId != null)
}

export function daysSinceLastTalked(contact: Pick<Contact, 'lastTalkedAt' | 'dateLastTalked'>, today = new Date()): number | null {
  let lastTalkedAt = contact.lastTalkedAt ?? null
  if (lastTalkedAt == null && contact.dateLastTalked) {
    lastTalkedAt = Date.parse(`${contact.dateLastTalked}T00:00:00Z`)
  }
  if (lastTalkedAt == null || !Number.isFinite(lastTalkedAt)) return null
  return Math.max(0, Math.floor((startOfUtcDay(today) - startOfUtcDay(new Date(lastTalkedAt))) / DAY_MS))
}

export function buildBirthdayAwareness(contact: Pick<Contact, 'birthday'>, today = new Date(), soonWindowDays = 14) {
  const birthday = parseDateOnly(contact.birthday)
  if (!birthday) {
    return {
      hasBirthday: false,
      isToday: false,
      daysUntilBirthday: null,
      isSoon: false,
    }
  }

  const todayDay = startOfUtcDay(today)
  let nextBirthday = Date.UTC(today.getUTCFullYear(), birthday.month, birthday.day)
  if (nextBirthday < todayDay) nextBirthday = Date.UTC(today.getUTCFullYear() + 1, birthday.month, birthday.day)
  const daysUntilBirthday = Math.floor((nextBirthday - todayDay) / DAY_MS)

  return {
    hasBirthday: true,
    isToday: daysUntilBirthday === 0,
    daysUntilBirthday,
    isSoon: daysUntilBirthday <= soonWindowDays,
  }
}

export const computeDaysSinceLastTalked = daysSinceLastTalked
export const computeBirthdayAwareness = buildBirthdayAwareness

export function buildCheckInAttention(
  contact: Pick<Contact, 'lastTalkedAt' | 'dateLastTalked'>,
  settings: Pick<ContactReminderSettings, 'checkInReminderEnabled' | 'checkInAfterDays'> | null | undefined,
  today = new Date(),
) {
  const enabled = settings?.checkInReminderEnabled ?? false
  const checkInAfterDays = settings?.checkInAfterDays ?? null
  const days = daysSinceLastTalked(contact, today)

  return {
    enabled,
    daysSinceLastTalked: days,
    checkInAfterDays,
    needsAttention: enabled && checkInAfterDays != null && days != null && days >= checkInAfterDays,
  }
}

export function computeContactFrequency(interactions: Pick<ContactInteraction, 'contactId' | 'entryId'>[]): Map<number, number> {
  const counts = new Map<number, number>()
  structuredInteractions(interactions).forEach((interaction) => {
    counts.set(interaction.contactId, (counts.get(interaction.contactId) ?? 0) + 1)
  })
  return counts
}

export function sortContactsByInteractionFrequency<T extends Pick<Contact, 'id' | 'name'>>(
  contacts: T[],
  interactions: Pick<ContactInteraction, 'contactId' | 'entryId'>[],
  direction: 'most' | 'least',
): T[] {
  const counts = computeContactFrequency(interactions)
  const multiplier = direction === 'most' ? -1 : 1
  return [...contacts].sort((a, b) => {
    const byCount = ((counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0)) * multiplier
    if (byCount !== 0) return byCount
    return a.name.localeCompare(b.name)
  })
}

export const sortContactsByTalkFrequency = sortContactsByInteractionFrequency

export function computeMethodFrequency(interactions: Pick<ContactInteraction, 'entryId' | 'method'>[]): Map<SocialMethod, number> {
  const counts = new Map<SocialMethod, number>()
  structuredInteractions(interactions).forEach((interaction) => {
    const method = validateSocialMethod(interaction.method) ? interaction.method : null
    if (!method) return
    counts.set(method, (counts.get(method) ?? 0) + 1)
  })
  return counts
}

export function computeMoodImpactDistribution(interactions: Pick<ContactInteraction, 'entryId' | 'moodImpact' | 'mood'>[]): Map<SocialMoodImpact, number> {
  const counts = new Map<SocialMoodImpact, number>()
  structuredInteractions(interactions).forEach((interaction) => {
    const moodImpact = validateSocialMoodImpact(interaction.moodImpact)
      ? interaction.moodImpact
      : validateSocialMoodImpact(interaction.mood)
        ? interaction.mood
        : null
    if (!moodImpact) return
    counts.set(moodImpact, (counts.get(moodImpact) ?? 0) + 1)
  })
  return counts
}

export function computeDaysWithSocialContact(interactions: Pick<ContactInteraction, 'entryId' | 'timestamp'>[]): number {
  const days = new Set<string>()
  structuredInteractions(interactions).forEach((interaction) => {
    const timestamp = Number(interaction.timestamp)
    if (!Number.isFinite(timestamp)) return
    days.add(new Date(timestamp).toISOString().slice(0, 10))
  })
  return days.size
}

export function sortProfileBlocksByOrder<T extends Pick<ContactProfileBlock, 'orderIndex' | 'id'>>(blocks: T[]): T[] {
  return [...blocks].sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id)
}

export function reorderContactProfileBlocks<T extends ContactProfileBlock>(blocks: T[], orderedIds: number[]): T[] {
  const byId = new Map(blocks.map((block) => [block.id, block]))
  const ordered: T[] = []
  orderedIds.forEach((id) => {
    const block = byId.get(id)
    if (block) ordered.push(block)
  })
  blocks
    .filter((block) => !orderedIds.includes(block.id))
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .forEach((block) => ordered.push(block))
  return ordered.map((block, orderIndex) => ({ ...block, orderIndex }))
}

export function reorderProfileBlocks<T extends ContactProfileBlock>(blocks: T[], orderedIds: number[]): T[] {
  return reorderContactProfileBlocks(blocks, orderedIds)
}

export function separateSocialEntries<T extends { socialInteractions?: unknown[] | null }>(entries: T[]): { structured: T[]; legacy: T[] } {
  const structured: T[] = []
  const legacy: T[] = []
  entries.forEach((entry) => {
    if (entry.socialInteractions && entry.socialInteractions.length > 0) {
      structured.push(entry)
    } else {
      legacy.push(entry)
    }
  })
  return { structured, legacy }
}
