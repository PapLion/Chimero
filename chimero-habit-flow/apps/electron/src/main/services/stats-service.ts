/**
 * Stats service: streak calculation and dashboard/calendar aggregates.
 * Runs in Main process; avoids heavy work in Renderer.
 */
import { getDb } from '@packages/db/database';
import { entries, trackers } from '@packages/db';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';

export interface DashboardStats {
  currentStreak: number;
  bestStreak: number;
  totalActivities: number;
  totalEntriesMonth: number;
}

/** Active day = any day with at least one entry (by dateStr). */
async function getDistinctDatesDesc(limit = 365): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ dateStr: entries.dateStr })
    .from(entries)
    .groupBy(entries.dateStr)
    .orderBy(desc(entries.dateStr))
    .limit(limit);
  return (rows as { dateStr: string }[]).map((r) => r.dateStr);
}

/** Compute current streak: consecutive days up to today/yesterday from most recent. */
function computeCurrentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...dates].sort((a, b) => (b < a ? 1 : -1));
  let streak = 0;
  let expected = today;
  for (const d of sorted) {
    if (d > expected) break;
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

/** Best streak = longest run of consecutive dates in the last 365 days. */
function computeBestStreak(dates: string[]): number {
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

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = getDb();

  const actRows = await db.select({ count: sql<number>`count(*)` }).from(trackers).where(eq(trackers.archived, false));
  const totalActivities = Number((actRows as unknown as { count: number }[])[0]?.count ?? 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const monthRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(entries)
    .where(and(gte(entries.dateStr, monthStart), lte(entries.dateStr, monthEnd)));
  const totalEntriesMonth = Number((monthRows as unknown as { count: number }[])[0]?.count ?? 0);

  const dates = await getDistinctDatesDesc(365);
  const currentStreak = computeCurrentStreak(dates);
  const bestStreak = computeBestStreak(dates);

  return {
    currentStreak,
    bestStreak,
    totalActivities,
    totalEntriesMonth,
  };
}

export interface CalendarDayEntry {
  id: number;
  trackerId: number;
  value: number | null;
  note: string | null;
  timestamp: number;
  dateStr: string;
}

export interface CalendarMonthData {
  year: number;
  month: number;
  entriesByDate: Record<string, CalendarDayEntry[]>;
  activeDays: number[];
}

/** Returns entries for the given month, grouped by dateStr, and list of active day numbers. */
export async function getCalendarMonth(year: number, month: number): Promise<CalendarMonthData> {
  const db = getDb();
  const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
  const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const rows = await db
    .select()
    .from(entries)
    .where(and(gte(entries.dateStr, monthStart), lte(entries.dateStr, monthEnd)))
    .orderBy(entries.timestamp);

  const entriesByDate: Record<string, CalendarDayEntry[]> = {};
  const activeDaysSet = new Set<number>();

  for (const r of rows as unknown as Array<{ id: number; trackerId: number; value: number | null; note: string | null; timestamp: number; dateStr: string }>) {
    const dateStr = r.dateStr;
    const day = parseInt(dateStr.slice(8, 10), 10);
    if (Number.isNaN(day) || day < 1 || day > 31) continue;
    activeDaysSet.add(day);
    if (!entriesByDate[dateStr]) entriesByDate[dateStr] = [];
    entriesByDate[dateStr].push({
      id: r.id,
      trackerId: r.trackerId,
      value: r.value,
      note: r.note,
      timestamp: r.timestamp,
      dateStr,
    });
  }

  return {
    year,
    month,
    entriesByDate,
    activeDays: Array.from(activeDaysSet).sort((a, b) => a - b),
  };
}
