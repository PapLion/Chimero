/**
 * Database initialization for Electron Main process.
 * Uses app.getPath('userData') for persistent storage.
 *
 * RUNTIME MIGRATION STRATEGY:
 * Migrations run on app startup (not via CLI db:push) to avoid ABI mismatch
 * between Electron (NODE_MODULE_VERSION 143) and Node.js (127) for better-sqlite3.
 */
import { app } from 'electron';
import { join, dirname, resolve } from 'path';
import { existsSync, readdirSync, unlinkSync } from 'fs';
import { initDb, getDb, getRawDb, closeDb } from '@packages/db/database';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

/**
 * Resolves the path to the Drizzle migrations folder.
 * Tries multiple strategies so it works in Dev (bundled main) and when run from different cwds.
 */
function getMigrationsFolder(): string {
  const attempts: { name: string; path: string }[] = [];

  // 1) Resolve from the db package (works when db is a real dependency, e.g. pnpm install symlink)
  try {
    const dbPackagePath = require.resolve('db/package.json');
    const dbPackageDir = dirname(dbPackagePath);
    const candidate = join(dbPackageDir, 'drizzle');
    attempts.push({ name: 'require.resolve(db/package.json)', path: candidate });
    if (existsSync(candidate)) return candidate;
  } catch {
    // Ignore: in bundled main there may be no 'db/package.json'
  }

  // 2) Relative to compiled main: __dirname = apps/electron/out/main → go up to monorepo root
  const mainDir = __dirname;
  const fromOutMain = resolve(mainDir, '..', '..', '..', '..', 'packages', 'db', 'drizzle');
  attempts.push({ name: '__dirname (out/main)', path: fromOutMain });
  if (existsSync(fromOutMain)) return fromOutMain;

  // 3) Same but one less level (e.g. if __dirname is apps/electron/src/main)
  const fromSrcMain = resolve(mainDir, '..', '..', '..', 'packages', 'db', 'drizzle');
  attempts.push({ name: '__dirname (src/main)', path: fromSrcMain });
  if (existsSync(fromSrcMain)) return fromSrcMain;

  // 4) From process.cwd(): when pnpm dev runs from monorepo root
  const cwd = process.cwd();
  const fromCwdRoot = join(cwd, 'packages', 'db', 'drizzle');
  attempts.push({ name: 'process.cwd()/packages/db/drizzle', path: fromCwdRoot });
  if (existsSync(fromCwdRoot)) return fromCwdRoot;

  // 5) cwd = apps/electron
  const fromCwdApps = join(cwd, '..', 'packages', 'db', 'drizzle');
  attempts.push({ name: 'process.cwd()../packages/db/drizzle', path: fromCwdApps });
  if (existsSync(fromCwdApps)) return fromCwdApps;

  // Return first attempted path so migrate() runs and we get a clear error + logs
  const fallback = attempts[0]?.path ?? fromOutMain;
  console.error('[DB] getMigrationsFolder: no candidate folder exists. Attempts:', attempts);
  return fallback;
}

/** Expected columns from migration 0002; used to detect schema drift. */
const REQUIRED_TRACKERS_COLUMN = 'is_favorite';
const REQUIRED_SETTINGS_COLUMN = 'dashboard_layout';

interface SchemaDiagnostic {
  trackersColumns: string[];
  settingsColumns: string[];
  hasIsFavorite: boolean;
  hasDashboardLayout: boolean;
  trackersTableExists: boolean;
  settingsTableExists: boolean;
}

/**
 * Run PRAGMA table_info on trackers and settings to verify schema (post-migrate diagnostic).
 */
function runSchemaDiagnostic(): SchemaDiagnostic {
  const raw = getRawDb();
  const empty: SchemaDiagnostic = {
    trackersColumns: [],
    settingsColumns: [],
    hasIsFavorite: false,
    hasDashboardLayout: false,
    trackersTableExists: false,
    settingsTableExists: false,
  };
  if (!raw) return empty;

  try {
    const trackersInfo = raw.prepare('PRAGMA table_info(trackers)').all() as Array<{ name: string }>;
    const trackersColumns = trackersInfo.map((c) => c.name);
    const trackersTableExists = trackersColumns.length > 0;
    const hasIsFavorite = trackersColumns.includes(REQUIRED_TRACKERS_COLUMN);

    let settingsColumns: string[] = [];
    let settingsTableExists = false;
    let hasDashboardLayout = false;
    try {
      const settingsInfo = raw.prepare('PRAGMA table_info(settings)').all() as Array<{ name: string }>;
      settingsColumns = settingsInfo.map((c) => c.name);
      settingsTableExists = settingsColumns.length > 0;
      hasDashboardLayout = settingsColumns.includes(REQUIRED_SETTINGS_COLUMN);
    } catch {
      // settings table might not exist yet
    }

    return {
      trackersColumns,
      settingsColumns,
      hasIsFavorite,
      hasDashboardLayout,
      trackersTableExists,
      settingsTableExists,
    };
  } catch (e) {
    console.warn('[DB DIAGNOSTIC] PRAGMA failed:', e);
    return empty;
  }
}

/** Ensure reminders table has date and completed_at (migrations 0004/0005). Run after migrate() so old DBs get columns without user deleting chimero.db. */
function ensureRemindersColumns(): void {
  const raw = getRawDb();
  if (!raw) return;
  try {
    const info = raw.prepare('PRAGMA table_info(reminders)').all() as Array<{ name: string }>;
    const columns = new Set(info.map((c) => c.name));
    if (!columns.has('date')) {
      raw.prepare('ALTER TABLE reminders ADD COLUMN date text').run();
      console.log('[DB] Added column reminders.date');
    }
    if (!columns.has('completed_at')) {
      raw.prepare('ALTER TABLE reminders ADD COLUMN completed_at integer').run();
      console.log('[DB] Added column reminders.completed_at');
    }
    if (!columns.has('description')) {
      raw.prepare('ALTER TABLE reminders ADD COLUMN description text').run();
      console.log('[DB] Added column reminders.description');
    }
  } catch (e) {
    console.warn('[DB] ensureRemindersColumns failed (reminders table may not exist yet):', e);
  }
}

/**
 * If schema drift is detected (missing is_favorite or dashboard_layout), hard-reset the DB:
 * close connection, delete file, re-init, re-run migrations.
 */
function ensureSchemaAndMaybeReset(
  dbPath: string,
  migrationsFolder: string,
  maxRetries: number = 1
): void {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const diag = runSchemaDiagnostic();

    console.log('[DB DIAGNOSTIC] Columns in trackers table:', diag.trackersColumns);
    if (!diag.trackersTableExists) {
      console.log('[DB DIAGNOSTIC] Table "trackers" does not exist!');
    }
    if (diag.settingsTableExists) {
      console.log('[DB DIAGNOSTIC] Columns in settings table:', diag.settingsColumns);
    } else {
      console.log('[DB DIAGNOSTIC] Table "settings" does not exist (yet).');
    }

    const drift = !diag.hasIsFavorite || !diag.hasDashboardLayout;
    if (!drift) {
      console.log('[DB DIAGNOSTIC] Schema OK (is_favorite and dashboard_layout present).');
      return;
    }

    if (attempt >= maxRetries) {
      console.error('[DB FIX] Schema drift still present after reset. Columns:', diag.trackersColumns);
      throw new Error(
        `Database schema drift: missing ${!diag.hasIsFavorite ? 'is_favorite ' : ''}${!diag.hasDashboardLayout ? 'dashboard_layout' : ''}. Check migrations.`
      );
    }

    console.log('[DB FIX] Schema drift detected. Hard resetting database...');
    closeDb();
    try {
      if (existsSync(dbPath)) {
        unlinkSync(dbPath);
        console.log('[DB FIX] Deleted', dbPath);
      }
    } catch (e) {
      console.error('[DB FIX] Failed to delete DB file:', e);
      throw new Error(`Database reset failed: could not delete ${dbPath}`);
    }

    initDb(dbPath);
    const db = getDb();
    migrate(db, { migrationsFolder });
    console.log('[DB FIX] Re-ran migrations after reset.');
  }
}

/**
 * Initializes the database and runs pending migrations.
 * Call from app.whenReady() BEFORE creating BrowserWindow.
 * Verifies schema after migrate; on drift, hard-resets DB and re-migrates (dev auto-recovery).
 * @throws Error if migration fails - app should quit on failure
 */
export function setupDatabase(): void {
  const userDataPath = app.getPath('userData');
  const dbPath = join(userDataPath, 'chimero.db');

  console.log('[DB] userDataPath:', userDataPath);
  console.log('[DB] dbPath:', dbPath);

  const migrationsFolder = getMigrationsFolder();
  console.log('[DB] migrationsFolder:', migrationsFolder);

  const folderExists = existsSync(migrationsFolder);
  console.log('[DB] migrationsFolder exists:', folderExists);

  if (folderExists) {
    try {
      const files = readdirSync(migrationsFolder);
      const sqlFiles = files.filter((f) => f.endsWith('.sql'));
      console.log('[DB] migration .sql files in folder:', sqlFiles);
      const metaPath = join(migrationsFolder, 'meta', '_journal.json');
      console.log('[DB] meta/_journal.json exists:', existsSync(metaPath));
    } catch (e) {
      console.warn('[DB] could not list migrations folder:', e);
    }
  }

  initDb(dbPath);
  const db = getDb();

  console.log('[DB] Running migrations...');
  try {
    migrate(db, { migrationsFolder });
    console.log('[DB] Migrations success!');
    ensureRemindersColumns();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[DB] Migration failed. Full error:', err);
    console.error('[DB] Message:', message);
    if (stack) console.error('[DB] Stack:', stack);
    throw new Error(`Database migration failed: ${message}`);
  }

  ensureSchemaAndMaybeReset(dbPath, migrationsFolder);
}
