// ============================================
// Phase 2: StatsService - Local Analytics Engine
// No external AI APIs - Pure local statistics
// ============================================

import type {
  DBItem,
  DBTag,
  ItemStats,
  CorrelationResult,
  TrackerStats,
  QuickEntrySuggestion,
  TrackerType,
  DBMoodEntry,
  DBDietEntry,
  DBSocialEntry,
  DBExerciseEntry,
  DBMediaEntry,
} from "@/types/database"

// ============================================
// Mock Data Store (Replace with actual DB queries in Electron)
// ============================================

interface DataStore {
  items: DBItem[]
  tags: DBTag[]
  moodEntries: DBMoodEntry[]
  dietEntries: (DBDietEntry & { items: { item_id: number; quantity: number }[] })[]
  socialEntries: DBSocialEntry[]
  exerciseEntries: DBExerciseEntry[]
  mediaEntries: DBMediaEntry[]
  favorites: { item_id: number; tracker_type: TrackerType }[]
  recentEntries: { item_id: number; tracker_type: TrackerType; use_count: number; last_used: string }[]
}

// This would be populated from SQLite in Electron
const mockDataStore: DataStore = {
  items: [
    { id: 1, name: "Tacos", category: "food", created_at: "2024-01-01", updated_at: "2024-01-01" },
    { id: 2, name: "Eggs", category: "food", created_at: "2024-01-01", updated_at: "2024-01-01" },
    { id: 3, name: "Chicken Breast", category: "food", created_at: "2024-01-01", updated_at: "2024-01-01" },
    { id: 4, name: "Running", category: "exercise", created_at: "2024-01-01", updated_at: "2024-01-01" },
    { id: 5, name: "Yoga", category: "exercise", created_at: "2024-01-01", updated_at: "2024-01-01" },
    { id: 6, name: "Mom", category: "person", created_at: "2024-01-01", updated_at: "2024-01-01" },
    { id: 7, name: "Elden Ring", category: "media", created_at: "2024-01-01", updated_at: "2024-01-01" },
    { id: 8, name: "Oatmeal", category: "food", created_at: "2024-01-01", updated_at: "2024-01-01" },
    { id: 9, name: "Salmon", category: "food", created_at: "2024-01-01", updated_at: "2024-01-01" },
    { id: 10, name: "Weight Training", category: "exercise", created_at: "2024-01-01", updated_at: "2024-01-01" },
  ],
  tags: [
    { id: 1, name: "Fast Food", color: "#EF4444", created_at: "2024-01-01" },
    { id: 2, name: "Mexican", color: "#F59E0B", created_at: "2024-01-01" },
    { id: 3, name: "Protein", color: "#10B981", created_at: "2024-01-01" },
    { id: 4, name: "Cardio", color: "#3B82F6", created_at: "2024-01-01" },
    { id: 5, name: "Healthy", color: "#22C55E", created_at: "2024-01-01" },
  ],
  moodEntries: [],
  dietEntries: [],
  socialEntries: [],
  exerciseEntries: [],
  mediaEntries: [],
  favorites: [
    { item_id: 2, tracker_type: "diet" },
    { item_id: 3, tracker_type: "diet" },
    { item_id: 4, tracker_type: "exercise" },
  ],
  recentEntries: [
    { item_id: 2, tracker_type: "diet", use_count: 89, last_used: "2024-12-12" },
    { item_id: 3, tracker_type: "diet", use_count: 67, last_used: "2024-12-11" },
    { item_id: 8, tracker_type: "diet", use_count: 45, last_used: "2024-12-12" },
    { item_id: 4, tracker_type: "exercise", use_count: 34, last_used: "2024-12-10" },
    { item_id: 5, tracker_type: "exercise", use_count: 28, last_used: "2024-12-09" },
  ],
}

// Generate mock entries for realistic stats
function generateMockEntries() {
  const now = new Date()

  // Generate mood entries
  for (let i = 0; i < 127; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - Math.floor(i / 2))
    date.setHours(Math.floor(Math.random() * 12) + 8)

    mockDataStore.moodEntries.push({
      id: i + 1,
      timestamp: date.toISOString(),
      rating: Math.floor(Math.random() * 4) + 5, // 5-8 range
      energy_level: Math.floor(Math.random() * 4) + 5,
      anxiety_level: Math.floor(Math.random() * 4) + 2,
    })
  }

  // Generate diet entries
  for (let i = 0; i < 312; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - Math.floor(i / 3))

    mockDataStore.dietEntries.push({
      id: i + 1,
      timestamp: date.toISOString(),
      meal_type: ["breakfast", "lunch", "dinner", "snack"][Math.floor(Math.random() * 4)] as any,
      items: [{ item_id: Math.floor(Math.random() * 3) + 1, quantity: Math.random() * 2 + 0.5 }],
    })
  }

  // Generate exercise entries
  for (let i = 0; i < 89; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - Math.floor(i / 1.5))

    mockDataStore.exerciseEntries.push({
      id: i + 1,
      timestamp: date.toISOString(),
      activity_type: ["cardio", "strength", "flexibility"][Math.floor(Math.random() * 3)] as any,
      item_id: Math.random() > 0.5 ? 4 : 5,
      duration_minutes: Math.floor(Math.random() * 60) + 20,
      intensity: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as any,
    })
  }

  // Generate social entries
  for (let i = 0; i < 56; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - Math.floor(i / 2))

    mockDataStore.socialEntries.push({
      id: i + 1,
      timestamp: date.toISOString(),
      person_id: 6,
      method: ["call", "text", "video", "in-person"][Math.floor(Math.random() * 4)] as any,
      duration_minutes: Math.floor(Math.random() * 60) + 5,
      quality_rating: Math.floor(Math.random() * 2) + 4,
    })
  }
}

generateMockEntries()

// ============================================
// Statistics Calculation Functions
// ============================================

/**
 * Calculate standard deviation of an array of numbers
 */
function calculateStdDeviation(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(avgSquaredDiff)
}

/**
 * Calculate Pearson correlation coefficient between two arrays
 */
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0

  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0)
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  if (denominator === 0) return 0
  return numerator / denominator
}

/**
 * Calculate streak (consecutive days with entries)
 */
function calculateStreak(timestamps: string[]): { current: number; max: number } {
  if (timestamps.length === 0) return { current: 0, max: 0 }

  const dates = timestamps
    .map((t) => new Date(t).toDateString())
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  let currentStreak = 0
  let maxStreak = 0
  let tempStreak = 1

  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  // Check current streak
  if (dates[0] === today || dates[0] === yesterday) {
    currentStreak = 1
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1])
      const currDate = new Date(dates[i])
      const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000)

      if (diffDays === 1) {
        currentStreak++
      } else {
        break
      }
    }
  }

  // Calculate max streak
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1])
    const currDate = new Date(dates[i])
    const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000)

    if (diffDays === 1) {
      tempStreak++
    } else {
      maxStreak = Math.max(maxStreak, tempStreak)
      tempStreak = 1
    }
  }
  maxStreak = Math.max(maxStreak, tempStreak, currentStreak)

  return { current: currentStreak, max: maxStreak }
}

/**
 * Determine trend direction based on recent vs older data
 */
function calculateTrend(values: number[], timestamps: string[]): "up" | "down" | "stable" {
  if (values.length < 10) return "stable"

  const sorted = values
    .map((v, i) => ({ value: v, time: new Date(timestamps[i]).getTime() }))
    .sort((a, b) => b.time - a.time)

  const recentHalf = sorted.slice(0, Math.floor(sorted.length / 2))
  const olderHalf = sorted.slice(Math.floor(sorted.length / 2))

  const recentAvg = recentHalf.reduce((a, b) => a + b.value, 0) / recentHalf.length
  const olderAvg = olderHalf.reduce((a, b) => a + b.value, 0) / olderHalf.length

  const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100

  if (percentChange > 5) return "up"
  if (percentChange < -5) return "down"
  return "stable"
}

// ============================================
// StatsService Class
// ============================================

export class StatsService {
  /**
   * Get the last time a specific item was used
   * Example: "When did I last eat Tacos?"
   */
  static getLastTimeItemUsed(itemName: string): { date: string | null; daysAgo: number | null } {
    const item = mockDataStore.items.find((i) => i.name.toLowerCase() === itemName.toLowerCase())

    if (!item) return { date: null, daysAgo: null }

    // Search across all entry types
    let lastUsed: Date | null = null

    // Check diet entries
    mockDataStore.dietEntries.forEach((entry) => {
      if (entry.items.some((i) => i.item_id === item.id)) {
        const entryDate = new Date(entry.timestamp)
        if (!lastUsed || entryDate > lastUsed) {
          lastUsed = entryDate
        }
      }
    })

    // Check exercise entries
    mockDataStore.exerciseEntries.forEach((entry) => {
      if (entry.item_id === item.id) {
        const entryDate = new Date(entry.timestamp)
        if (!lastUsed || entryDate > lastUsed) {
          lastUsed = entryDate
        }
      }
    })

    // Check media entries
    mockDataStore.mediaEntries.forEach((entry) => {
      if (entry.item_id === item.id) {
        const entryDate = new Date(entry.timestamp)
        if (!lastUsed || entryDate > lastUsed) {
          lastUsed = entryDate
        }
      }
    })

    if (!lastUsed) return { date: null, daysAgo: null }

    const daysAgo = Math.floor((Date.now() - lastUsed.getTime()) / 86400000)
    return {
      date: lastUsed.toISOString(),
      daysAgo,
    }
  }

  /**
   * Get total count of an item in a time range
   * Example: "Total eggs eaten in 2024"
   */
  static getTotalItemCount(
    itemName: string,
    startDate?: string,
    endDate?: string,
  ): { count: number; totalQuantity: number } {
    const item = mockDataStore.items.find((i) => i.name.toLowerCase() === itemName.toLowerCase())

    if (!item) return { count: 0, totalQuantity: 0 }

    const start = startDate ? new Date(startDate) : new Date(0)
    const end = endDate ? new Date(endDate) : new Date()

    let count = 0
    let totalQuantity = 0

    // Count in diet entries
    mockDataStore.dietEntries.forEach((entry) => {
      const entryDate = new Date(entry.timestamp)
      if (entryDate >= start && entryDate <= end) {
        entry.items.forEach((i) => {
          if (i.item_id === item.id) {
            count++
            totalQuantity += i.quantity
          }
        })
      }
    })

    // Count in exercise entries
    mockDataStore.exerciseEntries.forEach((entry) => {
      const entryDate = new Date(entry.timestamp)
      if (entryDate >= start && entryDate <= end && entry.item_id === item.id) {
        count++
      }
    })

    // Count in media entries
    mockDataStore.mediaEntries.forEach((entry) => {
      const entryDate = new Date(entry.timestamp)
      if (entryDate >= start && entryDate <= end && entry.item_id === item.id) {
        count++
      }
    })

    return { count, totalQuantity }
  }

  /**
   * Search items by name with usage statistics
   */
  static searchItems(query: string, category?: string): ItemStats[] {
    const normalizedQuery = query.toLowerCase()

    return mockDataStore.items
      .filter((item) => {
        const matchesQuery = item.name.toLowerCase().includes(normalizedQuery)
        const matchesCategory = !category || category === "all" || item.category === category
        return matchesQuery && matchesCategory
      })
      .map((item) => {
        const { count, totalQuantity } = this.getTotalItemCount(item.name)
        const lastUsed = this.getLastTimeItemUsed(item.name)

        // Get tags for item (mock - would be from DB join)
        const tags: DBTag[] = []

        return {
          item,
          totalCount: count,
          lastUsed: lastUsed.date,
          firstUsed: null, // Would come from DB
          averagePerDay: count / 30, // Simplified
          tags,
        }
      })
      .sort((a, b) => b.totalCount - a.totalCount)
  }

  /**
   * Get statistics for a specific tracker
   */
  static getTrackerStats(trackerType: TrackerType): TrackerStats {
    let entries: { timestamp: string; value?: number }[] = []
    let values: number[] = []

    switch (trackerType) {
      case "mood":
        entries = mockDataStore.moodEntries.map((e) => ({
          timestamp: e.timestamp,
          value: e.rating,
        }))
        values = mockDataStore.moodEntries.map((e) => e.rating)
        break
      case "diet":
        entries = mockDataStore.dietEntries.map((e) => ({ timestamp: e.timestamp }))
        break
      case "exercise":
        entries = mockDataStore.exerciseEntries.map((e) => ({
          timestamp: e.timestamp,
          value: e.duration_minutes,
        }))
        values = mockDataStore.exerciseEntries.filter((e) => e.duration_minutes).map((e) => e.duration_minutes!)
        break
      case "social":
        entries = mockDataStore.socialEntries.map((e) => ({ timestamp: e.timestamp }))
        break
      case "media":
        entries = mockDataStore.mediaEntries.map((e) => ({ timestamp: e.timestamp }))
        break
    }

    const timestamps = entries.map((e) => e.timestamp)
    const { current, max } = calculateStreak(timestamps)

    // Calculate days in range
    const uniqueDays = new Set(timestamps.map((t) => new Date(t).toDateString())).size
    const avgPerDay = entries.length / Math.max(uniqueDays, 1)

    return {
      totalEntries: entries.length,
      averagePerDay: Math.round(avgPerDay * 10) / 10,
      stdDeviation: values.length > 0 ? Math.round(calculateStdDeviation(values) * 10) / 10 : 0,
      trend: values.length > 0 ? calculateTrend(values, timestamps) : "stable",
      currentStreak: current,
      maxStreak: max,
    }
  }

  /**
   * Calculate correlations between mood and other factors
   */
  static getCorrelations(): CorrelationResult[] {
    const results: CorrelationResult[] = []

    // Mood vs Exercise correlation
    const moodByDate = new Map<string, number[]>()
    mockDataStore.moodEntries.forEach((entry) => {
      const date = new Date(entry.timestamp).toDateString()
      if (!moodByDate.has(date)) moodByDate.set(date, [])
      moodByDate.get(date)!.push(entry.rating)
    })

    const exerciseByDate = new Map<string, number>()
    mockDataStore.exerciseEntries.forEach((entry) => {
      const date = new Date(entry.timestamp).toDateString()
      exerciseByDate.set(date, (exerciseByDate.get(date) || 0) + (entry.duration_minutes || 0))
    })

    const correlationData: { mood: number; exercise: number }[] = []
    moodByDate.forEach((moods, date) => {
      const avgMood = moods.reduce((a, b) => a + b, 0) / moods.length
      const exerciseMinutes = exerciseByDate.get(date) || 0
      correlationData.push({ mood: avgMood, exercise: exerciseMinutes })
    })

    if (correlationData.length >= 10) {
      const moodValues = correlationData.map((d) => d.mood)
      const exerciseValues = correlationData.map((d) => d.exercise)
      const correlation = calculateCorrelation(moodValues, exerciseValues)

      results.push({
        factor_a: "Exercise",
        factor_b: "Mood",
        correlation_value: Math.round(correlation * 100) / 100,
        sample_size: correlationData.length,
        insight:
          correlation > 0.3
            ? `Days with more exercise show ${Math.round(correlation * 30)}% higher mood scores`
            : "No strong correlation detected between exercise and mood",
      })
    }

    // Mood vs Social interactions
    const socialByDate = new Map<string, number>()
    mockDataStore.socialEntries.forEach((entry) => {
      const date = new Date(entry.timestamp).toDateString()
      socialByDate.set(date, (socialByDate.get(date) || 0) + 1)
    })

    const socialCorrelationData: { mood: number; social: number }[] = []
    moodByDate.forEach((moods, date) => {
      const avgMood = moods.reduce((a, b) => a + b, 0) / moods.length
      const socialCount = socialByDate.get(date) || 0
      socialCorrelationData.push({ mood: avgMood, social: socialCount })
    })

    if (socialCorrelationData.length >= 10) {
      const moodValues = socialCorrelationData.map((d) => d.mood)
      const socialValues = socialCorrelationData.map((d) => d.social)
      const correlation = calculateCorrelation(moodValues, socialValues)

      results.push({
        factor_a: "Social Interactions",
        factor_b: "Mood",
        correlation_value: Math.round(correlation * 100) / 100,
        sample_size: socialCorrelationData.length,
        insight:
          correlation > 0.2
            ? "More social contact associated with moderate mood improvement"
            : "Social interactions show weak correlation with mood",
      })
    }

    return results
  }

  /**
   * Get quick entry suggestions (Recent, Frequent, Favorites)
   */
  static getQuickEntrySuggestions(trackerType: TrackerType): QuickEntrySuggestion[] {
    const suggestions: QuickEntrySuggestion[] = []

    // Get favorites
    mockDataStore.favorites
      .filter((f) => f.tracker_type === trackerType)
      .forEach((fav) => {
        const item = mockDataStore.items.find((i) => i.id === fav.item_id)
        if (item) {
          suggestions.push({
            item,
            type: "favorite",
            useCount: 0,
          })
        }
      })

    // Get recent/frequent
    mockDataStore.recentEntries
      .filter((r) => r.tracker_type === trackerType)
      .sort((a, b) => b.use_count - a.use_count)
      .slice(0, 10)
      .forEach((recent) => {
        const item = mockDataStore.items.find((i) => i.id === recent.item_id)
        if (item && !suggestions.find((s) => s.item.id === item.id)) {
          suggestions.push({
            item,
            type: recent.use_count > 20 ? "frequent" : "recent",
            useCount: recent.use_count,
            lastUsed: recent.last_used,
          })
        }
      })

    return suggestions
  }

  /**
   * Record item usage (updates recent entries)
   */
  static recordItemUsage(itemId: number, trackerType: TrackerType): void {
    const existing = mockDataStore.recentEntries.find((r) => r.item_id === itemId && r.tracker_type === trackerType)

    if (existing) {
      existing.use_count++
      existing.last_used = new Date().toISOString()
    } else {
      mockDataStore.recentEntries.push({
        item_id: itemId,
        tracker_type: trackerType,
        use_count: 1,
        last_used: new Date().toISOString(),
      })
    }
  }

  /**
   * Toggle item as favorite
   */
  static toggleFavorite(itemId: number, trackerType: TrackerType): boolean {
    const existingIndex = mockDataStore.favorites.findIndex(
      (f) => f.item_id === itemId && f.tracker_type === trackerType,
    )

    if (existingIndex >= 0) {
      mockDataStore.favorites.splice(existingIndex, 1)
      return false
    } else {
      mockDataStore.favorites.push({ item_id: itemId, tracker_type: trackerType })
      return true
    }
  }

  /**
   * Check if item is favorited
   */
  static isFavorite(itemId: number, trackerType: TrackerType): boolean {
    return mockDataStore.favorites.some((f) => f.item_id === itemId && f.tracker_type === trackerType)
  }
}
