/**
 * Database initialization for Electron Main process.
 * Uses app.getPath('userData') for persistent storage.
 *
 * RUNTIME MIGRATION STRATEGY:
 * Migrations run on app startup (not via CLI db:push) to avoid ABI mismatch
 * between Electron (NODE_MODULE_VERSION 143) and Node.js (127) for better-sqlite3.
 */
import { app } from 'electron';
import { join, resolve, isAbsolute } from 'path';
import { existsSync, readdirSync, unlinkSync } from 'fs';
import { initDb, getDb, getRawDb, closeDb } from '@packages/db/database';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

/**
 * Resolves the path to the Drizzle migrations folder.
 * In development: resolves to packages/db/drizzle from monorepo root.
 * In production (packaged): migrations are copied to out/main/migrations during build.
 */
function getMigrationsFolder(): string {
  // In packaged app, migrations are copied to out/main/migrations by copyMigrationsPlugin
  const packagedMigrations = resolve(__dirname, 'migrations');
  
  // In development, use the source migrations folder
  const devMigrations = resolve(__dirname, '..', '..', '..', '..', 'packages', 'db', 'drizzle');
  
  // Check packaged location first (production), then dev location
  const migrationsFolder = existsSync(packagedMigrations) ? packagedMigrations : devMigrations;

  if (process.env.NODE_ENV === 'development') {
    console.log('[DB] getMigrationsFolder resolved to:', migrationsFolder);
    console.log('[DB] migrationsFolder isAbsolute:', isAbsolute(migrationsFolder));
    console.log('[DB] Using packaged migrations:', existsSync(packagedMigrations));
  }

  if (!existsSync(migrationsFolder)) {
    console.error('[DB] migrationsFolder does not exist:', migrationsFolder);
    console.error('[DB] Checked packaged path:', packagedMigrations, 'exists:', existsSync(packagedMigrations));
    console.error('[DB] Checked dev path:', devMigrations, 'exists:', existsSync(devMigrations));
  }

  return migrationsFolder;
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
 * Handles transition from old migrations (0000-0006) to consolidated migration.
 * If schema is complete but __drizzle_migrations__ has old entries (2+ rows),
 * clear them so migrate() will run the consolidated migration (uses IF NOT EXISTS).
 */
function prepareConsolidatedMigrationTransition(_migrationsFolder: string): void {
  const raw = getRawDb();
  if (!raw) return;

  const diag = runSchemaDiagnostic();
  const schemaComplete = diag.hasIsFavorite && diag.hasDashboardLayout;
  if (!schemaComplete) return;

  try {
    const rows = raw.prepare("SELECT COUNT(*) as cnt FROM __drizzle_migrations").get() as { cnt: number };
    if (rows.cnt < 2) return;

    // Old multi-migration setup (0000-0006). Clear so migrate() runs consolidated.
    raw.prepare("DELETE FROM __drizzle_migrations").run();
    console.log('[DB] Cleared old migration entries for consolidated migration transition.');
  } catch {
    // Table may not exist yet (fresh DB) - migrate() will create it
  }
}

/**
 * Initializes the database and runs pending migrations.
 * Call from app.whenReady() BEFORE creating BrowserWindow.
 * Verifies schema after migrate; on drift, hard-resets DB and re-migrates (dev auto-recovery).
 * @throws Error if migration fails - app should quit on failure
 */
export function setupDatabase(): void {
  const userDataPath = resolve(app.getPath('userData'));
  const dbPath = resolve(userDataPath, 'chimero.db');
  const migrationsFolder = getMigrationsFolder();

  if (process.env.NODE_ENV === 'development') {
    console.log('[DB] userDataPath:', userDataPath);
    console.log('[DB] dbPath:', dbPath, 'isAbsolute:', isAbsolute(dbPath));
    console.log('[DB] migrationsFolder:', migrationsFolder, 'isAbsolute:', isAbsolute(migrationsFolder));

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
  }

  initDb(dbPath);
  const db = getDb();

  // Transition: if DB has old migrations (0000-0006), clear them so migrate() runs consolidated
  prepareConsolidatedMigrationTransition(migrationsFolder);

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
