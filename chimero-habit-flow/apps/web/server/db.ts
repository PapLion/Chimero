import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type SqlParam = string | number | Uint8Array | null
type SqlParams = SqlParam[] | Record<string, SqlParam>

export interface RunResult {
  changes: number
  lastInsertRowid: number
}

const serverDir = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(serverDir, '..')
const repoRoot = resolve(webRoot, '..', '..')
const require = createRequire(import.meta.url)

let dbPromise: Promise<WebDb> | null = null
let cachedDbPath: string | null = null

function normalizeValue(value: unknown): SqlParam {
  if (value === undefined || value === null) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value instanceof Uint8Array) return value
  return String(value)
}

function normalizeParams(params: unknown[]): SqlParams {
  if (params.length === 1 && params[0] && typeof params[0] === 'object' && !Array.isArray(params[0]) && !(params[0] instanceof Uint8Array)) {
    const source = params[0] as Record<string, unknown>
    const normalized: Record<string, SqlParam> = {}
    for (const [key, value] of Object.entries(source)) {
      normalized[`@${key}`] = normalizeValue(value)
      normalized[`:${key}`] = normalizeValue(value)
      normalized[`$${key}`] = normalizeValue(value)
    }
    return normalized
  }
  return params.map(normalizeValue)
}

class PreparedStatement {
  constructor(
    private readonly owner: WebDb,
    private readonly sql: string,
  ) {}

  all(...params: unknown[]): Record<string, unknown>[] {
    const stmt = this.owner.raw.prepare(this.sql)
    const rows: Record<string, unknown>[] = []
    try {
      stmt.bind(normalizeParams(params))
      while (stmt.step()) rows.push(stmt.getAsObject())
      return rows
    } finally {
      stmt.free()
    }
  }

  get(...params: unknown[]): Record<string, unknown> | undefined {
    return this.all(...params)[0]
  }

  run(...params: unknown[]): RunResult {
    this.owner.raw.run(this.sql, normalizeParams(params))
    const lastInsertRowid = Number(
      this.owner.raw.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0] ?? 0,
    )
    const changes = this.owner.raw.getRowsModified()
    this.owner.persist()
    return { changes, lastInsertRowid }
  }
}

export class WebDb {
  private transactionDepth = 0

  constructor(
    readonly raw: SqlJsDatabase,
    private readonly dbPath: string,
  ) {}

  exec(sql: string): void {
    this.raw.exec(sql)
    this.persist()
  }

  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(this, sql)
  }

  transaction<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult): (...args: TArgs) => TResult {
    return (...args: TArgs) => {
      this.raw.exec('BEGIN IMMEDIATE')
      this.transactionDepth += 1
      try {
        const result = fn(...args)
        this.transactionDepth -= 1
        this.raw.exec('COMMIT')
        this.persist()
        return result
      } catch (error) {
        this.transactionDepth = Math.max(0, this.transactionDepth - 1)
        try {
          this.raw.exec('ROLLBACK')
        } catch {
          // If sqlite has already aborted the transaction, keep the original error.
        }
        this.persist()
        throw error
      }
    }
  }

  persist(): void {
    if (this.transactionDepth > 0) return
    writeFileSync(this.dbPath, Buffer.from(this.raw.export()))
  }
}

export function getWebDataDir(): string {
  return resolve(process.env.CHIMERO_WEB_DATA_DIR ?? resolve(webRoot, '.data'))
}

export function getWebDbPath(): string {
  return resolve(getWebDataDir(), process.env.CHIMERO_WEB_DB_FILENAME ?? 'chimero-web.db')
}

export function getAssetsRoot(): string {
  return resolve(getWebDataDir(), 'assets')
}

function getMigrationsDir(): string {
  return resolve(repoRoot, 'packages', 'db', 'drizzle')
}

function runMigrations(database: WebDb): void {
  const migrationsDir = getMigrationsDir()
  if (!existsSync(migrationsDir)) {
    throw new Error(`Migrations folder not found: ${migrationsDir}`)
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS __chimero_web_migrations (
      name TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `)

  const applied = new Set(
    database
      .prepare('SELECT name FROM __chimero_web_migrations')
      .all()
      .map((row) => String(row.name)),
  )

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  const applyMigration = database.transaction((name: string, sqlText: string) => {
    const statements = sqlText
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean)

    for (const statement of statements) database.raw.exec(statement)
    database
      .prepare('INSERT INTO __chimero_web_migrations (name, applied_at) VALUES (?, ?)')
      .run(name, Date.now())
  })

  for (const file of files) {
    if (applied.has(file)) continue
    applyMigration(file, readFileSync(resolve(migrationsDir, file), 'utf-8'))
  }
}

function seedDefaults(database: WebDb): void {
  database.prepare('INSERT OR IGNORE INTO settings (id) VALUES (1)').run()

  const defaults = [
    { name: 'Weight', type: 'numeric', icon: 'scale', color: '#a855f7', order: 0, config: { unit: 'kg', goal: 70 } },
    { name: 'Mood', type: 'range', icon: 'smile', color: '#f59e0b', order: 1, config: { max: 10 } },
    { name: 'Exercise', type: 'numeric', icon: 'dumbbell', color: '#22c55e', order: 2, config: { unit: 'min', goal: 30 } },
    { name: 'Social', type: 'numeric', icon: 'users', color: '#3b82f6', order: 3, config: { unit: 'interactions' } },
    { name: 'Tasks', type: 'text', icon: 'check-square', color: '#ef4444', order: 4, config: {} },
    { name: 'Savings', type: 'numeric', icon: 'wallet', color: '#10b981', order: 5, config: { unit: '$', goal: 10000 } },
    { name: 'Books', type: 'text', icon: 'book', color: '#8b5cf6', order: 6, config: {} },
    { name: 'Gaming', type: 'text', icon: 'gamepad-2', color: '#10b981', order: 7, config: {} },
    { name: 'Media/TV', type: 'text', icon: 'music', color: '#0ea5e9', order: 8, config: {} },
    { name: 'Diet / Calories', type: 'numeric', icon: 'salad', color: '#22c55e', order: 9, config: { unit: 'kcal', goal: 2200 } },
  ] as const

  const insertDefaults = database.transaction(() => {
    const getTracker = database.prepare('SELECT id FROM trackers WHERE name = ?')
    const insertTracker = database.prepare(`
      INSERT INTO trackers (name, type, icon, color, "order", config, is_custom, is_favorite, archived)
      VALUES (@name, @type, @icon, @color, @order, @config, 0, 0, 0)
    `)

    for (const tracker of defaults) {
      if (getTracker.get(tracker.name)) continue
      insertTracker.run({ ...tracker, config: JSON.stringify(tracker.config) })
    }
  })

  insertDefaults()
}

async function createWebDb(dbPath: string): Promise<WebDb> {
  mkdirSync(dirname(dbPath), { recursive: true })
  mkdirSync(getAssetsRoot(), { recursive: true })

  const SQL = await initSqlJs({
    locateFile: (file) => require.resolve(`sql.js/dist/${file}`),
  })
  const raw = existsSync(dbPath)
    ? new SQL.Database(readFileSync(dbPath))
    : new SQL.Database()
  const database = new WebDb(raw, dbPath)
  database.raw.exec('PRAGMA foreign_keys = ON')
  runMigrations(database)
  seedDefaults(database)
  database.persist()
  return database
}

export function getWebDb(): Promise<WebDb> {
  const dbPath = getWebDbPath()
  if (!dbPromise || cachedDbPath !== dbPath) {
    cachedDbPath = dbPath
    dbPromise = createWebDb(dbPath)
  }
  return dbPromise
}
