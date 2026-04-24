import defaultTrackersJson from './contracts/default-trackers.json' with { type: 'json' }

export type DefaultTrackerDefinition = {
  name: string
  type: 'numeric' | 'range' | 'binary' | 'text' | 'composite'
  icon: string
  color: string
  order: number
  config: Record<string, unknown>
}

export const DEFAULT_TRACKERS = defaultTrackersJson as DefaultTrackerDefinition[]
