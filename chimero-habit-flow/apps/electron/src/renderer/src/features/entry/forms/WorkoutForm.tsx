import { useEffect, useRef, useState } from 'react'
import type { WorkoutSessionExerciseInput, WorkoutSessionReadModel, WorkoutWeightUnit } from '@contracts/contracts'
import type { Exercise } from '@contracts/features/exercises'
import { Copy, Plus, Search, Trash2, X } from 'lucide-react'
import { api, must } from '@/lib/api'
import { timestampFor } from '@/lib/dates'
import { useAction, useData, usePreferences } from '@/lib/queries'
import { Field, IconButton, Input, Segmented, Spinner, Switch } from '@/ui/primitives'
import { EntryForm, ExtrasFields, NoteField, NumberInput, Suggestions, parseNumber, useExtras, when, type EntryFormProps } from '../shared'
import { GenericForm } from './simple'

interface DraftSet {
  reps: string
  load: string
}

interface DraftExercise {
  key: string
  /** Everything the session stores about the exercise except its sets. */
  info: Omit<WorkoutSessionExerciseInput, 'sets' | 'orderIndex'>
  sets: DraftSet[]
}

let nextKey = 0
const newKey = () => `x${nextKey++}`
const text = (value: number | null | undefined) => (value == null ? '' : String(value))

function fromCatalogue(exercise: Exercise): DraftExercise {
  return {
    key: newKey(),
    info: {
      exerciseId: exercise.id,
      sourceExerciseId: exercise.id,
      name: exercise.name,
      category: exercise.category || null,
      level: exercise.level || null,
      equipment: exercise.equipment,
      bodyPartSnapshot: exercise.primaryMuscles,
      secondaryBodyPartSnapshot: exercise.secondaryMuscles,
      force: exercise.force,
      mechanic: exercise.mechanic,
    },
    sets: [{ reps: '', load: '' }],
  }
}

function custom(name: string): DraftExercise {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'exercise'
  return { key: newKey(), info: { exerciseId: `custom:${slug}`, name }, sets: [{ reps: '', load: '' }] }
}

function fromInput(exercise: WorkoutSessionExerciseInput): DraftExercise {
  const { sets, orderIndex: _order, ...info } = exercise
  return { key: newKey(), info, sets: sets.length > 0 ? sets.map((set) => ({ reps: text(set.reps), load: text(set.load) })) : [{ reps: '', load: '' }] }
}

function fromSession(session: WorkoutSessionReadModel): DraftExercise[] {
  return session.exercises.map((exercise) => ({
    key: newKey(),
    info: {
      exerciseId: exercise.exerciseId,
      sourceExerciseId: exercise.sourceExerciseId ?? null,
      name: exercise.exerciseName,
      category: exercise.category,
      level: exercise.level,
      equipment: exercise.equipment,
      bodyPartSnapshot: exercise.bodyPartSnapshot ?? [],
      secondaryBodyPartSnapshot: exercise.secondaryBodyPartSnapshot ?? [],
      force: exercise.force,
      mechanic: exercise.mechanic,
    },
    sets: exercise.sets.length > 0 ? exercise.sets.map((set) => ({ reps: text(set.reps), load: text(set.load) })) : [{ reps: '', load: '' }],
  }))
}

/** Loads the stored session when editing, then hands over to the editor. */
export function WorkoutForm(props: EntryFormProps) {
  const { entry } = props
  const { data, isLoading } = useData(['workout-session', entry?.id ?? 0], () => (entry ? api.getWorkoutSession(entry.id) : Promise.resolve(null)), { enabled: !!entry, gcTime: 0 })
  if (entry && isLoading) return <div className="grid h-40 place-items-center"><Spinner /></div>
  // Workouts logged before sessions existed are plain entries: a note and minutes.
  if (entry && !data) return <GenericForm {...props} />
  return <SessionEditor key={data?.session.entryId ?? 'new'} {...props} session={data?.session} />
}

function SessionEditor(props: EntryFormProps & { session?: WorkoutSessionReadModel }) {
  const { tracker, entry, session, onDone, date, time } = props
  const prefs = usePreferences()
  const run = useAction()
  const extras = useExtras(entry)
  const [name, setName] = useState(session?.sessionName ?? session?.title ?? '')
  const [minutes, setMinutes] = useState(text(session?.durationMinutes))
  const [unit, setUnit] = useState<WorkoutWeightUnit>(session?.loadUnit ?? prefs.weightUnit)
  const [note, setNote] = useState(session?.note ?? '')
  const [routineId, setRoutineId] = useState<number | null>(session?.routineId ?? null)
  const [exercises, setExercises] = useState<DraftExercise[]>(session ? fromSession(session) : [])
  const [keepAsRoutine, setKeepAsRoutine] = useState(false)
  const { data: routines } = useData(['workout-routines', tracker.id], () => api.getWorkoutRoutines(tracker.id))

  const startFrom = async (id: number) => {
    const draft = await run(() => must(api.instantiateWorkoutFromRoutine({ routineId: id, timestamp: timestampFor(date, time) }), 'That routine could not be loaded'))
    if (!draft) return
    setRoutineId(id)
    setName(draft.sessionName ?? '')
    setUnit(draft.loadUnit)
    setExercises(draft.exercises.map(fromInput))
    setKeepAsRoutine(false)
  }

  const patch = (key: string, change: (exercise: DraftExercise) => DraftExercise) => setExercises((list) => list.map((exercise) => (exercise.key === key ? change(exercise) : exercise)))
  const setSet = (key: string, index: number, value: Partial<DraftSet>) => patch(key, (exercise) => ({ ...exercise, sets: exercise.sets.map((set, i) => (i === index ? { ...set, ...value } : set)) }))

  const save = async () => {
    const payload = {
      timestamp: when(props),
      sessionName: name.trim() || null,
      note: note.trim() || null,
      routineId,
      durationMinutes: parseNumber(minutes),
      loadUnit: unit,
      assetId: extras.assetId,
      tagIds: extras.tagIds,
      exercises: exercises.map((exercise, orderIndex) => ({
        ...exercise.info,
        orderIndex,
        sets: exercise.sets.map((set, i) => ({ setIndex: i + 1, reps: parseNumber(set.reps), load: parseNumber(set.load) })),
      })),
    }
    if (entry) return must(api.updateWorkoutSession(entry.id, payload), 'The workout was not saved')
    const created = await must(api.createWorkoutSession({ trackerId: tracker.id, ...payload }), 'The workout was not saved')
    if (keepAsRoutine && name.trim()) await must(api.saveWorkoutAsRoutine({ sessionEntryId: created.session.entryId, name: name.trim() }), 'The workout was saved, but the routine was not')
    return created
  }

  return (
    <EntryForm onDone={onDone} valid={exercises.length > 0} save={save}>
      {!entry && <Suggestions items={routines?.routines ?? []} label="Start from a routine" onPick={(routine) => void startFrom(routine.id)} render={(routine) => routine.name} active={(routine) => routine.id === routineId} />}
      <div className="grid grid-cols-[1fr_110px_auto] items-end gap-3">
        <Field label="Session">{(id) => <Input id={id} value={name} onChange={(event) => setName(event.target.value)} placeholder="Push day, legs, morning run…" />}</Field>
        <Field label="Minutes">{(id) => <NumberInput id={id} value={minutes} onChange={setMinutes} placeholder="—" className="text-base" />}</Field>
        <Segmented value={unit} onChange={setUnit} options={[{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }]} label="Load unit" />
      </div>

      <div className="flex flex-col gap-2.5">
        {exercises.map((exercise) => (
          <div key={exercise.key} className="rounded-control border border-line p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{exercise.info.name}</p>
                <p className="truncate text-xs text-faint">{[...(exercise.info.bodyPartSnapshot ?? []), exercise.info.equipment].filter(Boolean).join(' · ') || 'Custom exercise'}</p>
              </div>
              <IconButton label="Remove exercise" size="sm" tone="danger" onClick={() => setExercises((list) => list.filter((item) => item.key !== exercise.key))}>
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </div>
            <div className="mt-2.5 grid grid-cols-[28px_1fr_1fr_24px] items-center gap-x-2 gap-y-1.5">
              <span />
              <span className="text-xs text-faint">Reps</span>
              <span className="text-xs text-faint">Load ({unit})</span>
              <span />
              {exercise.sets.map((set, index) => (
                <SetRow
                  key={index}
                  index={index}
                  set={set}
                  name={exercise.info.name}
                  onChange={(value) => setSet(exercise.key, index, value)}
                  onRemove={exercise.sets.length > 1 ? () => patch(exercise.key, (item) => ({ ...item, sets: item.sets.filter((_, i) => i !== index) })) : undefined}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => patch(exercise.key, (item) => ({ ...item, sets: [...item.sets, { ...item.sets[item.sets.length - 1] }] }))}
              className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted hover:bg-raised hover:text-text"
            >
              <Copy className="h-3 w-3" />
              Add set
            </button>
          </div>
        ))}
        <ExercisePicker autoFocus={!entry && exercises.length === 0} onAdd={(exercise) => setExercises((list) => [...list, exercise])} taken={exercises.map((exercise) => exercise.info.exerciseId)} />
      </div>

      {!entry && routineId == null && exercises.length > 0 && (
        <label className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2 text-sm">
          <span>
            Keep as a routine
            <span className="block text-xs text-faint">{name.trim() ? `Saved as “${name.trim()}” so you can start from it next time.` : 'Give the session a name first.'}</span>
          </span>
          <Switch checked={keepAsRoutine && !!name.trim()} onChange={setKeepAsRoutine} label="Keep as a routine" disabled={!name.trim()} />
        </label>
      )}
      <NoteField value={note} onChange={setNote} placeholder="How it felt, what to change next time" />
      <ExtrasFields extras={extras} />
    </EntryForm>
  )
}

function SetRow({ index, set, name, onChange, onRemove }: { index: number; set: DraftSet; name: string; onChange: (value: Partial<DraftSet>) => void; onRemove?: () => void }) {
  return (
    <>
      <span className="num text-center text-sm text-faint">{index + 1}</span>
      <NumberInput value={set.reps} onChange={(reps) => onChange({ reps })} placeholder="—" aria-label={`${name}, set ${index + 1}, reps`} className="h-8 text-base" />
      <NumberInput value={set.load} onChange={(load) => onChange({ load })} placeholder="—" aria-label={`${name}, set ${index + 1}, load`} className="h-8 text-base" />
      {onRemove ? (
        <button type="button" aria-label={`Remove set ${index + 1}`} onClick={onRemove} className="grid h-6 w-6 place-items-center rounded-md text-faint hover:bg-raised hover:text-text">
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span />
      )}
    </>
  )
}

function ExercisePicker({ onAdd, taken, autoFocus }: { onAdd: (exercise: DraftExercise) => void; taken: string[]; autoFocus?: boolean }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Exercise[]>([])
  const [cursor, setCursor] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const needle = query.trim()

  useEffect(() => {
    if (!needle) {
      setResults([])
      return
    }
    let live = true
    const timer = setTimeout(() => {
      void api.searchExercises(needle, 8).then((found) => {
        if (!live) return
        setResults(found)
        setCursor(0)
      })
    }, 90)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [needle])

  const options = results.filter((exercise) => !taken.includes(exercise.id))
  const exact = results.some((exercise) => exercise.name.toLowerCase() === needle.toLowerCase())
  const total = options.length + (needle && !exact ? 1 : 0)
  const choose = (index: number) => {
    if (index < options.length) onAdd(fromCatalogue(options[index]))
    else if (needle) onAdd(custom(needle))
    setQuery('')
    input.current?.focus()
  }

  return (
    <div className="rounded-control border border-dashed border-line p-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          ref={input}
          autoFocus={autoFocus}
          value={query}
          placeholder="Add an exercise: squat, chest, dumbbell…"
          aria-label="Add an exercise"
          className="border-transparent bg-transparent pl-8 hover:border-transparent"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (!needle || total === 0) return
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setCursor((c) => (c + 1) % total)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setCursor((c) => (c - 1 + total) % total)
            } else if (event.key === 'Enter') {
              // Enter adds the highlighted exercise; the record saves from any other field.
              event.preventDefault()
              choose(cursor)
            }
          }}
        />
      </div>
      {needle && (
        <div className="mt-1 flex flex-col" role="listbox" aria-label="Matching exercises">
          {options.map((exercise, index) => (
            <button
              key={exercise.id}
              type="button"
              role="option"
              aria-selected={cursor === index}
              onMouseEnter={() => setCursor(index)}
              onClick={() => choose(index)}
              className={`flex h-9 items-center gap-2 rounded-md px-2 text-left text-sm ${cursor === index ? 'bg-line/60' : ''}`}
            >
              <span className="min-w-0 flex-1 truncate">{exercise.name}</span>
              <span className="shrink-0 truncate text-xs text-faint">{[exercise.primaryMuscles[0], exercise.equipment].filter(Boolean).join(' · ')}</span>
            </button>
          ))}
          {!exact && (
            <button
              type="button"
              role="option"
              aria-selected={cursor === options.length}
              onMouseEnter={() => setCursor(options.length)}
              onClick={() => choose(options.length)}
              className={`flex h-9 items-center gap-2 rounded-md px-2 text-left text-sm text-accent ${cursor === options.length ? 'bg-line/60' : ''}`}
            >
              <Plus className="h-3.5 w-3.5" />
              Add “{needle}” as your own exercise
            </button>
          )}
        </div>
      )}
    </div>
  )
}
