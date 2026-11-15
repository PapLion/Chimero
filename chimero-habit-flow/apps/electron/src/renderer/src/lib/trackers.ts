import type { Tracker } from '@contracts/contracts'
import { getTrackerIdentity, type TrackerIdentity } from '@contracts/features/tracking'

export type { TrackerIdentity }

export function identityOf(tracker: Tracker): TrackerIdentity {
  const identity = getTrackerIdentity(tracker)
  return identity === 'legacy-media-tv' ? 'tv' : identity
}

export const FALLBACK_COLOR = '#a080ff'

export function colorOf(tracker: Pick<Tracker, 'color'> | null | undefined): string {
  return tracker?.color || FALLBACK_COLOR
}

/** Storage type with legacy aliases folded in. */
export function kindOf(tracker: Tracker): 'numeric' | 'range' | 'binary' | 'text' {
  const type = ({ counter: 'numeric', rating: 'range', list: 'text', composite: 'text' } as Record<string, string>)[tracker.type] ?? tracker.type
  return (['numeric', 'range', 'binary', 'text'].includes(type) ? type : 'text') as 'numeric' | 'range' | 'binary' | 'text'
}

export const PALETTE = ['#a080ff', '#7c9cff', '#5cc8ff', '#2dd4bf', '#5fd3a2', '#a3e635', '#facc15', '#ffb05c', '#ff8a5c', '#ff7086', '#ff82b8', '#e879f9']

export const IDENTITY_BLURB: Record<TrackerIdentity, string> = {
  weight: 'Body weight, waist and a target to move toward',
  mood: 'How you feel, as often as you like',
  exercise: 'Workouts with exercises, sets and routines',
  social: 'Who you spent time with and how it felt',
  tasks: 'Things to do, by day',
  books: 'Reading days, shelves and ratings',
  gaming: 'Games played and hours',
  tv: 'Shows and films watched',
  media: 'Music, podcasts and everything else',
  'legacy-media-tv': 'Shows and films watched',
  health: 'Symptoms and how bad they were',
  intake: 'Vitamins, medication and supplements',
  diet: 'What you ate, tagged by ingredient',
  generic: 'Your own variable',
}
