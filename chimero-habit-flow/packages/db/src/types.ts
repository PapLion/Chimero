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
  assetId?: number | null
}

export interface EntryInsert {
  trackerId: number
  value?: number | null
  note?: string | null
  metadata?: Record<string, unknown>
  timestamp: number
  dateStr: string
  assetId?: number | null
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

/** Reminder/Notification (recurring: time HH:MM + days 0-6; one-off: optional date YYYY-MM-DD) */
export interface Reminder {
  id: number
  trackerId?: number | null
  title: string
  description?: string | null
  time: string // "HH:MM" 24h
  date?: string | null // YYYY-MM-DD one-off; null = recurring by days
  days: number[] | null // 0=Sun .. 6=Sat
  enabled: boolean
  lastTriggered?: number | null
  completedAt?: number | null
  createdAt: number | null
}

export interface ReminderInsert {
  title: string
  description?: string | null
  trackerId?: number | null
  time: string
  date?: string | null
  days?: number[] | null
  enabled?: boolean
}

/** Asset (file reference in userData/assets) */
export interface Asset {
  id: number
  filename: string
  originalName?: string | null
  path: string
  type: string // 'image' | 'video'
  mimeType?: string | null
  size?: number | null
  thumbnailPath?: string | null
  createdAt: number | null
}

// === CORRELATION ENGINE TYPES ===

export interface CorrelationResult {
  sourceTrackerId: number;
  targetTrackerId: number;
  offsetDays: number;
  impact: number; // Percentage difference (-100 to +100)
  confidence: number; // Sample size (0-100)
  baselineAvg: number; // Cohort B average
  impactedAvg: number; // Cohort A average
  triggeredDays: number; // Days where source > 0
  baselineDays: number; // Days where source = 0/null
}

export interface CorrelationMetadata {
  totalDays: number;
  dataQuality: 'high' | 'medium' | 'low';
  hasSufficientData: boolean;
  recommendedActions: string[];
}

export interface EnhancedCorrelationResult extends CorrelationResult {
  metadata: CorrelationMetadata;
  insightType: 'positive_synergy' | 'destructive_interference' | 'neutral_correlation';
  userFriendlyConfidence: string;
}

export interface CorrelationCalculationOptions {
  sourceTrackerId: number;
  targetTrackerId: number;
  offsetDays: number;
  minSampleSize?: number;
  confidenceThreshold?: number;
}
