/**
 * IPC handlers for Chimero - Bridge between Renderer and SQLite.
 * Maps DB snake_case to app camelCase for consistent API.
 */
import { ipcMain, app, dialog } from 'electron';
import { copyFileSync, existsSync } from 'fs';
import { getDb } from '@packages/db/database';
import { trackers, entries, settings, assets, reminders, contacts, contactInteractions } from '@packages/db';
import type { Tracker, Entry, TrackerInsert, EntryInsert, Asset, Reminder, ReminderInsert, Contact, ContactInteraction, ContactInsert, ContactUpdate, ContactInteractionInsert } from '@packages/db';
import { eq, desc, and, sql, asc } from 'drizzle-orm';
import { saveFile, deleteFile, getAssetAbsolutePath } from './services/asset-manager';
import { getDashboardStats, getCalendarMonth, calculateImpact } from './services/stats-service';
import { searchExercises, getAllExercises, getExerciseDbStatus } from './services/exercise-db-service';

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
    assetId: (row.assetId ?? row.asset_id) as number | null,
  };
}

function toTimestampMs(val: unknown): number | null {
  if (val == null) return null;
  if (val instanceof Date) return val.getTime();
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function mapReminder(row: Record<string, unknown>): Reminder {
  const daysRaw = row.days;
  let days: number[] | null = null;
  if (Array.isArray(daysRaw)) days = daysRaw;
  else if (typeof daysRaw === 'string') try { days = JSON.parse(daysRaw); } catch { /* ignore */ }
  const completedRaw = row.completedAt ?? row.completed_at;
  const lastTriggeredRaw = row.lastTriggered ?? row.last_triggered;
  return {
    id: row.id as number,
    trackerId: (row.trackerId ?? row.tracker_id) as number | null,
    title: row.title as string,
    description: (row.description as string) ?? null,
    time: (row.time as string) ?? '',
    date: (row.date as string) ?? null,
    days,
    enabled: !!(row.enabled as number | boolean),
    lastTriggered: toTimestampMs(lastTriggeredRaw),
    completedAt: toTimestampMs(completedRaw),
    createdAt: (row.createdAt ?? row.created_at) as number | null,
  };
}

export type AssetWithUrls = Asset & { assetUrl: string; thumbnailUrl: string };

function mapAsset(row: Record<string, unknown>): AssetWithUrls {
  const path = (row.path as string) ?? '';
  const thumbnailPath = (row.thumbnailPath ?? row.thumbnail_path) as string | null;
  const assetUrl = `chimero-asset:///${path.replace(/^\/+/, '')}`;
  const thumbnailUrl = thumbnailPath
    ? `chimero-asset:///${thumbnailPath.replace(/^\/+/, '')}`
    : assetUrl;
  return {
    id: row.id as number,
    filename: (row.filename as string) ?? '',
    originalName: (row.originalName ?? row.original_name) as string | null,
    path,
    type: (row.type as string) ?? 'image',
    mimeType: (row.mimeType ?? row.mime_type) as string | null,
    size: (row.size as number) ?? null,
    thumbnailPath,
    createdAt: (row.createdAt ?? row.created_at) as number | null,
    assetUrl,
    thumbnailUrl,
  };
}

function mapContact(row: Record<string, unknown>): Contact {
  const traitsRaw = row.traits;
  let traits: string[] | null = null;
  if (traitsRaw && typeof traitsRaw === 'string') {
    try { traits = JSON.parse(traitsRaw); } catch { /* ignore */ }
  } else if (Array.isArray(traitsRaw)) {
    traits = traitsRaw as string[];
  }
  return {
    id: row.id as number,
    name: (row.name as string) ?? '',
    avatarAssetId: (row.avatarAssetId ?? row.avatar_asset_id) as number | null,
    birthday: (row.birthday as string) ?? null,
    dateMet: (row.dateMet ?? row.date_met) as string | null,
    dateLastTalked: (row.dateLastTalked ?? row.date_last_talked) as string | null,
    traits,
    notes: (row.notes as string) ?? null,
    createdAt: (row.createdAt ?? row.created_at) as number | null,
  };
}

function mapContactInteraction(row: Record<string, unknown>): ContactInteraction {
  return {
    id: row.id as number,
    contactId: (row.contactId ?? row.contact_id) as number,
    entryId: (row.entryId ?? row.entry_id) as number | null,
    mood: (row.mood as "positive" | "negative" | "neutral") ?? 'neutral',
    timestamp: row.timestamp as number,
    notes: (row.notes as string) ?? null,
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
    { name: 'Books', type: 'text' as const, icon: 'book', color: '#8b5cf6', order: 6, config: {} },
    { name: 'Gaming', type: 'text' as const, icon: 'gamepad-2', color: '#10b981', order: 7, config: {} },
    { name: 'Media/TV', type: 'text' as const, icon: 'tv', color: '#0ea5e9', order: 8, config: {} },
    { name: 'Diet / Calories', type: 'numeric' as const, icon: 'salad', color: '#22c55e', order: 9, config: { unit: 'kcal' } },
  ];

  // --- getTrackers ---
  ipcMain.handle('get-trackers', async () => {
    try {
      let rows = await db()
        .select()
        .from(trackers)
        .where(eq(trackers.archived, false))
        .orderBy(asc(trackers.order));

      // Ensure all default trackers exist safely without duplicating
      const existingTrackerNames = new Set(rows.map((row: Record<string, unknown>) => row.name as string));
      const missingDefaults = defaultTrackers.filter(t => !existingTrackerNames.has(t.name));

      if (missingDefaults.length > 0) {
        // Find highest order to append safely
        let maxOrder = -1;
        if (rows.length > 0) {
          maxOrder = Math.max(...rows.map((r: Record<string, unknown>) => (r.order as number) ?? -1));
        }

        const toInsert = missingDefaults.map((t, index) => ({
          name: t.name,
          type: t.type,
          icon: t.icon,
          color: t.color,
          order: maxOrder !== -1 ? maxOrder + 1 + index : t.order,
          config: JSON.stringify(t.config),
          isCustom: false,
          archived: false,
        }));

        await db().insert(trackers).values(toInsert);

        // Re-fetch after safe insertion
        rows = await db()
          .select()
          .from(trackers)
          .where(eq(trackers.archived, false))
          .orderBy(asc(trackers.order));
      }

      return rows.map((r) => mapTracker(r as Record<string, unknown>));
    } catch (e) {
      console.error('get-trackers error:', e);
      return [];
    }
  });

  // --- createTracker ---
  ipcMain.handle('create-tracker', async (_, data: TrackerInsert & { type?: string }) => {
    try {
      // Basic input validation
      if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
        throw new Error('Invalid tracker name');
      }

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
      return inserted ? mapTracker(inserted as Record<string, unknown>) : null;
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
      return rows.map((r) => mapEntry(r as Record<string, unknown>));
    } catch (e) {
      console.error('get-entries error:', e);
      return [];
    }
  });

  // --- addEntry ---
  ipcMain.handle('add-entry', async (_, data: Omit<EntryInsert, 'dateStr'>) => {
    try {
      const d = new Date(data.timestamp);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; // YYYY-MM-DD local
      const [inserted] = await db()
        .insert(entries)
        .values({
          trackerId: data.trackerId,
          value: data.value ?? null,
          note: data.note ?? null,
          metadata: JSON.stringify(data.metadata ?? {}),
          timestamp: data.timestamp,
          dateStr,
          assetId: (data as EntryInsert).assetId ?? null,
        })
        .returning();
      return inserted ? mapEntry(inserted as Record<string, unknown>) : null;
    } catch (e) {
      console.error('add-entry error:', e);
      return null;
    }
  });

  // --- updateEntry ---
  ipcMain.handle('update-entry', async (_, id: number, updates: { value?: number | null; note?: string | null; timestamp?: number; assetId?: number | null }) => {
    try {
      const set: Record<string, unknown> = {};
      if (updates.value !== undefined) set.value = updates.value;
      if (updates.note !== undefined) set.note = updates.note;
      if (updates.assetId !== undefined) set.assetId = updates.assetId;
      if (updates.timestamp !== undefined) {
        set.timestamp = updates.timestamp;
        const d = new Date(updates.timestamp);
        set.dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      if (Object.keys(set).length === 0) return null;
      await db().update(entries).set(set).where(eq(entries.id, id));
      const [updated] = await db().select().from(entries).where(eq(entries.id, id));
      return updated ? mapEntry(updated as Record<string, unknown>) : null;
    } catch (e) {
      console.error('update-entry error:', e);
      return null;
    }
  });

  // --- deleteEntry ---
  ipcMain.handle('delete-entry', async (_, id: number) => {
    try {
      await db().delete(entries).where(eq(entries.id, id));
      return true;
    } catch (e) {
      console.error('delete-entry error:', e);
      return false;
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
        .map((r) => mapTracker(r as Record<string, unknown>));
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
      return rows.map((r) => mapTracker(r as Record<string, unknown>));
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
      const current = !!row.isFavorite;
      await db()
        .update(trackers)
        .set({ isFavorite: !current })
        .where(eq(trackers.id, trackerId));
      const [updated] = await db().select().from(trackers).where(eq(trackers.id, trackerId));
      return updated ? mapTracker(updated as Record<string, unknown>) : null;
    } catch (e) {
      console.error('toggle-tracker-favorite error:', e);
      return null;
    }
  });

  // --- getDashboardStats --- (Header: streak, activities, entries this month)
  ipcMain.handle('get-dashboard-stats', async () => {
    try {
      return await getDashboardStats();
    } catch (e) {
      console.error('get-dashboard-stats error:', e);
      return { currentStreak: 0, bestStreak: 0, totalActivities: 0, totalEntriesMonth: 0 };
    }
  });

  // --- getCalendarMonth --- (Calendar page: entries by date, active days)
  ipcMain.handle('get-calendar-month', async (_, year: number, month: number) => {
    try {
      return await getCalendarMonth(year, month);
    } catch (e) {
      console.error('get-calendar-month error:', e);
      return { year: 0, month: 0, entriesByDate: {}, activeDays: [] };
    }
  });

  // --- getReminders ---
  ipcMain.handle('get-reminders', async () => {
    try {
      const rows = await db().select().from(reminders).orderBy(reminders.id);
      return rows.map((r) => mapReminder(r as Record<string, unknown>));
    } catch (e) {
      console.error('get-reminders error:', e);
      return [];
    }
  });

  // --- upsertReminder --- (create or update by id)
  ipcMain.handle('upsert-reminder', async (_, data: ReminderInsert & { id?: number }) => {
    try {
      const id = data.id;
      const payload = {
        title: data.title,
        description: data.description ?? null,
        trackerId: data.trackerId ?? null,
        time: data.time,
        date: data.date ?? null,
        days: data.days ?? null,
        enabled: data.enabled ?? true,
      };
      if (id != null && id > 0) {
        await db().update(reminders).set(payload).where(eq(reminders.id, id));
        const [updated] = await db().select().from(reminders).where(eq(reminders.id, id));
        return updated ? mapReminder(updated as Record<string, unknown>) : null;
      }
      const [inserted] = await db().insert(reminders).values(payload).returning();
      return inserted ? mapReminder(inserted as Record<string, unknown>) : null;
    } catch (e) {
      console.error('upsert-reminder error:', e);
      return null;
    }
  });

  // --- deleteReminder ---
  ipcMain.handle('delete-reminder', async (_, id: number) => {
    try {
      await db().delete(reminders).where(eq(reminders.id, id));
      return true;
    } catch (e) {
      console.error('delete-reminder error:', e);
      return false;
    }
  });

  // --- toggleReminder ---
  ipcMain.handle('toggle-reminder', async (_, id: number, enabled: boolean) => {
    try {
      await db().update(reminders).set({ enabled }).where(eq(reminders.id, id));
      const [updated] = await db().select().from(reminders).where(eq(reminders.id, id));
      return updated ? mapReminder(updated as Record<string, unknown>) : null;
    } catch (e) {
      console.error('toggle-reminder error:', e);
      return null;
    }
  });

  // --- completeReminder --- (mark as done: set completedAt so it moves to Completed section, does not disappear)
  ipcMain.handle('complete-reminder', async (_, id: number) => {
    try {
      const completedAt = new Date(); // Drizzle timestamp mode expects Date, not number
      await db().update(reminders).set({ completedAt }).where(eq(reminders.id, id));
      const [updated] = await db().select().from(reminders).where(eq(reminders.id, id));
      return updated ? mapReminder(updated as Record<string, unknown>) : null;
    } catch (e) {
      console.error('complete-reminder error:', e);
      return null;
    }
  });

  // --- uncompleteReminder --- (move back to Pending: clear completedAt)
  ipcMain.handle('uncomplete-reminder', async (_, id: number) => {
    try {
      await db().update(reminders).set({ completedAt: null }).where(eq(reminders.id, id));
      const [updated] = await db().select().from(reminders).where(eq(reminders.id, id));
      return updated ? mapReminder(updated as Record<string, unknown>) : null;
    } catch (e) {
      console.error('uncomplete-reminder error:', e);
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
      return rows.map((r) => mapEntry(r as Record<string, unknown>));
    } catch (e) {
      console.error('get-task-entries error:', e);
      return [];
    }
  });

  // --- openFileDialog --- (for upload: Main gets path, then upload-asset(path))
  ipcMain.handle('open-file-dialog', async (_, options?: { filters?: { name: string; extensions: string[] }[] }) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: options?.filters ?? [{ name: 'Images & Video', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'mov'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return { path: null as string | null };
    return { path: result.filePaths[0] };
  });

  // --- uploadAsset --- copy file to userData/assets, insert DB, return asset
  ipcMain.handle('upload-asset', async (_, sourcePath: string) => {
    try {
      // Validate source path
      if (!sourcePath || typeof sourcePath !== 'string') {
        throw new Error('Invalid source path');
      }

      if (!existsSync(sourcePath)) {
        throw new Error('Source file does not exist');
      }

      const userDataPath = app.getPath('userData');
      const saved = await saveFile(sourcePath, userDataPath);
      const [inserted] = await db()
        .insert(assets)
        .values({
          filename: saved.filename,
          originalName: saved.originalName,
          path: saved.path,
          type: saved.type,
          size: saved.size,
          thumbnailPath: saved.thumbnailPath,
        })
        .returning();
      if (!inserted) return null;
      return mapAsset(inserted as Record<string, unknown>);
    } catch (e) {
      console.error('upload-asset error:', e);
      return null;
    }
  });

  // --- getAssets --- (for Media Grid / AssetsPage)
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
      return rows.map((r) => mapAsset(r as Record<string, unknown>));
    } catch (e) {
      console.error('get-assets error:', e);
      return [];
    }
  });

  // --- updateAsset --- persist originalName (display name)
  ipcMain.handle('update-asset', async (_, id: number, updates: { originalName?: string | null }) => {
    try {
      if (updates.originalName !== undefined) {
        await db().update(assets).set({ originalName: updates.originalName || null }).where(eq(assets.id, id));
      }
      const [updated] = await db().select().from(assets).where(eq(assets.id, id));
      return updated ? mapAsset(updated as Record<string, unknown>) : null;
    } catch (e) {
      console.error('update-asset error:', e);
      return null;
    }
  });

  // --- deleteAsset --- remove main file, thumbnail (if separate), and DB record
  ipcMain.handle('delete-asset', async (_, id: number) => {
    try {
      const rows = await db().select().from(assets).where(eq(assets.id, id));
      const row = rows[0];
      if (!row) return false;
      const userDataPath = app.getPath('userData');
      const mainPath = row.path as string;
      const thumbnailPath = (row.thumbnailPath) as string | null | undefined;
      deleteFile(userDataPath, mainPath);
      if (thumbnailPath && thumbnailPath !== mainPath) {
        deleteFile(userDataPath, thumbnailPath);
      }
      await db().delete(assets).where(eq(assets.id, id));
      return true;
    } catch (e) {
      console.error('delete-asset error:', e);
      return false;
    }
  });

  // --- downloadAsset --- save file to user-chosen path (avoids opening chimero-asset:// in system)
  ipcMain.handle('download-asset', async (_, id: number, suggestedName: string) => {
    try {
      const rows = await db().select().from(assets).where(eq(assets.id, id));
      const row = rows[0];
      if (!row) return { ok: false, error: 'not_found' };
      const userDataPath = app.getPath('userData');
      const sourcePath = getAssetAbsolutePath(userDataPath, row.path as string);
      if (!existsSync(sourcePath)) return { ok: false, error: 'file_not_found' };
      const result = await dialog.showSaveDialog({
        defaultPath: suggestedName,
        title: 'Save asset',
      });
      if (result.canceled || !result.filePath) return { ok: false, canceled: true };
      copyFileSync(sourcePath, result.filePath);
      return { ok: true, path: result.filePath };
    } catch (e) {
      console.error('download-asset error:', e);
      return { ok: false, error: String(e) };
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

  // --- reorderTrackers ---
  ipcMain.handle('reorder-trackers', async (_, ids: number[]) => {
    try {
      const database = db();
      await database.transaction(async (tx) => {
        for (let i = 0; i < ids.length; i++) {
          await tx.update(trackers).set({ order: i }).where(eq(trackers.id, ids[i]));
        }
      });
      return true;
    } catch (e) {
      console.error('reorder-trackers error:', e);
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
      return updated ? mapTracker(updated as Record<string, unknown>) : null;
    } catch (e) {
      console.error('update-tracker error:', e);
      return null;
    }
  });

  // --- calculateImpact --- (Universal Correlations Engine)
  ipcMain.handle('calculate-impact', async (_, sourceTrackerId: number, targetTrackerId: number, offsetDays: number) => {
    try {
      return await calculateImpact(sourceTrackerId, targetTrackerId, offsetDays);
    } catch (e) {
      console.error('calculate-impact error:', e);
      return {
        sourceTrackerId,
        targetTrackerId,
        offsetDays,
        impact: 0,
        confidence: 0,
        baselineAvg: 0,
        impactedAvg: 0,
        triggeredDays: 0,
        baselineDays: 0
      };
    }
  });

  // --- get-contacts --- (all contacts ordered by name)
  ipcMain.handle('get-contacts', async () => {
    try {
      const rows = await db()
        .select()
        .from(contacts)
        .orderBy(asc(contacts.name));
      return rows.map((r) => mapContact(r as Record<string, unknown>));
    } catch (e) {
      console.error('get-contacts error:', e);
      return [];
    }
  });

  // --- get-contact --- (single contact by id)
  ipcMain.handle('get-contact', async (_, id: number) => {
    try {
      const rows = await db().select().from(contacts).where(eq(contacts.id, id));
      return rows[0] ? mapContact(rows[0] as Record<string, unknown>) : null;
    } catch (e) {
      console.error('get-contact error:', e);
      return null;
    }
  });

  // --- create-contact ---
  ipcMain.handle('create-contact', async (_, data: ContactInsert) => {
    try {
      if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
        throw new Error('Invalid contact name');
      }
      const [inserted] = await db()
        .insert(contacts)
        .values({
          name: data.name,
          avatarAssetId: data.avatarAssetId ?? null,
          birthday: data.birthday ?? null,
          dateMet: data.dateMet ?? null,
          notes: data.notes ?? null,
        })
        .returning();
      return inserted ? mapContact(inserted as Record<string, unknown>) : null;
    } catch (e) {
      console.error('create-contact error:', e);
      return null;
    }
  });

  // --- update-contact ---
  ipcMain.handle('update-contact', async (_, id: number, updates: ContactUpdate) => {
    try {
      const set: Record<string, unknown> = {};
      if (updates.name !== undefined) set.name = updates.name;
      if (updates.avatarAssetId !== undefined) set.avatarAssetId = updates.avatarAssetId;
      if (updates.birthday !== undefined) set.birthday = updates.birthday;
      if (updates.dateMet !== undefined) set.dateMet = updates.dateMet;
      if (updates.dateLastTalked !== undefined) set.dateLastTalked = updates.dateLastTalked;
      if (updates.traits !== undefined) set.traits = updates.traits ? JSON.stringify(updates.traits) : null;
      if (updates.notes !== undefined) set.notes = updates.notes;
      if (Object.keys(set).length === 0) return null;
      await db().update(contacts).set(set).where(eq(contacts.id, id));
      const [updated] = await db().select().from(contacts).where(eq(contacts.id, id));
      return updated ? mapContact(updated as Record<string, unknown>) : null;
    } catch (e) {
      console.error('update-contact error:', e);
      return null;
    }
  });

  // --- delete-contact --- (deletes contact and its interactions)
  ipcMain.handle('delete-contact', async (_, id: number) => {
    try {
      // contactInteractions will be cascade deleted due to FK constraint
      await db().delete(contacts).where(eq(contacts.id, id));
      return { success: true };
    } catch (e) {
      console.error('delete-contact error:', e);
      return { success: false };
    }
  });

  // --- create-contact-interaction ---
  ipcMain.handle('create-contact-interaction', async (_, data: ContactInteractionInsert) => {
    try {
      if (!data.contactId || !data.mood) {
        throw new Error('Invalid interaction data');
      }
      const timestamp = Date.now();
      const [inserted] = await db()
        .insert(contactInteractions)
        .values({
          contactId: data.contactId,
          entryId: data.entryId ?? null,
          mood: data.mood,
          timestamp,
          notes: data.notes ?? null,
        })
        .returning();

      // Update dateLastTalked on the contact
      const now = new Date();
      const dateLastTalked = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      await db().update(contacts).set({ dateLastTalked }).where(eq(contacts.id, data.contactId));

      return inserted ? mapContactInteraction(inserted as Record<string, unknown>) : null;
    } catch (e) {
      console.error('create-contact-interaction error:', e);
      return null;
    }
  });

  // --- get-contact-interactions --- (all interactions for a contact, ordered by timestamp DESC)
  ipcMain.handle('get-contact-interactions', async (_, contactId: number) => {
    try {
      const rows = await db()
        .select()
        .from(contactInteractions)
        .where(eq(contactInteractions.contactId, contactId))
        .orderBy(desc(contactInteractions.timestamp));
      return rows.map((r) => mapContactInteraction(r as Record<string, unknown>));
    } catch (e) {
      console.error('get-contact-interactions error:', e);
      return [];
    }
  });

  // --- search-exercises --- (search exercises by query)
  ipcMain.handle('search-exercises', async (_, options: { query: string; limit?: number }) => {
    try {
      const { query, limit } = options;
      const effectiveQuery = query?.trim() || '';
      if (!effectiveQuery) {
        return getAllExercises(limit ?? 20);
      }
      return searchExercises(effectiveQuery, limit ?? 20);
    } catch (e) {
      console.error('search-exercises error:', e);
      return [];
    }
  });

  // --- get-all-exercises --- (get all exercises without search)
  ipcMain.handle('get-all-exercises', async (_, options?: { limit?: number }) => {
    try {
      return getAllExercises(options?.limit ?? 50);
    } catch (e) {
      console.error('get-all-exercises error:', e);
      return [];
    }
  });

  // --- get-exercise-db-status --- (get DB status: idle/loading/ready/error)
  ipcMain.handle('get-exercise-db-status', async () => {
    try {
      return getExerciseDbStatus();
    } catch (e) {
      console.error('get-exercise-db-status error:', e);
      return { status: 'error', count: 0, error: 'Unknown error' };
    }
  });
}
