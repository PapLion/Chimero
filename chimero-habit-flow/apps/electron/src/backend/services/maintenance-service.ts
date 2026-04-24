import { getDb } from "@packages/db/database"
import { entries } from "@packages/db"
import { eq } from "drizzle-orm"
import { dateToDateStrLocal } from "shared"

export async function recalculateEntryDateStr(): Promise<{ updated: number; total: number }> {
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

  return { updated, total: rows.length }
}

