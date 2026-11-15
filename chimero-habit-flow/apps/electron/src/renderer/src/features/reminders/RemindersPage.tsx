import { useState } from 'react'
import type { Reminder } from '@contracts/contracts'
import { Bell, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, must } from '@/lib/api'
import { cn } from '@/lib/cn'
import { fmt, todayStr } from '@/lib/dates'
import { useAction, useData, usePreferences, useTrackers } from '@/lib/queries'
import { WEEKDAYS, clock, isDoneOn, occursOn, scheduleText } from '@/lib/reminders'
import { PageShell } from '@/shell/PageHeader'
import { ConfirmDialog, Dialog } from '@/ui/dialog'
import { Button, Empty, Field, IconButton, Input, Segmented, Select, Switch, Textarea } from '@/ui/primitives'

type Draft = { id?: number; title: string; description: string; time: string; repeat: 'once' | 'repeat'; date: string; days: number[]; trackerId: number | null }

function draftOf(reminder?: Reminder): Draft {
  return {
    id: reminder?.id,
    title: reminder?.title ?? '',
    description: reminder?.description ?? '',
    time: reminder?.time?.slice(0, 5) || '09:00',
    repeat: reminder ? (reminder.date ? 'once' : 'repeat') : 'repeat',
    date: reminder?.date ?? todayStr(),
    days: reminder?.days ?? [],
    trackerId: reminder?.trackerId ?? null,
  }
}

export function RemindersPage() {
  const prefs = usePreferences()
  const run = useAction()
  const { data: reminders = [], isLoading } = useData(['reminders'], () => api.getReminders())
  const { data: trackers = [] } = useTrackers()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [removing, setRemoving] = useState<Reminder | null>(null)
  const today = todayStr()

  const sorted = [...reminders].sort((a, b) => a.time.localeCompare(b.time))
  const todays = sorted.filter((r) => r.enabled && occursOn(r, today))
  const upcoming = sorted.filter((r) => r.date && r.date > today).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const repeating = sorted.filter((r) => !r.date)
  const past = sorted.filter((r) => r.date && r.date < today).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  const row = (reminder: Reminder, day?: string) => {
    const done = day ? isDoneOn(reminder, day) : !!reminder.date && !!reminder.completedAt
    const tracker = trackers.find((t) => t.id === reminder.trackerId)
    return (
      <li key={`${day ?? 'all'}-${reminder.id}`} className="group flex items-center gap-3 border-t border-line/60 px-4 py-2.5 first:border-t-0">
        {day || reminder.date ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={`${reminder.title}, done`}
            onClick={() => void run(() => must(done ? api.uncompleteReminder(reminder.id) : api.completeReminder(reminder.id), 'The reminder was not updated'))}
            className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border', done ? 'border-transparent bg-good text-black/80' : 'border-faint hover:border-text')}
          >
            {done && <Check className="h-3 w-3" strokeWidth={4} />}
          </button>
        ) : (
          <Switch checked={reminder.enabled} label={`${reminder.title}, enabled`} onChange={(enabled) => void run(() => must(api.toggleReminder(reminder.id, enabled), 'The reminder was not updated'))} />
        )}
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-base font-medium', (done || !reminder.enabled) && 'text-faint', done && 'line-through')}>{reminder.title}</p>
          <p className="truncate text-sm text-muted">
            {[scheduleText(reminder, fmt.full), tracker?.name, reminder.description].filter(Boolean).join(' · ')}
          </p>
        </div>
        <span className="num shrink-0 text-lg text-muted">{clock(reminder.time, prefs.timeFormat)}</span>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <IconButton label="Edit" size="sm" onClick={() => setDraft(draftOf(reminder))}>
            <Pencil className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Delete" size="sm" tone="danger" onClick={() => setRemoving(reminder)}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </li>
    )
  }

  const block = (title: string, items: Reminder[], day?: string) =>
    items.length > 0 && (
      <section>
        <h2 className="mb-2 px-1 text-sm font-medium text-muted">{title}</h2>
        <ul className="card overflow-hidden">{items.map((reminder) => row(reminder, day))}</ul>
      </section>
    )

  return (
    <PageShell
      title="Reminders"
      subtitle={prefs.notifications ? 'You get a desktop notification when one is due.' : 'Desktop notifications are off in Settings; reminders still show here and on Today.'}
      actions={
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setDraft(draftOf())}>
          New reminder
        </Button>
      }
    >
      {reminders.length === 0 && !isLoading ? (
        <Empty icon={<Bell />} title="No reminders yet" action={<Button variant="primary" onClick={() => setDraft(draftOf())}>Create one</Button>}>
          Set a time to be nudged — to weigh in each morning, take a vitamin, or call someone on a date.
        </Empty>
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {block('Today', todays, today)}
          {block('Coming up', upcoming)}
          {block('Repeating', repeating)}
          {block('Past', past)}
        </div>
      )}
      {draft && <ReminderDialog draft={draft} onClose={() => setDraft(null)} />}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Delete this reminder?"
        onConfirm={() => {
          const id = removing?.id
          setRemoving(null)
          if (id) void run(() => must(api.deleteReminder(id), 'The reminder was not deleted'))
        }}
      >
        “{removing?.title}” will stop notifying you.
      </ConfirmDialog>
    </PageShell>
  )
}

function ReminderDialog({ draft: initial, onClose }: { draft: Draft; onClose: () => void }) {
  const run = useAction()
  const { data: trackers = [] } = useTrackers()
  const [draft, setDraft] = useState(initial)
  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }))
  const valid = !!draft.title.trim() && /^\d{2}:\d{2}$/.test(draft.time) && (draft.repeat === 'repeat' || !!draft.date)

  const save = async () => {
    if (!valid) return
    const saved = await run(() =>
      must(
        api.upsertReminder({
          id: draft.id,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          time: draft.time,
          date: draft.repeat === 'once' ? draft.date : null,
          days: draft.repeat === 'repeat' && draft.days.length > 0 && draft.days.length < 7 ? draft.days : null,
          trackerId: draft.trackerId,
          enabled: true,
        }),
        'The reminder was not saved',
      ),
    )
    if (saved) onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={draft.id ? 'Edit reminder' : 'New reminder'}
      width={460}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="reminder-form" disabled={!valid}>
            Save
          </Button>
        </>
      }
    >
      <form
        id="reminder-form"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <Field label="Remind me to">{(id) => <Input id={id} autoFocus value={draft.title} onChange={(event) => set({ title: event.target.value })} placeholder="Weigh in, take vitamin D, call Mum…" />}</Field>
        <div className="flex items-end gap-3">
          <Field label="At" className="w-[130px]">
            {(id) => <Input id={id} type="time" value={draft.time} onChange={(event) => set({ time: event.target.value })} />}
          </Field>
          <Segmented value={draft.repeat} onChange={(repeat) => set({ repeat })} options={[{ value: 'repeat', label: 'Repeats' }, { value: 'once', label: 'One date' }]} label="Schedule" />
        </div>
        {draft.repeat === 'once' ? (
          <Field label="On">{(id) => <Input id={id} type="date" value={draft.date} onChange={(event) => set({ date: event.target.value })} className="w-[170px]" />}</Field>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted">On these days</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const on = draft.days.length === 0 || draft.days.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const current = draft.days.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : draft.days
                      const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
                      // Clearing every day would never fire, so that resets to every day.
                      set({ days: next.length === 0 || next.length === 7 ? [] : next })
                    }}
                    className={cn('h-8 w-11 rounded-control border text-sm font-medium transition-colors', on ? 'border-accent/60 bg-accent/15 text-text' : 'border-line text-faint hover:text-text')}
                  >
                    {WEEKDAYS[day]}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-faint">{draft.days.length === 0 ? 'Every day.' : 'Tap a day to turn it off.'}</p>
          </div>
        )}
        <Field label="About" hint="Optional. Shown next to the reminder.">
          {(id) => (
            <Select id={id} value={draft.trackerId ?? ''} onChange={(event) => set({ trackerId: event.target.value ? Number(event.target.value) : null })}>
              <option value="">No tracker</option>
              {trackers.map((tracker) => (
                <option key={tracker.id} value={tracker.id}>
                  {tracker.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Note">{(id) => <Textarea id={id} rows={2} value={draft.description} onChange={(event) => set({ description: event.target.value })} placeholder="Optional" />}</Field>
      </form>
    </Dialog>
  )
}
