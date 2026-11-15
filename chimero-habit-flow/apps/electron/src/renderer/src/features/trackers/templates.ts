import type { TrackerConfig } from '@contracts/contracts'

export type TrackerKind = 'numeric' | 'range' | 'binary' | 'text'

export interface TrackerTemplate {
  id: string
  name: string
  icon: string
  color: string
  type: TrackerKind
  config: TrackerConfig
}

/** Starting points for common personal variables. Each one is a normal, fully editable tracker. */
export const TEMPLATES: TrackerTemplate[] = [
  {
    id: 'sleep',
    name: 'Sleep',
    icon: 'moon',
    color: '#7c9cff',
    type: 'numeric',
    config: {
      unit: 'h',
      valueKind: 'measure',
      aggregate: 'sum',
      goal: 8,
      goalDirection: 'atLeast',
      quickValues: [6, 7, 8, 9],
      description: 'Hours slept, logged the morning after.',
      fields: [
        { key: 'quality', label: 'Quality', type: 'select', options: ['Poor', 'Okay', 'Good', 'Great'] },
        { key: 'woke_up', label: 'Times woken', type: 'number' },
      ],
    },
  },
  { id: 'water', name: 'Water', icon: 'droplet', color: '#5cc8ff', type: 'numeric', config: { unit: 'glasses', valueKind: 'activity', aggregate: 'sum', goal: 8, goalDirection: 'atLeast', quickValues: [1, 2, 3], description: 'Glasses of water through the day.' } },
  { id: 'meditation', name: 'Meditation', icon: 'flower', color: '#2dd4bf', type: 'numeric', config: { unit: 'min', valueKind: 'activity', aggregate: 'sum', goal: 10, goalDirection: 'atLeast', quickValues: [5, 10, 15, 20], description: 'Minutes of practice.' } },
  { id: 'steps', name: 'Steps', icon: 'footprints', color: '#a3e635', type: 'numeric', config: { unit: 'steps', valueKind: 'measure', aggregate: 'last', goal: 8000, goalDirection: 'atLeast', description: 'Daily step count from your phone or watch.' } },
  { id: 'caffeine', name: 'Caffeine', icon: 'coffee', color: '#ffb05c', type: 'numeric', config: { unit: 'cups', valueKind: 'activity', aggregate: 'sum', goal: 3, goalDirection: 'atMost', quickValues: [1, 2], description: 'Coffee, tea and energy drinks.' } },
  { id: 'alcohol', name: 'Alcohol', icon: 'wine', color: '#ff7086', type: 'numeric', config: { unit: 'drinks', valueKind: 'activity', aggregate: 'sum', quickValues: [1, 2, 3], description: 'Drinks per day.' } },
  { id: 'screen', name: 'Screen time', icon: 'smartphone', color: '#e879f9', type: 'numeric', config: { unit: 'h', valueKind: 'measure', aggregate: 'last', goal: 3, goalDirection: 'atMost', description: 'Hours on your phone, from its weekly report.' } },
  { id: 'energy', name: 'Energy', icon: 'zap', color: '#facc15', type: 'range', config: { min: 1, max: 10, aggregate: 'mean', description: 'How much energy you have, from 1 to 10.' } },
  { id: 'stress', name: 'Stress', icon: 'wind', color: '#ff8a5c', type: 'range', config: { min: 1, max: 10, aggregate: 'mean', description: 'How tense the day feels, from 1 to 10.' } },
  { id: 'habit', name: 'Daily habit', icon: 'check-square', color: '#5fd3a2', type: 'binary', config: { description: 'Something you either did or did not do.' } },
  { id: 'journal', name: 'Journal', icon: 'pen-line', color: '#a080ff', type: 'text', config: { description: 'A few lines about the day.' } },
]

export const KIND_LABEL: Record<TrackerKind, string> = { numeric: 'Number', range: 'Scale', binary: 'Yes or no', text: 'Text' }

export const KIND_HINT: Record<TrackerKind, string> = {
  numeric: 'An amount with a unit: hours, glasses, pages, minutes.',
  range: 'A score between two numbers, like 1 to 10.',
  binary: 'Did it happen today or not.',
  text: 'Words, optionally picked from a list.',
}
