import { useState } from 'react'
import type { IntakeItemType, MealType, SymptomCategory } from '@contracts/contracts'
import { addCalendarDays } from '@contracts/domain'
import { api, must } from '@/lib/api'
import { moodColor, moodWord } from '@/lib/entries'
import { convertLength, convertWeight, num } from '@/lib/format'
import { useData, usePreferences } from '@/lib/queries'
import { colorOf, kindOf } from '@/lib/trackers'
import { Field, Input, Segmented, Select, Switch } from '@/ui/primitives'
import { EntryForm, ExtrasFields, NoteField, NumberInput, ScalePicker, Suggestions, parseNumber, useExtras, when, type EntryFormProps } from '../shared'

const round = (value: number, digits = 1) => String(Math.round(value * 10 ** digits) / 10 ** digits)

export function WeightForm(props: EntryFormProps) {
  const { tracker, entry, onDone } = props
  const prefs = usePreferences()
  const extras = useExtras(entry)
  const existing = entry?.weight
  const [weight, setWeight] = useState(existing ? round(convertWeight(existing.weight, existing.unit, prefs.weightUnit)) : '')
  const [waist, setWaist] = useState(existing?.waist != null ? round(convertLength(existing.waist, existing.waistUnit, prefs.measureUnit)) : '')
  const [note, setNote] = useState(entry?.note ?? '')
  const { data: detail } = useData(['weight-detail', tracker.id], () => api.getWeightDetail(tracker.id, { limit: 5 }))
  const last = detail?.current
  const value = parseNumber(weight)
  const valid = value != null && value > 0

  return (
    <EntryForm
      onDone={onDone}
      valid={valid}
      save={() => {
        const waistValue = parseNumber(waist)
        const payload = {
          weight: value as number,
          weightUnit: prefs.weightUnit,
          waist: waistValue,
          waistUnit: waistValue != null ? prefs.measureUnit : null,
          note: note.trim() || null,
          timestamp: when(props),
          tagIds: extras.tagIds,
          assetId: extras.assetId,
        }
        return entry ? must(api.updateWeightEntry(entry.id, payload), 'The weigh-in was not saved') : must(api.addWeightEntry({ trackerId: tracker.id, ...payload }), 'The weigh-in was not saved')
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Weight (${prefs.weightUnit})`} hint={last && !entry ? `Last: ${num(convertWeight(last.weight, last.weightUnit, prefs.weightUnit))} ${prefs.weightUnit}` : undefined}>
          {(id) => <NumberInput id={id} autoFocus value={weight} onChange={setWeight} placeholder={last ? round(convertWeight(last.weight, last.weightUnit, prefs.weightUnit)) : '0.0'} />}
        </Field>
        <Field label={`Waist (${prefs.measureUnit})`} hint="Optional">
          {(id) => <NumberInput id={id} value={waist} onChange={setWaist} placeholder="—" />}
        </Field>
      </div>
      <NoteField value={note} onChange={setNote} placeholder="Morning, after a big dinner, travelling…" />
      <ExtrasFields extras={extras} tagHint="Tag what might explain a change, like a cheat day." />
    </EntryForm>
  )
}

export function MoodForm(props: EntryFormProps) {
  const { tracker, entry, onDone } = props
  const extras = useExtras(entry)
  const [score, setScore] = useState<number | null>(entry?.value ?? null)
  const [note, setNote] = useState(entry?.note ?? '')
  return (
    <EntryForm
      onDone={onDone}
      valid={score != null}
      save={() => {
        const payload = { value: score, note: note.trim() || null, timestamp: when(props), tagIds: extras.tagIds, assetId: extras.assetId }
        return entry ? must(api.updateEntry(entry.id, payload), 'The check-in was not saved') : must(api.addEntry({ trackerId: tracker.id, ...payload }), 'The check-in was not saved')
      }}
    >
      <ScalePicker value={score} onChange={setScore} min={1} max={10} color={moodColor} label={moodWord} />
      <NoteField value={note} onChange={setNote} placeholder="What is behind it?" />
      <ExtrasFields extras={extras} tagLabel="Causes" tagHint="Worth adding for the big swings." />
    </EntryForm>
  )
}

export function TaskForm(props: EntryFormProps) {
  const { tracker, entry, date, onDone } = props
  const extras = useExtras(entry)
  const [text, setText] = useState(entry?.note ?? '')
  const [done, setDone] = useState((entry?.value ?? 0) >= 1)
  const [moveToTomorrow, setMoveToTomorrow] = useState(false)
  return (
    <EntryForm
      onDone={onDone}
      valid={!!text.trim()}
      save={() => {
        if (!entry) return must(api.addEntry({ trackerId: tracker.id, value: 0, note: text.trim(), timestamp: when(props), tagIds: extras.tagIds }), 'The task was not saved')
        const active = typeof entry.metadata.activeDate === 'string' ? entry.metadata.activeDate : entry.dateStr
        const postponements = Array.isArray(entry.metadata.postponements) ? entry.metadata.postponements : []
        const metadata = moveToTomorrow
          ? { ...entry.metadata, activeDate: addCalendarDays(active, 1), postponements: [...postponements, { fromDate: active, toDate: addCalendarDays(active, 1), timestamp: Date.now() }] }
          : entry.metadata
        return must(api.updateEntry(entry.id, { note: text.trim(), value: done ? 1 : 0, metadata, tagIds: extras.tagIds }), 'The task was not saved')
      }}
    >
      <Field label="Task">{(id) => <Input id={id} autoFocus value={text} onChange={(event) => setText(event.target.value)} placeholder={`Something to do on ${date}`} />}</Field>
      {entry && (
        <div className="flex flex-col gap-3 rounded-control border border-line p-3">
          <label className="flex items-center justify-between gap-3 text-sm">
            Done
            <Switch checked={done} onChange={setDone} label="Done" />
          </label>
          {!done && (
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                Move to the next day
                <span className="block text-xs text-faint">It stays in your history as postponed.</span>
              </span>
              <Switch checked={moveToTomorrow} onChange={setMoveToTomorrow} label="Move to the next day" />
            </label>
          )}
        </div>
      )}
    </EntryForm>
  )
}

export function GamingForm(props: EntryFormProps) {
  const { tracker, entry, onDone } = props
  const extras = useExtras(entry)
  const [title, setTitle] = useState(entry?.gaming?.gameTitle ?? '')
  const [hours, setHours] = useState(entry?.gaming ? String(entry.gaming.estimatedHours) : '1')
  const { data: detail } = useData(['gaming-detail', tracker.id], () => api.getGamingDetail(tracker.id, { limit: 200 }))
  const games = (detail?.perGameHours ?? []).slice(0, 8)
  const value = parseNumber(hours)
  return (
    <EntryForm
      onDone={onDone}
      valid={!!title.trim() && value != null && value > 0}
      save={() => {
        const payload = { gameTitle: title.trim(), estimatedHours: value as number, timestamp: when(props), tagIds: extras.tagIds, assetId: extras.assetId }
        return entry?.gaming ? must(api.updateGamingEntry(entry.id, payload), 'The session was not saved') : must(api.addGamingEntry({ trackerId: tracker.id, ...payload }), 'The session was not saved')
      }}
    >
      <Suggestions items={games} label="Played before" onPick={(game) => setTitle(game.gameTitle)} render={(game) => game.gameTitle} active={(game) => game.gameTitle === title} />
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <Field label="Game">{(id) => <Input id={id} autoFocus={games.length === 0} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Which game?" />}</Field>
        <Field label="Hours">{(id) => <NumberInput id={id} value={hours} onChange={setHours} />}</Field>
      </div>
      <div className="flex gap-1.5">
        {[0.5, 1, 2, 3, 4].map((preset) => (
          <button key={preset} type="button" onClick={() => setHours(String(preset))} className="h-7 rounded-full border border-line px-2.5 text-xs text-muted hover:border-faint hover:text-text">
            {preset} h
          </button>
        ))}
      </div>
      <ExtrasFields extras={extras} tagHint="For example “won”, “lost”, “with friends”." />
    </EntryForm>
  )
}

const MEALS: Array<{ value: MealType; label: string }> = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

function defaultMeal(hour: number): MealType {
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour >= 18 && hour < 22) return 'dinner'
  return 'snack'
}

export function FoodForm(props: EntryFormProps) {
  const { tracker, entry, onDone, time } = props
  const extras = useExtras(entry)
  const [name, setName] = useState(entry?.food?.foodName ?? entry?.note ?? '')
  const [meal, setMeal] = useState<MealType>(entry?.food?.mealType ?? defaultMeal(Number(time.split(':')[0])))
  const [calories, setCalories] = useState(entry?.food?.calories != null ? String(entry.food.calories) : '')
  const { data: detail } = useData(['food-detail', tracker.id], () => api.getFoodDetail(tracker.id, { limit: 400 }))
  const frequent = (detail?.foodFrequency ?? []).slice(0, 10)

  // Picking a food you have logged before brings back its tags and calories.
  const pick = (foodKey: string, foodName: string) => {
    setName(foodName)
    const previous = detail?.history.find((item) => item.structured && item.foodKey === foodKey)
    if (previous?.structured) {
      extras.setTagIds(previous.tagIds ?? [])
      setCalories(previous.calories != null ? String(previous.calories) : '')
    }
  }

  return (
    <EntryForm
      onDone={onDone}
      valid={!!name.trim()}
      save={() => {
        const payload = { foodName: name.trim(), mealType: meal, calories: parseNumber(calories), timestamp: when(props), tagIds: extras.tagIds, assetId: extras.assetId }
        return entry?.food ? must(api.updateFoodEntry(entry.id, payload), 'The food was not saved') : must(api.addFoodEntry({ trackerId: tracker.id, ...payload }), 'The food was not saved')
      }}
    >
      <Suggestions items={frequent} label="You often log" onPick={(food) => pick(food.foodKey, food.foodName)} render={(food) => food.foodName} active={(food) => food.foodName === name} />
      <Field label="What did you eat?">{(id) => <Input id={id} autoFocus={frequent.length === 0} value={name} onChange={(event) => setName(event.target.value)} placeholder="Taco, potato chips, ⅓ lb beef…" />}</Field>
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Meal</span>
          <Segmented value={meal} onChange={setMeal} options={MEALS} label="Meal" />
        </div>
        <Field label="Calories" hint="Optional" className="w-28">
          {(id) => <NumberInput id={id} value={calories} onChange={setCalories} placeholder="—" />}
        </Field>
      </div>
      <ExtrasFields extras={extras} tagLabel="Ingredients and labels" tagHint="Tags like Wheat or Beef are what Insights compares against symptoms and mood." />
    </EntryForm>
  )
}

const CATEGORIES: Array<{ value: SymptomCategory; label: string }> = [
  { value: 'physical', label: 'Physical' },
  { value: 'mental', label: 'Mental' },
  { value: 'general', label: 'General' },
]

export function HealthForm(props: EntryFormProps) {
  const { tracker, entry, onDone } = props
  const extras = useExtras(entry)
  const [name, setName] = useState(entry?.health?.symptomName ?? entry?.note ?? '')
  const [category, setCategory] = useState<SymptomCategory>(entry?.health?.category ?? 'physical')
  const [severity, setSeverity] = useState<number | null>(entry?.health?.severity ?? null)
  const [note, setNote] = useState(entry?.health ? (entry.note ?? '') : '')
  const { data: detail } = useData(['health-detail', tracker.id], () => api.getHealthDetail(tracker.id, { limit: 300 }))
  const known = (detail?.symptomFrequency ?? []).slice(0, 10)
  return (
    <EntryForm
      onDone={onDone}
      valid={!!name.trim()}
      save={() => {
        const payload = { symptomName: name.trim(), category, severity, note: note.trim() || null, timestamp: when(props), tagIds: extras.tagIds, assetId: extras.assetId }
        return entry?.health ? must(api.updateHealthSymptomEntry(entry.id, payload), 'The symptom was not saved') : must(api.addHealthSymptomEntry({ trackerId: tracker.id, ...payload }), 'The symptom was not saved')
      }}
    >
      <Suggestions
        items={known}
        label="Logged before"
        onPick={(symptom) => {
          setName(symptom.symptomName)
          setCategory(symptom.category === 'other' ? 'general' : symptom.category)
        }}
        render={(symptom) => symptom.symptomName}
        active={(symptom) => symptom.symptomName === name}
      />
      <Field label="Symptom">{(id) => <Input id={id} autoFocus={known.length === 0} value={name} onChange={(event) => setName(event.target.value)} placeholder="Headache, cold, sore knee, low energy…" />}</Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">Kind</span>
        <Segmented value={category} onChange={setCategory} options={CATEGORIES} label="Kind" className="self-start" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between text-sm font-medium text-muted">
          How bad? <span className="font-normal text-faint">{severity == null ? 'optional' : `${severity} of 10`}</span>
        </span>
        <div className="flex gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
            <button
              key={score}
              type="button"
              aria-label={`Severity ${score}`}
              aria-pressed={severity === score}
              onClick={() => setSeverity(severity === score ? null : score)}
              className="h-7 min-w-0 flex-1 rounded-md text-xs font-semibold transition-colors"
              style={{ background: severity != null && score <= severity ? moodColor(11 - score) : 'rgb(var(--line))', color: severity != null && score <= severity ? 'rgb(0 0 0 / 0.75)' : 'rgb(var(--muted))' }}
            >
              {score}
            </button>
          ))}
        </div>
      </div>
      <NoteField value={note} onChange={setNote} />
      <ExtrasFields extras={extras} />
    </EntryForm>
  )
}

const INTAKE_TYPES: Array<{ value: IntakeItemType; label: string }> = [
  { value: 'vitamin', label: 'Vitamin' },
  { value: 'supplement', label: 'Supplement' },
  { value: 'medication', label: 'Medication' },
  { value: 'other', label: 'Other' },
]

export function IntakeForm(props: EntryFormProps) {
  const { tracker, entry, onDone } = props
  const extras = useExtras(entry)
  const [name, setName] = useState(entry?.intake?.itemName ?? entry?.note ?? '')
  const [type, setType] = useState<IntakeItemType>(entry?.intake?.itemType ?? 'vitamin')
  const [dosage, setDosage] = useState(entry?.intake?.dosage != null ? String(entry.intake.dosage) : '')
  const [unit, setUnit] = useState(entry?.intake?.unit ?? 'mg')
  const [note, setNote] = useState(entry?.intake ? (entry.note ?? '') : '')
  const { data: detail } = useData(['intake-detail', tracker.id], () => api.getIntakeDetail(tracker.id, { limit: 300 }))
  const known = (detail?.itemFrequency ?? []).slice(0, 10)

  const pick = (itemKey: string, itemName: string, itemType: IntakeItemType) => {
    setName(itemName)
    setType(itemType)
    const previous = detail?.history.find((item) => item.structured && item.itemKey === itemKey)
    if (previous?.structured) {
      setDosage(previous.dosage != null ? String(previous.dosage) : '')
      if (previous.unit) setUnit(previous.unit)
    }
  }

  return (
    <EntryForm
      onDone={onDone}
      valid={!!name.trim()}
      save={() => {
        const amount = parseNumber(dosage)
        const payload = { itemName: name.trim(), itemType: type, dosage: amount, unit: amount != null ? unit.trim() || null : null, note: note.trim() || null, timestamp: when(props), tagIds: extras.tagIds, assetId: extras.assetId }
        return entry?.intake ? must(api.updateIntakeEntry(entry.id, payload), 'The dose was not saved') : must(api.addIntakeEntry({ trackerId: tracker.id, ...payload }), 'The dose was not saved')
      }}
    >
      <Suggestions items={known} label="Taken before" onPick={(item) => pick(item.itemKey, item.itemName, item.itemType)} render={(item) => item.itemName} active={(item) => item.itemName === name} />
      <div className="grid grid-cols-[1fr_150px] gap-3">
        <Field label="What did you take?">{(id) => <Input id={id} autoFocus={known.length === 0} value={name} onChange={(event) => setName(event.target.value)} placeholder="Vitamin D, ibuprofen, magnesium…" />}</Field>
        <Field label="Type">
          {(id) => (
            <Select id={id} value={type} onChange={(event) => setType(event.target.value as IntakeItemType)}>
              {INTAKE_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="grid grid-cols-[120px_100px_1fr] gap-3">
        <Field label="Dose" hint="Optional">
          {(id) => <NumberInput id={id} value={dosage} onChange={setDosage} placeholder="—" />}
        </Field>
        <Field label="Unit">{(id) => <Input id={id} value={unit} onChange={(event) => setUnit(event.target.value)} list="dose-units" />}</Field>
        <datalist id="dose-units">
          {['mg', 'mcg', 'g', 'IU', 'ml', 'tablet', 'capsule', 'drop'].map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>
      <NoteField value={note} onChange={setNote} />
      <ExtrasFields extras={extras} />
    </EntryForm>
  )
}

const MEDIA_KINDS: Record<'tv' | 'media', string[]> = { tv: ['Show', 'Film', 'Documentary'], media: ['Music', 'Podcast', 'Video', 'Article', 'Other'] }

export function MediaForm(props: EntryFormProps & { flavor: 'tv' | 'media' }) {
  const { tracker, entry, onDone, flavor } = props
  const extras = useExtras(entry)
  const meta = entry?.metadata ?? {}
  const text = (key: string) => (typeof meta[key] === 'string' ? (meta[key] as string) : '')
  const number = (key: string) => (typeof meta[key] === 'number' ? String(meta[key]) : '')
  const [title, setTitle] = useState(text('title') || (entry && !meta.title ? (entry.note ?? '') : ''))
  const [kind, setKind] = useState(text('kind') || MEDIA_KINDS[flavor][0])
  const [season, setSeason] = useState(number('season'))
  const [episode, setEpisode] = useState(number('episode'))
  const [minutes, setMinutes] = useState(number('minutes'))
  const [rating, setRating] = useState<number | null>(typeof meta.rating === 'number' ? meta.rating : null)
  const [note, setNote] = useState(meta.title ? (entry?.note ?? '') : '')
  const { data: recent = [] } = useData(['entries', 'tracker', tracker.id, 200], () => api.getEntries({ trackerId: tracker.id, limit: 200 }))
  const titles = [...new Set(recent.map((e) => (typeof e.metadata.title === 'string' ? e.metadata.title : e.note)).filter((t): t is string => !!t))].slice(0, 8)

  const pick = (picked: string) => {
    setTitle(picked)
    const previous = recent.find((e) => e.metadata.title === picked)
    if (!previous) return
    if (typeof previous.metadata.kind === 'string') setKind(previous.metadata.kind)
    if (typeof previous.metadata.season === 'number') setSeason(String(previous.metadata.season))
    // Suggest the following episode of a show already in progress.
    if (typeof previous.metadata.episode === 'number') setEpisode(String(previous.metadata.episode + 1))
  }

  return (
    <EntryForm
      onDone={onDone}
      valid={!!title.trim()}
      save={() => {
        const metadata: Record<string, unknown> = { ...(entry?.metadata ?? {}), title: title.trim(), kind }
        for (const [key, raw] of [['season', season], ['episode', episode], ['minutes', minutes]] as const) {
          const parsed = parseNumber(raw)
          if (parsed != null) metadata[key] = parsed
          else delete metadata[key]
        }
        if (rating != null) metadata.rating = rating
        else delete metadata.rating
        const payload = { value: parseNumber(minutes), note: note.trim() || null, metadata, timestamp: when(props), tagIds: extras.tagIds, assetId: extras.assetId }
        return entry ? must(api.updateEntry(entry.id, payload), 'The entry was not saved') : must(api.addEntry({ trackerId: tracker.id, ...payload }), 'The entry was not saved')
      }}
    >
      <Suggestions items={titles} label="Recent" onPick={pick} render={(t) => t} active={(t) => t === title} />
      <div className="grid grid-cols-[1fr_150px] gap-3">
        <Field label="Title">{(id) => <Input id={id} autoFocus={titles.length === 0} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={flavor === 'tv' ? 'What did you watch?' : 'What was it?'} />}</Field>
        <Field label="Kind">
          {(id) => (
            <Select id={id} value={kind} onChange={(event) => setKind(event.target.value)}>
              {MEDIA_KINDS[flavor].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {flavor === 'tv' && kind === 'Show' && (
          <>
            <Field label="Season">{(id) => <NumberInput id={id} value={season} onChange={setSeason} placeholder="—" />}</Field>
            <Field label="Episode">{(id) => <NumberInput id={id} value={episode} onChange={setEpisode} placeholder="—" />}</Field>
          </>
        )}
        <Field label="Minutes">{(id) => <NumberInput id={id} value={minutes} onChange={setMinutes} placeholder="—" />}</Field>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">Rating</span>
        <Segmented size="md" value={rating ?? 0} onChange={(value) => setRating(value === 0 ? null : value)} options={[{ value: 0, label: 'None' }, ...[1, 2, 3, 4, 5].map((v) => ({ value: v, label: `${v}★` }))]} label="Rating" className="self-start" />
      </div>
      <NoteField value={note} onChange={setNote} />
      <ExtrasFields extras={extras} tagHint="Genre or tone tags (“dark”, “comfort”) let Insights compare against mood." />
    </EntryForm>
  )
}

export function GenericForm(props: EntryFormProps) {
  const { tracker, entry, onDone } = props
  const extras = useExtras(entry)
  const kind = kindOf(tracker)
  const config = tracker.config
  const [value, setValue] = useState(entry?.value != null ? String(entry.value) : '')
  const [score, setScore] = useState<number | null>(kind === 'range' ? (entry?.value ?? null) : null)
  const [done, setDone] = useState(entry ? (entry.value ?? 1) >= 1 : true)
  const [note, setNote] = useState(entry?.note ?? '')
  const [fields, setFields] = useState<Record<string, unknown>>((entry?.metadata.fields as Record<string, unknown>) ?? {})
  const color = colorOf(tracker)
  const min = config.min ?? 1
  const max = Math.min(config.max ?? 10, min + 11)
  const numeric = parseNumber(value)
  const valid = kind === 'numeric' ? numeric != null : kind === 'range' ? score != null : kind === 'text' ? !!note.trim() : true

  return (
    <EntryForm
      onDone={onDone}
      valid={valid}
      save={() => {
        const cleaned: Record<string, unknown> = {}
        for (const field of config.fields ?? []) {
          const raw = fields[field.key]
          if (field.type === 'number') {
            const parsed = typeof raw === 'number' ? raw : parseNumber(String(raw ?? ''))
            if (parsed != null) cleaned[field.key] = parsed
          } else if (field.type === 'boolean') {
            if (raw === true) cleaned[field.key] = true
          } else if (typeof raw === 'string' && raw.trim()) cleaned[field.key] = raw.trim()
        }
        const payload = {
          value: kind === 'numeric' ? numeric : kind === 'range' ? score : kind === 'binary' ? (done ? 1 : 0) : null,
          note: note.trim() || null,
          metadata: { ...(entry?.metadata ?? {}), fields: cleaned },
          timestamp: when(props),
          tagIds: extras.tagIds,
          assetId: extras.assetId,
        }
        return entry ? must(api.updateEntry(entry.id, payload), 'The entry was not saved') : must(api.addEntry({ trackerId: tracker.id, ...payload }), 'The entry was not saved')
      }}
    >
      {kind === 'numeric' && (
        <>
          <Field label={config.unit ? `Amount (${config.unit})` : 'Amount'} hint={config.goal ? `Daily goal: ${config.goalDirection === 'atMost' ? 'at most' : 'at least'} ${num(config.goal)} ${config.unit ?? ''}` : undefined}>
            {(id) => <NumberInput id={id} autoFocus value={value} onChange={setValue} placeholder="0" />}
          </Field>
          {(config.quickValues?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {config.quickValues?.map((preset) => (
                <button key={preset} type="button" onClick={() => setValue(String(preset))} className="h-7 rounded-full border border-line px-2.5 text-xs text-muted hover:border-faint hover:text-text">
                  {num(preset)} {config.unit}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {kind === 'range' && <ScalePicker value={score} onChange={setScore} min={min} max={max} color={() => color} label={(s) => `${s} of ${max}`} />}
      {kind === 'binary' && (
        <label className="flex items-center justify-between rounded-control border border-line p-3 text-base">
          <span>
            {done ? 'Done' : 'Skipped'}
            <span className="block text-xs text-faint">Record a skip to tell a missed day from an unlogged one.</span>
          </span>
          <Switch checked={done} onChange={setDone} label="Done" />
        </label>
      )}
      {kind === 'text' && (config.options?.length ?? 0) > 0 && <Suggestions items={config.options ?? []} label="Options" onPick={setNote} render={(o) => o} active={(o) => o === note} />}

      {(config.fields ?? []).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {config.fields?.map((field) =>
            field.type === 'boolean' ? (
              <label key={field.key} className="col-span-2 flex items-center justify-between rounded-control border border-line px-3 py-2 text-sm">
                {field.label}
                <Switch checked={fields[field.key] === true} onChange={(checked) => setFields({ ...fields, [field.key]: checked })} label={field.label} />
              </label>
            ) : (
              <Field key={field.key} label={field.unit ? `${field.label} (${field.unit})` : field.label}>
                {(id) =>
                  field.type === 'number' ? (
                    <NumberInput id={id} value={String(fields[field.key] ?? '')} onChange={(next) => setFields({ ...fields, [field.key]: next })} placeholder="—" className="text-base" />
                  ) : field.type === 'select' ? (
                    <Select id={id} value={String(fields[field.key] ?? '')} onChange={(event) => setFields({ ...fields, [field.key]: event.target.value })}>
                      <option value="">—</option>
                      {field.options?.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input id={id} value={String(fields[field.key] ?? '')} onChange={(event) => setFields({ ...fields, [field.key]: event.target.value })} />
                  )
                }
              </Field>
            ),
          )}
        </div>
      )}
      <NoteField value={note} onChange={setNote} label={kind === 'text' ? 'Entry' : 'Note'} placeholder={kind === 'text' ? 'What happened?' : undefined} />
      <ExtrasFields extras={extras} />
    </EntryForm>
  )
}
