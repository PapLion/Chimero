/**
 * Database runtime - ONLY for Electron Main process.
 * Contains better-sqlite3 (native module) - do not import from Renderer.
 */
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDB | null = null;
let _rawDb: Database.Database | null = null;

/**
 * Initialize the database connection. Call from Electron Main in app.whenReady()
 * with: initDb(join(app.getPath('userData'), 'chimero.db'))
 */
export function initDb(dbPath: string): DrizzleDB {
  if (_db) return _db;
  const sqlite = new Database(dbPath);
  _rawDb = sqlite;
  _db = drizzle(sqlite, { schema });
  return _db;
}

/**
 * Get the db instance. Must call initDb() first (in app.whenReady()).
 */
export function getDb(): DrizzleDB {
  if (!_db) {
    throw new Error('DB not initialized. Call initDb() in app.whenReady() first.');
  }
  return _db;
}

/**
 * Get the raw better-sqlite3 instance for PRAGMA / diagnostics.
 * Returns null if DB not initialized.
 */
export function getRawDb(): Database.Database | null {
  return _rawDb;
}

/**
 * Close the database connection and clear the singleton.
 * Used before deleting the DB file for a hard reset (dev recovery).
 */
export function closeDb(): void {
  if (_rawDb) {
    try {
      _rawDb.close();
    } catch (e) {
      console.warn('[DB] closeDb: error closing raw connection', e);
    }
    _rawDb = null;
  }
  _db = null;
}
