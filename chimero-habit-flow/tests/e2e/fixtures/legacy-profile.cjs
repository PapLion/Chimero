/**
 * Builds a database as the last release (schema 0000–0010, drizzle history and
 * all) left it, with records in that release's shapes, including the old
 * array-based dashboard layout. Runs under Electron as Node so the app's own
 * better-sqlite3 build is used:
 *
 *   ELECTRON_RUN_AS_NODE=1 electron legacy-profile.cjs <db path> <migrations folder> <last tag>
 */
const { createHash } = require('node:crypto')
const { readFileSync } = require('node:fs')
const { join, resolve } = require('node:path')

const Database = require(resolve(__dirname, '../../../apps/electron/node_modules/better-sqlite3'))
const [dbPath, migrations, lastTag] = process.argv.slice(2)

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Exactly what drizzle's migrator records, so the new app resumes after lastTag.
db.exec('CREATE TABLE IF NOT EXISTS __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)')
const journal = JSON.parse(readFileSync(join(migrations, 'meta', '_journal.json'), 'utf8')).entries
for (const entry of journal) {
  const sql = readFileSync(join(migrations, `${entry.tag}.sql`), 'utf8')
  for (const statement of sql.split('--> statement-breakpoint')) if (statement.trim()) db.exec(statement)
  db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(createHash('sha256').update(sql).digest('hex'), entry.when)
  if (entry.tag === lastTag) break
}

const day = (offset) => {
  const date = new Date(2026, 9, 1 + offset, 8)
  return { timestamp: date.getTime(), date: `2026-10-${String(1 + offset).padStart(2, '0')}` }
}
const tracker = db.prepare('INSERT INTO trackers (name, type, icon, color, "order", config, is_custom) VALUES (?, ?, ?, ?, ?, ?, ?)')
const entry = db.prepare('INSERT INTO entries (tracker_id, value, note, metadata, timestamp, date_str) VALUES (?, ?, ?, ?, ?, ?)')

const weight = Number(tracker.run('Weight', 'numeric', 'scale', '#a855f7', 0, '{}', 0).lastInsertRowid)
const mood = Number(tracker.run('Mood', 'range', 'smile', '#f59e0b', 1, JSON.stringify({ max: 10 }), 0).lastInsertRowid)
const meditation = Number(tracker.run('Meditation', 'numeric', 'sparkles', '#22d3ee', 2, JSON.stringify({ unit: 'min', goal: 10 }), 1).lastInsertRowid)
tracker.run('Savings', 'numeric', 'piggy-bank', '#10b981', 3, '{}', 0)

const calm = Number(db.prepare("INSERT INTO tags (name, color) VALUES ('calm', '#22d3ee')").run().lastInsertRowid)
for (let i = 0; i < 3; i++) {
  const { timestamp, date } = day(i)
  const w = Number(entry.run(weight, 80 - i * 0.4, null, '{}', timestamp, date).lastInsertRowid)
  db.prepare("INSERT INTO entry_weight (entry_id, weight_value, weight_unit) VALUES (?, ?, 'kg')").run(w, 80 - i * 0.4)
  entry.run(mood, 5 + i, i === 2 ? 'legacy note kept' : null, '{}', timestamp + 3600e3, date)
  const m = Number(entry.run(meditation, 10 + i * 5, null, '{}', timestamp + 7200e3, date).lastInsertRowid)
  db.prepare('INSERT INTO entries_to_tags (entry_id, tag_id) VALUES (?, ?)').run(m, calm)
}
db.prepare("INSERT INTO contacts (name, notes) VALUES ('Sam Example', 'kept across the upgrade')").run()
db.prepare('INSERT INTO settings (id, theme, dashboard_layout) VALUES (1, ?, ?)').run(
  'dark',
  JSON.stringify([
    { id: `tracker-${meditation}`, trackerId: meditation, position: 0, size: 'medium' },
    { id: `tracker-${mood}`, trackerId: mood, position: 1, size: 'small' },
  ]),
)
db.close()
console.log(JSON.stringify({ weight, mood, meditation }))
