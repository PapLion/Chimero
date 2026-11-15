import type Database from 'better-sqlite3'
import type { AppPreferences, DashboardLayoutV2, DashboardWidget, Tracker } from '@contracts/contracts'
import { DEFAULT_PREFERENCES, sanitizePreferences } from '@contracts/contracts'
import { addItem, buildDefaultLayout, sanitizeLayout } from '@contracts/domain/grid'
import { getTrackerIdentity } from '@contracts/features/tracking'

type Raw = Database.Database

function parseJson(value: unknown): unknown {
  if (value == null) return null
  if (typeof value !== 'string') return value
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'string' ? JSON.parse(parsed) : parsed
  } catch {
    return null
  }
}

function settingsRow(raw: Raw): { preferences: string | null; weight_unit: string | null; measure_unit: string | null; theme: string | null; dashboard_layout: string | null } | undefined {
  return raw.prepare('SELECT preferences, weight_unit, measure_unit, theme, dashboard_layout FROM settings WHERE id = 1').get() as never
}

function ensureRow(raw: Raw): void {
  raw.prepare('INSERT OR IGNORE INTO settings (id) VALUES (1)').run()
}

/**
 * Preferences live in settings.preferences (JSON). Units are mirrored in the
 * legacy weight_unit / measure_unit columns, which older builds wrote.
 */
export function getPreferences(raw: Raw): AppPreferences {
  const row = settingsRow(raw)
  const stored = parseJson(row?.preferences)
  if (stored) return sanitizePreferences(stored)

  // First run of this version: carry over what the previous build knew.
  const base: AppPreferences = { ...DEFAULT_PREFERENCES }
  if (row) {
    if (row.weight_unit === 'kg' || row.weight_unit === 'lb') base.weightUnit = row.weight_unit
    if (row.measure_unit === 'cm' || row.measure_unit === 'in') base.measureUnit = row.measure_unit
    if (row.theme === 'light' || row.theme === 'dark') base.theme = row.theme
  }
  const latest = raw
    .prepare('SELECT w.weight_unit AS unit, w.waist_unit AS waistUnit FROM entry_weight w JOIN entries e ON e.id = w.entry_id ORDER BY e.timestamp DESC LIMIT 1')
    .get() as { unit: string | null; waistUnit: string | null } | undefined
  if (latest?.unit === 'kg' || latest?.unit === 'lb') {
    base.weightUnit = latest.unit
    base.measureUnit = latest.waistUnit === 'in' || latest.waistUnit === 'cm' ? latest.waistUnit : latest.unit === 'kg' ? 'cm' : 'in'
  }
  return base
}

export function updatePreferences(raw: Raw, patch: unknown): AppPreferences {
  const next = sanitizePreferences(patch, getPreferences(raw))
  ensureRow(raw)
  raw
    .prepare('UPDATE settings SET preferences = ?, weight_unit = ?, measure_unit = ?, theme = ? WHERE id = 1')
    .run(JSON.stringify(next), next.weightUnit, next.measureUnit, next.theme === 'light' ? 'light' : 'dark')
  return next
}

const LEGACY_SIZES: Record<string, [number, number]> = {
  small: [3, 2],
  medium: [4, 3],
  large: [6, 4],
  wide: [6, 3],
  tall: [3, 5],
}

/** Layouts saved by 1.x were a flat ordered list; keep the user's order and rough sizes. */
function upgradeLegacyLayout(stored: unknown[], validTrackerIds: Set<number>): DashboardLayoutV2 | null {
  const ordered = stored
    .filter((item): item is { trackerId: number; position?: number; size?: string } => !!item && typeof item === 'object' && Number.isInteger((item as { trackerId?: unknown }).trackerId))
    .filter((item) => validTrackerIds.has(item.trackerId))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  if (ordered.length === 0) return null
  let widgets: DashboardWidget[] = []
  const seen = new Set<number>()
  for (const item of ordered) {
    if (seen.has(item.trackerId)) continue
    seen.add(item.trackerId)
    const [w, h] = LEGACY_SIZES[String(item.size ?? '').toLowerCase()] ?? [3, 3]
    widgets = addItem(widgets, { id: `tracker-${item.trackerId}`, type: 'tracker', trackerId: item.trackerId, w, h })
  }
  widgets = addItem(widgets, { id: 'heatmap', type: 'heatmap', w: 8, h: 3 })
  widgets = addItem(widgets, { id: 'day-log', type: 'day-log', w: 4, h: 5 })
  return { version: 2, widgets }
}

function activeTrackers(raw: Raw): Array<{ id: number; identity: string }> {
  const rows = raw.prepare('SELECT id, name, icon, config FROM trackers WHERE archived = 0 OR archived IS NULL ORDER BY "order", id').all() as Array<{
    id: number
    name: string
    icon: string | null
    config: string | null
  }>
  return rows.map((row) => ({
    id: row.id,
    identity: getTrackerIdentity({ name: row.name, icon: row.icon, config: (parseJson(row.config) ?? {}) as Tracker['config'] }),
  }))
}

export function defaultLayout(raw: Raw): DashboardLayoutV2 {
  return buildDefaultLayout(activeTrackers(raw))
}

/** Stored layout, upgraded/sanitized; widgets pointing at deleted or archived trackers are dropped. */
export function getDashboardLayout(raw: Raw): DashboardLayoutV2 {
  const trackers = activeTrackers(raw)
  const valid = new Set(trackers.map((t) => t.id))
  const stored = parseJson(settingsRow(raw)?.dashboard_layout)
  let layout: DashboardLayoutV2 | null = null
  if (Array.isArray(stored)) layout = upgradeLegacyLayout(stored, valid)
  else layout = sanitizeLayout(stored)
  if (!layout) return buildDefaultLayout(trackers)
  const widgets = layout.widgets.filter((w) => w.type !== 'tracker' || valid.has(w.trackerId as number))
  return widgets.length === layout.widgets.length ? layout : (sanitizeLayout({ version: 2, widgets }) as DashboardLayoutV2)
}

export function saveDashboardLayout(raw: Raw, input: unknown): DashboardLayoutV2 {
  const layout = sanitizeLayout(input)
  if (!layout) throw new Error('Invalid dashboard layout')
  ensureRow(raw)
  raw.prepare('UPDATE settings SET dashboard_layout = ? WHERE id = 1').run(JSON.stringify(layout))
  return layout
}
