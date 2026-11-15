/**
 * Getting data out of (and back into) Chimero: JSON export of every table, a
 * flat CSV of entries, and SQLite backup / restore.
 */
import Database from 'better-sqlite3'
import { copyFileSync, existsSync, writeFileSync } from 'fs'

type Raw = Database.Database

export const EXPORT_FORMAT = 'chimero-export'
export const EXPORT_VERSION = 1

function userTables(raw: Raw): string[] {
  return (raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name").all() as Array<{ name: string }>).map((r) => r.name)
}

export function exportJson(raw: Raw, filePath: string, appVersion: string): number {
  const tables: Record<string, unknown[]> = {}
  let count = 0
  for (const table of userTables(raw)) {
    tables[table] = raw.prepare(`SELECT * FROM "${table}"`).all()
    count += tables[table].length
  }
  writeFileSync(filePath, JSON.stringify({ format: EXPORT_FORMAT, version: EXPORT_VERSION, appVersion, exportedAt: new Date().toISOString(), tables }, null, 2), 'utf8')
  return count
}

function csvCell(value: unknown): string {
  if (value == null) return ''
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildEntriesCsv(raw: Raw): { csv: string; count: number } {
  const rows = raw
    .prepare(
      `SELECT e.id, e.date_str AS date, e.timestamp, t.name AS tracker, e.value, e.note,
              w.weight_value AS weight, w.weight_unit AS weight_unit, w.waist_value AS waist, w.waist_unit AS waist_unit,
              g.game_title AS game, g.estimated_hours AS hours,
              f.food_name AS food, f.calories, f.meal_type AS meal,
              s.name AS symptom, h.severity,
              ii.item_name AS intake_item, i.dosage, i.unit AS dosage_unit,
              b.title AS book, ba.activity_type AS book_activity,
              ws.session_name AS workout, ws.duration_minutes AS workout_minutes,
              (SELECT group_concat(tg.name, '; ') FROM entries_to_tags et JOIN tags tg ON tg.id = et.tag_id WHERE et.entry_id = e.id) AS tags,
              (SELECT group_concat(c.name, '; ') FROM contact_interactions ci JOIN contacts c ON c.id = ci.contact_id WHERE ci.entry_id = e.id) AS people,
              e.metadata
       FROM entries e
       JOIN trackers t ON t.id = e.tracker_id
       LEFT JOIN entry_weight w ON w.entry_id = e.id
       LEFT JOIN entry_gaming g ON g.entry_id = e.id
       LEFT JOIN entry_food f ON f.entry_id = e.id
       LEFT JOIN entry_health h ON h.entry_id = e.id
       LEFT JOIN symptoms s ON s.id = h.symptom_id
       LEFT JOIN entry_intake i ON i.entry_id = e.id
       LEFT JOIN intake_items ii ON ii.id = i.item_id
       LEFT JOIN book_activities ba ON ba.entry_id = e.id
       LEFT JOIN books b ON b.id = ba.book_id
       LEFT JOIN workout_sessions ws ON ws.entry_id = e.id
       ORDER BY e.timestamp`,
    )
    .all() as Array<Record<string, unknown>>
  const columns = ['id', 'date', 'time', 'tracker', 'value', 'note', 'weight', 'weight_unit', 'waist', 'waist_unit', 'game', 'hours', 'food', 'calories', 'meal', 'symptom', 'severity', 'intake_item', 'dosage', 'dosage_unit', 'book', 'book_activity', 'workout', 'workout_minutes', 'tags', 'people', 'metadata']
  const lines = [columns.join(',')]
  for (const row of rows) {
    const time = new Date(Number(row.timestamp)).toISOString()
    const metadata = row.metadata && row.metadata !== '{}' && row.metadata !== '"{}"' ? row.metadata : ''
    lines.push(columns.map((column) => csvCell(column === 'time' ? time : column === 'metadata' ? metadata : row[column])).join(','))
  }
  return { csv: lines.join('\r\n') + '\r\n', count: rows.length }
}

export function exportCsv(raw: Raw, filePath: string): number {
  const { csv, count } = buildEntriesCsv(raw)
  writeFileSync(filePath, '﻿' + csv, 'utf8')
  return count
}

export async function backupDatabase(raw: Raw, filePath: string): Promise<void> {
  await raw.backup(filePath)
}

/** A restorable file is a healthy SQLite database that contains Chimero's core tables. */
export function inspectBackup(filePath: string): { ok: true; entries: number; trackers: number } | { ok: false; error: string } {
  if (!existsSync(filePath)) return { ok: false, error: 'File not found' }
  let candidate: Raw | null = null
  try {
    candidate = new Database(filePath, { readonly: true, fileMustExist: true })
    const check = candidate.pragma('integrity_check', { simple: true })
    if (check !== 'ok') return { ok: false, error: 'The file failed the SQLite integrity check' }
    const tables = new Set((candidate.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name))
    for (const required of ['trackers', 'entries', 'settings', '__drizzle_migrations']) {
      if (!tables.has(required)) return { ok: false, error: 'This is not a Chimero database' }
    }
    const entries = (candidate.prepare('SELECT COUNT(*) AS n FROM entries').get() as { n: number }).n
    const trackers = (candidate.prepare('SELECT COUNT(*) AS n FROM trackers').get() as { n: number }).n
    return { ok: true, entries, trackers }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'The file could not be read as a database' }
  } finally {
    candidate?.close()
  }
}

/**
 * Stage a restore: the chosen file is copied next to the live database and
 * swapped in on next launch (see applyPendingRestore), after the current
 * database has been set aside as a safety copy.
 */
export function stageRestore(sourcePath: string, pendingPath: string): void {
  copyFileSync(sourcePath, pendingPath)
}
