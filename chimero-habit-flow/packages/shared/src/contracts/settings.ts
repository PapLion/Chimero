import type { MeasurementUnit, WeightUnit } from './app-types'

export type ThemeChoice = 'dark' | 'light' | 'system'
export type AccentChoice = 'iris' | 'ember' | 'moss' | 'tide' | 'rose'

export interface AppPreferences {
  theme: ThemeChoice
  accent: AccentChoice
  weightUnit: WeightUnit
  measureUnit: MeasurementUnit
  /** 0 = Sunday, 1 = Monday. */
  weekStartsOn: 0 | 1
  timeFormat: '12h' | '24h'
  sidebarCollapsed: boolean
  /** Desktop notifications for reminders. */
  notifications: boolean
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: 'dark',
  accent: 'iris',
  weightUnit: 'lb',
  measureUnit: 'in',
  weekStartsOn: 1,
  timeFormat: '12h',
  sidebarCollapsed: false,
  notifications: true,
}

const THEMES: ThemeChoice[] = ['dark', 'light', 'system']
const ACCENTS: AccentChoice[] = ['iris', 'ember', 'moss', 'tide', 'rose']

/** Merge untrusted input over a base, dropping anything that is not a valid preference. */
export function sanitizePreferences(input: unknown, base: AppPreferences = DEFAULT_PREFERENCES): AppPreferences {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  return {
    theme: THEMES.includes(raw.theme as ThemeChoice) ? (raw.theme as ThemeChoice) : base.theme,
    accent: ACCENTS.includes(raw.accent as AccentChoice) ? (raw.accent as AccentChoice) : base.accent,
    weightUnit: raw.weightUnit === 'kg' || raw.weightUnit === 'lb' ? raw.weightUnit : base.weightUnit,
    measureUnit: raw.measureUnit === 'cm' || raw.measureUnit === 'in' ? raw.measureUnit : base.measureUnit,
    weekStartsOn: raw.weekStartsOn === 0 || raw.weekStartsOn === 1 ? raw.weekStartsOn : base.weekStartsOn,
    timeFormat: raw.timeFormat === '12h' || raw.timeFormat === '24h' ? raw.timeFormat : base.timeFormat,
    sidebarCollapsed: typeof raw.sidebarCollapsed === 'boolean' ? raw.sidebarCollapsed : base.sidebarCollapsed,
    notifications: typeof raw.notifications === 'boolean' ? raw.notifications : base.notifications,
  }
}

export interface AppInfo {
  version: string
  platform: string
  dataPath: string
  databaseBytes: number
  entryCount: number
  trackerCount: number
  firstEntryDate: string | null
}

export interface DataFileResult {
  ok: boolean
  canceled?: boolean
  path?: string
  error?: string
  /** Rows written (exports) or restored. */
  count?: number
}
