import Database from 'better-sqlite3'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { UPGRADE_BACKUPS_KEPT, backupBeforeMigrating } from '../../../apps/electron/src/main/upgrade-backup'

const migrations = resolve(__dirname, '../../../packages/db/drizzle')
const journal = JSON.parse(readFileSync(join(migrations, 'meta/_journal.json'), 'utf8')) as { entries: Array<{ when: number }> }
const latest = Math.max(...journal.entries.map((e) => e.when))

let folder: string
let dbPath: string

function makeDb(appliedUpTo: number | null): void {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec("CREATE TABLE trackers (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO trackers (name) VALUES ('Mood')")
  if (appliedUpTo != null) {
    db.exec('CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash text NOT NULL, created_at numeric)')
    db.prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('x', ?)").run(appliedUpTo)
  }
  db.close()
}

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'chimero-backup-'))
  dbPath = join(folder, 'chimero.db')
})

afterEach(() => rmSync(folder, { recursive: true, force: true }))

describe('copy before upgrading', () => {
  it('copies a database that has migrations pending, with its records', () => {
    makeDb(journal.entries[3].when)
    const copy = backupBeforeMigrating(dbPath, migrations)
    expect(copy).toMatch(/backups[\\/]before-upgrade-.+\.db$/)
    const restored = new Database(copy as string, { readonly: true })
    expect(restored.prepare('SELECT name FROM trackers').all()).toEqual([{ name: 'Mood' }])
    restored.close()
  })

  it('does nothing when the database is current, new, or not a Chimero database', () => {
    expect(backupBeforeMigrating(dbPath, migrations)).toBeNull()
    makeDb(latest)
    expect(backupBeforeMigrating(dbPath, migrations)).toBeNull()
    rmSync(dbPath)
    const other = new Database(dbPath)
    other.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY)')
    other.close()
    expect(backupBeforeMigrating(dbPath, migrations)).toBeNull()
  })

  it(`keeps the newest ${UPGRADE_BACKUPS_KEPT} copies and never touches other files`, () => {
    makeDb(0)
    for (let i = 0; i < UPGRADE_BACKUPS_KEPT + 2; i++) backupBeforeMigrating(dbPath, migrations, new Date(Date.UTC(2026, 0, 1 + i)))
    writeFileSync(join(folder, 'backups', 'chimero-backup-manual.db'), '')
    backupBeforeMigrating(dbPath, migrations, new Date(Date.UTC(2026, 1, 1)))
    const names = readdirSync(join(folder, 'backups')).sort()
    const copies = names.filter((n) => n.startsWith('before-upgrade-'))
    expect(copies).toHaveLength(UPGRADE_BACKUPS_KEPT)
    expect(copies.at(-1)).toMatch(/^before-upgrade-2026-02-01/)
    expect(names).toContain('chimero-backup-manual.db')
  })
})
