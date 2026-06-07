"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useAppStore } from "@shared/store"
import { useTrackers, useRecentTrackers, useFavoriteTrackers, useEntries, useBooks, useAddEntryMutation, useAddWeightEntryMutation, useAddGamingEntryMutation, useAddFoodEntryMutation, useAddHealthSymptomEntryMutation, useCreateBookMutation, useStartBookMutation, useReadBookMutation, useFinishBookMutation, useQuickEntryContext, useUpsertReminderMutation, useAssets, useCreateContactInteractionMutation, useTags, useCreateTagMutation } from "@shared/queries"
import { cn } from "@shared/utils"
import { getEntryConfig } from "../entry-config"
import type { Entry, Tracker } from "@shared/store"
import { ContactBubblesGrid, type ContactMoodSelection } from "@features/contacts/components/ContactBubblesGrid"
import { ExerciseSearch, type SelectedExercise } from "@features/exercises/components/ExerciseSearch"
import { TagSelector } from "@features/tags/components/TagChips"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@packages/ui/dialog"
import { Input } from "@packages/ui/input"
import { Button } from "@packages/ui/button"
import { CyberpunkSelect } from "@features/tracking/components/CyberpunkSelect"
import { formatToastError, useToast } from "@shared/components/toast"
import { Scale, Smile, Dumbbell, Users, CheckSquare, Wallet, Command, Bell, Activity, Calendar, Flame, Book, Gamepad2, Heart, Coffee, Moon, Sun, Zap, Target, Music, Camera, ImageIcon, X, Tv, BookmarkPlus, BookOpen, BookMarked, CheckCheck, type LucideIcon } from "lucide-react"
import { clampMoodScore } from "@contracts/domain"
import { getTrackerIdentity, isBooksTracker } from "@contracts/features/tracking"
import type { MealType } from "@contracts/contracts"

const iconMap: Record<string, LucideIcon> = {
  scale: Scale,
  smile: Smile,
  dumbbell: Dumbbell,
  users: Users,
  "check-square": CheckSquare,
  wallet: Wallet,
  flame: Flame,
  book: Book,
  "gamepad-2": Gamepad2,
  heart: Heart,
  coffee: Coffee,
  moon: Moon,
  sun: Sun,
  zap: Zap,
  target: Target,
  music: Music,
  tv: Tv,
  camera: Camera,
}

const MODE_ACTIVITY = "activity"
const MODE_REMINDER = "reminder"
type QuickEntryMode = typeof MODE_ACTIVITY | typeof MODE_REMINDER

export function QuickEntry() {
  const { commandBarOpen, setQuickEntryOpen, activeTracker } = useAppStore()
  const upsertReminderMutation = useUpsertReminderMutation()
  const { data: trackers = [], isLoading: trackersLoading } = useTrackers()
  const { data: recentTrackersFallback = [] } = useRecentTrackers(10)
  const { data: favoriteTrackersFallback = [] } = useFavoriteTrackers()
  const { data: quickEntryContext } = useQuickEntryContext(commandBarOpen)
  const { data: tagFallback = [] } = useTags()
  const recentTrackers = quickEntryContext?.recentTrackers ?? recentTrackersFallback
  const favoriteTrackers = quickEntryContext?.favoriteTrackers ?? favoriteTrackersFallback
  const tags = useMemo(() => {
    const seen = new Set<number>()
    const ordered = [...(quickEntryContext?.suggestedTags ?? []), ...(quickEntryContext?.tags ?? tagFallback)]
    return ordered.filter((tag) => {
      if (seen.has(tag.id)) return false
      seen.add(tag.id)
      return true
    })
  }, [quickEntryContext?.suggestedTags, quickEntryContext?.tags, tagFallback])
  const addEntryMutation = useAddEntryMutation()
  const addWeightEntryMutation = useAddWeightEntryMutation()
  const addGamingEntryMutation = useAddGamingEntryMutation()
  const addFoodEntryMutation = useAddFoodEntryMutation()
  const addHealthSymptomEntryMutation = useAddHealthSymptomEntryMutation()
  const createBookMutation = useCreateBookMutation()
  const startBookMutation = useStartBookMutation()
  const readBookMutation = useReadBookMutation()
  const finishBookMutation = useFinishBookMutation()
  const createTagMutation = useCreateTagMutation()
  const createContactInteractionMutation = useCreateContactInteractionMutation()
  const toast = useToast()

  const [search, setSearch] = useState("")
  const [selectedTracker, setSelectedTracker] = useState<number | null>(null)
  const [value, setValue] = useState("")
  const [waist, setWaist] = useState("")
  const [note, setNote] = useState("")
  const [healthSymptomName, setHealthSymptomName] = useState("")
  const [healthCategory, setHealthCategory] = useState<"physical" | "mental" | "general" | "other">("general")
  const [mealType, setMealType] = useState<MealType | "">("")
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [mode, setMode] = useState<QuickEntryMode>(MODE_ACTIVITY)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Selected contacts for Social trackers
  const [selectedContacts, setSelectedContacts] = useState<ContactMoodSelection[]>([])

  // Selected exercises for Exercise trackers
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([])

  // Reminder state
  const [reminderTitle, setReminderTitle] = useState("")
  const [reminderDescription, setReminderDescription] = useState("")
  const [reminderDate, setReminderDate] = useState("")
  const [reminderTime, setReminderTime] = useState("")
  const [linkedTrackerId, setLinkedTrackerId] = useState<number | undefined>(undefined)
  const bookIdCacheRef = useRef(new Map<string, number>())
  const selectedTrackerData = trackers.find((t) => t.id === selectedTracker)

  const { data: selectedTrackerEntries = [] } = useEntries(selectedTracker ? { trackerId: selectedTracker } : undefined)
  const { data: books = [] } = useBooks(commandBarOpen && (selectedTrackerData ? isBooksTracker(selectedTrackerData) : false))

  // Assets for picker
  const { data: assetsData } = useAssets({ limit: 50 })
  const assets = (assetsData ?? []) as Array<{ id: number; thumbnailUrl: string; assetUrl: string; originalName?: string | null }>
  const selectedAsset = assets.find((a) => a.id === selectedAssetId)
  const assetPickerRef = useRef<HTMLDivElement>(null)

  const normalizeBookKey = useCallback((title: string) => title.trim().toLowerCase().replace(/\s+/g, " "), [])

  const selectedTrackerBookIdsByTitle = useMemo(() => {
    const map = new Map<string, number>()
    for (const book of books as Array<{ id: number; title: string }>) {
      map.set(normalizeBookKey(book.title), book.id)
    }
    for (const entry of selectedTrackerEntries as Entry[]) {
      if (entry.book?.structured) {
        map.set(normalizeBookKey(entry.book.title), entry.book.bookId)
      }
    }
    for (const [key, value] of bookIdCacheRef.current.entries()) {
      if (!map.has(key)) {
        map.set(key, value)
      }
    }
    return map
  }, [normalizeBookKey, books, selectedTrackerEntries])

  // Autocomplete: Favorites + Recents (deduped) + All trackers filtered by search
  const searchLower = search.toLowerCase().trim()
  const filteredBySearch = useMemo(() => {
    if (!searchLower) return trackers
    return trackers.filter((t) => t.name.toLowerCase().includes(searchLower))
  }, [trackers, searchLower])

  const suggestedTrackers = useMemo(() => {
    const seen = new Set<number>()
    const result: Tracker[] = []
    // 1. Favorites first (matching search)
    for (const t of favoriteTrackers) {
      if (!searchLower || t.name.toLowerCase().includes(searchLower)) {
        if (!seen.has(t.id)) { seen.add(t.id); result.push(t) }
      }
    }
    // 2. Recent (matching search)
    for (const t of recentTrackers) {
      if (!searchLower || t.name.toLowerCase().includes(searchLower)) {
        if (!seen.has(t.id)) { seen.add(t.id); result.push(t) }
      }
    }
    // 3. Rest of trackers
    for (const t of filteredBySearch) {
      if (!seen.has(t.id)) { seen.add(t.id); result.push(t) }
    }
    return result
  }, [favoriteTrackers, recentTrackers, filteredBySearch, searchLower])

  // When no search: exclude favorites/recent from "Trackers" to avoid duplicates
  const othersForList = useMemo(() => {
    if (searchLower) return suggestedTrackers
    const favIds = new Set(favoriteTrackers.map((t) => t.id))
    const recentIds = new Set(recentTrackers.slice(0, 5).map((t) => t.id))
    return suggestedTrackers.filter((t) => !favIds.has(t.id) && !recentIds.has(t.id))
  }, [suggestedTrackers, searchLower, favoriteTrackers, recentTrackers])

  const standardTrackers = othersForList.filter((t) => !t.isCustom)
  const customTrackers = othersForList.filter((t) => t.isCustom)

  // Reset state when dialog closes or opens
  useEffect(() => {
    if (!commandBarOpen) {
      setSearch("")
      setSelectedTracker(null)
      setValue("")
      setWaist("")
      setNote("")
      setHealthSymptomName("")
      setHealthCategory("general")
      setSelectedAssetId(null)
      setSelectedTagIds([])
      setAssetPickerOpen(false)
      setMode(MODE_ACTIVITY)
      setReminderTitle("")
      setReminderDescription("")
      setReminderDate("")
      setReminderTime("")
      setLinkedTrackerId(undefined)
      setSelectedContacts([])
      setSelectedExercises([])
    } else {
      if (activeTracker) {
        setSelectedTracker(activeTracker)
        setLinkedTrackerId(activeTracker)
      } else {
        setSelectedTracker(null)
        setLinkedTrackerId(undefined)
      }
      setSearch("")
      setValue("")
      setWaist("")
      setNote("")
      setHealthSymptomName("")
      setHealthCategory("general")
      setSelectedAssetId(null)
      setSelectedTagIds([])
      setAssetPickerOpen(false)
      setMode(MODE_ACTIVITY)
      setReminderTitle("")
      setReminderDescription("")
      setReminderDate("")
      setReminderTime("")
      setSelectedContacts([])
      setSelectedExercises([])
    }
  }, [commandBarOpen, activeTracker])

  const handleCreateTag = useCallback(async (name: string) => {
    try {
      const createdTag = await createTagMutation.mutateAsync({ name })
      if (createdTag) {
        toast.success("Tag created.", createdTag.name)
      }
      return createdTag
    } catch (error) {
      toast.error(
        "We couldn't create that tag.",
        formatToastError(error, "Please try again in a moment."),
      )
      return null
    }
  }, [createTagMutation, toast])

  // Close asset picker when clicking outside
  useEffect(() => {
    if (!assetPickerOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (assetPickerRef.current && !assetPickerRef.current.contains(event.target as Node)) {
        setAssetPickerOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [assetPickerOpen])

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "q") {
        e.preventDefault()
        setQuickEntryOpen(!commandBarOpen)
      }
      if (e.key === "Escape" && commandBarOpen) {
        setQuickEntryOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [commandBarOpen, setQuickEntryOpen])

  const getBookIdForTitle = useCallback(async (title: string, action: "want" | "started" | "read" | "finished") => {
    const key = normalizeBookKey(title)
    const existingBookId = selectedTrackerBookIdsByTitle.get(key)
    if (existingBookId != null) {
      return existingBookId
    }

    const createdBook = await createBookMutation.mutateAsync({
      title,
      shelf: action === "finished" ? "finished" : action === "want" ? "tbr" : "reading",
      status: action === "finished" ? "completed" : action === "want" ? "planned" : "active",
    })
    const bookId = createdBook?.book.id
    if (bookId == null) {
      throw new Error("We couldn't create that book.")
    }

    bookIdCacheRef.current.set(key, bookId)
    return bookId
  }, [createBookMutation, normalizeBookKey, selectedTrackerBookIdsByTitle])

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !selectedTracker) return

    const trackerData = trackers.find((t) => t.id === selectedTracker)
    if (!trackerData) return

    const isSocialTracker =
      trackerData.icon === "users" ||
      trackerData.name.toLowerCase().includes("social") ||
      trackerData.name.toLowerCase().includes("connection")

    const isExerciseTracker =
      trackerData.icon === "dumbbell" ||
      trackerData.name.toLowerCase().includes("exercise") ||
      trackerData.name.toLowerCase().includes("workout") ||
      trackerData.name.toLowerCase().includes("gym") ||
      trackerData.name.toLowerCase().includes("fitness")

    const isWeightTracker =
      trackerData.icon === "scale" ||
      trackerData.name.toLowerCase().includes("weight") ||
      trackerData.name.toLowerCase().includes("peso")
    const isMoodTracker =
      trackerData.icon === "smile" ||
      trackerData.name.toLowerCase().includes("mood") ||
      trackerData.name.toLowerCase().includes("feeling")
    const isHealthTracker = getTrackerIdentity(trackerData) === "health"
    const isFoodTracker = getTrackerIdentity(trackerData) === "diet"
    const isGamingTracker = getTrackerIdentity(trackerData) === "gaming"

    setIsSubmitting(true)

    try {
      if (isExerciseTracker && selectedExercises.length > 0) {
        await addEntryMutation.mutateAsync({
          trackerId: selectedTracker,
          value: selectedExercises.length,
          note: note.trim() || null,
          assetId: selectedAssetId,
          tagIds: selectedTagIds,
          metadata: { exercises: selectedExercises },
          timestamp: Date.now(),
        })

        toast.success("Workout logged.", trackerData.name)
        setQuickEntryOpen(false)
        return
      }

      if (isGamingTracker) {
        const gameTitle = note.trim()
        const hours = value ? parseFloat(value) : NaN
        if (!gameTitle || !Number.isFinite(hours)) return

        await addGamingEntryMutation.mutateAsync({
          trackerId: selectedTracker,
          gameTitle,
          estimatedHours: hours,
          assetId: selectedAssetId,
          tagIds: selectedTagIds,
          timestamp: Date.now(),
        })

        toast.success("Game logged.", trackerData.name)
        setQuickEntryOpen(false)
        return
      }

      if (isFoodTracker) {
        const foodName = note.trim()
        if (!foodName) return
        const calories = value.trim() ? parseFloat(value) : null
        if (calories !== null && !Number.isFinite(calories)) return

        await addFoodEntryMutation.mutateAsync({
          trackerId: selectedTracker,
          foodName,
          calories,
          mealType: mealType || null,
          assetId: selectedAssetId,
          tagIds: selectedTagIds,
          timestamp: Date.now(),
        })

        toast.success("Food logged.", trackerData.name)
        setQuickEntryOpen(false)
        return
      }

      if (isHealthTracker) {
        const symptomName = healthSymptomName.trim()
        if (!symptomName) return
        const severity = value.trim() ? parseFloat(value) : null
        if (severity !== null && (!Number.isFinite(severity) || !Number.isInteger(severity) || severity < 1 || severity > 10)) return

        await addHealthSymptomEntryMutation.mutateAsync({
          trackerId: selectedTracker,
          symptomName,
          category: healthCategory,
          severity,
          note: note.trim() || null,
          assetId: selectedAssetId,
          tagIds: selectedTagIds,
          timestamp: Date.now(),
        })

        toast.success("Symptom logged.", trackerData.name)
        setQuickEntryOpen(false)
        return
      }

      if (isWeightTracker) {
        if (!value) return
        const parsedWeight = parseFloat(value)
        if (!Number.isFinite(parsedWeight)) return
        const parsedWaist = waist.trim() ? parseFloat(waist) : null
        if (parsedWaist !== null && !Number.isFinite(parsedWaist)) return
        const weightUnit = trackerData.config.unit === "lb" ? "lb" : "kg"

        await addWeightEntryMutation.mutateAsync({
          trackerId: selectedTracker,
          weight: parsedWeight,
          weightUnit,
          waist: parsedWaist,
          waistUnit: weightUnit === "lb" ? "in" : "cm",
          note: note.trim() || null,
          assetId: selectedAssetId,
          tagIds: selectedTagIds,
          timestamp: Date.now(),
        })

        toast.success("Weight logged.", trackerData.name)
        setQuickEntryOpen(false)
        return
      }

      let entryValue: number | null = null
      let entryNote: string | null = null
      const taskLikeEntry =
        (trackerData.type === "text" || trackerData.type === "list" || trackerData.type === "binary") &&
        !getEntryConfig(trackerData).secondaryPlaceholder

      if (taskLikeEntry) {
        entryNote = note.trim() || null
        entryValue = 0
      } else if (trackerData.type === "text" || trackerData.type === "list") {
        entryNote = note.trim() || null
        entryValue = value ? parseFloat(value) : 1
      } else if (trackerData.type === "binary" || trackerData.type === "composite") {
        entryNote = note.trim() || null
        entryValue = 1
      } else {
        if (!value) return
        entryValue = isMoodTracker ? clampMoodScore(value) : parseFloat(value)
        entryNote = note.trim() || null
      }

      if ((trackerData.type === "text" || trackerData.type === "list") && !note.trim() && !value) {
        return
      }

      await addEntryMutation.mutateAsync({
        trackerId: selectedTracker,
        value: entryValue,
        note: entryNote,
        assetId: selectedAssetId,
        tagIds: selectedTagIds,
        metadata: {},
        timestamp: Date.now(),
      })

      if (isSocialTracker && selectedContacts.length > 0) {
        try {
          await Promise.all(
            selectedContacts.map((contact) =>
              createContactInteractionMutation.mutateAsync({
                contactId: contact.contactId,
                mood: contact.mood,
                entryId: null,
                notes: entryNote,
              }),
            ),
          )

          toast.success(
            "Check-in saved.",
            `You logged time with ${selectedContacts.length} contact${selectedContacts.length === 1 ? "" : "s"}.`,
          )
        } catch (interactionError) {
          toast.error(
            "Your activity was saved, but the contact check-in could not finish.",
            formatToastError(interactionError, "Please try again in a moment."),
          )
        }
      } else {
        toast.success("Entry saved.", trackerData.name)
      }

      setQuickEntryOpen(false)
    } catch (error) {
      toast.error(
        "We couldn't save that entry.",
        formatToastError(error, "Please try again in a moment."),
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [
    addEntryMutation,
    addWeightEntryMutation,
    addGamingEntryMutation,
    addFoodEntryMutation,
    addHealthSymptomEntryMutation,
    createContactInteractionMutation,
    isSubmitting,
    healthCategory,
    healthSymptomName,
    note,
    mealType,
    selectedAssetId,
    selectedContacts,
    selectedExercises,
    selectedTagIds,
    selectedTracker,
    setQuickEntryOpen,
    toast,
    trackers,
    value,
    waist,
  ])

  const handleBookSubmit = useCallback(async (action: "want" | "started" | "read" | "finished") => {
    if (isSubmitting || !selectedTrackerData || !note.trim()) return

    setIsSubmitting(true)

    try {
      const title = note.trim()
      if (action === "want") {
        await getBookIdForTitle(title, action)
      } else {
        const bookId = await getBookIdForTitle(title, action)
        const activityPayload = {
          trackerId: selectedTrackerData.id,
          bookId,
          timestamp: Date.now(),
          assetId: selectedAssetId,
          tagIds: selectedTagIds,
        }

        if (action === "started") {
          await startBookMutation.mutateAsync(activityPayload)
        } else if (action === "read") {
          await readBookMutation.mutateAsync(activityPayload)
        } else {
          await finishBookMutation.mutateAsync(activityPayload)
        }
      }

      const actionLabel =
        action === "want" ? "Want to Read" :
        action === "started" ? "Started" :
        action === "read" ? "Read today" :
        "Finished"

      toast.success(`${actionLabel} saved.`, selectedTrackerData.name)
      setQuickEntryOpen(false)
    } catch (error) {
      toast.error(
        "We couldn't save that book event.",
        formatToastError(error, "Please try again in a moment."),
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    getBookIdForTitle,
    note,
    selectedAssetId,
    selectedTagIds,
    selectedTrackerData,
    startBookMutation,
    readBookMutation,
    finishBookMutation,
    setQuickEntryOpen,
    toast,
  ])

  const handleReminderSubmit = useCallback(async () => {
    if (isSubmitting || !reminderTitle || !reminderDate || !reminderTime) return

    setIsSubmitting(true)

    try {
      await upsertReminderMutation.mutateAsync({
        title: reminderTitle,
        description: reminderDescription.trim() || null,
        time: reminderTime.slice(0, 5),
        date: reminderDate,
        trackerId: linkedTrackerId ?? null,
        enabled: true,
      })

      toast.success("Reminder saved.", reminderTitle)
      setQuickEntryOpen(false)
    } catch (error) {
      toast.error(
        "We couldn't set that reminder.",
        formatToastError(error, "Please try again in a moment."),
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    linkedTrackerId,
    reminderDate,
    reminderDescription,
    reminderTime,
    reminderTitle,
    setQuickEntryOpen,
    toast,
    upsertReminderMutation,
  ])

  // Get human-centric entry config for the selected tracker
  const entryConfig = selectedTrackerData ? getEntryConfig(selectedTrackerData) : null

  // Check if this is a Social tracker (by icon "users" or name containing "social"/"connection")
  const isSocialTracker = selectedTrackerData
    ? selectedTrackerData.icon === "users" ||
      selectedTrackerData.name.toLowerCase().includes("social") ||
      selectedTrackerData.name.toLowerCase().includes("connection")
    : false

  // Check if this is an Exercise tracker (by icon "dumbbell" or name containing "exercise"/"workout"/"gym")
  const isExerciseTracker = selectedTrackerData
    ? selectedTrackerData.icon === "dumbbell" ||
      selectedTrackerData.name.toLowerCase().includes("exercise") ||
      selectedTrackerData.name.toLowerCase().includes("workout") ||
      selectedTrackerData.name.toLowerCase().includes("gym") ||
      selectedTrackerData.name.toLowerCase().includes("fitness")
    : false

  const isWeightTracker = selectedTrackerData
    ? selectedTrackerData.icon === "scale" ||
      selectedTrackerData.name.toLowerCase().includes("weight") ||
      selectedTrackerData.name.toLowerCase().includes("peso")
    : false
  const isFoodTracker = selectedTrackerData ? getTrackerIdentity(selectedTrackerData) === "diet" : false
  const isHealthTracker = selectedTrackerData ? getTrackerIdentity(selectedTrackerData) === "health" : false
  const isBooksTrackerSelected = selectedTrackerData ? isBooksTracker(selectedTrackerData) : false

  const renderTrackerList = (trackerList: typeof trackers, title: string) => {
    if (trackerList.length === 0) return null

    return (
      <div className="space-y-1">
        <div className="section-kicker px-3 py-2">
          {title}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
          {trackerList.map((tracker) => {
            const Icon = iconMap[tracker.icon ?? ""] || CheckSquare
            return (
              <button
                key={tracker.id}
                onClick={() => setSelectedTracker(tracker.id)}
                className={cn(
                  "surface-card min-w-0 flex flex-col items-center gap-2 rounded-2xl border border-[hsl(var(--border)/0.7)] px-2 py-3 text-center transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[hsl(var(--border)/0.95)] hover:bg-white/5"
                )}
              >
                <div
                  className="surface-chip rounded-xl p-2"
                  style={{ backgroundColor: `${tracker.color ?? "#6b7280"}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: tracker.color ?? "#6b7280" }} />
                </div>
                <div className="min-w-0">
                  <div className="line-clamp-2 text-xs font-medium leading-tight text-[hsl(210_28%_97%)]">
                    {tracker.name}
                  </div>
                  <div className="truncate text-[10px] capitalize text-[hsl(var(--muted-foreground))]">
                    {tracker.type}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={commandBarOpen} onOpenChange={(open) => setQuickEntryOpen(open)}>
      <DialogContent className="sm:max-w-[560px] min-w-0 overflow-hidden p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Quick Entry</DialogTitle>
        </DialogHeader>

        {/* Mode Switcher */}
        <div className="surface-chip mx-4 mt-4 flex gap-1 rounded-2xl p-1.5">
          <button
            onClick={() => setMode(MODE_ACTIVITY)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.35)]",
              mode === MODE_ACTIVITY
                ? "bg-[hsl(var(--primary))] text-white shadow-sm"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-white/5"
            )}
          >
            <Activity className="w-4 h-4" />
            Log Activity
          </button>
          <button
            onClick={() => setMode(MODE_REMINDER)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.35)]",
              mode === MODE_REMINDER
                ? "bg-[hsl(var(--primary))] text-white shadow-sm"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-white/5"
            )}
          >
            <Bell className="w-4 h-4" />
            Set Reminder
          </button>
        </div>

        {mode === MODE_ACTIVITY ? (
          /* Activity Mode */
          !selectedTracker ? (
            <>
              {/* Search Input */}
              <div className="surface-card mx-4 mt-4 flex items-center gap-2 rounded-2xl px-4 py-3">
                <Command className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <Input
                  placeholder="Search trackers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-auto border-0 bg-transparent p-0 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:ring-0"
                  autoFocus
                />
                <kbd className="hidden h-5 select-none items-center gap-1 rounded border border-[hsl(var(--border)/0.7)] bg-white/5 px-1.5 font-mono text-[10px] font-medium text-[hsl(var(--muted-foreground))] sm:inline-flex">
                  <span className="text-xs">Alt</span>+Q
                </kbd>
              </div>

              {/* Tracker List: Favorites/Recent + Standard/Custom */}
              <div className="max-h-[300px] overflow-y-auto p-2">
                {trackersLoading ? (
                  <div className="py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">Loading trackers...</div>
                ) : suggestedTrackers.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    No trackers found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!searchLower && favoriteTrackers.length > 0 && renderTrackerList(
                      suggestedTrackers.filter((t) => t.isFavorite),
                      "Favorites"
                    )}
                    {!searchLower && recentTrackers.length > 0 && renderTrackerList(
                      suggestedTrackers.filter((t) => !t.isFavorite && recentTrackers.some((r) => r.id === t.id)).slice(0, 5),
                      "Recent"
                    )}
                    {standardTrackers.length > 0 && renderTrackerList(standardTrackers, "Trackers")}
                    {customTrackers.length > 0 && (
                      <>
                        {standardTrackers.length > 0 && <div className="border-t border-[hsl(210_18%_22%)]" />}
                        {renderTrackerList(customTrackers, "Custom Trackers")}
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Entry Form */}
              <form
                className="p-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubmit()
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedTracker(null)}
                  className="mb-4 flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  ← Back to trackers
                </button>

                <div className="flex items-center gap-3 mb-4">
                  {selectedTrackerData && (
                    <>
                      {(() => {
                        const Icon = iconMap[selectedTrackerData.icon ?? ""] || CheckSquare
                        const color = selectedTrackerData.color ?? "#6b7280"
                        return (
                          <div
                            className="surface-chip rounded-xl p-2"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <Icon className="w-5 h-5" style={{ color }} />
                          </div>
                        )
                      })()}
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[hsl(var(--foreground))]">
                          {selectedTrackerData.name}
                        </div>
                        <div className="line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">
                          {isBooksTrackerSelected ? "Log a book event" : isHealthTracker ? "Log a symptom" : isFoodTracker ? "Log a food entry" : "Enter new value"}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Social Tracker: ContactBubblesGrid */}
                {isBooksTrackerSelected ? (
                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">
                        Book Title
                      </label>
                      <Input
                        type="text"
                        placeholder={entryConfig?.mainPlaceholder ?? "What book are you logging?"}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            e.stopPropagation()
                            void handleBookSubmit("read")
                          }
                        }}
                        className="h-12 text-lg bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => void handleBookSubmit("want")}
                        disabled={!note.trim() || isSubmitting}
                        className={cn(
                          "flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200 ease-out",
                          !note.trim() || isSubmitting
                            ? "cursor-not-allowed border-[hsl(var(--border)/0.5)] bg-white/5 text-[hsl(var(--muted-foreground))] opacity-60"
                            : "border-[hsl(var(--border)/0.7)] bg-white/5 text-[hsl(var(--foreground))] hover:border-[hsl(var(--border)/0.95)] hover:bg-white/8"
                        )}
                      >
                        <BookmarkPlus className="h-4 w-4" />
                        Want to Read
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleBookSubmit("started")}
                        disabled={!note.trim() || isSubmitting}
                        className={cn(
                          "flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200 ease-out",
                          !note.trim() || isSubmitting
                            ? "cursor-not-allowed border-[hsl(var(--border)/0.5)] bg-white/5 text-[hsl(var(--muted-foreground))] opacity-60"
                            : "border-[hsl(var(--border)/0.7)] bg-white/5 text-[hsl(var(--foreground))] hover:border-[hsl(var(--border)/0.95)] hover:bg-white/8"
                        )}
                      >
                        <BookOpen className="h-4 w-4" />
                        Start Reading
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleBookSubmit("read")}
                        disabled={!note.trim() || isSubmitting}
                        className={cn(
                          "flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200 ease-out",
                          !note.trim() || isSubmitting
                            ? "cursor-not-allowed border-[hsl(var(--border)/0.5)] bg-white/5 text-[hsl(var(--muted-foreground))] opacity-60"
                            : "border-[hsl(var(--border)/0.7)] bg-white/5 text-[hsl(var(--foreground))] hover:border-[hsl(var(--border)/0.95)] hover:bg-white/8"
                        )}
                      >
                        <BookMarked className="h-4 w-4" />
                        Read today
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleBookSubmit("finished")}
                        disabled={!note.trim() || isSubmitting}
                        className={cn(
                          "flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200 ease-out",
                          !note.trim() || isSubmitting
                            ? "cursor-not-allowed border-[hsl(var(--border)/0.5)] bg-white/5 text-[hsl(var(--muted-foreground))] opacity-60"
                            : "border-[hsl(var(--border)/0.7)] bg-white/5 text-[hsl(var(--foreground))] hover:border-[hsl(var(--border)/0.95)] hover:bg-white/8"
                        )}
                      >
                        <CheckCheck className="h-4 w-4" />
                        Finish
                      </button>
                    </div>
                  </div>
                ) : isFoodTracker ? (
                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">
                        Food Name
                      </label>
                      <Input
                        type="text"
                        placeholder="What did you eat?"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            e.stopPropagation()
                            void handleSubmit()
                          }
                        }}
                        className="h-12 text-lg bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                        autoFocus
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">
                          Calories (optional)
                        </label>
                        <Input
                          type="number"
                          placeholder="Calories"
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          className="h-12 bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">
                          Meal Type (optional)
                        </label>
                        <select
                          value={mealType}
                          onChange={(e) => setMealType((e.target.value as MealType) || "")}
                          className="h-12 w-full rounded-xl border border-[hsl(var(--border)/0.7)] bg-white/5 px-3 text-sm text-[hsl(var(--foreground))] outline-none transition-colors focus:border-[hsl(var(--border)/0.95)]"
                        >
                          <option value="">Any meal</option>
                          <option value="breakfast">Breakfast</option>
                          <option value="lunch">Lunch</option>
                          <option value="dinner">Dinner</option>
                          <option value="snack">Snack</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : isSocialTracker ? (
                  <div className="mb-4">
                    <ContactBubblesGrid
                      onSelectionChange={(selected) => setSelectedContacts(selected)}
                    />
                  </div>
                ) : isExerciseTracker ? (
                  <div className="mb-4">
                    <ExerciseSearch
                      onExerciseSelect={(exercise) => setSelectedExercises((prev) => [...prev, exercise])}
                      selectedExercises={selectedExercises}
                    />
                  </div>
                ) : (
                  <>
                  {/* Dynamic Input Fields Based on Entry Config */}
                  {entryConfig && entryConfig.mainType === "rating" ? (
                  <div className="mb-4">
                    {/* 1-10 Scale for Mood */}
                    {selectedTrackerData?.icon === "smile" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => {
                            const moodEmojis = ["🤬", "😠", "😞", "☹️", "😐", "🙂", "😊", "😄", "🤩", "😍"]
                            return (
                              <button
                                type="button"
                                key={rating}
                                onClick={() => setValue(rating.toString())}
                                className={cn(
                                  "min-w-0 flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-lg transition-all duration-200 ease-out",
                                  value === rating.toString()
                                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--foreground))]"
                                    : "border-[hsl(var(--border)/0.7)] bg-white/5 text-[hsl(var(--foreground))] hover:border-[hsl(var(--border)/0.95)] hover:bg-white/5"
                                )}
                              >
                                <span>{moodEmojis[rating - 1]}</span>
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">{rating}</span>
                              </button>
                            )
                          })}
                        </div>
                        {value && (
                          <div className="text-center text-sm text-[hsl(var(--muted-foreground))]">
                            Selected: {value}/10
                          </div>
                        )}
                        {entryConfig.notePlaceholder && (
                          <Input
                            type="text"
                            placeholder={entryConfig.notePlaceholder}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="mt-2 bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                          />
                        )}
                      </div>
                    ) : (
                      /* Default 1-5 scale for other rating types */
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            type="button"
                            key={rating}
                            onClick={() => setValue(rating.toString())}
                            className={cn(
                              "min-w-0 rounded-xl border py-3 text-lg transition-all duration-200 ease-out",
                              value === rating.toString()
                                ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--foreground))]"
                                : "border-[hsl(var(--border)/0.7)] bg-white/5 text-[hsl(var(--foreground))] hover:border-[hsl(var(--border)/0.95)] hover:bg-white/5"
                            )}
                          >
                            {["😢", "😔", "😐", "🙂", "😄"][rating - 1]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : isHealthTracker ? (
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">
                        Symptom
                      </label>
                      <Input
                        type="text"
                        placeholder="What symptom are you logging?"
                        value={healthSymptomName}
                        onChange={(e) => setHealthSymptomName(e.target.value)}
                        className="h-12 text-lg bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                        autoFocus
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">
                          Severity (optional)
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          step={1}
                          placeholder="1-10"
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          className="h-12 text-lg bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">
                          Category
                        </label>
                        <select
                          value={healthCategory}
                          onChange={(e) => setHealthCategory(e.target.value as "physical" | "mental" | "general" | "other")}
                          className="h-12 w-full rounded-xl border border-[hsl(var(--border)/0.7)] bg-white/5 px-3 text-sm text-[hsl(var(--foreground))] outline-none transition-colors focus:border-[hsl(var(--border)/0.95)]"
                        >
                          <option value="general">General</option>
                          <option value="physical">Physical</option>
                          <option value="mental">Mental</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">
                        Context
                      </label>
                      <Input
                        type="text"
                        placeholder={entryConfig?.notePlaceholder ?? "Optional note or context"}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                      />
                    </div>
                  </div>
                ) : entryConfig && entryConfig.mainType === "text" ? (
                  /* Text-based Trackers (Books, TV, Games, Tasks) */
                  <div className="space-y-3 mb-4">
                    <div>
                      {entryConfig.mainLabel && (
                        <label className="block text-xs text-[hsl(210_12%_47%)] mb-1.5">
                          {entryConfig.mainLabel}
                        </label>
                      )}
                      <Input
                        type="text"
                        placeholder={entryConfig.mainPlaceholder}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleSubmit() } }}
                        className="h-12 text-lg bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                        autoFocus
                      />
                    </div>
                    {entryConfig.secondaryPlaceholder && (
                      <div>
                        {entryConfig.noteLabel && (
                          <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">
                            {entryConfig.noteLabel}
                          </label>
                        )}
                        <Input
                          type="number"
                          placeholder={entryConfig.secondaryPlaceholder}
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          className="bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                        />
                      </div>
                    )}
                  </div>
                ) : entryConfig && entryConfig.mainType === "number" ? (
                  /* Numeric Trackers (Exercise, Weight, Diet, etc.) */
                  <div className="space-y-3 mb-4">
                    <div className="relative">
                      {entryConfig.mainLabel && (
                        <label className="block text-xs text-[hsl(210_12%_47%)] mb-1.5">
                          {entryConfig.mainLabel}
                        </label>
                      )}
                      <Input
                        type="number"
                        placeholder={entryConfig.mainPlaceholder}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleSubmit() } }}
                        className="h-12 text-lg bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                        autoFocus
                      />
                      {selectedTrackerData?.config.unit && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">
                          {selectedTrackerData.config.unit as string}
                        </span>
                      )}
                    </div>
                    {isWeightTracker && (
                      <div className="relative">
                        <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">
                          Waist (optional)
                        </label>
                        <Input
                          type="number"
                          placeholder="Waist measurement"
                          value={waist}
                          onChange={(e) => setWaist(e.target.value)}
                          className="h-11 bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                        />
                        <span className="absolute right-3 top-[2.35rem] text-[hsl(var(--muted-foreground))]">
                          {selectedTrackerData?.config.unit === "lb" ? "in" : "cm"}
                        </span>
                      </div>
                    )}
                    {entryConfig.notePlaceholder && (
                      <div>
                        {entryConfig.noteLabel && (
                          <label className="mb-1.5 block text-xs text-[hsl(var(--muted-foreground))]">
                            {entryConfig.noteLabel}
                          </label>
                        )}
                        {entryConfig.noteHint && (
                          <p className="mb-1.5 text-xs text-[hsl(var(--muted-foreground))]">{entryConfig.noteHint}</p>
                        )}
                        <Input
                          type="text"
                          placeholder={entryConfig.notePlaceholder}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Fallback: Default behavior */
                  <div className="space-y-3 mb-4">
                    <Input
                      type="text"
                      placeholder="Enter value..."
                      value={note || value}
                      onChange={(e) => {
                        if (selectedTrackerData?.type === "text" || selectedTrackerData?.type === "list") {
                          setNote(e.target.value)
                        } else {
                          setValue(e.target.value)
                        }
                      }}
                      className="h-12 text-lg bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                      autoFocus
                    />
                  </div>
                )}
                </>
                )}

                <div className="mb-4">
                  <TagSelector
                    tags={tags}
                    selectedTagIds={selectedTagIds}
                    onChange={setSelectedTagIds}
                    onCreateTag={handleCreateTag}
                    disabled={isSubmitting}
                    creating={createTagMutation.isPending}
                    compact
                  />
                </div>

                {/* Asset Attachment */}
                <div className="mb-4 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setAssetPickerOpen(!assetPickerOpen)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.35)]",
                        selectedAssetId
                          ? "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--foreground))]"
                          : "border-[hsl(var(--border)/0.7)] bg-white/5 text-[hsl(var(--foreground))] hover:bg-white/5"
                      )}
                    >
                      <ImageIcon className="w-4 h-4" />
                      {selectedAssetId ? "Change Attachment" : "Attach Image"}
                    </button>
                    {selectedAssetId && (
                      <button
                        type="button"
                        onClick={() => setSelectedAssetId(null)}
                        className="rounded-lg border border-[hsl(var(--border)/0.7)] p-2 text-[hsl(var(--muted-foreground))] hover:bg-white/5 hover:text-[hsl(var(--foreground))]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Asset Preview - Large content thumbnail */}
                  {selectedAsset && (
                    <div className="surface-card mt-2 max-h-[200px] max-w-xs overflow-hidden rounded-2xl">
                      <img
                        src={selectedAsset.thumbnailUrl}
                        alt={selectedAsset.originalName || "Asset"}
                        className="w-full h-auto max-h-[200px] object-contain"
                      />
                    </div>
                  )}

                  {/* Asset Picker Popover */}
                  {assetPickerOpen && (
                    <div
                      ref={assetPickerRef}
                      className="surface-panel absolute left-0 top-full z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl p-3"
                    >
                      {assets.length === 0 ? (
                        <div className="py-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                          No assets available
                        </div>
                      ) : (
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(72px,1fr))] gap-2">
                          {assets.map((asset) => (
                            <button
                              type="button"
                              key={asset.id}
                              onClick={() => {
                                setSelectedAssetId(asset.id)
                                setAssetPickerOpen(false)
                              }}
                              className={cn(
                                "relative aspect-square min-w-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ease-out",
                                selectedAssetId === asset.id
                                  ? "border-[hsl(var(--primary))]"
                                  : "border-[hsl(var(--border)/0.7)] hover:border-[hsl(var(--primary)/0.4)]"
                              )}
                            >
                              <img
                                src={asset.thumbnailUrl}
                                alt={asset.originalName || "Asset"}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => setQuickEntryOpen(false)}
                  >
                    Cancel
                  </Button>
                  {!isBooksTrackerSelected && (
                    <Button
                      type="submit"
                      className="flex-1 rounded-xl"
                      disabled={
                        isExerciseTracker
                          ? selectedExercises.length === 0 // Exercise trackers need at least one exercise selected
                          : isSocialTracker
                            ? selectedContacts.length === 0 // Social trackers need at least one contact selected
                          : isHealthTracker
                            ? !healthSymptomName.trim() || (value.trim() !== "" && (!Number.isFinite(parseFloat(value)) || !Number.isInteger(parseFloat(value)) || parseFloat(value) < 1 || parseFloat(value) > 10))
                            : isFoodTracker
                              ? !note.trim()
                            : selectedTrackerData?.type === "text" || selectedTrackerData?.type === "list"
                              ? !note.trim() && !value
                              : selectedTrackerData?.type === "binary" || selectedTrackerData?.type === "composite"
                                ? !note.trim()
                              : !value
                      }
                      loading={isSubmitting}
                      loadingText="Saving entry..."
                    >
                      Save Entry
                    </Button>
                  )}
                </div>
              </form>
            </>
          )
        ) : (
          /* Reminder Mode */
          <form
            className="space-y-4 p-4"
            onSubmit={(e) => {
              e.preventDefault()
              handleReminderSubmit()
            }}
          >
            {/* Title */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                Reminder Title
              </label>
              <Input
                placeholder="e.g., Log weight, Morning workout..."
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                className="text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                Description (optional)
              </label>
              <Input
                placeholder="Add details..."
                value={reminderDescription}
                onChange={(e) => setReminderDescription(e.target.value)}
                className="text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  Date
                </label>
                <Input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="text-[hsl(var(--foreground))] [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  Time
                </label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="text-[hsl(var(--foreground))] [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Link to Tracker (optional) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                Link to Tracker (optional)
              </label>
              <CyberpunkSelect
                value={linkedTrackerId || null}
                onValueChange={(value) => setLinkedTrackerId(value === null ? undefined : Number(value))}
                options={[
                  { value: "", label: "No tracker linked" },
                  ...trackers.map((tracker) => ({ value: tracker.id, label: tracker.name }))
                ]}
                placeholder="No tracker linked"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setQuickEntryOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-xl"
                disabled={!reminderTitle || !reminderDate || !reminderTime}
                loading={isSubmitting}
                loadingText="Saving reminder..."
              >
                <Calendar className="w-4 h-4 mr-2" />
                Set Reminder
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
