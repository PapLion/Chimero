// ============================================
// STATISTICS SERVICE
// Local-first analytics engine
// ============================================

import type {
  DbItem,
  DbDietEntry,
  DbMoodEntry,
  DbSocialEntry,
  DbExerciseEntry,
  ItemCategory,
  CorrelationResult,
} from "./types"

// Helper: Calculate standard deviation
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2))
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
}

// Helper: Calculate average
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

// Helper: Get date range
function getDateRange(days: number): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { start, end }
}

export class StatsService {
  private items: DbItem[] = []
  private dietEntries: DbDietEntry[] = []
  private moodEntries: DbMoodEntry[] = []
  private socialEntries: DbSocialEntry[] = []
  private exerciseEntries: DbExerciseEntry[] = []

  constructor(data: {
    items?: DbItem[]
    dietEntries?: DbDietEntry[]
    moodEntries?: DbMoodEntry[]
    socialEntries?: DbSocialEntry[]
    exerciseEntries?: DbExerciseEntry[]
  }) {
    this.items = data.items || []
    this.dietEntries = data.dietEntries || []
    this.moodEntries = data.moodEntries || []
    this.socialEntries = data.socialEntries || []
    this.exerciseEntries = data.exerciseEntries || []
  }

  // ============================================
  // RETROACTIVE QUERIES
  // ============================================

  /**
   * Get the last time an item was used
   * Example: "When did I last eat Tacos?"
   */
  getLastTimeItemUsed(itemName: string, category?: ItemCategory): Date | null {
    const item = this.items.find(
      (i) => i.name.toLowerCase() === itemName.toLowerCase() && (!category || i.category === category),
    )

    if (!item || !item.last_used_at) return null
    return new Date(item.last_used_at)
  }

  /**
   * Get total count of an item
   * Example: "How many eggs have I eaten in 2024?"
   */
  getTotalItemCount(
    itemName: string,
    category: ItemCategory,
    startDate?: Date,
    endDate?: Date,
  ): { count: number; totalQuantity: number } {
    const item = this.items.find((i) => i.name.toLowerCase() === itemName.toLowerCase() && i.category === category)

    if (!item) return { count: 0, totalQuantity: 0 }

    let entries: { quantity?: number; logged_at: string }[] = []

    if (category === "food") {
      entries = this.dietEntries.filter((e) => e.item_id === item.id)
    } else if (category === "exercise") {
      entries = this.exerciseEntries.filter((e) => e.item_id === item.id)
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      entries = entries.filter((e) => {
        const entryDate = new Date(e.logged_at)
        if (startDate && entryDate < startDate) return false
        if (endDate && entryDate > endDate) return false
        return true
      })
    }

    return {
      count: entries.length,
      totalQuantity: entries.reduce((sum, e) => sum + (e.quantity || 1), 0),
    }
  }

  /**
   * Get items by tag
   * Example: "Show all Fast Food items I've eaten"
   */
  getItemsByTag(tagName: string): DbItem[] {
    return this.items.filter((item) => item.tags?.some((t) => t.name.toLowerCase() === tagName.toLowerCase()))
  }

  /**
   * Get streak information
   */
  getCurrentStreak(trackerType: string): number {
    // This would query the streaks table
    // For now, calculate from entries
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let entries: { logged_at: string }[] = []
    switch (trackerType) {
      case "exercise":
        entries = this.exerciseEntries
        break
      case "mood":
        entries = this.moodEntries
        break
      case "diet":
        entries = this.dietEntries
        break
    }

    // Sort by date descending
    const sortedDates = [...new Set(entries.map((e) => new Date(e.logged_at).toDateString()))].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    )

    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = new Date(today)
      expectedDate.setDate(expectedDate.getDate() - i)

      if (sortedDates[i] === expectedDate.toDateString()) {
        streak++
      } else {
        break
      }
    }

    return streak
  }

  /**
   * Get max streak ever achieved
   */
  getMaxStreak(trackerType: string): number {
    let entries: { logged_at: string }[] = []
    switch (trackerType) {
      case "exercise":
        entries = this.exerciseEntries
        break
      case "mood":
        entries = this.moodEntries
        break
      case "diet":
        entries = this.dietEntries
        break
    }

    const dates = [...new Set(entries.map((e) => new Date(e.logged_at).toDateString()))].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    )

    let maxStreak = 0
    let currentStreak = 1

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1])
      const currDate = new Date(dates[i])
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        currentStreak++
      } else {
        maxStreak = Math.max(maxStreak, currentStreak)
        currentStreak = 1
      }
    }

    return Math.max(maxStreak, currentStreak)
  }

  // ============================================
  // CORRELATIONS
  // ============================================

  /**
   * Find correlation between mood and other factors
   * Example: "Does alcohol affect my mood?"
   */
  getMoodCorrelation(
    factorType: "diet" | "exercise" | "social" | "sleep",
    factorName?: string,
    windowHours = 24,
  ): CorrelationResult | null {
    const results: { moodScore: number; factorValue: number }[] = []

    for (const moodEntry of this.moodEntries) {
      const moodTime = new Date(moodEntry.logged_at).getTime()
      const windowStart = moodTime - windowHours * 60 * 60 * 1000

      let factorValue = 0

      switch (factorType) {
        case "diet":
          const dietInWindow = this.dietEntries.filter((e) => {
            const entryTime = new Date(e.logged_at).getTime()
            return entryTime >= windowStart && entryTime <= moodTime
          })
          if (factorName) {
            factorValue = dietInWindow.filter((e) =>
              e.item?.name.toLowerCase().includes(factorName.toLowerCase()),
            ).length
          } else {
            factorValue = dietInWindow.reduce((sum, e) => sum + (e.calories || 0), 0)
          }
          break

        case "exercise":
          const exerciseInWindow = this.exerciseEntries.filter((e) => {
            const entryTime = new Date(e.logged_at).getTime()
            return entryTime >= windowStart && entryTime <= moodTime
          })
          factorValue = exerciseInWindow.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
          break

        case "social":
          const socialInWindow = this.socialEntries.filter((e) => {
            const entryTime = new Date(e.logged_at).getTime()
            return entryTime >= windowStart && entryTime <= moodTime
          })
          factorValue = socialInWindow.length
          break

        case "sleep":
          factorValue = moodEntry.sleep_quality || 0
          break
      }

      if (factorValue > 0) {
        results.push({ moodScore: moodEntry.rating, factorValue })
      }
    }

    if (results.length < 3) return null

    // Calculate Pearson correlation coefficient
    const n = results.length
    const sumX = results.reduce((s, r) => s + r.factorValue, 0)
    const sumY = results.reduce((s, r) => s + r.moodScore, 0)
    const sumXY = results.reduce((s, r) => s + r.factorValue * r.moodScore, 0)
    const sumX2 = results.reduce((s, r) => s + r.factorValue * r.factorValue, 0)
    const sumY2 = results.reduce((s, r) => s + r.moodScore * r.moodScore, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    const correlation = denominator === 0 ? 0 : numerator / denominator

    return {
      correlation_type: "mood_factor",
      factor_a: "mood_rating",
      factor_b: `${factorType}${factorName ? `_${factorName}` : ""}`,
      correlation_value: Math.round(correlation * 100) / 100,
      sample_size: n,
      time_window: `${windowHours}h`,
    }
  }

  /**
   * Get low mood days with potential causes
   */
  getLowMoodAnalysis(threshold = 4): {
    date: string
    moodScore: number
    potentialCauses: string[]
  }[] {
    const lowMoodDays = this.moodEntries.filter((e) => e.rating < threshold)

    return lowMoodDays.map((mood) => {
      const moodDate = new Date(mood.logged_at)
      const dayStart = new Date(moodDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(moodDate)
      dayEnd.setHours(23, 59, 59, 999)

      const causes: string[] = []

      // Check sleep
      if (mood.sleep_quality && mood.sleep_quality < 5) {
        causes.push(`Poor sleep quality (${mood.sleep_quality}/10)`)
      }

      // Check exercise
      const exerciseToday = this.exerciseEntries.filter((e) => {
        const date = new Date(e.logged_at)
        return date >= dayStart && date <= dayEnd
      })
      if (exerciseToday.length === 0) {
        causes.push("No exercise logged")
      }

      // Check social
      const socialToday = this.socialEntries.filter((e) => {
        const date = new Date(e.logged_at)
        return date >= dayStart && date <= dayEnd
      })
      if (socialToday.length === 0) {
        causes.push("No social interactions")
      }

      // Check stress
      if (mood.stress_level && mood.stress_level > 7) {
        causes.push(`High stress level (${mood.stress_level}/10)`)
      }

      return {
        date: moodDate.toISOString().split("T")[0],
        moodScore: mood.rating,
        potentialCauses: causes,
      }
    })
  }

  // ============================================
  // GLOBAL STATISTICS
  // ============================================

  /**
   * Get comprehensive stats for a tracker type
   */
  getTrackerStats(
    trackerType: string,
    days = 30,
  ): {
    totalEntries: number
    averagePerDay: number
    stdDeviation: number
    trend: "up" | "down" | "stable"
    currentStreak: number
    maxStreak: number
  } {
    const { start, end } = getDateRange(days)
    let entries: { logged_at: string; value?: number }[] = []

    switch (trackerType) {
      case "mood":
        entries = this.moodEntries
          .filter((e) => new Date(e.logged_at) >= start)
          .map((e) => ({ logged_at: e.logged_at, value: e.rating }))
        break
      case "exercise":
        entries = this.exerciseEntries
          .filter((e) => new Date(e.logged_at) >= start)
          .map((e) => ({ logged_at: e.logged_at, value: e.duration_minutes }))
        break
      case "diet":
        entries = this.dietEntries
          .filter((e) => new Date(e.logged_at) >= start)
          .map((e) => ({ logged_at: e.logged_at, value: e.calories }))
        break
    }

    // Group by day
    const dailyCounts: Record<string, number[]> = {}
    entries.forEach((e) => {
      const day = new Date(e.logged_at).toDateString()
      if (!dailyCounts[day]) dailyCounts[day] = []
      dailyCounts[day].push(e.value || 1)
    })

    const dailyValues = Object.values(dailyCounts).map((arr) => arr.reduce((a, b) => a + b, 0))

    // Calculate trend (compare first half to second half)
    const midpoint = Math.floor(dailyValues.length / 2)
    const firstHalf = dailyValues.slice(0, midpoint)
    const secondHalf = dailyValues.slice(midpoint)
    const firstAvg = calculateAverage(firstHalf)
    const secondAvg = calculateAverage(secondHalf)

    let trend: "up" | "down" | "stable" = "stable"
    if (secondAvg > firstAvg * 1.1) trend = "up"
    else if (secondAvg < firstAvg * 0.9) trend = "down"

    return {
      totalEntries: entries.length,
      averagePerDay: calculateAverage(dailyValues),
      stdDeviation: calculateStdDev(dailyValues),
      trend,
      currentStreak: this.getCurrentStreak(trackerType),
      maxStreak: this.getMaxStreak(trackerType),
    }
  }

  /**
   * Get most frequent items
   */
  getMostFrequentItems(category: ItemCategory, limit = 10): DbItem[] {
    return this.items
      .filter((i) => i.category === category)
      .sort((a, b) => b.use_count - a.use_count)
      .slice(0, limit)
  }

  /**
   * Get recent items (for quick entry)
   */
  getRecentItems(category: ItemCategory, limit = 5): DbItem[] {
    return this.items
      .filter((i) => i.category === category && i.last_used_at)
      .sort((a, b) => new Date(b.last_used_at!).getTime() - new Date(a.last_used_at!).getTime())
      .slice(0, limit)
  }

  /**
   * Get favorite items
   */
  getFavoriteItems(category?: ItemCategory): DbItem[] {
    return this.items.filter((i) => i.is_favorite && (!category || i.category === category))
  }
}
