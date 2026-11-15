import { useState } from 'react'
import type { Book, BookShelf, Tracker } from '@contracts/contracts'
import { Plus, Trash2 } from 'lucide-react'
import { api, must } from '@/lib/api'
import { fmt } from '@/lib/dates'
import { convertWeight, num, plural } from '@/lib/format'
import { useAction, useData, usePreferences } from '@/lib/queries'
import { Section } from '@/shell/PageHeader'
import { ConfirmDialog } from '@/ui/dialog'
import { Button, Empty, IconButton, Input, Segmented, Select } from '@/ui/primitives'
import { parseNumber } from '../entry/shared'

/** The active weight goal, converted to the unit the app displays. */
export function useWeightGoal(trackerId: number | null, unit: 'kg' | 'lb'): { value: number | null } {
  const { data } = useData(['weight-goal', trackerId ?? 0], () => (trackerId ? api.getWeightGoal(trackerId) : Promise.resolve({ goal: null })), { enabled: !!trackerId })
  const goal = data?.goal
  return { value: goal?.active ? convertWeight(goal.targetValue, goal.unit, unit) : null }
}

export function WeightGoal({ tracker }: { tracker: Tracker }) {
  const prefs = usePreferences()
  const run = useAction()
  const goal = useWeightGoal(tracker.id, prefs.weightUnit)
  const { data: detail } = useData(['weight-detail', tracker.id], () => api.getWeightDetail(tracker.id, { limit: 1 }))
  const [draft, setDraft] = useState<string | null>(null)
  const current = detail?.current ? convertWeight(detail.current.weight, detail.current.weightUnit, prefs.weightUnit) : null
  const target = parseNumber(draft ?? '')

  const save = async () => {
    if (target == null || target <= 0) return
    const direction = current == null || Math.abs(current - target) < 0.05 ? 'maintain' : target < current ? 'decrease' : 'increase'
    const saved = await run(() => api.setWeightGoal({ trackerId: tracker.id, goalType: 'target', targetValue: target, unit: prefs.weightUnit, direction }), { failure: 'The goal was not saved' })
    if (saved) setDraft(null)
  }

  return (
    <Section title="Goal" hint={goal.value == null ? 'Set a target weight to see it on the chart.' : undefined}>
      {draft == null ? (
        goal.value == null ? (
          <Button onClick={() => setDraft('')}>Set a target</Button>
        ) : (
          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <p className="num text-3xl font-semibold">
                {num(goal.value)} <span className="text-lg text-muted">{prefs.weightUnit}</span>
              </p>
              {current != null && <p className="mt-1 text-sm text-muted">{Math.abs(current - goal.value) < 0.05 ? 'You are there.' : `${num(Math.abs(current - goal.value))} ${prefs.weightUnit} to go from ${num(current)}.`}</p>}
            </div>
            <Button size="sm" onClick={() => setDraft(String(Math.round((goal.value as number) * 10) / 10))}>
              Change
            </Button>
          </div>
        )
      ) : (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <Input autoFocus inputMode="decimal" aria-label={`Target weight in ${prefs.weightUnit}`} value={draft} onChange={(event) => setDraft(event.target.value.replace(',', '.'))} placeholder={`Target (${prefs.weightUnit})`} className="w-36" />
          <Button variant="primary" type="submit" disabled={target == null || target <= 0}>
            Save
          </Button>
          <Button variant="ghost" onClick={() => setDraft(null)}>
            Cancel
          </Button>
          {goal.value != null && (
            <Button
              variant="ghost"
              className="ml-auto text-bad hover:bg-bad/15 hover:text-bad"
              onClick={() => void run(() => api.setWeightGoal({ trackerId: tracker.id, goalType: 'target', targetValue: goal.value as number, active: false })).then(() => setDraft(null))}
            >
              Remove
            </Button>
          )}
        </form>
      )}
    </Section>
  )
}

const SHELVES: Array<{ value: BookShelf; label: string }> = [
  { value: 'reading', label: 'Reading' },
  { value: 'tbr', label: 'To read' },
  { value: 'finished', label: 'Finished' },
  { value: 'paused', label: 'Paused' },
  { value: 'dropped', label: 'Dropped' },
]

const STATUS: Record<BookShelf, Book['status']> = { reading: 'active', tbr: 'planned', finished: 'completed', paused: 'paused', dropped: 'dropped' }

export function BookLibrary() {
  const run = useAction()
  const { data: books = [] } = useData(['books'], () => api.getBooks())
  const [shelf, setShelf] = useState<BookShelf>('reading')
  const [title, setTitle] = useState('')
  const counts = new Map<BookShelf, number>()
  for (const book of books) counts.set(book.shelf, (counts.get(book.shelf) ?? 0) + 1)
  const shown = books.filter((book) => book.shelf === shelf).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  const duplicate = books.some((book) => book.title.trim().toLowerCase() === title.trim().toLowerCase())

  const add = async () => {
    if (!title.trim() || duplicate) return
    const created = await run(() => must(api.createBook({ title: title.trim(), shelf, status: STATUS[shelf] }), 'The book was not added'))
    if (created) setTitle('')
  }

  return (
    <Section title="Library" hint={books.length > 0 ? plural(books.length, 'book') : undefined}>
      <Segmented size="sm" value={shelf} onChange={setShelf} options={SHELVES.filter((item) => item.value === shelf || (counts.get(item.value) ?? 0) > 0 || item.value === 'tbr' || item.value === 'reading').map((item) => ({ value: item.value, label: `${item.label}${counts.get(item.value) ? ` ${counts.get(item.value)}` : ''}` }))} label="Shelf" className="mb-3 max-w-full flex-wrap" />
      {shown.length === 0 ? (
        <p className="py-3 text-sm text-muted">Nothing on this shelf.</p>
      ) : (
        <ul className="-mx-1 mb-3 flex max-h-72 flex-col overflow-y-auto">
          {shown.map((book) => (
            <li key={book.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{book.title}</p>
                <p className="truncate text-xs text-faint">
                  {[book.startedDate && `started ${fmt.relativeDay(book.startedDate)}`, book.finishedDate && `finished ${fmt.relativeDay(book.finishedDate)}`, book.ratingTenths != null && `${num(book.ratingTenths / 10)} / 5`].filter(Boolean).join(' · ') || 'Not started'}
                </p>
              </div>
              <Select
                aria-label={`Shelf for ${book.title}`}
                value={book.shelf}
                onChange={(event) => {
                  const next = event.target.value as BookShelf
                  void run(() => must(api.updateBook(book.id, { shelf: next, status: STATUS[next] }), 'The book was not moved'))
                }}
                className="h-7 w-[104px] shrink-0 text-xs"
              >
                {SHELVES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
              {book.shelf === 'finished' && (
                <Select
                  aria-label={`Rating for ${book.title}`}
                  value={book.ratingTenths ?? ''}
                  onChange={(event) => void run(() => must(api.updateBook(book.id, { ratingTenths: event.target.value ? Number(event.target.value) : null }), 'The rating was not saved'))}
                  className="h-7 w-[68px] shrink-0 text-xs"
                >
                  <option value="">Rate</option>
                  {[50, 45, 40, 35, 30, 25, 20, 15, 10].map((tenths) => (
                    <option key={tenths} value={tenths}>
                      {tenths / 10}
                    </option>
                  ))}
                </Select>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void add()
        }}
      >
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`Add a book to “${SHELVES.find((item) => item.value === shelf)?.label}”`} aria-label="Book title" />
        <Button type="submit" disabled={!title.trim() || duplicate} icon={<Plus className="h-4 w-4" />}>
          Add
        </Button>
      </form>
      {duplicate && title.trim() && <p className="mt-1 text-xs text-warn">That book is already in your library.</p>}
    </Section>
  )
}

export function RoutineList({ tracker }: { tracker: Tracker }) {
  const run = useAction()
  const { data } = useData(['workout-routines', tracker.id], () => api.getWorkoutRoutines(tracker.id))
  const [removing, setRemoving] = useState<{ id: number; name: string } | null>(null)
  const routines = data?.routines ?? []
  return (
    <Section title="Routines" hint="Saved workouts you can start from when logging.">
      {routines.length === 0 ? (
        <Empty title="No routines yet" className="py-4">
          Log a workout and switch on “Keep as a routine”.
        </Empty>
      ) : (
        <ul className="flex flex-col gap-1">
          {routines.map((routine) => (
            <li key={routine.id} className="group flex items-center gap-2 rounded-lg py-1">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{routine.name}</p>
                <p className="truncate text-xs text-faint">{routine.exercises.map((exercise) => exercise.exerciseName).join(', ') || 'No exercises'}</p>
              </div>
              <span className="shrink-0 text-xs text-muted">{plural(routine.exercises.length, 'exercise')}</span>
              <IconButton label="Delete routine" size="sm" tone="danger" onClick={() => setRemoving(routine)}>
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Delete “${removing?.name ?? ''}”?`}
        onConfirm={() => {
          const id = removing?.id
          setRemoving(null)
          if (id) void run(() => must(api.deleteWorkoutRoutine(id).then((result) => result.success), 'The routine was not deleted'))
        }}
      >
        Workouts you already logged from it stay in your history.
      </ConfirmDialog>
    </Section>
  )
}
