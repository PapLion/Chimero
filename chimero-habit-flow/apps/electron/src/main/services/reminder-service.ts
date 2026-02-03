/**
 * Reminder service: cron loop every 60s, checks DB for due reminders.
 * Dispatches IPC to Renderer or shows native Notification.
 */
import { getDb } from '@packages/db/database';
import { reminders } from '@packages/db';
import { eq } from 'drizzle-orm';
import type { BrowserWindow } from 'electron';

let checkInterval: ReturnType<typeof setInterval> | null = null;
let mainWindowRef: BrowserWindow | null = null;

export function setMainWindowRef(win: BrowserWindow | null): void {
  mainWindowRef = win;
}

function nowHHMM(): string {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function todayDayIndex(): number {
  return new Date().getDay(); // 0 = Sunday, 6 = Saturday
}

export function startReminderLoop(): void {
  if (checkInterval) return;
  checkInterval = setInterval(async () => {
    try {
      const db = getDb();
      const now = nowHHMM();
      const day = todayDayIndex();
      const rows = await db.select().from(reminders).where(eq(reminders.enabled, true));
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      for (const r of rows as unknown as Array<{ id: number; title: string; time: string; date: string | null; days: string | number[] | null; last_triggered: number | null }>) {
        const reminderTime = (r.time ?? '').slice(0, 5);
        if (reminderTime !== now) continue;
        const reminderDate = r.date ?? null;
        if (reminderDate != null && reminderDate !== '') {
          if (reminderDate !== todayStr) continue;
        } else {
          const days = Array.isArray(r.days) ? r.days : (typeof r.days === 'string' ? JSON.parse(r.days || '[]') : []) as number[];
          if (days.length > 0 && !days.includes(day)) continue;
        }
        const id = r.id;
        await db.update(reminders).set({ lastTriggered: Date.now() }).where(eq(reminders.id, id));
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send('on-reminder', { id, title: r.title });
        } else {
          const { Notification } = await import('electron');
          if (Notification.isSupported()) {
            new Notification({ title: 'Chimero', body: r.title }).show();
          }
        }
      }
    } catch (e) {
      console.error('[ReminderService] check error:', e);
    }
  }, 60_000);
}

export function stopReminderLoop(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}
