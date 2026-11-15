import type { AppPreferences, Entry, Tracker } from '@contracts/contracts'
import { convertLength, convertWeight, duration, num, plural } from './format'
import { identityOf, kindOf } from './trackers'

export interface EntryLine {
  /** What was recorded, in a few words. */
  title: string
  /** Secondary facts: amounts, people, notes. */
  detail: string | null
  /** A value worth showing large, when there is one. */
  figure: string | null
}

const MEAL: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', other: 'Other' }
const BOOK_VERB: Record<string, string> = { started: 'Started', read: 'Read', finished: 'Finished' }

export function moodWord(score: number): string {
  if (score >= 9) return 'Great'
  if (score >= 7) return 'Good'
  if (score >= 5) return 'Okay'
  if (score >= 3) return 'Low'
  return 'Rough'
}

/** Red → orange → yellow → green, the colour language the mood scale uses. */
export function moodColor(score: number): string {
  const stops = ['#ff6b81', '#ff8a5c', '#ffb05c', '#facc15', '#a3e635', '#5fd3a2']
  return stops[Math.max(0, Math.min(stops.length - 1, Math.round(((score - 1) / 9) * (stops.length - 1))))]
}

function join(parts: Array<string | null | undefined | false>): string | null {
  const kept = parts.filter((p): p is string => !!p)
  return kept.length > 0 ? kept.join(' · ') : null
}

/** One human-readable line for any entry of any tracker. */
export function describeEntry(entry: Entry, tracker: Tracker, prefs: Pick<AppPreferences, 'weightUnit' | 'measureUnit'>): EntryLine {
  const note = entry.note?.trim() || null
  const meta = entry.metadata ?? {}
  switch (identityOf(tracker)) {
    case 'weight': {
      const source = entry.weight ?? (entry.value != null ? { weight: entry.value, unit: (tracker.config.unit === 'lb' ? 'lb' : 'kg') as 'kg' | 'lb', waist: null, waistUnit: null } : null)
      if (!source) return { title: 'Weigh-in', detail: note, figure: null }
      const figure = `${num(convertWeight(source.weight, source.unit, prefs.weightUnit))} ${prefs.weightUnit}`
      const waist = source.waist != null ? `waist ${num(convertLength(source.waist, source.waistUnit, prefs.measureUnit))} ${prefs.measureUnit}` : null
      return { title: figure, detail: join([waist, note]), figure }
    }
    case 'mood': {
      const score = entry.value ?? 0
      return { title: `${moodWord(score)} · ${num(score, 0)}/10`, detail: note, figure: num(score, 0) }
    }
    case 'exercise': {
      if (entry.session) {
        const s = entry.session
        const volume = s.volume != null ? `${num(convertWeight(s.volume, s.loadUnit, prefs.weightUnit), 0)} ${prefs.weightUnit} volume` : null
        return {
          title: s.name || 'Workout',
          detail: join([s.minutes != null && duration(s.minutes), s.exercises.length > 0 && plural(s.exercises.length, 'exercise'), s.sets > 0 && plural(s.sets, 'set'), volume, note !== s.name && note]),
          figure: s.minutes != null ? duration(s.minutes) : null,
        }
      }
      return { title: note || 'Workout', detail: entry.value != null ? duration(entry.value) : null, figure: entry.value != null ? duration(entry.value) : null }
    }
    case 'social': {
      const people = entry.socialInteractions ?? []
      if (people.length === 0) return { title: note || 'Social time', detail: null, figure: null }
      const names = people.map((p) => p.contactName ?? 'Someone')
      const method = people[0].method ? people[0].method.replace('-', ' ') : null
      return { title: names.length <= 3 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`, detail: join([method, note]), figure: null }
    }
    case 'tasks':
      return { title: note || 'Task', detail: (entry.value ?? 0) >= 1 ? 'Done' : null, figure: null }
    case 'books':
      if (entry.book) return { title: entry.book.title, detail: BOOK_VERB[entry.book.activityType] ?? null, figure: null }
      return { title: note || 'Reading', detail: null, figure: null }
    case 'gaming':
      if (entry.gaming) return { title: entry.gaming.gameTitle, detail: `${num(entry.gaming.estimatedHours)} h`, figure: `${num(entry.gaming.estimatedHours)} h` }
      return { title: note || 'Played', detail: null, figure: null }
    case 'diet':
      if (entry.food) {
        return { title: entry.food.foodName, detail: join([entry.food.mealType && MEAL[entry.food.mealType], entry.food.calories != null && `${num(entry.food.calories, 0)} kcal`]), figure: null }
      }
      return { title: note || 'Food', detail: entry.value ? `${num(entry.value, 0)} kcal` : null, figure: null }
    case 'health':
      if (entry.health) return { title: entry.health.symptomName, detail: join([entry.health.severity != null && `severity ${entry.health.severity}/10`, note]), figure: entry.health.severity != null ? String(entry.health.severity) : null }
      return { title: note || 'Symptom', detail: null, figure: null }
    case 'intake':
      if (entry.intake) {
        const dose = entry.intake.dosage != null ? `${num(entry.intake.dosage)}${entry.intake.unit ? ` ${entry.intake.unit}` : ''}` : null
        return { title: entry.intake.itemName, detail: join([dose, entry.intake.variant, note]), figure: dose }
      }
      return { title: note || 'Dose', detail: null, figure: null }
    case 'tv':
    case 'media': {
      const title = typeof meta.title === 'string' && meta.title ? meta.title : note || tracker.name
      const episode = typeof meta.season === 'number' || typeof meta.episode === 'number' ? `S${meta.season ?? '?'} E${meta.episode ?? '?'}` : null
      return {
        title,
        detail: join([typeof meta.kind === 'string' && meta.kind, episode, typeof meta.minutes === 'number' && duration(meta.minutes), typeof meta.rating === 'number' && `${meta.rating}/5`, meta.title ? note : null]),
        figure: null,
      }
    }
    default: {
      const kind = kindOf(tracker)
      const fields = fieldSummary(entry, tracker)
      if (kind === 'binary') return { title: (entry.value ?? 1) >= 1 ? 'Done' : 'Skipped', detail: join([fields, note]), figure: null }
      if (kind === 'text') return { title: note || tracker.name, detail: fields, figure: null }
      const figure = entry.value != null ? `${num(entry.value, 2)}${kind === 'range' ? `/${tracker.config.max ?? 10}` : tracker.config.unit ? ` ${tracker.config.unit}` : ''}` : '—'
      return { title: figure, detail: join([fields, note]), figure }
    }
  }
}

function fieldSummary(entry: Entry, tracker: Tracker): string | null {
  const values = (entry.metadata?.fields ?? {}) as Record<string, unknown>
  const parts: string[] = []
  for (const field of tracker.config.fields ?? []) {
    const value = values[field.key]
    if (value == null || value === '') continue
    if (field.type === 'boolean') {
      if (value === true) parts.push(field.label)
    } else parts.push(`${field.label} ${String(value)}${field.unit ? ` ${field.unit}` : ''}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}
