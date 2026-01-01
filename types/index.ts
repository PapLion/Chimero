// ============================================
// WIDGET TYPES
// ============================================

// Base widget props
export interface WidgetProps {
  className?: string
}

// Exercise Widget Types
export interface ExerciseData {
  hoursCompleted: number
  goalHours: number
  percentage: number
  unit: "hours" | "minutes"
}

// Diet Widget Types
export type DietStatus = "on-track" | "over" | "under"

export interface MacroNutrients {
  protein: number
  carbs: number
  fats: number
}

export interface DietData {
  status: DietStatus
  macros: MacroNutrients
  goals?: MacroNutrients
}

// Weight Widget Types
export interface WeightDataPoint {
  day: string
  weight: number
}

export interface WeightData {
  current: number
  unit: "lbs" | "kg"
  trend: number
  trendDirection: "up" | "down" | "stable"
  goal: number
  history: WeightDataPoint[]
}

// Tasks Widget Types
export interface TasksData {
  completed: number
  total: number
  remaining: number
  percentage: number
}

// Media Widget Types
export interface MediaBreakdown {
  platform: string
  hours: number
}

export interface MediaData {
  totalHours: number
  breakdown: MediaBreakdown[]
}

// Books Widget Types
export interface BookProgress {
  title: string
  currentPage: number
  totalPages: number
  percentage: number
}

export interface BooksData {
  readingTime: number
  unit: "minutes" | "hours"
  currentBook: BookProgress
}

// Gaming Widget Types
export interface GamingData {
  playTime: number
  unit: "hours" | "minutes"
  lastPlayedGame: string
}

// TV Widget Types
export interface TVShowProgress {
  title: string
  season?: number
  episode?: number
}

export interface TVData {
  episodesWatched: number
  currentShow: TVShowProgress
}

// Mood Widget Types
export interface MoodEntry {
  timestamp: Date
  rating: number // 1-10 scale
  notes?: string
}

export interface MoodData {
  currentRating: number // Most recent rating
  dailyAverage: number
  dailyMin: number
  dailyMax: number
  entriesCount: number
  history: MoodEntry[]
}

// Social Widget Types
export type ContactMethod = "call" | "text" | "video" | "in-person"

export interface SocialInteraction {
  id: number
  timestamp: Date
  person: string
  method: ContactMethod
  duration?: number // in minutes
  notes?: string
}

export interface SocialData {
  todayInteractions: number
  weekInteractions: number
  lastInteraction?: SocialInteraction
  breakdown: {
    method: ContactMethod
    count: number
  }[]
}

// ============================================
// ASSETS TYPES
// ============================================

export type AssetCategory = "games" | "books" | "tv" | "apps" | "other" | "all"

export type AssetType = "svg" | "jpg" | "png" | "gif" | "webp" | "other"

export interface Asset {
  id: number
  name: string
  category: AssetCategory
  url: string
  type: AssetType
  size?: number
  uploadedAt?: Date
  updatedAt?: Date
}

export interface AssetCategoryOption {
  id: AssetCategory
  name: string
}

// ============================================
// COMMON/SHARED TYPES
// ============================================

export interface ProgressMetric {
  current: number
  goal: number
  percentage: number
  unit: string
}

export interface TrendData {
  value: number
  direction: "up" | "down" | "stable"
  changeAmount: number
  changePercentage: number
}

export interface TimeRange {
  start: Date
  end: Date
  label: string
}

// ============================================
// USER ACTIVITY TYPES
// ============================================

export interface ActivityLog {
  id: number
  type: "exercise" | "diet" | "weight" | "task" | "media" | "book" | "game" | "tv" | "mood" | "social"
  timestamp: Date
  data:
    | ExerciseData
    | DietData
    | WeightData
    | TasksData
    | MediaData
    | BooksData
    | GamingData
    | TVData
    | MoodData
    | SocialData
  notes?: string
}

export interface DailyStats {
  date: Date
  activitiesLogged: number
  totalTimeTracked: number
  goalsCompleted: number
  goalsTotal: number
}

// ============================================
// CALENDAR TYPES
// ============================================

export interface CalendarEvent {
  id: number
  date: Date
  activityType: ActivityLog["type"]
  title: string
  completed: boolean
  data?: ActivityLog["data"]
}

// ============================================
// CUSTOM TRACKER TYPES
// ============================================

export type CustomTrackerFieldType =
  | "number" // Simple number input
  | "scale" // Scale from min to max (e.g., 1-10)
  | "checkbox" // Boolean toggle
  | "text" // Short text input
  | "textarea" // Long text input
  | "time" // Time duration (minutes, hours)
  | "counter" // Simple increment/decrement counter
  | "rating" // Star rating (1-5 stars)
  | "select" // Dropdown with predefined options

export interface CustomTrackerFieldConfig {
  id: string
  label: string
  type: CustomTrackerFieldType
  required?: boolean
  // For scale type
  min?: number
  max?: number
  step?: number
  // For select type
  options?: string[]
  // For time type
  timeUnit?: "minutes" | "hours" | "days"
  // Default value
  defaultValue?: string | number | boolean
  // Help text
  helpText?: string
}

export interface CustomTrackerConfig {
  id: string
  name: string
  description?: string
  icon?: string // Lucide icon name
  color?: string // Hex color for widget accent
  fields: CustomTrackerFieldConfig[]
  // Display settings
  showOnDashboard: boolean
  widgetSize?: "small" | "medium" | "large" // Grid span size
  // Goal settings
  hasGoal?: boolean
  goalField?: string // Which field to track for goals
  goalValue?: number
  goalType?: "daily" | "weekly" | "monthly"
  // Visualization
  chartType?: "line" | "bar" | "area" | "none"
  // Created date
  createdAt: Date
  updatedAt: Date
}

export interface CustomTrackerEntry {
  id: number
  trackerId: string
  timestamp: Date
  data: Record<string, string | number | boolean> // Field values
  notes?: string
}

// ============================================
// DASHBOARD LAYOUT TYPES
// ============================================

export type WidgetId =
  | "exercise"
  | "diet"
  | "weight"
  | "tasks"
  | "mood"
  | "social"
  | "media"
  | "tv"
  | "books"
  | "gaming"
  | string // For custom tracker IDs

export interface WidgetGridSize {
  width: number // Grid columns
  height: number // Grid rows
}

export interface WidgetPosition {
  x: number // Grid column position (0-indexed)
  y: number // Grid row position (0-indexed)
}

export interface DashboardWidget {
  id: WidgetId
  type: "builtin" | "custom"
  size: WidgetGridSize
  position: WidgetPosition
  visible: boolean
}

export interface DashboardLayout {
  widgets: DashboardWidget[]
  gridColumns: number // Total columns in grid
  updatedAt: Date
}

export type TrackingPageSection = {
  id: string
  size: WidgetGridSize
  position: WidgetPosition
  visible: boolean
}

export type TrackingPageLayout = {
  sections: TrackingPageSection[]
  gridColumns: number
  updatedAt: Date
}

export type TrackingPageLayouts = {
  [pageId: string]: TrackingPageLayout
}
