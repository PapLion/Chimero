import { useEffect, useMemo, useState } from 'react'
import type { Tracker } from '@contracts/contracts'
import { ArrowLeft, Search, Trash2 } from 'lucide-react'
import { api, must } from '@/lib/api'
import { cn } from '@/lib/cn'
import { fmt, timeOf, todayStr } from '@/lib/dates'
import { TrackerIcon } from '@/lib/icons'
import { useAction, useData, useTrackers } from '@/lib/queries'
import { useApp, type EntryRequest } from '@/lib/store'
import { IDENTITY_BLURB, colorOf, identityOf } from '@/lib/trackers'
import { ConfirmDialog, Dialog } from '@/ui/dialog'
import { Button, Empty, Input, Kbd, Spinner } from '@/ui/primitives'
import { ENTRY_FORM_ID, type EntryFormProps } from './shared'
import { FoodForm, GamingForm, GenericForm, HealthForm, IntakeForm, MediaForm, MoodForm, TaskForm, WeightForm } from './forms/simple'
import { BookForm, SocialForm } from './forms/structured'
import { WorkoutForm } from './forms/WorkoutForm'

/** The one place records are created and edited, for every kind of tracker. */
export function EntryDialog() {
  const request = useApp((state) => state.entry)
  const close = useApp((state) => state.closeEntry)
  if (!request) return null
  return <EntrySession key={request.edit?.entryId ?? 'new'} request={request} onClose={close} />
}

function EntrySession({ request, onClose }: { request: EntryRequest; onClose: () => void }) {
  const selectedDate = useApp((state) => state.selectedDate)
  const { data: trackers = [] } = useTrackers()
  const editId = request.edit?.entryId
  const { data: loaded, isLoading } = useData(['entry', editId ?? 0], () => (editId ? api.getEntries({ id: editId }) : Promise.resolve([])), { enabled: !!editId, gcTime: 0 })
  const entry = editId ? loaded?.[0] : undefined

  const [trackerId, setTrackerId] = useState<number | null>(request.edit?.trackerId ?? request.trackerId ?? null)
  const [date, setDate] = useState(request.date ?? selectedDate)
  const [time, setTime] = useState(() => timeOf(Date.now()))
  const [confirming, setConfirming] = useState(false)
  const run = useAction()

  // An existing record opens on its own day and time.
  useEffect(() => {
    if (!entry) return
    setDate(entry.dateStr)
    setTime(timeOf(entry.timestamp))
  }, [entry])

  const tracker = trackers.find((item) => item.id === trackerId)
  const missing = !!editId && !isLoading && !entry

  const remove = async () => {
    if (!entry) return
    const done = await run(() => {
      if (entry.session) return must(api.deleteWorkoutSession(entry.id), 'The workout was not deleted')
      if (entry.weight) return must(api.deleteWeightEntry(entry.id), 'The weigh-in was not deleted')
      return must(api.deleteEntry(entry.id), 'The record was not deleted')
    })
    setConfirming(false)
    if (done) onClose()
  }

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        width={tracker && identityOf(tracker) === 'exercise' ? 620 : 540}
        icon={
          tracker ? (
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${colorOf(tracker)}22` }}>
              <TrackerIcon name={tracker.icon} color={colorOf(tracker)} className="h-[18px] w-[18px]" />
            </span>
          ) : undefined
        }
        title={tracker ? tracker.name : 'Log something'}
        description={tracker ? (editId ? 'Editing a record' : IDENTITY_BLURB[identityOf(tracker)]) : 'Pick what you want to record.'}
        footer={
          tracker && !missing ? (
            <>
              {entry && (
                <Button variant="ghost" className="mr-auto text-bad hover:bg-bad/15 hover:text-bad" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirming(true)}>
                  Delete
                </Button>
              )}
              {!editId && request.trackerId == null && (
                <Button variant="ghost" className="mr-auto" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setTrackerId(null)}>
                  All trackers
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" form={ENTRY_FORM_ID} data-testid="entry-save">
                {editId ? 'Save changes' : 'Save'}
                <Kbd>↵</Kbd>
              </Button>
            </>
          ) : undefined
        }
      >
        {!tracker ? (
          <TrackerPicker trackers={trackers} onPick={setTrackerId} />
        ) : editId && isLoading ? (
          <div className="grid h-40 place-items-center">
            <Spinner />
          </div>
        ) : missing ? (
          <Empty title="This record no longer exists">It may have been deleted from another view.</Empty>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Input type="date" aria-label="Date" value={date} max={identityOf(tracker) === 'tasks' ? undefined : todayStr()} onChange={(event) => event.target.value && setDate(event.target.value)} className="w-[150px]" />
              {identityOf(tracker) !== 'tasks' && <Input type="time" aria-label="Time" value={time} onChange={(event) => event.target.value && setTime(event.target.value)} className="w-[118px]" />}
              <span className="text-sm text-muted">{fmt.relativeDay(date)}</span>
            </div>
            <TrackerForm key={`${tracker.id}:${entry?.id ?? 'new'}`} tracker={tracker} date={date} time={time} entry={entry} onDone={onClose} />
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={confirming} onClose={() => setConfirming(false)} onConfirm={() => void remove()} title="Delete this record?">
        It is removed from your history, charts and statistics. This cannot be undone.
      </ConfirmDialog>
    </>
  )
}

function TrackerForm(props: EntryFormProps) {
  const { tracker, entry } = props
  switch (identityOf(tracker)) {
    case 'weight':
      return <WeightForm {...props} />
    case 'mood':
      return <MoodForm {...props} />
    case 'tasks':
      return <TaskForm {...props} />
    case 'exercise':
      return <WorkoutForm {...props} />
    case 'social':
      return <SocialForm {...props} />
    // Records made before a tracker had its own fields stay editable as plain entries.
    case 'books':
      return entry && !entry.book ? <GenericForm {...props} /> : <BookForm {...props} />
    case 'gaming':
      return entry && !entry.gaming ? <GenericForm {...props} /> : <GamingForm {...props} />
    case 'diet':
      return entry && !entry.food ? <GenericForm {...props} /> : <FoodForm {...props} />
    case 'health':
      return entry && !entry.health ? <GenericForm {...props} /> : <HealthForm {...props} />
    case 'intake':
      return entry && !entry.intake ? <GenericForm {...props} /> : <IntakeForm {...props} />
    case 'tv':
      return <MediaForm {...props} flavor="tv" />
    case 'media':
      return <MediaForm {...props} flavor="media" />
    default:
      return <GenericForm {...props} />
  }
}

function TrackerPicker({ trackers, onPick }: { trackers: Tracker[]; onPick: (id: number) => void }) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const { data: context } = useData(['quick-entry-context'], () => api.getQuickEntryContext())

  const ordered = useMemo(() => {
    // Favourites, then what was logged most recently, then everything else in sidebar order.
    const rank = new Map<number, number>()
    context?.favoriteTrackers.forEach((tracker, i) => rank.set(tracker.id, i))
    context?.recentTrackers.forEach((tracker, i) => !rank.has(tracker.id) && rank.set(tracker.id, 100 + i))
    const needle = query.trim().toLowerCase()
    return trackers
      .filter((tracker) => !needle || tracker.name.toLowerCase().includes(needle) || identityOf(tracker).includes(needle))
      .sort((a, b) => (rank.get(a.id) ?? 1000 + a.order) - (rank.get(b.id) ?? 1000 + b.order))
  }, [trackers, context, query])

  const active = Math.min(cursor, Math.max(0, ordered.length - 1))
  const columns = 2

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          autoFocus
          value={query}
          placeholder="Type to filter, Enter to pick"
          aria-label="Find a tracker"
          className="pl-9"
          onChange={(event) => {
            setQuery(event.target.value)
            setCursor(0)
          }}
          onKeyDown={(event) => {
            const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[event.key]
            if (step !== undefined) {
              event.preventDefault()
              setCursor(Math.max(0, Math.min(ordered.length - 1, active + step)))
            } else if (event.key === 'Enter' && ordered[active]) {
              event.preventDefault()
              onPick(ordered[active].id)
            }
          }}
        />
      </div>
      {ordered.length === 0 ? (
        <Empty title="No tracker matches">{trackers.length === 0 ? 'Create a tracker first from the Trackers page.' : 'Try a different word.'}</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-1.5" role="listbox" aria-label="Trackers">
          {ordered.map((tracker, index) => (
            <button
              key={tracker.id}
              type="button"
              role="option"
              aria-selected={index === active}
              data-testid={`pick-tracker-${tracker.id}`}
              onMouseEnter={() => setCursor(index)}
              onClick={() => onPick(tracker.id)}
              className={cn('flex h-12 items-center gap-2.5 rounded-control border px-2.5 text-left transition-colors', index === active ? 'border-accent/60 bg-accent/10' : 'border-line/70 hover:border-faint/60')}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${colorOf(tracker)}22` }}>
                <TrackerIcon name={tracker.icon} color={colorOf(tracker)} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-base font-medium">{tracker.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
