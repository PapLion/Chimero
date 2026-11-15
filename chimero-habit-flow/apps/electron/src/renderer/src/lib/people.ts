import type { Contact, ContactReminderSettings } from '@contracts/contracts'
import { api } from './api'
import { diffDays, todayStr } from './dates'
import { plural } from './format'
import { useContacts, useData } from './queries'

export interface Nudge {
  contact: Contact
  kind: 'birthday' | 'catch-up'
  text: string
  /** Smaller is more urgent. */
  rank: number
}

/** Birthdays show a week ahead unless the person has their own lead time. */
export const DEFAULT_BIRTHDAY_LEAD = 7

export function nextBirthday(birthday: string | null | undefined, today = todayStr()): { date: string; inDays: number; turning: number | null } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday ?? '')
  if (!match) return null
  const year = Number(today.slice(0, 4))
  let date = `${year}-${match[2]}-${match[3]}`
  if (date < today) date = `${year + 1}-${match[2]}-${match[3]}`
  const born = Number(match[1])
  return { date, inDays: diffDays(today, date), turning: born > 1900 ? Number(date.slice(0, 4)) - born : null }
}

export function lastTalkedText(contact: Pick<Contact, 'daysSinceLastTalked'>): string {
  const days = contact.daysSinceLastTalked
  if (days == null) return 'No time together logged yet'
  if (days <= 0) return 'Talked today'
  if (days === 1) return 'Talked yesterday'
  return `Last talked ${plural(days, 'day')} ago`
}

export function nudgesFor(contact: Contact, settings: ContactReminderSettings | null | undefined, today = todayStr()): Nudge[] {
  const out: Nudge[] = []
  const birthday = nextBirthday(contact.birthday, today)
  const lead = settings?.birthdayReminderEnabled ? (settings.birthdayReminderDaysBefore ?? DEFAULT_BIRTHDAY_LEAD) : DEFAULT_BIRTHDAY_LEAD
  if (birthday && birthday.inDays <= lead) {
    const when = birthday.inDays === 0 ? 'today' : birthday.inDays === 1 ? 'tomorrow' : `in ${birthday.inDays} days`
    out.push({ contact, kind: 'birthday', text: `Birthday ${when}${birthday.turning ? `, turning ${birthday.turning}` : ''}`, rank: birthday.inDays })
  }
  if (settings?.checkInReminderEnabled && settings.checkInAfterDays) {
    const days = contact.daysSinceLastTalked
    if (days == null) out.push({ contact, kind: 'catch-up', text: 'Time to catch up', rank: 50 })
    else if (days >= settings.checkInAfterDays) out.push({ contact, kind: 'catch-up', text: `${plural(days, 'day')} since you talked`, rank: 100 - Math.min(99, days - settings.checkInAfterDays) })
  }
  return out
}

/** Everyone's reminder settings in one query, keyed by contact id. */
export function useContactSettings() {
  const { data: contacts = [] } = useContacts()
  const ids = contacts.map((contact) => contact.id)
  return useData(['contact-settings', ids.join(',')], async () => {
    const all = await Promise.all(ids.map((id) => api.getContactReminderSettings(id)))
    return new Map(ids.map((id, index) => [id, all[index]]))
  })
}

export function useNudges(): Nudge[] {
  const { data: contacts = [] } = useContacts()
  const { data: settings } = useContactSettings()
  return contacts.flatMap((contact) => nudgesFor(contact, settings?.get(contact.id))).sort((a, b) => a.rank - b.rank)
}
