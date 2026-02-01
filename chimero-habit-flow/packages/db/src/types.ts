/**
 * Shared TypeScript types for Chimero (Habit Flow).
 * These align with the Drizzle schema and are used across Main, Preload, and Renderer.
 *
 * DB schema uses snake_case; app layer uses camelCase for consistency with frontend.
 */

/** Tracker type enum (Drizzle schema) */
export type TrackerSchemaType = "numeric" | "range" | "binary" | "text" | "composite"

/** UI-friendly tracker type mapping (counter→numeric, rating→range, list→text) */
export type TrackerUIType = "counter" | "rating" | "list" | TrackerSchemaType

export interface TrackerConfig {
  min?: number
  max?: number
  unit?: string
  goal?: number
  step?: number
  options?: string[]
  isCustom?: boolean
}

export interface Tracker {
  id: number
  name: string
  type: TrackerSchemaType | TrackerUIType
  icon: string | null
  color: string | null
  order: number
  config: TrackerConfig
  archived: boolean
  isCustom?: boolean
  isFavorite?: boolean
  createdAt: number | null
}

export interface Entry {
  id: number
  trackerId: number
  value: number | null
  note: string | null
  metadata: Record<string, unknown>
  timestamp: number
  dateStr: string
}

export interface EntryInsert {
  trackerId: number
  value?: number | null
  note?: string | null
  metadata?: Record<string, unknown>
  timestamp: number
  dateStr: string
}

export interface TrackerInsert {
  name: string
  type: TrackerSchemaType
  icon?: string | null
  color?: string | null
  order?: number
  config?: TrackerConfig
  isCustom?: boolean
  archived?: boolean
}

/** Reminder/Notification (NotificationsModal, QuickEntry "Set Reminder") */
export interface Reminder {
  id: number
  title: string
  description?: string | null
  dueDateTime: number
  isCompleted: boolean
  linkedTrackerId?: number | null
  createdAt: number | null
}

export interface ReminderInsert {
  title: string
  description?: string | null
  dueDateTime: number
  isCompleted?: boolean
  linkedTrackerId?: number | null
}
