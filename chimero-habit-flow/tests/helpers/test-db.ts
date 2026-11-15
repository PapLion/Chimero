import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const MIGRATIONS = resolve(__dirname, '../../packages/db/drizzle')

/** In-memory database with every checked-in migration applied, in journal order. */
export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  const journal = JSON.parse(readFileSync(resolve(MIGRATIONS, 'meta/_journal.json'), 'utf8')) as { entries: Array<{ tag: string }> }
  for (const { tag } of journal.entries) {
    for (const statement of readFileSync(resolve(MIGRATIONS, `${tag}.sql`), 'utf8').split('--> statement-breakpoint')) {
      if (statement.trim()) db.exec(statement)
    }
  }
  db.exec('CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY, hash text NOT NULL, created_at numeric)')
  return db
}

export function addTracker(db: Database.Database, name: string, type: string, config: Record<string, unknown> = {}, isCustom = false): number {
  return Number(db.prepare('INSERT INTO trackers (name, type, config, is_custom, archived) VALUES (?, ?, ?, ?, 0)').run(name, type, JSON.stringify(config), isCustom ? 1 : 0).lastInsertRowid)
}

export function addEntry(db: Database.Database, trackerId: number, date: string, value: number | null, extra: { note?: string; metadata?: Record<string, unknown>; hour?: number } = {}): number {
  const [y, m, d] = date.split('-').map(Number)
  const timestamp = new Date(y, m - 1, d, extra.hour ?? 12).getTime()
  return Number(
    db.prepare('INSERT INTO entries (tracker_id, value, note, metadata, timestamp, date_str) VALUES (?, ?, ?, ?, ?, ?)').run(trackerId, value, extra.note ?? null, JSON.stringify(extra.metadata ?? {}), timestamp, date).lastInsertRowid,
  )
}
