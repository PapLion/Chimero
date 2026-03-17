"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchExercises, useAllExercises, useExerciseDbStatus } from "../lib/queries"
import { Input } from "@packages/ui/input"
import { Button } from "@packages/ui/button"
import { X, Search } from "lucide-react"

export interface SelectedExercise {
  name: string
  sets?: number
  reps?: number
  weight?: number
}

interface ExerciseSearchProps {
  onExerciseSelect: (exercise: SelectedExercise) => void
  selectedExercises: SelectedExercise[]
}

interface Exercise {
  id: string
  name: string
  category: string
  level: string
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
}

export function ExerciseSearch({ onExerciseSelect, selectedExercises }: ExerciseSearchProps) {
  // === TODOS LOS HOOKS PRIMERO — NINGÚN RETURN ANTES DE AQUÍ ===
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [sets, setSets] = useState("")
  const [reps, setReps] = useState("")
  const [weight, setWeight] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Query hooks - must be called unconditionally
  const { data: dbStatus } = useExerciseDbStatus()
  const { data: searchResults = [] } = useSearchExercises(debouncedQuery, 10)
  const { data: allExercises = [] } = useAllExercises(20)

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset selected exercise state when search query changes
  useEffect(() => {
    setSelectedExercise(null)
    setSets("")
    setReps("")
    setWeight("")
  }, [searchQuery])

  // === DERIVADOS (no son hooks) ===
  const exercises = debouncedQuery.trim().length > 0
    ? searchResults as Exercise[]
    : allExercises as Exercise[]

  // === HANDLERS ===
  const handleExerciseClick = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setSearchQuery("")
    // Focus on first input after a short delay
    setTimeout(() => {
      const setsInput = document.getElementById("exercise-sets")
      if (setsInput) setsInput.focus()
    }, 100)
  }

  const handleAddExercise = () => {
    if (!selectedExercise) return

    onExerciseSelect({
      name: selectedExercise.name,
      sets: sets ? parseInt(sets, 10) : undefined,
      reps: reps ? parseInt(reps, 10) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
    })

    // Reset state
    setSelectedExercise(null)
    setSets("")
    setReps("")
    setWeight("")
    setSearchQuery("")
    searchInputRef.current?.focus()
  }

  const handleDeselect = () => {
    setSelectedExercise(null)
    setSets("")
    setReps("")
    setWeight("")
    searchInputRef.current?.focus()
  }

  const formatExerciseSummary = (exercise: SelectedExercise): string => {
    const parts: string[] = []
    if (exercise.sets) parts.push(`${exercise.sets}`)
    if (exercise.reps) parts.push(`x${exercise.reps}`)
    if (exercise.weight) parts.push(`${exercise.weight}kg`)
    return parts.length > 0 ? parts.join(" ") : ""
  }

  // === EARLY RETURNS BASADOS EN dbStatus — DESPUÉS DE TODOS LOS HOOKS ===
  if (!dbStatus || dbStatus.status === 'idle' || dbStatus.status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="w-4 h-4 border-2 border-[hsl(266_73%_63%)] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-[hsl(210_12%_47%)]">Loading exercise database...</span>
        {dbStatus && dbStatus.progress > 0 && (
          <div className="w-full max-w-[200px] bg-[hsl(210_20%_15%)] rounded-full h-1.5">
            <div
              className="bg-[hsl(266_73%_63%)] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${dbStatus.progress}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  if (dbStatus.status === 'error') {
    return (
      <div className="py-8 px-4 text-center space-y-2">
        <p className="text-sm text-[hsl(210_12%_47%)]">Exercise database unavailable</p>
        <p className="text-xs text-[hsl(210_12%_47%)]">
          {dbStatus.error || 'Check your internet connection'}
        </p>
      </div>
    )
  }

  if (dbStatus.status === 'ready' && dbStatus.count === 0) {
    return (
      <div className="py-8 px-4 text-center">
        <p className="text-sm text-[hsl(210_12%_47%)]">No exercises available</p>
      </div>
    )
  }

  // === RENDER PRINCIPAL — solo llega aquí si dbStatus.status === 'ready' ===
  return (
    <div className="space-y-4">
      {/* Selected Exercises Display */}
      {selectedExercises.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedExercises.map((exercise, index) => (
            <div
              key={`${exercise.name}-${index}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(266_73%_63%/0.15)] border border-[hsl(266_73%_63%/0.3)] text-sm text-[hsl(210_25%_97%)]"
            >
              <span className="font-medium">{exercise.name}</span>
              {formatExerciseSummary(exercise) && (
                <span className="text-xs text-[hsl(210_12%_47%)]">
                  {formatExerciseSummary(exercise)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected Exercise Form */}
      {selectedExercise ? (
        <div className="space-y-4 p-4 bg-[hsl(210_20%_15%)] rounded-lg border border-[hsl(210_18%_22%)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-[hsl(210_25%_97%)]">{selectedExercise.name}</div>
              <div className="text-xs text-[hsl(210_12%_47%)]">
                {selectedExercise.primaryMuscles[0] || selectedExercise.category}
                {selectedExercise.equipment && ` • ${selectedExercise.equipment}`}
              </div>
            </div>
            <button
              type="button"
              onClick={handleDeselect}
              className="p-1.5 rounded-lg border border-[hsl(210_18%_22%)] text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_20%)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[hsl(210_12%_47%)] mb-1.5">Sets</label>
              <Input
                id="exercise-sets"
                type="number"
                placeholder="3"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddExercise() } }}
                className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs text-[hsl(210_12%_47%)] mb-1.5">Reps</label>
              <Input
                type="number"
                placeholder="8"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddExercise() } }}
                className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs text-[hsl(210_12%_47%)] mb-1.5">Weight</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddExercise() } }}
                  className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)] pr-8"
                  min="0"
                  step="0.5"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(210_12%_47%)]">
                  kg
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleAddExercise}
            className="w-full bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
          >
            Add exercise
          </Button>
        </div>
      ) : (
        <>
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(210_12%_47%)]" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
            />
          </div>

          {/* Results List */}
          {exercises.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <p className="text-sm text-[hsl(210_12%_47%)]">
                No exercises found for '{searchQuery}'
              </p>
            </div>
          ) : (
            <div className="max-h-[240px] overflow-y-auto space-y-1">
              {exercises.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => handleExerciseClick(exercise)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-transparent hover:border-[hsl(210_18%_22%)] hover:bg-[hsl(210_20%_15%)] transition-all text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[hsl(210_25%_97%)] truncate">
                      {exercise.name}
                    </div>
                    <div className="text-xs text-[hsl(210_12%_47%)] truncate">
                      {exercise.primaryMuscles[0] || exercise.category}
                      {exercise.equipment && ` • ${exercise.equipment}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
