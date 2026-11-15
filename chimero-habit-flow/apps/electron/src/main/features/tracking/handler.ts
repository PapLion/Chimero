import { ipcMain } from 'electron'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { entries, trackers } from '@packages/db'
import { getDb as db } from '@packages/db/database'
import type { TrackerConfig, TrackerInsert } from '@contracts/contracts'
import { mapTracker } from '../../shared/mappers'

type SchemaType = 'numeric' | 'range' | 'binary' | 'text' | 'composite'

function normalizeTrackerType(value: string): SchemaType {
  const mapped = ({ counter: 'numeric', rating: 'range', list: 'text' } as Record<string, string>)[value] ?? value
  if (!['numeric', 'range', 'binary', 'text', 'composite'].includes(mapped)) throw new Error('Invalid tracker type')
  return mapped as SchemaType
}

function normalizeTrackerName(value: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) throw new Error('Tracker name must contain 1–120 characters')
  return value.trim()
}

const FIELD_TYPES = ['number', 'text', 'select', 'boolean']

/** Keep only well-formed configuration; custom field keys must be unique slugs. */
export function normalizeTrackerConfig(input: unknown): TrackerConfig {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const config: TrackerConfig = {}
  for (const key of ['min', 'max', 'goal', 'step'] as const) {
    if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) config[key] = raw[key] as number
  }
  for (const key of ['unit', 'identity', 'description'] as const) {
    if (typeof raw[key] === 'string' && raw[key]) config[key] = (raw[key] as string).slice(0, key === 'description' ? 280 : 40)
  }
  if (Array.isArray(raw.options)) config.options = raw.options.filter((o): o is string => typeof o === 'string' && !!o.trim()).map((o) => o.trim().slice(0, 60)).slice(0, 40)
  if (raw.aggregate === 'sum' || raw.aggregate === 'mean' || raw.aggregate === 'last') config.aggregate = raw.aggregate
  if (raw.valueKind === 'measure' || raw.valueKind === 'activity') config.valueKind = raw.valueKind
  if (raw.goalDirection === 'atLeast' || raw.goalDirection === 'atMost') config.goalDirection = raw.goalDirection
  if (Array.isArray(raw.quickValues)) config.quickValues = raw.quickValues.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)).slice(0, 8)
  if (typeof raw.isCustom === 'boolean') config.isCustom = raw.isCustom
  if (Array.isArray(raw.fields)) {
    const seen = new Set<string>()
    config.fields = []
    for (const candidate of raw.fields) {
      if (!candidate || typeof candidate !== 'object') continue
      const field = candidate as Record<string, unknown>
      const label = typeof field.label === 'string' ? field.label.trim().slice(0, 40) : ''
      const key = String(field.key ?? label).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)
      if (!label || !key || seen.has(key) || !FIELD_TYPES.includes(field.type as string)) continue
      seen.add(key)
      config.fields.push({
        key,
        label,
        type: field.type as 'number' | 'text' | 'select' | 'boolean',
        ...(typeof field.unit === 'string' && field.unit ? { unit: field.unit.slice(0, 16) } : {}),
        ...(Array.isArray(field.options) ? { options: field.options.filter((o): o is string => typeof o === 'string' && !!o.trim()).map((o) => o.trim().slice(0, 60)).slice(0, 30) } : {}),
      })
      if (config.fields.length >= 12) break
    }
  }
  return config
}

async function listTrackers(archived: boolean) {
  const rows = await db().select().from(trackers).where(eq(trackers.archived, archived)).orderBy(asc(trackers.order), asc(trackers.id))
  return rows.map((r) => mapTracker(r as Record<string, unknown>))
}

export function registerTrackingHandlers(): void {
  ipcMain.handle('get-trackers', () => listTrackers(false))
  ipcMain.handle('get-archived-trackers', () => listTrackers(true))

  ipcMain.handle('create-tracker', async (_, data: TrackerInsert & { type?: string }) => {
    const [maxRow] = await db().select({ max: sql<number>`coalesce(max(${trackers.order}), -1)` }).from(trackers)
    const [inserted] = await db()
      .insert(trackers)
      .values({
        name: normalizeTrackerName(data.name),
        type: normalizeTrackerType((data.type as string) || 'numeric'),
        icon: data.icon ?? null,
        color: data.color ?? null,
        order: data.order ?? Number(maxRow?.max ?? -1) + 1,
        config: JSON.stringify(normalizeTrackerConfig(data.config)),
        isCustom: true,
        archived: false,
      })
      .returning()
    return inserted ? mapTracker(inserted as Record<string, unknown>) : null
  })

  ipcMain.handle('delete-tracker', async (_, id: number) => {
    const [row] = await db().select().from(trackers).where(eq(trackers.id, id))
    if (!row) return false
    // Built-in trackers are re-created on startup; they can be hidden, not deleted.
    if (!row.isCustom) throw new Error('Built-in trackers can be hidden but not deleted')
    await db().delete(trackers).where(eq(trackers.id, id))
    return true
  })

  ipcMain.handle('get-recent-trackers', async (_, limit = 10) => {
    const rows = await db()
      .select({ trackerId: entries.trackerId, maxTs: sql<number>`max(${entries.timestamp})` })
      .from(entries)
      .groupBy(entries.trackerId)
      .orderBy(desc(sql`max(${entries.timestamp})`))
      .limit(Math.min(limit, 50))
    const active = new Map((await listTrackers(false)).map((t) => [t.id, t]))
    return rows.map((r) => active.get(r.trackerId)).filter(Boolean)
  })

  ipcMain.handle('get-favorite-trackers', async () => {
    const rows = await db().select().from(trackers).where(and(eq(trackers.archived, false), eq(trackers.isFavorite, true))).orderBy(trackers.order)
    return rows.map((r) => mapTracker(r as Record<string, unknown>))
  })

  ipcMain.handle('toggle-tracker-favorite', async (_, trackerId: number) => {
    const [row] = await db().select().from(trackers).where(eq(trackers.id, trackerId))
    if (!row) return null
    await db().update(trackers).set({ isFavorite: !row.isFavorite }).where(eq(trackers.id, trackerId))
    const [updated] = await db().select().from(trackers).where(eq(trackers.id, trackerId))
    return updated ? mapTracker(updated as Record<string, unknown>) : null
  })

  ipcMain.handle('reorder-trackers', async (_, ids: number[]) => {
    db().transaction((tx) => {
      ids.forEach((id, index) => tx.update(trackers).set({ order: index }).where(eq(trackers.id, id)).run())
    })
    return true
  })

  ipcMain.handle('update-tracker', async (
    _,
    id: number,
    updates: { order?: number; isFavorite?: boolean; archived?: boolean; name?: string; icon?: string | null; color?: string | null; type?: string; config?: Record<string, unknown> },
  ) => {
    const set: Record<string, unknown> = {}
    if (updates.order !== undefined) set.order = updates.order
    if (updates.isFavorite !== undefined) set.isFavorite = !!updates.isFavorite
    if (updates.archived !== undefined) set.archived = !!updates.archived
    if (updates.name !== undefined) set.name = normalizeTrackerName(updates.name)
    if (updates.icon !== undefined) set.icon = updates.icon
    if (updates.color !== undefined) set.color = updates.color
    if (updates.config !== undefined) set.config = JSON.stringify(normalizeTrackerConfig(updates.config))
    if (updates.type !== undefined) set.type = normalizeTrackerType(updates.type)
    if (Object.keys(set).length === 0) return null
    await db().update(trackers).set(set).where(eq(trackers.id, id))
    const [updated] = await db().select().from(trackers).where(eq(trackers.id, id))
    return updated ? mapTracker(updated as Record<string, unknown>) : null
  })
}
