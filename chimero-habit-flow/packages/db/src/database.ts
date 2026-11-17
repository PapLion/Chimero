/**
 * Database runtime - ONLY for Electron Main process.
 * Contains better-sqlite3 (native module) - do not import from Renderer.
 */
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

export type DrizzleTransaction = Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];

let _db: DrizzleDB | null = null;
let _rawDb: Database.Database | null = null;

/**
 * Initialize the database connection. Call from Electron Main in app.whenReady()
 * with: initDb(join(app.getPath('userData'), 'chimero.db'))
 */
export function initDb(dbPath: string): DrizzleDB {
  if (_db) return _db;
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  _rawDb = sqlite;
  _db = drizzle(sqlite, { schema });
  return _db;
}

/**
 * Use an already-open connection (integration tests run the real services
 * against an in-memory database this way).
 */
export function attachDb(sqlite: Database.Database): DrizzleDB {
  _rawDb = sqlite;
  _db = drizzle(sqlite, { schema });
  return _db;
}

let transactionQueue: Promise<unknown> = Promise.resolve();
let transactionDepth = 0;

/**
 * Run `work` atomically: everything it writes is committed together, or rolled
 * back together if it throws.
 *
 * better-sqlite3 is synchronous and its own `transaction()` rejects functions
 * that return a promise, so the services' `async` units of work go through this
 * helper instead. It is correct because of two properties:
 *
 *  - Transactions are queued, so two never overlap on the single connection.
 *  - Inside `work`, only database calls are awaited. Those resolve in the same
 *    tick (the driver does the work synchronously), so no other IPC handler can
 *    run between BEGIN and COMMIT. Do not await timers, files or the network
 *    inside a transaction.
 *
 * A `transact` call made while one is already running joins it.
 */
export function transact<T>(work: (tx: DrizzleDB) => Promise<T> | T): Promise<T> {
  if (transactionDepth > 0) return Promise.resolve().then(() => work(getDb()));
  const run = async (): Promise<T> => {
    const sqlite = _rawDb;
    if (!sqlite) throw new Error('DB not initialized. Call initDb() in app.whenReady() first.');
    sqlite.exec('BEGIN IMMEDIATE');
    transactionDepth++;
    try {
      const result = await work(getDb());
      sqlite.exec('COMMIT');
      return result;
    } catch (error) {
      if (sqlite.inTransaction) sqlite.exec('ROLLBACK');
      throw error;
    } finally {
      transactionDepth--;
    }
  };
  const next = transactionQueue.then(run, run);
  transactionQueue = next.catch(() => undefined);
  return next;
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
 * Used during shutdown and when switching disposable test databases.
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
