/**
 * IPC handlers for Chimero - Bridge between Renderer and SQLite.
 * Maps DB snake_case to app camelCase for consistent API.
 */
import { ipcMain } from 'electron';
import { getDb } from '@packages/db/database';
import { trackers, entries, settings, assets } from '@packages/db';
import type { Tracker, Entry, TrackerInsert, EntryInsert } from '@packages/db';
import { eq, desc, and, sql, asc } from 'drizzle-orm';

function db() {
  return getDb();
}

// --- Mappers: DB schema types -> UI-friendly types (counter, rating, list) ---
function schemaTypeToUI(type: string, config: Record<string, unknown>): string {
  if (type === 'numeric') return 'counter';
  if (type === 'range' && (config?.max === 5 || config?.max === 10)) return 'rating';
  if (type === 'text' || type === 'composite') return 'list';
  return type;
}

function mapTracker(row: Record<string, unknown>): Tracker {
  const config = (row.config as Record<string, unknown>) || {};
  const schemaType = (row.type as string) || 'numeric';
  const isCustomCol = row.isCustom ?? row.is_custom;
  const isFavoriteCol = row.isFavorite ?? row.is_favorite;
  return {
    id: row.id as number,
    name: row.name as string,
    type: schemaTypeToUI(schemaType, config) as Tracker['type'],
    icon: (row.icon as string) ?? null,
    color: (row.color as string) ?? null,
    order: (row.order as number) ?? 0,
    config: config as Tracker['config'],
    archived: !!(row.archived as number | boolean),
    isCustom: isCustomCol !== undefined ? !!(isCustomCol as number | boolean) : !!(config as { isCustom?: boolean }).isCustom,
    isFavorite: isFavoriteCol !== undefined ? !!(isFavoriteCol as number | boolean) : false,
    createdAt: (row.createdAt ?? row.created_at) as number | null,
  };
}

function mapEntry(row: Record<string, unknown>): Entry {
  return {
    id: row.id as number,
    trackerId: (row.trackerId ?? row.tracker_id) as number,
    value: (row.value as number) ?? null,
    note: (row.note as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) || {},
    timestamp: row.timestamp as number,
    dateStr: (row.dateStr ?? row.date_str) as string,
  };
}

export function registerIpcHandlers(): void {
  const defaultTrackers = [
    { name: 'Weight', type: 'numeric' as const, icon: 'scale', color: '#a855f7', order: 0, config: { unit: 'kg', goal: 70 } },
    { name: 'Mood', type: 'range' as const, icon: 'smile', color: '#f59e0b', order: 1, config: { max: 5 } },
    { name: 'Exercise', type: 'numeric' as const, icon: 'dumbbell', color: '#22c55e', order: 2, config: { unit: 'min', goal: 30 } },
    { name: 'Social', type: 'numeric' as const, icon: 'users', color: '#3b82f6', order: 3, config: { unit: 'interactions' } },
    { name: 'Tasks', type: 'text' as const, icon: 'check-square', color: '#ef4444', order: 4, config: {} },
    { name: 'Savings', type: 'numeric' as const, icon: 'wallet', color: '#10b981', order: 5, config: { unit: '$', goal: 10000 } },
  ];

  // --- getTrackers ---
  ipcMain.handle('get-trackers', async () => {
    try {
      let rows = await db()
        .select()
        .from(trackers)
        .where(eq(trackers.archived, false))
        .orderBy(asc(trackers.order));
      if (rows.length === 0) {
        await db().insert(trackers).values(
          defaultTrackers.map((t) => ({
            name: t.name,
            type: t.type,
            icon: t.icon,
            color: t.color,
            order: t.order,
            config: JSON.stringify(t.config),
            isCustom: false,
            archived: false,
          }))
        );
        rows = await db()
          .select()
          .from(trackers)
          .where(eq(trackers.archived, false))
          .orderBy(asc(trackers.order));
      }
      return rows.map((r) => mapTracker(r as unknown as Record<string, unknown>));
    } catch (e) {
      console.error('get-trackers error:', e);
      return [];
    }
  });

  // --- createTracker ---
  ipcMain.handle('create-tracker', async (_, data: TrackerInsert & { type?: string }) => {
    try {
      const uiType = (data.type as string) || 'numeric';
      const schemaType = uiType === 'counter' ? 'numeric' : uiType === 'rating' ? 'range' : uiType === 'list' ? 'text' : uiType;
      const [inserted] = await db()
        .insert(trackers)
        .values({
          name: data.name,
          type: schemaType as 'numeric' | 'range' | 'binary' | 'text' | 'composite',
          icon: data.icon ?? null,
          color: data.color ?? null,
          order: data.order ?? 0,
          config: JSON.stringify(data.config ?? {}),
          isCustom: data.isCustom ?? true,
          archived: false,
        })
        .returning();
      return inserted ? mapTracker(inserted as unknown as Record<string, unknown>) : null;
    } catch (e) {
      console.error('create-tracker error:', e);
      return null;
    }
  });

  // --- deleteTracker ---
  ipcMain.handle('delete-tracker', async (_, id: number) => {
    try {
      await db().delete(trackers).where(eq(trackers.id, id));
      return true;
    } catch (e) {
      console.error('delete-tracker error:', e);
      return false;
    }
  });

  // --- getEntries ---
  ipcMain.handle('get-entries', async (_, options?: { limit?: number; trackerId?: number }) => {
    try {
      const limit = options?.limit ?? 100;
      const base = db().select().from(entries).orderBy(desc(entries.timestamp)).limit(limit);
      const rows = options?.trackerId
        ? await db()
            .select()
            .from(entries)
            .where(eq(entries.trackerId, options.trackerId))
            .orderBy(desc(entries.timestamp))
            .limit(limit)
        : await base;
      return rows.map((r) => mapEntry(r as unknown as Record<string, unknown>));
    } catch (e) {
      console.error('get-entries error:', e);
      return [];
    }
  });

  // --- addEntry ---
  ipcMain.handle('add-entry', async (_, data: Omit<EntryInsert, 'dateStr'>) => {
    try {
      const dateStr = new Date(data.timestamp).toISOString().slice(0, 10); // YYYY-MM-DD
      const [inserted] = await db()
        .insert(entries)
        .values({
          trackerId: data.trackerId,
          value: data.value ?? null,
          note: data.note ?? null,
          metadata: JSON.stringify(data.metadata ?? {}),
          timestamp: data.timestamp,
          dateStr,
        })
        .returning();
      return inserted ? mapEntry(inserted as unknown as Record<string, unknown>) : null;
    } catch (e) {
      console.error('add-entry error:', e);
      return null;
    }
  });

  // --- getRecentTrackers --- (distinct trackerIds from entries, ordered by most recent)
  ipcMain.handle('get-recent-trackers', async (_, limit = 10) => {
    try {
      const rows = await db()
        .select({
          trackerId: entries.trackerId,
          maxTs: sql<number>`max(${entries.timestamp})`,
        })
        .from(entries)
        .groupBy(entries.trackerId)
        .orderBy(desc(sql`max(${entries.timestamp})`))
        .limit(Math.min(limit, 50));
      const ids = rows.map((r) => r.trackerId).filter(Boolean);
      if (ids.length === 0) return [];
      const allTrackers = await db()
        .select()
        .from(trackers)
        .where(eq(trackers.archived, false));
      const byId = new Map(allTrackers.map((t) => [(t as { id: number }).id, t]));
      return ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((r) => mapTracker(r as unknown as Record<string, unknown>));
    } catch (e) {
      console.error('get-recent-trackers error:', e);
      return [];
    }
  });

  // --- getFavoriteTrackers ---
  ipcMain.handle('get-favorite-trackers', async () => {
    try {
      const rows = await db()
        .select()
        .from(trackers)
        .where(and(eq(trackers.archived, false), eq(trackers.isFavorite, true)))
        .orderBy(trackers.order);
      return rows.map((r) => mapTracker(r as unknown as Record<string, unknown>));
    } catch (e) {
      console.error('get-favorite-trackers error:', e);
      return [];
    }
  });

  // --- toggleFavorite ---
  ipcMain.handle('toggle-tracker-favorite', async (_, trackerId: number) => {
    try {
      const rows = await db().select().from(trackers).where(eq(trackers.id, trackerId));
      const row = rows[0];
      if (!row) return null;
      const current = !!(row as { isFavorite?: number }).isFavorite;
      await db()
        .update(trackers)
        .set({ isFavorite: !current })
        .where(eq(trackers.id, trackerId));
      const [updated] = await db().select().from(trackers).where(eq(trackers.id, trackerId));
      return updated ? mapTracker(updated as unknown as Record<string, unknown>) : null;
    } catch (e) {
      console.error('toggle-tracker-favorite error:', e);
      return null;
    }
  });

  // --- getMoodDailyAggregates --- (for Mood Graph widget)
  ipcMain.handle('get-mood-daily-aggregates', async (_, options?: { trackerId?: number; days?: number }) => {
    try {
      const days = options?.days ?? 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      const moodTrackerId = options?.trackerId;

      const baseSelect = db()
        .select({
          dateStr: entries.dateStr,
          avg: sql<number>`avg(${entries.value})`,
          count: sql<number>`count(*)`,
        })
        .from(entries)
        .where(
          moodTrackerId
            ? and(sql`${entries.dateStr} >= ${cutoffStr}`, eq(entries.trackerId, moodTrackerId))
            : sql`${entries.dateStr} >= ${cutoffStr}`
        )
        .groupBy(entries.dateStr)
        .orderBy(entries.dateStr);

      const rows = await baseSelect;
      return rows.map((r) => ({
        date: r.dateStr,
        value: Math.round((Number(r.avg) || 0) * 10) / 10,
        count: Number(r.count) || 0,
      }));
    } catch (e) {
      console.error('get-mood-daily-aggregates error:', e);
      return [];
    }
  });

  // --- getTaskEntries --- (entries for list-type trackers, e.g. Tasks)
  ipcMain.handle('get-task-entries', async (_, trackerId: number, options?: { limit?: number }) => {
    try {
      const limit = options?.limit ?? 100;
      const rows = await db()
        .select()
        .from(entries)
        .where(eq(entries.trackerId, trackerId))
        .orderBy(desc(entries.timestamp))
        .limit(limit);
      return rows.map((r) => mapEntry(r as unknown as Record<string, unknown>));
    } catch (e) {
      console.error('get-task-entries error:', e);
      return [];
    }
  });

  // --- getAssets --- (for Media Grid)
  ipcMain.handle('get-assets', async (_, options?: { limit?: number; offset?: number }) => {
    try {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;
      const rows = await db()
        .select()
        .from(assets)
        .orderBy(desc(assets.createdAt))
        .limit(limit)
        .offset(offset);
      return rows.map((r) => ({
        id: String(r.id),
        filename: r.filename,
        path: r.path,
        mimeType: r.mimeType,
        size: r.size,
        thumbnailPath: r.thumbnailPath,
        createdAt: r.createdAt ?? 0,
      }));
    } catch (e) {
      console.error('get-assets error:', e);
      return [];
    }
  });

  // --- getDashboardLayout ---
  ipcMain.handle('get-dashboard-layout', async () => {
    try {
      const rows = await db().select().from(settings).where(eq(settings.id, 1));
      const row = rows[0];
      const layout = (row as { dashboardLayout?: string } | undefined)?.dashboardLayout;
      if (!layout) return null;
      return typeof layout === 'string' ? JSON.parse(layout) : layout;
    } catch (e) {
      console.error('get-dashboard-layout error:', e);
      return null;
    }
  });

  // --- saveDashboardLayout ---
  ipcMain.handle('save-dashboard-layout', async (_, layout: Array<{ id: string; trackerId: number; position: number; size: string }>) => {
    try {
      const json = JSON.stringify(layout);
      const existing = await db().select().from(settings).where(eq(settings.id, 1));
      if (existing.length > 0) {
        await db().update(settings).set({ dashboardLayout: json }).where(eq(settings.id, 1));
      } else {
        await db().insert(settings).values({ id: 1, dashboardLayout: json });
      }
      return true;
    } catch (e) {
      console.error('save-dashboard-layout error:', e);
      return false;
    }
  });

  // --- updateTracker ---
  ipcMain.handle('update-tracker', async (
    _,
    id: number,
    updates: {
      order?: number;
      isFavorite?: boolean;
      name?: string;
      icon?: string | null;
      color?: string | null;
      type?: string;
      config?: Record<string, unknown>;
    }
  ) => {
    try {
      const set: Record<string, unknown> = {};
      if (updates.order !== undefined) set.order = updates.order;
      if (updates.isFavorite !== undefined) set.isFavorite = updates.isFavorite;
      if (updates.name !== undefined) set.name = updates.name;
      if (updates.icon !== undefined) set.icon = updates.icon;
      if (updates.color !== undefined) set.color = updates.color;
      if (updates.config !== undefined) set.config = JSON.stringify(updates.config);
      if (updates.type !== undefined) {
        const uiType = updates.type;
        const schemaType = uiType === 'counter' ? 'numeric' : uiType === 'rating' ? 'range' : uiType === 'list' ? 'text' : uiType;
        set.type = schemaType;
      }
      if (Object.keys(set).length === 0) return null;
      await db().update(trackers).set(set).where(eq(trackers.id, id));
      const [updated] = await db().select().from(trackers).where(eq(trackers.id, id));
      return updated ? mapTracker(updated as unknown as Record<string, unknown>) : null;
    } catch (e) {
      console.error('update-tracker error:', e);
      return null;
    }
  });
}
