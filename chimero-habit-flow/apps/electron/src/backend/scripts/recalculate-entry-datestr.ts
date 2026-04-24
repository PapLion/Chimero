/**
 * One-off maintenance script.
 *
 * Recalculates `entries.dateStr` from `entries.timestamp` using the canonical local-time rule.
 *
 * Run (from repo root):
 *   pnpm --filter chimero-habit-flow-electron exec tsx src/backend/scripts/recalculate-entry-datestr.ts
 *
 * Note: this updates the current user's local DB (Electron userData). It is intended
 * to be executed in the Electron app environment where `getDb()` points to the same DB.
 */
import { getDb } from "@packages/db/database"
import { entries } from "@packages/db"
import { eq } from "drizzle-orm"
import { dateToDateStrLocal } from "shared"

async function main() {
  const db = getDb()
  const rows = await db.select().from(entries)

  let updated = 0
  for (const row of rows as Array<{ id: number; timestamp: number; dateStr: string }>) {
    const next = dateToDateStrLocal(new Date(row.timestamp))
    if (row.dateStr !== next) {
      await db.update(entries).set({ dateStr: next }).where(eq(entries.id, row.id))
      updated++
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[recalculate-entry-datestr] updated ${updated}/${rows.length} rows`)
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e)
  process.exit(1)
})

