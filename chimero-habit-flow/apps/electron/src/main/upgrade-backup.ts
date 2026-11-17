/**
 * A copy of the database taken just before an app update changes its schema.
 *
 * Migrations already run inside one transaction, so a failed upgrade rolls back.
 * This guards against the other case: an upgrade that succeeds but turns out to
 * be wrong. The copy is written with VACUUM INTO, which is consistent even with
 * a write-ahead log, and only the newest few are kept.
 */
import Database from 'better-sqlite3'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'fs'
import { dirname, join } from 'path'

const PREFIX = 'before-upgrade-'
export const UPGRADE_BACKUPS_KEPT = 5

/** Newest migration timestamp in a drizzle migrations folder. */
function latestMigration(migrationsFolder: string): number {
  const journal = JSON.parse(readFileSync(join(migrationsFolder, 'meta', '_journal.json'), 'utf8')) as { entries: Array<{ when: number }> }
  return Math.max(0, ...journal.entries.map((entry) => Number(entry.when) || 0))
}

/**
 * Returns the backup path when one was written: only for an existing database
 * that holds Chimero tables and has migrations still to apply.
 */
export function backupBeforeMigrating(dbPath: string, migrationsFolder: string, now = new Date()): string | null {
  if (!existsSync(dbPath)) return null
  const latest = latestMigration(migrationsFolder)
  const db = new Database(dbPath, { fileMustExist: true })
  try {
    const has = (name: string) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name))
    if (!has('trackers')) return null
    const applied = has('__drizzle_migrations') ? Number((db.prepare('SELECT max(created_at) AS v FROM __drizzle_migrations').get() as { v: number | null }).v ?? 0) : 0
    if (applied >= latest) return null

    const folder = join(dirname(dbPath), 'backups')
    mkdirSync(folder, { recursive: true })
    const target = join(folder, `${PREFIX}${now.toISOString().replace(/[:.]/g, '-')}.db`)
    db.prepare('VACUUM INTO ?').run(target)

    // Only files this function wrote are ever removed.
    const older = readdirSync(folder)
      .filter((name) => name.startsWith(PREFIX) && name.endsWith('.db'))
      .sort()
      .slice(0, -UPGRADE_BACKUPS_KEPT)
    for (const name of older) rmSync(join(folder, name), { force: true })
    return target
  } finally {
    db.close()
  }
}
