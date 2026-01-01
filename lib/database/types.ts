// ============================================
// DATABASE TYPES
// ============================================

// Core types
export interface DbTag {
  id: number
  name: string
  color: string
  created_at: string
}

export interface DbItem {
  id: number
  name: string
  category: ItemCategory
  icon?: string
  color?: string
  is_favorite: boolean
  use_count: number
  last_used_at?: string
  created_at: string
  tags?: DbTag[]
}

export type ItemCategory = "food" | "exercise" | "person" | "game" | "show" | "book" | "app" | "activity"

// Entry types
export interface DbDietEntry {
  id: number
  item_id: number
  item?: DbItem
  quantity: number
  unit: string
  calories?: number
  protein?: number
  carbs?: number
  fats?: number
  meal_type?: "breakfast" | "lunch" | "dinner" | "snack"
  notes?: string
  logged_at: string
}

export interface DbExerciseEntry {
  id: number
  item_id: number
  item?: DbItem
  duration_minutes?: number
  calories_burned?: number
  sets?: number
  reps?: number
  weight?: number
  distance?: number
  distance_unit?: string
  intensity?: "light" | "moderate" | "intense"
  notes?: string
  logged_at: string
}

export interface DbMoodEntry {
  id: number
  rating: number
  energy_level?: number
  stress_level?: number
  sleep_quality?: number
  notes?: string
  factors?: DbMoodFactor[]
  logged_at: string
}

export interface DbMoodFactor {
  id: number
  mood_entry_id: number
  factor_type: "positive" | "negative" | "neutral"
  description: string
}

export interface DbSocialEntry {
  id: number
  person_id: number
  person?: DbItem & { contact?: DbContact }
  method: "call" | "text" | "video" | "in-person"
  duration_minutes?: number
  quality_rating?: number
  notes?: string
  logged_at: string
}

export interface DbContact {
  id: number
  item_id: number
  initials?: string
  photo_url?: string
  relationship?: "family" | "friend" | "colleague" | "acquaintance"
  birthday?: string
}

export interface DbWeightEntry {
  id: number
  weight: number
  unit: "lbs" | "kg"
  body_fat_percentage?: number
  muscle_mass?: number
  notes?: string
  logged_at: string
}

export interface DbTaskEntry {
  id: number
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "in-progress" | "completed" | "cancelled"
  due_date?: string
  completed_at?: string
  category?: string
  notes?: string
  logged_at: string
}

export interface DbMediaEntry {
  id: number
  item_id?: number
  item?: DbItem
  platform: string
  duration_minutes: number
  activity_type?: string
  notes?: string
  logged_at: string
}

export interface DbGamingEntry {
  id: number
  item_id: number
  item?: DbItem
  duration_minutes: number
  platform?: string
  achievement?: string
  notes?: string
  logged_at: string
}

export interface DbTvEntry {
  id: number
  item_id: number
  item?: DbItem
  season?: number
  episode?: number
  duration_minutes?: number
  rating?: number
  notes?: string
  logged_at: string
}

export interface DbBookEntry {
  id: number
  item_id: number
  item?: DbItem
  pages_read?: number
  current_page?: number
  total_pages?: number
  chapter?: string
  duration_minutes?: number
  notes?: string
  logged_at: string
}

export interface DbCustomEntry {
  id: number
  tracker_id: string
  field_values: Record<string, string | number | boolean>
  notes?: string
  logged_at: string
}

export interface DbDailySummary {
  id: number
  date: string
  total_calories_in?: number
  total_calories_out?: number
  exercise_minutes?: number
  sleep_hours?: number
  avg_mood?: number
  social_interactions?: number
  tasks_completed?: number
  screen_time_minutes?: number
  notes?: string
}

export interface DbStreak {
  id: number
  tracker_type: string
  start_date: string
  end_date?: string
  current_count: number
  is_active: boolean
}

// Query result types
export interface ItemWithStats extends DbItem {
  total_uses: number
  last_used: string
  avg_quantity?: number
}

export interface CorrelationResult {
  correlation_type: string
  factor_a: string
  factor_b: string
  correlation_value: number
  sample_size: number
  time_window: string
}
