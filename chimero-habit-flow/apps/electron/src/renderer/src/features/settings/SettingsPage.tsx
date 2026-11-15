import { useState, type ReactNode } from 'react'
import type { AccentChoice, AppPreferences, DataFileResult } from '@contracts/contracts'
import { Database, Download, FolderOpen, RotateCcw, Table } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/dates'
import { bytes, plural } from '@/lib/format'
import { useAction, useData, usePreferences } from '@/lib/queries'
import { PageShell, Section } from '@/shell/PageHeader'
import { ConfirmDialog } from '@/ui/dialog'
import { Button, Kbd, Segmented, Switch } from '@/ui/primitives'
import { toast } from '@/ui/toast'

const ACCENTS: Array<{ value: AccentChoice; label: string; color: string }> = [
  { value: 'iris', label: 'Iris', color: '#a080ff' },
  { value: 'ember', label: 'Ember', color: '#ff9a54' },
  { value: 'moss', label: 'Moss', color: '#7ed38c' },
  { value: 'tide', label: 'Tide', color: '#62c8ff' },
  { value: 'rose', label: 'Rose', color: '#ff82b8' },
]

const SHORTCUTS: Array<[string, string]> = [
  ['Alt Q', 'Log something'],
  ['Ctrl K', 'Search and commands'],
  ['Ctrl 1 / 2 / 3', 'Today, Journal, Insights'],
  ['Alt ← / →', 'Previous or next day'],
  ['Alt T', 'Jump to today'],
  ['Enter', 'Save the open record'],
]

function Row({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-t border-line/60 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium">{title}</p>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const prefs = usePreferences()
  const run = useAction()
  const { data: info } = useData(['app-info'], () => api.getAppInfo())
  const [restoring, setRestoring] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const set = (patch: Partial<AppPreferences>) => void run(() => api.updatePreferences(patch))

  const file = async (id: string, work: () => Promise<DataFileResult>, done: (result: DataFileResult) => string) => {
    setBusy(id)
    try {
      const result = await work()
      if (result.canceled) return
      if (result.ok) toast.success(done(result), result.path)
      else toast.error('That did not work', result.error)
    } catch (error) {
      toast.error('That did not work', error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <PageShell title="Settings" subtitle="Everything stays on this computer.">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Section title="Appearance">
          <Row title="Theme">
            <Segmented value={prefs.theme} onChange={(theme) => set({ theme })} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }]} label="Theme" />
          </Row>
          <Row title="Accent" hint="Used for buttons, selection and focus. Trackers keep their own colours.">
            <div className="flex gap-2" role="radiogroup" aria-label="Accent colour">
              {ACCENTS.map((accent) => (
                <button
                  key={accent.value}
                  type="button"
                  role="radio"
                  aria-checked={prefs.accent === accent.value}
                  aria-label={accent.label}
                  title={accent.label}
                  onClick={() => set({ accent: accent.value })}
                  className={cn('h-7 w-7 rounded-full transition-transform hover:scale-110', prefs.accent === accent.value && 'ring-2 ring-text ring-offset-2 ring-offset-surface')}
                  style={{ background: accent.color }}
                />
              ))}
            </div>
          </Row>
        </Section>

        <Section title="Units and calendar">
          <Row title="Weight" hint="Stored values are converted, never rewritten.">
            <Segmented value={prefs.weightUnit} onChange={(weightUnit) => set({ weightUnit })} options={[{ value: 'lb', label: 'Pounds' }, { value: 'kg', label: 'Kilograms' }]} label="Weight unit" />
          </Row>
          <Row title="Body measurements">
            <Segmented value={prefs.measureUnit} onChange={(measureUnit) => set({ measureUnit })} options={[{ value: 'in', label: 'Inches' }, { value: 'cm', label: 'Centimetres' }]} label="Measurement unit" />
          </Row>
          <Row title="Week starts on">
            <Segmented value={prefs.weekStartsOn} onChange={(weekStartsOn) => set({ weekStartsOn })} options={[{ value: 1, label: 'Monday' }, { value: 0, label: 'Sunday' }]} label="First day of the week" />
          </Row>
          <Row title="Clock">
            <Segmented value={prefs.timeFormat} onChange={(timeFormat) => set({ timeFormat })} options={[{ value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }]} label="Time format" />
          </Row>
        </Section>

        <Section title="Reminders">
          <Row title="Desktop notifications" hint="Show a system notification when a reminder is due. Reminders always appear inside the app.">
            <Switch checked={prefs.notifications} onChange={(notifications) => set({ notifications })} label="Desktop notifications" />
          </Row>
        </Section>

        <Section title="Your data" hint={info ? `${plural(info.entryCount, 'record')} across ${plural(info.trackerCount, 'tracker')}${info.firstEntryDate ? `, since ${fmt.full(info.firstEntryDate)}` : ''}. Database size ${bytes(info.databaseBytes)}.` : undefined}>
          <Row title="Export everything as JSON" hint="Trackers, records, tags, people, reminders and settings in one readable file.">
            <Button icon={<Download className="h-4 w-4" />} busy={busy === 'json'} onClick={() => void file('json', () => api.exportJson(), (r) => `Exported ${plural(r.count ?? 0, 'record')}`)}>
              Export JSON
            </Button>
          </Row>
          <Row title="Export records as CSV" hint="One row per record, ready for a spreadsheet.">
            <Button icon={<Table className="h-4 w-4" />} busy={busy === 'csv'} onClick={() => void file('csv', () => api.exportCsv(), (r) => `Exported ${plural(r.count ?? 0, 'row')}`)}>
              Export CSV
            </Button>
          </Row>
          <Row title="Back up the database" hint="A complete copy you can restore later or move to another computer.">
            <Button icon={<Database className="h-4 w-4" />} busy={busy === 'backup'} onClick={() => void file('backup', () => api.backupDatabase(), () => 'Backup saved')}>
              Save backup
            </Button>
          </Row>
          <Row title="Restore from a backup" hint="Replaces the current data after restarting. The current database is kept next to it as a safety copy.">
            <Button icon={<RotateCcw className="h-4 w-4" />} onClick={() => setRestoring(true)}>
              Restore…
            </Button>
          </Row>
          <Row title="Data folder" hint={<span className="selectable break-all">{info?.dataPath ?? '…'}</span>}>
            <Button icon={<FolderOpen className="h-4 w-4" />} onClick={() => void api.openDataFolder()}>
              Open folder
            </Button>
          </Row>
        </Section>

        <Section title="Keyboard">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {SHORTCUTS.map(([keys, what]) => (
              <div key={keys} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{what}</span>
                <Kbd>{keys}</Kbd>
              </div>
            ))}
          </div>
        </Section>

        <p className="pb-2 text-center text-xs text-faint">
          Chimero {info?.version ?? ''} · {info?.platform ?? ''} · no account, no cloud, no telemetry
        </p>
      </div>

      <ConfirmDialog
        open={restoring}
        onClose={() => setRestoring(false)}
        confirmLabel="Choose backup and restart"
        title="Restore from a backup?"
        onConfirm={() => {
          setRestoring(false)
          void file('restore', () => api.restoreDatabase(), () => 'Restoring…')
        }}
      >
        Everything currently in Chimero is replaced by the backup you choose, and the app restarts. Your current database is kept in the data folder as a “before-restore” copy.
      </ConfirmDialog>
    </PageShell>
  )
}
