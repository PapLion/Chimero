// ============================================
// Phase 2: Database Types for Item-Level Tagging
// ============================================

// Core Item Types
export interface DBItem {
  id: number
  name: string
  category: ItemCategory
  created_at: string
  updated_at: string
}

export type ItemCategory = "food" | "exercise" | "person" | "media" | "activity" | "location"

export interface DBTag {
  id: number
  name: string
  color?: string
  created_at: string
}

export interface DBItemTag {
  item_id: number
  tag_id: number
}

// Diet Entry Types
export interface DBDietEntry {
  id: number
  timestamp: string
  meal_type?: "breakfast" | "lunch" | "dinner" | "snack"
  notes?: string
}

export interface DBDietEntryItem {
  id: number
  entry_id: number
  item_id: number
  quantity: number
  unit?: string
  calories?: number
  protein?: number
  carbs?: number
  fats?: number
}

export interface DietEntryWithItems extends DBDietEntry {
  items: (DBDietEntryItem & { item: DBItem; tags: DBTag[] })[]
}

// Mood Entry Types
export interface DBMoodEntry {
  id: number
  timestamp: string
  rating: number
  energy_level?: number
  anxiety_level?: number
  notes?: string
}

export interface DBMoodFactor {
  id: number
  entry_id: number
  factor_type: "activity" | "person" | "event" | "weather" | "health"
  factor_value: string
  impact?: "positive" | "negative" | "neutral"
}

// Social Entry Types
export interface DBPerson {
  id: number
  name: string
  initials?: string
  relationship?: "family" | "friend" | "colleague" | "acquaintance"
  photo_asset_id?: number
  created_at: string
}

export interface DBSocialEntry {
  id: number
  timestamp: string
  person_id: number
  method: "call" | "text" | "video" | "in-person"
  duration_minutes?: number
  quality_rating?: number
  notes?: string
}

export interface SocialEntryWithPerson extends DBSocialEntry {
  person: DBPerson
}

// Exercise Entry Types
export interface DBExerciseEntry {
  id: number
  timestamp: string
  activity_type: "cardio" | "strength" | "flexibility" | "sports"
  item_id?: number
  duration_minutes?: number
  calories_burned?: number
  intensity?: "low" | "medium" | "high"
  notes?: string
}

export interface DBExerciseSet {
  id: number
  entry_id: number
  set_number?: number
  reps?: number
  weight?: number
  weight_unit?: string
}

// Media Entry Types
export interface DBMediaEntry {
  id: number
  timestamp: string
  media_type: "game" | "tv" | "movie" | "music" | "podcast" | "book"
  item_id?: number
  duration_minutes?: number
  rating?: number
  progress_type?: "started" | "in_progress" | "completed" | "dropped"
  progress_value?: string
  notes?: string
}

// Quick Entry Types
export interface DBFavorite {
  id: number
  item_id: number
  tracker_type: TrackerType
  display_order: number
  created_at: string
}

export interface DBRecentEntry {
  id: number
  item_id: number
  tracker_type: TrackerType
  last_used: string
  use_count: number
}

export type TrackerType = "diet" | "exercise" | "social" | "media" | "mood"

// Statistics & Analytics Types
export interface ItemStats {
  item: DBItem
  totalCount: number
  lastUsed: string | null
  firstUsed: string | null
  averagePerDay?: number
  tags: DBTag[]
}

export interface CorrelationResult {
  factor_a: string
  factor_b: string
  correlation_value: number
  sample_size: number
  insight: string
}

export interface TrackerStats {
  totalEntries: number
  averagePerDay: number
  stdDeviation: number
  trend: "up" | "down" | "stable"
  currentStreak: number
  maxStreak: number
}

// Quick Entry Suggestion Types
export interface QuickEntrySuggestion {
  item: DBItem
  type: "recent" | "frequent" | "favorite"
  useCount: number
  lastUsed?: string
}
