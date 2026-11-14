"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Camera, ImageIcon, PencilLine, Trash2 } from "lucide-react"
import type { AssetWithUrls } from "@contracts/features/assets"
import type {
  Tag,
  WorkoutSessionDetailResponse,
  WorkoutSessionExerciseInput,
  WorkoutSessionReadModel,
  WorkoutWeightUnit,
} from "@contracts/contracts"
import { api } from "@shared/api"
import { Button } from "@packages/ui/button"
import { DialogTitle } from "@packages/ui/dialog"
import { Input } from "@packages/ui/input"
import { TagSelector } from "@features/tags/components/TagChips"
import { ExerciseSearch, type SelectedExercise } from "@features/exercises/components/ExerciseSearch"
import { CyberpunkSelect } from "@features/tracking/components/CyberpunkSelect"
import { formatToastError, useToast } from "@shared/components/toast"
import { useAssets, useCreateTagMutation, useTags, useUpdateWorkoutSessionMutation, useWorkoutSession } from "@shared/queries"
import type { Entry, Tracker } from "@shared/store"

type WorkoutSetDraft = {
  draftId: string
  setIndex: number
  reps: string
  load: string
  notes: string
  isWarmup: boolean
}

type WorkoutExerciseDraft = {
  draftId: string
  exerciseId: string
  sourceExerciseId: string | null
  name: string
  category: string
  level: string
  equipment: string | null
  bodyPartSnapshot: string[]
  secondaryBodyPartSnapshot: string[]
  force: string | null
  mechanic: string | null
  sets: WorkoutSetDraft[]
}

type WorkoutSessionDraft = {
  sessionName: string
  note: string
  date: string
  time: string
  durationMinutes: string
  loadUnit: WorkoutWeightUnit
  exercises: WorkoutExerciseDraft[]
}

interface StructuredWorkoutEditDialogProps {
  entry: Entry
  tracker: Tracker
  open: boolean
  onOpenChange: (open: boolean) => void
}

let workoutDraftIdCounter = 0
function createDraftId(prefix: string): string {
  workoutDraftIdCounter += 1
  return `${prefix}-${Date.now()}-${workoutDraftIdCounter}`
}

function toSessionKey(session: WorkoutSessionReadModel): string {
  return JSON.stringify({
    entryId: session.entryId,
    timestamp: session.timestamp,
    sessionName: session.sessionName,
    note: session.note,
    durationMinutes: session.durationMinutes,
    loadUnit: session.loadUnit,
    routineId: session.routineId,
    exercises: session.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      name: exercise.exerciseName,
      sets: exercise.sets.map((set) => ({
        setIndex: set.setIndex,
        reps: set.reps,
        load: set.load,
        notes: set.notes ?? null,
        isWarmup: set.isWarmup ?? false,
      })),
    })),
  })
}

function toDateTimeParts(timestamp: number): { date: string; time: string } {
  const value = new Date(timestamp)
  return {
    date: format(value, "yyyy-MM-dd"),
    time: format(value, "HH:mm"),
  }
}

function workoutSessionToDraft(session: WorkoutSessionReadModel): WorkoutSessionDraft {
  const { date, time } = toDateTimeParts(session.timestamp)
  return {
    sessionName: session.sessionName ?? session.title ?? "",
    note: session.note ?? "",
    date,
    time,
    durationMinutes: session.durationMinutes == null ? "" : String(session.durationMinutes),
    loadUnit: session.loadUnit,
    exercises: session.exercises.map((exercise, exerciseIndex) => ({
      draftId: createDraftId(`exercise-${exerciseIndex + 1}`),
      exerciseId: exercise.exerciseId,
      sourceExerciseId: exercise.sourceExerciseId ?? null,
      name: exercise.exerciseName,
      category: exercise.category ?? "",
      level: exercise.level ?? "",
      equipment: exercise.equipment ?? null,
      bodyPartSnapshot: exercise.bodyPartSnapshot ?? [],
      secondaryBodyPartSnapshot: exercise.secondaryBodyPartSnapshot ?? [],
      force: exercise.force ?? null,
      mechanic: exercise.mechanic ?? null,
      sets: exercise.sets.map((set) => ({
        draftId: createDraftId(`set-${exerciseIndex + 1}`),
        setIndex: set.setIndex,
        reps: set.reps == null ? "" : String(set.reps),
        load: set.load == null ? "" : String(set.load),
        notes: set.notes ?? "",
        isWarmup: set.isWarmup ?? false,
      })),
    })),
  }
}

function selectedExerciseToDraft(exercise: SelectedExercise, index: number): WorkoutExerciseDraft {
  const setCount = Number.isInteger(exercise.sets) && (exercise.sets ?? 0) > 0 ? Math.trunc(exercise.sets ?? 1) : 1
  const reps = exercise.reps == null ? "" : String(exercise.reps)
  const load = exercise.weight == null ? "" : String(exercise.weight)
  return {
    draftId: createDraftId(`added-${index + 1}`),
    exerciseId: exercise.exerciseId,
    sourceExerciseId: null,
    name: exercise.name,
    category: exercise.category,
    level: exercise.level,
    equipment: exercise.equipment,
    bodyPartSnapshot: exercise.primaryMuscles ?? [],
    secondaryBodyPartSnapshot: exercise.secondaryMuscles ?? [],
    force: exercise.force,
    mechanic: exercise.mechanic,
    sets: Array.from({ length: setCount }, (_, setIndex) => ({
      draftId: createDraftId(`added-${index + 1}-set-${setIndex + 1}`),
      setIndex: setIndex + 1,
      reps,
      load,
      notes: "",
      isWarmup: false,
    })),
  }
}

function mapDraftExercisesToInputs(exercises: WorkoutExerciseDraft[]): WorkoutSessionExerciseInput[] {
  return exercises.map((exercise, exerciseIndex) => ({
    exerciseId: exercise.exerciseId.trim(),
    sourceExerciseId: exercise.sourceExerciseId?.trim() || null,
    name: exercise.name.trim(),
    category: exercise.category.trim() || null,
    level: exercise.level.trim() || null,
    equipment: exercise.equipment?.trim() || null,
    bodyPartSnapshot: exercise.bodyPartSnapshot,
    secondaryBodyPartSnapshot: exercise.secondaryBodyPartSnapshot,
    force: exercise.force?.trim() || null,
    mechanic: exercise.mechanic?.trim() || null,
    orderIndex: exerciseIndex,
    sets: exercise.sets.map((set, setIndex) => ({
      setIndex: set.setIndex > 0 ? set.setIndex : setIndex + 1,
      reps: set.reps.trim() === "" ? null : Number.parseInt(set.reps, 10),
      load: set.load.trim() === "" ? null : Number.parseFloat(set.load),
      notes: set.notes.trim() || null,
      isWarmup: set.isWarmup,
    })),
  }))
}

function mapSessionTags(tags: Tag[] | undefined): number[] {
  return tags?.map((tag) => tag.id) ?? []
}

function selectedExerciseFromDraft(draft: WorkoutExerciseDraft): SelectedExercise {
  return {
    exerciseId: draft.exerciseId,
    name: draft.name,
    category: draft.category,
    level: draft.level,
    equipment: draft.equipment,
    primaryMuscles: draft.bodyPartSnapshot,
    secondaryMuscles: draft.secondaryBodyPartSnapshot,
    force: draft.force,
    mechanic: draft.mechanic,
    sets: draft.sets.length,
    reps: draft.sets[0]?.reps ? Number.parseInt(draft.sets[0].reps, 10) : undefined,
    weight: draft.sets[0]?.load ? Number.parseFloat(draft.sets[0].load) : undefined,
  }
}

export function StructuredWorkoutEditDialog({ entry, tracker, open, onOpenChange }: StructuredWorkoutEditDialogProps) {
  const toast = useToast()
  const { data: workoutSessionResponse, isLoading, isError, error } = useWorkoutSession(entry.id, open && !!entry.workout?.structured)
  const updateWorkoutSessionMutation = useUpdateWorkoutSessionMutation()
  const { data: assetsData = [] } = useAssets()
  const { data: tags = [] } = useTags()
  const createTagMutation = useCreateTagMutation()

  const [draft, setDraft] = useState<WorkoutSessionDraft | null>(null)
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(entry.assetId ?? null)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(entry.tagIds ?? [])
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [loadedSessionKey, setLoadedSessionKey] = useState<string | null>(null)

  const workoutSession = workoutSessionResponse?.session ?? null
  const sessionKey = workoutSession ? toSessionKey(workoutSession) : null
  const assetList = useMemo<AssetWithUrls[]>(() => assetsData as AssetWithUrls[], [assetsData])
  const assets = useMemo<Map<number, AssetWithUrls>>(
    () => new Map(assetList.map((asset) => [asset.id, asset])),
    [assetList],
  )
  const selectedAsset = selectedAssetId ? assets.get(selectedAssetId) : undefined

  useEffect(() => {
    if (!open) {
      setDraft(null)
      setLoadedSessionKey(null)
      setAssetPickerOpen(false)
      return
    }
    setSelectedAssetId(entry.assetId ?? null)
    setSelectedTagIds(entry.tagIds ?? [])
  }, [entry.assetId, entry.id, entry.tagIds, open])

  useEffect(() => {
    if (!open || !workoutSession || !sessionKey) return
    if (loadedSessionKey === sessionKey) return
    setDraft(workoutSessionToDraft(workoutSession))
    setSelectedTagIds(mapSessionTags(workoutSessionResponse?.tags))
    setLoadedSessionKey(sessionKey)
  }, [loadedSessionKey, open, sessionKey, workoutSession, workoutSessionResponse?.tags])

  const handleCreateTag = async (name: string) => {
    try {
      const createdTag = await createTagMutation.mutateAsync({ name })
      if (createdTag) {
        toast.success("Tag created.", createdTag.name)
      }
      return createdTag
    } catch (createError) {
      toast.error(
        "We couldn't create that tag.",
        formatToastError(createError, "Please try again in a moment."),
      )
      return null
    }
  }

  const updateExercise = (index: number, updater: (exercise: WorkoutExerciseDraft) => WorkoutExerciseDraft) => {
    setDraft((current) => {
      if (!current) return current
      const exercises = current.exercises.slice()
      const next = exercises[index]
      if (!next) return current
      exercises[index] = updater(next)
      return { ...current, exercises }
    })
  }

  const moveExercise = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      if (!current) return current
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.exercises.length) return current
      const exercises = current.exercises.slice()
      const [item] = exercises.splice(index, 1)
      exercises.splice(nextIndex, 0, item)
      return { ...current, exercises }
    })
  }

  const addExercise = (exercise: SelectedExercise) => {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        exercises: [...current.exercises, selectedExerciseToDraft(exercise, current.exercises.length)],
      }
    })
  }

  const removeExercise = (index: number) => {
    setDraft((current) => {
      if (!current) return current
      return { ...current, exercises: current.exercises.filter((_, exerciseIndex) => exerciseIndex !== index) }
    })
  }

  const addSet = (exerciseIndex: number) => {
    setDraft((current) => {
      if (!current) return current
      const exercises = current.exercises.slice()
      const exercise = exercises[exerciseIndex]
      if (!exercise) return current
      exercises[exerciseIndex] = {
        ...exercise,
        sets: [
          ...exercise.sets,
          {
            draftId: createDraftId(`exercise-${exerciseIndex + 1}-set-${exercise.sets.length + 1}`),
            setIndex: exercise.sets.length + 1,
            reps: "",
            load: "",
            notes: "",
            isWarmup: false,
          },
        ],
      }
      return { ...current, exercises }
    })
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setDraft((current) => {
      if (!current) return current
      const exercises = current.exercises.slice()
      const exercise = exercises[exerciseIndex]
      if (!exercise || exercise.sets.length <= 1) return current
      exercises[exerciseIndex] = {
        ...exercise,
        sets: exercise.sets
          .filter((_, index) => index !== setIndex)
          .map((set, index) => ({ ...set, setIndex: index + 1 })),
      }
      return { ...current, exercises }
    })
  }

  const updateSet = (exerciseIndex: number, setIndex: number, updater: (set: WorkoutSetDraft) => WorkoutSetDraft) => {
    setDraft((current) => {
      if (!current) return current
      const exercises = current.exercises.slice()
      const exercise = exercises[exerciseIndex]
      if (!exercise || !exercise.sets[setIndex]) return current
      const sets = exercise.sets.slice()
      sets[setIndex] = updater(sets[setIndex])
      exercises[exerciseIndex] = { ...exercise, sets }
      return { ...current, exercises }
    })
  }

  const isPending = updateWorkoutSessionMutation.isPending || createTagMutation.isPending
  const currentRoutine = workoutSession?.routine ?? null

  const handleSave = async (event?: React.FormEvent) => {
    if (event) event.preventDefault()
    if (!draft || !workoutSession) return

    const timestamp = new Date(`${draft.date}T${draft.time}`)
    const parsedDuration = draft.durationMinutes.trim() === "" ? null : Number.parseInt(draft.durationMinutes, 10)
    if (Number.isNaN(timestamp.getTime())) {
      toast.error("We couldn't save that workout.", "Please choose a valid date and time.")
      return
    }
    if (parsedDuration !== null && (!Number.isFinite(parsedDuration) || parsedDuration < 0)) {
      toast.error("We couldn't save that workout.", "Duration must be a non-negative number.")
      return
    }

    try {
      await updateWorkoutSessionMutation.mutateAsync({
        entryId: entry.id,
        updates: {
          timestamp: timestamp.getTime(),
          sessionName: draft.sessionName.trim() || null,
          note: draft.note.trim() || null,
          routineId: workoutSession.routineId ?? undefined,
          durationMinutes: parsedDuration,
          loadUnit: workoutSession.loadUnit,
          assetId: selectedAssetId,
          tagIds: selectedTagIds,
          exercises: mapDraftExercisesToInputs(draft.exercises),
        },
      })
      onOpenChange(false)
      toast.info("Workout updated.", tracker.name)
    } catch (saveError) {
      toast.error(
        "We couldn't save that workout.",
        formatToastError(saveError, "Please try again in a moment."),
      )
    }
  }

  if (!open) return null

  return (
    <form onSubmit={handleSave} className="space-y-5 p-6">
      <div className="flex items-center gap-3 border-b border-[hsl(var(--border)/0.7)] px-0 pb-4">
        <div className="surface-chip flex h-10 w-10 items-center justify-center rounded-xl">
          <PencilLine className="h-5 w-5 text-[hsl(var(--primary))]" />
        </div>
        <div className="min-w-0">
          <div className="section-kicker">Edit workout</div>
          <DialogTitle className="mt-1 truncate text-lg font-semibold text-[hsl(var(--foreground))]">{tracker.name}</DialogTitle>
          <p className="line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">Edit the saved structured workout session directly.</p>
        </div>
      </div>

      {isLoading && !draft ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-[hsl(var(--muted-foreground))]">
          Loading structured workout...
        </div>
      ) : isError || !workoutSession ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          We could not load this structured workout.
          {isError && error ? ` ${(error as Error).message}` : ""}
        </div>
      ) : draft ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Date</label>
              <Input type="date" value={draft.date} onChange={(e) => setDraft((current) => current ? { ...current, date: e.target.value } : current)} className="h-11 bg-white/5 text-[hsl(var(--foreground))] [color-scheme:dark]" required />
            </div>
            <div className="space-y-1">
              <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Time</label>
              <Input type="time" value={draft.time} onChange={(e) => setDraft((current) => current ? { ...current, time: e.target.value } : current)} className="h-11 bg-white/5 text-[hsl(var(--foreground))] [color-scheme:dark]" required />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Session name</label>
              <Input type="text" placeholder="Push day" value={draft.sessionName} onChange={(e) => setDraft((current) => current ? { ...current, sessionName: e.target.value } : current)} className="h-11 bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]" />
            </div>
            <div className="space-y-1">
              <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Duration</label>
              <Input type="number" min={0} step={1} placeholder="Minutes" value={draft.durationMinutes} onChange={(e) => setDraft((current) => current ? { ...current, durationMinutes: e.target.value } : current)} className="h-11 bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]" />
            </div>
          </div>

          {currentRoutine && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-[hsl(var(--foreground))]">
              <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Source routine</div>
              <div className="mt-1 font-medium">{currentRoutine.name}</div>
              {currentRoutine.notes && <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{currentRoutine.notes}</div>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px]">
            <div className="space-y-1">
              <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Note / context</label>
              <textarea
                placeholder="What did you train or want to remember?"
                value={draft.note}
                onChange={(e) => setDraft((current) => current ? { ...current, note: e.target.value } : current)}
                className="min-h-[96px] w-full resize-y rounded-xl border border-[hsl(var(--border)/0.7)] bg-white/5 px-4 py-3 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none transition-colors duration-200 ease-out focus:border-[hsl(var(--primary)/0.45)] focus:ring-2 focus:ring-[hsl(var(--ring)/0.25)]"
              />
            </div>
            <div className="space-y-1">
              <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Load unit</label>
              <CyberpunkSelect
                value={draft.loadUnit}
                onValueChange={() => null}
                options={[
                  { value: "kg", label: "kg" },
                  { value: "lb", label: "lb" },
                ]}
                disabled
              />
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Locked to the saved unit to keep existing loads honest during edit.</p>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Add exercise</div>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Add a new exercise from the shared exercise database.</p>
              </div>
            </div>
            <ExerciseSearch
              onExerciseSelect={(exercise) => addExercise(exercise)}
              selectedExercises={draft.exercises.map(selectedExerciseFromDraft)}
              loadUnit={draft.loadUnit}
            />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Add at least one exercise before saving. Each exercise keeps its own set, rep, and load snapshot.
            </p>
          </div>

          <div className="space-y-3">
            {draft.exercises.length > 0 ? (
              draft.exercises.map((exercise, exerciseIndex) => (
                <div key={exercise.draftId} className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Exercise name snapshot</label>
                      <Input
                        type="text"
                        value={exercise.name}
                        onChange={(e) => updateExercise(exerciseIndex, (current) => ({ ...current, name: e.target.value }))}
                        className="h-11 bg-white/5 text-[hsl(var(--foreground))]"
                      />
                      <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                        {exercise.bodyPartSnapshot.join(", ") || "No body part snapshot"}{exercise.equipment ? ` · ${exercise.equipment}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-full px-3"
                        onClick={() => moveExercise(exerciseIndex, -1)}
                        disabled={exerciseIndex === 0}
                        aria-label={`Move exercise ${exercise.name} up`}
                      >
                        Up
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-full px-3"
                        onClick={() => moveExercise(exerciseIndex, 1)}
                        disabled={exerciseIndex === draft.exercises.length - 1}
                        aria-label={`Move exercise ${exercise.name} down`}
                      >
                        Down
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-full px-3 text-rose-200 hover:text-rose-100"
                        onClick={() => removeExercise(exerciseIndex)}
                        aria-label={`Remove exercise ${exercise.name}`}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Sets</label>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" className="h-9 w-9 rounded-full p-0" onClick={() => addSet(exerciseIndex)}>+</Button>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{exercise.sets.length} saved</span>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Category</label>
                      <Input type="text" value={exercise.category} onChange={(e) => updateExercise(exerciseIndex, (current) => ({ ...current, category: e.target.value }))} className="bg-white/5 text-[hsl(var(--foreground))]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Equipment</label>
                      <Input type="text" value={exercise.equipment ?? ""} onChange={(e) => updateExercise(exerciseIndex, (current) => ({ ...current, equipment: e.target.value }))} className="bg-white/5 text-[hsl(var(--foreground))]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {exercise.sets.map((set, setIndex) => (
                      <div key={set.draftId} className="grid gap-2 rounded-xl border border-white/8 bg-black/20 p-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
                        <div className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Set {set.setIndex}</div>
                        <div>
                          <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Reps</label>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={set.reps}
                            onChange={(e) => updateSet(exerciseIndex, setIndex, (current) => ({ ...current, reps: e.target.value }))}
                            className="bg-white/5 text-[hsl(var(--foreground))]"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">Load ({draft.loadUnit})</label>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={set.load}
                            onChange={(e) => updateSet(exerciseIndex, setIndex, (current) => ({ ...current, load: e.target.value }))}
                            className="bg-white/5 text-[hsl(var(--foreground))]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-full px-3"
                            onClick={() => removeSet(exerciseIndex, setIndex)}
                            disabled={exercise.sets.length <= 1}
                            aria-label={`Remove set ${set.setIndex} from ${exercise.name}`}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-[hsl(var(--muted-foreground))]">
                No exercises in this workout yet. Add one from the exercise search above.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <TagSelector
              tags={tags}
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
              onCreateTag={handleCreateTag}
              disabled={isPending}
              creating={createTagMutation.isPending}
              compact
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Image attachment</span>
              {!assetPickerOpen && (
                <button
                  type="button"
                  onClick={() => setAssetPickerOpen(true)}
                  className="flex items-center gap-1 text-xs text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--foreground))]"
                >
                  <ImageIcon className="h-3 w-3" />
                  {selectedAssetId ? "Change" : "Add image"}
                </button>
              )}
            </div>

            {assetPickerOpen ? (
              <div className="surface-card space-y-3 rounded-2xl p-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={async () => {
                    const result = await api.openFileDialog({
                      filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] }],
                    })
                    if (!result.path) return
                    await api.uploadAsset(result.path)
                  }}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Upload New
                </Button>
                {assetList.length > 0 && (
                  <div className="max-h-40 overflow-y-auto pr-1">
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(72px,1fr))] gap-2">
                      {assetList.map((asset) => (
                        <button
                          type="button"
                          key={asset.id}
                          onClick={() => {
                            setSelectedAssetId(asset.id)
                            setAssetPickerOpen(false)
                          }}
                          className={`group relative aspect-square min-w-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ease-out ${
                            selectedAssetId === asset.id ? "border-[hsl(var(--primary)/0.35)]" : "border-[hsl(var(--border)/0.7)] hover:border-[hsl(var(--primary)/0.35)]"
                          }`}
                        >
                          <img
                            src={asset.thumbnailUrl || asset.assetUrl || `chimero-asset://${asset.path}`}
                            alt={asset.originalName || "Asset"}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAssetPickerOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            ) : selectedAsset ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-[hsl(var(--foreground))]">{selectedAsset.originalName || "Attached image"}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">Selected asset</div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedAssetId(null)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-white/8 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || draft.exercises.length === 0}>
              Save workout
            </Button>
          </div>
        </>
      ) : null}
    </form>
  )
}

export function createWorkoutSessionDetailKey(response: WorkoutSessionDetailResponse | null | undefined): string | null {
  return response?.session ? toSessionKey(response.session) : null
}
