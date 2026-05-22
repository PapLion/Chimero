import type { Tracker } from '../../contracts/app-types'

export type TrackerIdentity =
  | 'weight'
  | 'mood'
  | 'exercise'
  | 'social'
  | 'tasks'
  | 'books'
  | 'gaming'
  | 'tv'
  | 'media'
  | 'legacy-media-tv'
  | 'diet'
  | 'generic'

export type DefaultTrackerDefinition = {
  name: string
  type: 'numeric' | 'range' | 'binary' | 'text' | 'composite'
  icon: string
  color: string
  order: number
  config: Record<string, unknown>
}

export const DEFAULT_TRACKERS: readonly DefaultTrackerDefinition[] = [
  { name: 'Weight', type: 'numeric', icon: 'scale', color: '#a855f7', order: 0, config: { unit: 'kg', goal: 70, identity: 'weight' } },
  { name: 'Mood', type: 'range', icon: 'smile', color: '#f59e0b', order: 1, config: { max: 10, identity: 'mood' } },
  { name: 'Exercise', type: 'numeric', icon: 'dumbbell', color: '#22c55e', order: 2, config: { unit: 'min', goal: 30, identity: 'exercise' } },
  { name: 'Social', type: 'numeric', icon: 'users', color: '#3b82f6', order: 3, config: { unit: 'interactions', identity: 'social' } },
  { name: 'Tasks', type: 'text', icon: 'check-square', color: '#ef4444', order: 4, config: { identity: 'tasks' } },
  { name: 'Books', type: 'text', icon: 'book', color: '#8b5cf6', order: 5, config: { identity: 'books' } },
  { name: 'Gaming', type: 'text', icon: 'gamepad-2', color: '#10b981', order: 6, config: { identity: 'gaming' } },
  { name: 'TV', type: 'text', icon: 'tv', color: '#0ea5e9', order: 7, config: { identity: 'tv' } },
  { name: 'Media', type: 'text', icon: 'music', color: '#38bdf8', order: 8, config: { identity: 'media' } },
  { name: 'Diet / Calories', type: 'numeric', icon: 'salad', color: '#22c55e', order: 9, config: { unit: 'kcal', goal: 2200, identity: 'diet' } },
] as const

type ExistingTrackerSeedRow = Pick<Tracker, 'name'> & {
  id: number
  order?: number | null
  config?: Record<string, unknown> | string | null
}

export type DefaultTrackerSeedPlan = {
  toInsert: DefaultTrackerDefinition[]
  legacyAction: 'none' | 'remove-empty' | 'preserve-populated'
  legacyTrackerIdsToRemove: number[]
}

function normalizeTrackerName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function readConfigIdentity(config: ExistingTrackerSeedRow['config'] | Tracker['config']): string | null {
  if (!config) return null
  if (typeof config === 'string') {
    try {
      const parsed = JSON.parse(config) as Record<string, unknown>
      return typeof parsed.identity === 'string' ? parsed.identity : null
    } catch {
      return null
    }
  }
  return typeof config.identity === 'string' ? config.identity : null
}

export function getTrackerIdentity(tracker: Pick<Tracker, 'name' | 'icon' | 'config'>): TrackerIdentity {
  const configuredIdentity = readConfigIdentity(tracker.config)
  if (configuredIdentity === 'tv') return 'tv'
  if (configuredIdentity === 'media') return 'media'
  if (configuredIdentity === 'legacy-media-tv') return 'legacy-media-tv'
  if (configuredIdentity === 'books') return 'books'
  if (configuredIdentity === 'gaming') return 'gaming'

  const name = normalizeTrackerName(tracker.name)
  const icon = tracker.icon?.toLowerCase() ?? ''

  if (name === 'media/tv' || name === 'media / tv') return 'legacy-media-tv'
  if (name === 'tv' || /\btv\b/.test(name) || name.includes('show') || name.includes('series') || name.includes('movie')) return 'tv'
  if (name === 'media' || name === 'apps & media' || name === 'app media') return 'media'
  if (name.includes('book') || name.includes('reading') || icon === 'book') return 'books'
  if (name.includes('game') || name.includes('gaming') || icon === 'gamepad-2') return 'gaming'
  if (name.includes('weight') || name.includes('peso') || icon === 'scale') return 'weight'
  if (name.includes('mood') || name.includes('feeling') || icon === 'smile') return 'mood'
  if (name.includes('exercise') || name.includes('workout') || name.includes('fitness') || icon === 'dumbbell') return 'exercise'
  if (name.includes('social') || name.includes('connection') || icon === 'users') return 'social'
  if (name.includes('task') || name.includes('todo') || icon === 'check-square') return 'tasks'
  if (name.includes('diet') || name.includes('calorie') || name.includes('food') || name.includes('meal') || icon === 'salad') return 'diet'

  return 'generic'
}

export function usesMediaStyleRendering(tracker: Pick<Tracker, 'name' | 'icon' | 'config'>): boolean {
  const identity = getTrackerIdentity(tracker)
  return identity === 'books' || identity === 'gaming' || identity === 'tv' || identity === 'media' || identity === 'legacy-media-tv'
}

export function planDefaultTrackerSeedActions(input: {
  trackers: ExistingTrackerSeedRow[]
  populatedLegacyMediaTv: boolean
}): DefaultTrackerSeedPlan {
  const names = new Set(input.trackers.map((tracker) => normalizeTrackerName(tracker.name)))
  const legacyTrackers = input.trackers.filter((tracker) => {
    const name = normalizeTrackerName(tracker.name)
    return name === 'media/tv' || name === 'media / tv'
  })

  let legacyAction: DefaultTrackerSeedPlan['legacyAction'] = 'none'
  let effectiveNames = names
  const legacyTrackerIdsToRemove: number[] = []

  if (legacyTrackers.length > 0) {
    if (input.populatedLegacyMediaTv) {
      legacyAction = 'preserve-populated'
      effectiveNames = new Set([...names, 'tv', 'media'])
    } else {
      legacyAction = 'remove-empty'
      legacyTrackers.forEach((tracker) => legacyTrackerIdsToRemove.push(tracker.id))
      effectiveNames = new Set([...names].filter((name) => name !== 'media/tv' && name !== 'media / tv'))
    }
  }

  const toInsert = DEFAULT_TRACKERS.filter((tracker) => !effectiveNames.has(normalizeTrackerName(tracker.name)))

  return {
    toInsert,
    legacyAction,
    legacyTrackerIdsToRemove,
  }
}
