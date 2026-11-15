/**
 * Pure streak calculation helpers (no DB). Shared across main services and tests.
 */

export function computeCurrentStreak(dates: string[], todayOverride?: string): number {
  if (dates.length === 0) return 0
  const now = new Date()
  const today = todayOverride ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const sorted = [...new Set(dates)].sort((a, b) => (a < b ? 1 : -1))
  let streak = 0
  let expected = today
  for (const d of sorted) {
    if (d > today) continue
    if (d > expected) break
    if (d === expected) {
      streak++
      const next = new Date(expected)
      next.setUTCDate(next.getUTCDate() - 1)
      expected = next.toISOString().slice(0, 10)
    } else {
      break
    }
  }
  return streak
}

export function computeBestStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  const sorted = [...new Set(dates)].sort()
  let best = 1
  let current = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    prev.setUTCDate(prev.getUTCDate() + 1)
    const want = prev.toISOString().slice(0, 10)
    if (sorted[i] === want) {
      current++
      best = Math.max(best, current)
    } else {
      current = 1
    }
  }
  return best
}
