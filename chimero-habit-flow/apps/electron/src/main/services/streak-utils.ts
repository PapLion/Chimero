/**
 * Pure streak calculation helpers (no DB). Used by stats-service and by unit tests.
 */

/** Compute current streak: consecutive days up to today from most recent. */
export function computeCurrentStreak(dates: string[], todayOverride?: string): number {
  if (dates.length === 0) return 0;
  const today = todayOverride ?? new Date().toISOString().slice(0, 10);
  const sorted = [...dates].sort((a, b) => (a < b ? 1 : -1));
  let streak = 0;
  let expected = today;
  for (const d of sorted) {
    if (d > today) continue
    if (d > expected) break
    if (d === expected) {
      streak++;
      const next = new Date(expected);
      next.setDate(next.getDate() - 1);
      expected = next.toISOString().slice(0, 10);
    } else {
      break;
    }
  }
  return streak;
}

/** Best streak = longest run of consecutive dates in the list. */
export function computeBestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort();
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    prev.setDate(prev.getDate() + 1);
    const want = prev.toISOString().slice(0, 10);
    if (sorted[i] === want) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
}
