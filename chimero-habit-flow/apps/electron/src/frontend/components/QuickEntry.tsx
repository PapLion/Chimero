"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useAppStore } from "../lib/store"
import { useTrackers, useRecentTrackers, useFavoriteTrackers, useAddEntryMutation, useUpsertReminderMutation, useAssets, useCreateContactInteractionMutation } from "../lib/queries"
import { cn } from "../lib/utils"
import type { Tracker } from "../lib/store"
import { ContactBubblesGrid, type ContactMoodSelection } from "./ContactBubblesGrid"
import { ExerciseSearch, type SelectedExercise } from "./ExerciseSearch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@packages/ui/dialog"
import { Input } from "@packages/ui/input"
import { Button } from "@packages/ui/button"
import { CyberpunkSelect } from "../components/CyberpunkSelect"
import { Scale, Smile, Dumbbell, Users, CheckSquare, Wallet, Command, Bell, Activity, Calendar, Flame, Book, Gamepad2, Heart, Coffee, Moon, Sun, Zap, Target, Music, Camera, ImageIcon, X, type LucideIcon } from "lucide-react"
import type { TrackerInputField, TrackerInputFieldType } from "@packages/db"

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
  camera: Camera,
}

const MODE_ACTIVITY = "activity"
const MODE_REMINDER = "reminder"
type QuickEntryMode = typeof MODE_ACTIVITY | typeof MODE_REMINDER

export function QuickEntry() {
  const { commandBarOpen, setQuickEntryOpen, activeTracker } = useAppStore()
  const upsertReminderMutation = useUpsertReminderMutation()
  const { data: trackers = [], isLoading: trackersLoading } = useTrackers()
  const { data: recentTrackers = [] } = useRecentTrackers(10)
  const { data: favoriteTrackers = [] } = useFavoriteTrackers()
  const addEntryMutation = useAddEntryMutation()
  const createContactInteractionMutation = useCreateContactInteractionMutation()

  const [search, setSearch] = useState("")
  const [selectedTracker, setSelectedTracker] = useState<number | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({})
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null)
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [mode, setMode] = useState<QuickEntryMode>(MODE_ACTIVITY)

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

  // Assets for picker
  const { data: assetsData } = useAssets({ limit: 50 })
  const assets = (assetsData ?? []) as Array<{ id: number; thumbnailUrl: string; assetUrl: string; originalName?: string | null }>
  const selectedAsset = assets.find((a) => a.id === selectedAssetId)
  const assetPickerRef = useRef<HTMLDivElement>(null)

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
      setFieldValues({})
      setSelectedAssetId(null)
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
      setFieldValues({})
      setSelectedAssetId(null)
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

  const selectedTrackerData = trackers.find((t) => t.id === selectedTracker)

  const schemaFields: TrackerInputField[] = useMemo(() => {
    if (!selectedTrackerData) return []
    const schema = selectedTrackerData.config?.inputSchema
    if (schema?.fields?.length) return schema.fields

    // Legacy fallback (should be migrated to config.inputSchema)
    const t = selectedTrackerData.type as string
    if (t === "rating") {
      return [{ key: "value", type: "rating", label: "Rating", min: 1, max: 10, required: true }]
    }
    if (t === "text" || t === "list" || t === "binary" || t === "composite") {
      return [{ key: "note", type: "text", label: "Note", placeholder: "Enter text...", required: true }]
    }
    return [{ key: "value", type: "number", label: "Value", placeholder: "Enter value...", required: true }]
  }, [selectedTrackerData])

  const hasFieldType = useCallback((type: TrackerInputFieldType) => {
    return schemaFields.some((f) => f.type === type)
  }, [schemaFields])

  // Initialize fields when tracker changes
  useEffect(() => {
    if (!selectedTrackerData) return
    setFieldValues((prev) => {
      const next: Record<string, unknown> = { ...prev }
      for (const f of schemaFields) {
        if (next[f.key] === undefined) {
          next[f.key] = f.type === "boolean" ? false : ""
        }
      }
      return next
    })
    // reset structured selectors when schema doesn't need them
    if (!hasFieldType("contacts")) setSelectedContacts([])
    if (!hasFieldType("exercises")) setSelectedExercises([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrackerData?.id])

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

  const handleSubmit = useCallback(() => {
    if (!selectedTracker) return

    if (!selectedTrackerData) return
    const schema = selectedTrackerData.config?.inputSchema
    const requiredMissing = schemaFields.some((f) => {
      if (!f.required) return false
      if (f.type === "contacts") return selectedContacts.length === 0
      if (f.type === "exercises") return selectedExercises.length === 0
      const v = fieldValues[f.key]
      if (f.type === "boolean") return v !== true && v !== false ? true : false
      return v == null || String(v).trim() === ""
    })
    if (requiredMissing) return

    const metadata: Record<string, unknown> = {}
    for (const f of schemaFields) {
      if (f.type === "contacts") metadata[f.key] = selectedContacts
      else if (f.type === "exercises") metadata[f.key] = selectedExercises
      else metadata[f.key] = fieldValues[f.key]
    }

    const valueKey = schema?.valueKey
      ?? schemaFields.find((f) => f.type === "number" || f.type === "rating")?.key
      ?? null
    const noteKey = schema?.noteKey
      ?? schemaFields.find((f) => f.type === "text")?.key
      ?? null

    const entryValueRaw = valueKey ? metadata[valueKey] : null
    const entryValue = entryValueRaw == null || entryValueRaw === "" ? null : Number(entryValueRaw)
    const entryNoteRaw = noteKey ? metadata[noteKey] : null
    const entryNote = entryNoteRaw == null || String(entryNoteRaw).trim() === "" ? null : String(entryNoteRaw)

    addEntryMutation.mutate(
      {
        trackerId: selectedTracker,
        value: Number.isFinite(entryValue) ? entryValue : null,
        note: entryNote,
        assetId: selectedAssetId,
        metadata,
        timestamp: Date.now(),
      },
      {
        onSuccess: (entry) => {
          if (entry && hasFieldType("contacts") && selectedContacts.length > 0) {
            selectedContacts.forEach((contact) => {
              createContactInteractionMutation.mutate({
                contactId: contact.contactId,
                mood: contact.mood,
                entryId: entry.id,
                notes: entryNote,
              })
            })
          }
          setQuickEntryOpen(false)
        },
      }
    )
  }, [selectedTracker, selectedTrackerData, schemaFields, fieldValues, selectedAssetId, selectedContacts, selectedExercises, addEntryMutation, createContactInteractionMutation, hasFieldType, setQuickEntryOpen])

  const handleReminderSubmit = useCallback(() => {
    if (!reminderTitle || !reminderDate || !reminderTime) return
    upsertReminderMutation.mutate(
      {
        title: reminderTitle,
        description: reminderDescription.trim() || null,
        time: reminderTime.slice(0, 5),
        date: reminderDate,
        trackerId: linkedTrackerId ?? null,
        enabled: true,
      },
      {
        onSuccess: () => setQuickEntryOpen(false),
      }
    )
  }, [reminderTitle, reminderDescription, reminderDate, reminderTime, linkedTrackerId, upsertReminderMutation, setQuickEntryOpen])

  const isContactsDriven = hasFieldType("contacts")
  const isExercisesDriven = hasFieldType("exercises")

  const renderTrackerList = (trackerList: typeof trackers, title: string) => {
    if (trackerList.length === 0) return null

    return (
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {trackerList.map((tracker) => {
            const Icon = iconMap[tracker.icon ?? ""] || CheckSquare
            return (
              <button
                key={tracker.id}
                onClick={() => setSelectedTracker(tracker.id)}
                className={cn(
                  "flex flex-col items-center gap-2 px-2 py-3 rounded-lg transition-all text-center",
                  "hover:bg-accent"
                )}
              >
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${tracker.color ?? "#6b7280"}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: tracker.color ?? "#6b7280" }} />
                </div>
                <div>
                  <div className="text-xs font-medium text-foreground leading-tight">
                    {tracker.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground capitalize">
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
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-[hsl(210_25%_11%)] border-[hsl(210_18%_22%)]">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Quick Entry</DialogTitle>
        </DialogHeader>

        {/* Mode Switcher */}
        <div className="flex gap-1 p-2 mx-4 bg-[hsl(210_20%_15%)] rounded-lg">
          <button
            onClick={() => setMode(MODE_ACTIVITY)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              mode === MODE_ACTIVITY
                ? "bg-[hsl(266_73%_63%)] text-white"
                : "text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)]"
            )}
          >
            <Activity className="w-4 h-4" />
            Log Activity
          </button>
          <button
            onClick={() => setMode(MODE_REMINDER)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              mode === MODE_REMINDER
                ? "bg-[hsl(266_73%_63%)] text-white"
                : "text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)]"
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
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(210_18%_22%)]">
                <Command className="w-4 h-4 text-[hsl(210_12%_47%)]" />
                <Input
                  placeholder="Search trackers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 p-0 h-auto text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-[hsl(210_18%_22%)] bg-[hsl(210_20%_15%)] px-1.5 font-mono text-[10px] font-medium text-[hsl(210_12%_47%)]">
                  <span className="text-xs">Alt</span>+Q
                </kbd>
              </div>

              {/* Tracker List: Favorites/Recent + Standard/Custom */}
              <div className="max-h-[300px] overflow-y-auto p-2">
                {trackersLoading ? (
                  <div className="py-6 text-center text-sm text-[hsl(210_12%_47%)]">Loading trackers...</div>
                ) : suggestedTrackers.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[hsl(210_12%_47%)]">
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
                  className="text-sm text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)] mb-4 flex items-center gap-1"
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
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <Icon className="w-5 h-5" style={{ color }} />
                          </div>
                        )
                      })()}
                      <div>
                        <div className="font-medium text-[hsl(210_25%_97%)]">
                          {selectedTrackerData.name}
                        </div>
                        <div className="text-xs text-[hsl(210_12%_47%)]">
                          Enter new value
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Config-driven fields */}
                {isContactsDriven ? (
                  <div className="mb-4">
                    <ContactBubblesGrid
                      onSelectionChange={(selected) => setSelectedContacts(selected)}
                    />
                  </div>
                ) : isExercisesDriven ? (
                  <div className="mb-4">
                    <ExerciseSearch
                      onExerciseSelect={(exercise) => setSelectedExercises((prev) => [...prev, exercise])}
                      selectedExercises={selectedExercises}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {schemaFields.map((field) => {
                        if (field.type === "contacts" || field.type === "exercises") return null

                        if (field.type === "rating") {
                          const min = field.min ?? 1
                          const max = field.max ?? 10
                          const current = String(fieldValues[field.key] ?? "")
                          return (
                            <div key={field.key} className="space-y-2">
                              {field.label && (
                                <label className="block text-xs text-[hsl(210_12%_47%)] mb-1.5">
                                  {field.label}
                                </label>
                              )}
                              <div className="grid grid-cols-5 gap-2">
                                {Array.from({ length: max - min + 1 }, (_, idx) => min + idx).map((rating) => (
                                  <button
                                    type="button"
                                    key={rating}
                                    onClick={() => setFieldValues((p) => ({ ...p, [field.key]: String(rating) }))}
                                    className={cn(
                                      "py-2 rounded-lg border transition-all text-sm flex items-center justify-center",
                                      current === String(rating)
                                        ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%/0.1)] text-[hsl(266_73%_63%)]"
                                        : "border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%/0.5)] text-[hsl(210_25%_97%)]"
                                    )}
                                  >
                                    {rating}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        }

                        if (field.type === "select") {
                          const options = (field.options ?? []).map((o) => ({ value: o, label: o }))
                          return (
                            <div key={field.key}>
                              {field.label && (
                                <label className="block text-xs text-[hsl(210_12%_47%)] mb-1.5">
                                  {field.label}
                                </label>
                              )}
                              <CyberpunkSelect
                                value={(fieldValues[field.key] as string | null) ?? null}
                                onValueChange={(v) => setFieldValues((p) => ({ ...p, [field.key]: v }))}
                                options={options}
                                placeholder={field.placeholder ?? "Select..."}
                              />
                            </div>
                          )
                        }

                        const inputType = field.type === "number" ? "number" : "text"
                        return (
                          <div key={field.key} className="relative">
                            {field.label && (
                              <label className="block text-xs text-[hsl(210_12%_47%)] mb-1.5">
                                {field.label}
                              </label>
                            )}
                            <Input
                              type={inputType}
                              placeholder={field.placeholder ?? ""}
                              value={String(fieldValues[field.key] ?? "")}
                              onChange={(e) => setFieldValues((p) => ({ ...p, [field.key]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleSubmit() } }}
                              className="text-lg h-12 bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
                              autoFocus={schemaFields[0]?.key === field.key}
                            />
                            {field.type === "number" && field.key === "value" && selectedTrackerData?.config.unit && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(210_12%_47%)]">
                                {selectedTrackerData.config.unit as string}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                </>
                )}

                {/* Asset Attachment */}
                <div className="mb-4 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setAssetPickerOpen(!assetPickerOpen)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm",
                        selectedAssetId
                          ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%/0.1)] text-[hsl(266_73%_63%)]"
                          : "border-[hsl(210_18%_22%)] bg-[hsl(210_20%_15%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_20%)]"
                      )}
                    >
                      <ImageIcon className="w-4 h-4" />
                      {selectedAssetId ? "Change Attachment" : "Attach Image"}
                    </button>
                    {selectedAssetId && (
                      <button
                        type="button"
                        onClick={() => setSelectedAssetId(null)}
                        className="p-2 rounded-lg border border-[hsl(210_18%_22%)] text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_15%)]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Asset Preview - Large content thumbnail */}
                  {selectedAsset && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-[hsl(210_18%_22%)] max-w-xs max-h-[200px] bg-white/[0.04]">
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
                      className="absolute z-50 top-full left-0 mt-2 p-3 bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] rounded-lg shadow-lg max-h-64 overflow-y-auto w-full"
                    >
                      {assets.length === 0 ? (
                        <div className="py-4 text-center text-sm text-[hsl(210_12%_47%)]">
                          No assets available
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {assets.map((asset) => (
                            <button
                              type="button"
                              key={asset.id}
                              onClick={() => {
                                setSelectedAssetId(asset.id)
                                setAssetPickerOpen(false)
                              }}
                              className={cn(
                                "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                                selectedAssetId === asset.id
                                  ? "border-[hsl(266_73%_63%)]"
                                  : "border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%/0.5)]"
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
                    className="flex-1 bg-transparent border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_15%)]"
                    onClick={() => setQuickEntryOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
                    disabled={schemaFields.some((f) => {
                      if (!f.required) return false
                      if (f.type === "contacts") return selectedContacts.length === 0
                      if (f.type === "exercises") return selectedExercises.length === 0
                      const v = fieldValues[f.key]
                      if (f.type === "boolean") return v !== true && v !== false
                      return v == null || String(v).trim() === ""
                    })}
                  >
                    Save Entry
                  </Button>
                </div>
              </form>
            </>
          )
        ) : (
          /* Reminder Mode */
          <form
            className="p-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              handleReminderSubmit()
            }}
          >
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
                Reminder Title
              </label>
              <Input
                placeholder="e.g., Log weight, Morning workout..."
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
                Description (optional)
              </label>
              <Input
                placeholder="Add details..."
                value={reminderDescription}
                onChange={(e) => setReminderDescription(e.target.value)}
                className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
                  Date
                </label>
                <Input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
                  Time
                </label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Link to Tracker (optional) */}
            <div>
              <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
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
                className="flex-1 bg-transparent border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_15%)]"
                onClick={() => setQuickEntryOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
                disabled={!reminderTitle || !reminderDate || !reminderTime}
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
