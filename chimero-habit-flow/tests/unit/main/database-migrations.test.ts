import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getRawDbMock: vi.fn(),
  deleteMigrationHistoryRunMock: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => 'C:\\Users\\Dani\\AppData\\Local\\Chimero'),
  },
}))

vi.mock('@packages/db/database', () => ({
  initDb: vi.fn(),
  getDb: vi.fn(),
  getRawDb: mocks.getRawDbMock,
  closeDb: vi.fn(),
}))

vi.mock('drizzle-orm/better-sqlite3/migrator', () => ({
  migrate: vi.fn(),
}))

describe('database migration transition', () => {
  it('does not clear migration history for the current 0000/0001/0002 state', async () => {
    const raw = {
      prepare: vi.fn((statement: string) => {
        if (statement === 'PRAGMA table_info(trackers)') {
          return {
            all: () => [{ name: 'id' }, { name: 'is_favorite' }],
          }
        }
        if (statement === 'PRAGMA table_info(settings)') {
          return {
            all: () => [
              { name: 'id' },
              { name: 'dashboard_layout' },
              { name: 'weight_unit' },
              { name: 'measure_unit' },
            ],
          }
        }
        if (statement === 'SELECT COUNT(*) as cnt FROM __drizzle_migrations') {
          return {
            get: () => ({ cnt: 3 }),
          }
        }
        if (statement === 'DELETE FROM __drizzle_migrations') {
          return {
            run: mocks.deleteMigrationHistoryRunMock,
          }
        }
        throw new Error(`Unexpected SQL: ${statement}`)
      }),
    }
    mocks.getRawDbMock.mockReturnValue(raw)

    const { prepareConsolidatedMigrationTransition } = await import('../../../apps/electron/src/main/database')

    prepareConsolidatedMigrationTransition('unused')

    expect(mocks.deleteMigrationHistoryRunMock).not.toHaveBeenCalled()
  })

  it('adds the gaming extension migration without backfilling legacy entries', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'packages/db/drizzle/0003_overconfident_forgotten_one.sql'),
      'utf-8',
    )

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS `entry_gaming`')
    expect(migration).toContain('FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade')
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS `entry_gaming_game_key_idx`')
    expect(migration).not.toMatch(/INSERT INTO `?entries`?/i)
    expect(migration).not.toMatch(/UPDATE `?entries`?/i)
    expect(migration).not.toMatch(/DELETE FROM `?entries`?/i)
  })
})
