"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useAppStore } from "../lib/store"
import { useTrackers, useRecentTrackers, useFavoriteTrackers, useAddEntryMutation, useUpsertReminderMutation, useAssets } from "../lib/queries"
import { cn } from "../lib/utils"
import { getEntryConfig } from "../lib/entry-config"
import type { Tracker } from "../lib/store"
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

type QuickEntryMode = "activity" | "reminder"

export function QuickEntry() {
  const { commandBarOpen, setQuickEntryOpen } = useAppStore()
  const upsertReminderMutation = useUpsertReminderMutation()
  const { data: trackers = [], isLoading: trackersLoading } = useTrackers()
  const { data: recentTrackers = [] } = useRecentTrackers(10)
  const { data: favoriteTrackers = [] } = useFavoriteTrackers()
  const addEntryMutation = useAddEntryMutation()

  const [search, setSearch] = useState("")
  const [selectedTracker, setSelectedTracker] = useState<number | null>(null)
  const [value, setValue] = useState("")
  const [note, setNote] = useState("")
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null)
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [mode, setMode] = useState<QuickEntryMode>("activity")
  
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

  // Reset state when dialog closes
  useEffect(() => {
    if (!commandBarOpen) {
      setSearch("")
      setSelectedTracker(null)
      setValue("")
      setNote("")
      setSelectedAssetId(null)
      setAssetPickerOpen(false)
      setMode("activity")
      setReminderTitle("")
      setReminderDescription("")
      setReminderDate("")
      setReminderTime("")
      setLinkedTrackerId(undefined)
    }
  }, [commandBarOpen])

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
    
    const selectedTrackerData = trackers.find((t) => t.id === selectedTracker)
    if (!selectedTrackerData) return

    // Determine value and note based on tracker type
    let entryValue: number | null = null
    let entryNote: string | null = null

    if (selectedTrackerData.type === "text" || selectedTrackerData.type === "list") {
      // Text/List trackers: note is main, value is optional number or 1 (count)
      entryNote = note.trim() || null
      entryValue = value ? parseFloat(value) : 1
    } else if (selectedTrackerData.type === "binary" || selectedTrackerData.type === "composite") {
      // Tasks: text input only, value is 1
      entryNote = note.trim() || null
      entryValue = 1
    } else {
      // Numeric/Range trackers: value is main, note is optional
      if (!value) return // Require value for numeric trackers
      entryValue = parseFloat(value)
      entryNote = note.trim() || null
    }

    // For text/list trackers, require at least note or value
    if ((selectedTrackerData.type === "text" || selectedTrackerData.type === "list") && !note.trim() && !value) {
      return
    }

    addEntryMutation.mutate(
      {
        trackerId: selectedTracker,
        value: entryValue,
        note: entryNote,
        assetId: selectedAssetId,
        metadata: {},
        timestamp: Date.now(),
      },
      { onSuccess: () => setQuickEntryOpen(false) }
    )
  }, [selectedTracker, value, note, selectedAssetId, trackers, addEntryMutation, setQuickEntryOpen])

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

  const selectedTrackerData = trackers.find((t) => t.id === selectedTracker)
  
  // Get human-centric entry config for the selected tracker
  const entryConfig = selectedTrackerData ? getEntryConfig(selectedTrackerData) : null

  const renderTrackerList = (trackerList: typeof trackers, title: string) => {
    if (trackerList.length === 0) return null
    
    return (
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </div>
        {trackerList.map((tracker) => {
          const Icon = iconMap[tracker.icon ?? ""] || CheckSquare
          return (
            <button
              key={tracker.id}
              onClick={() => setSelectedTracker(tracker.id)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-left",
                "hover:bg-accent"
              )}
            >
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${tracker.color ?? "#6b7280"}20` }}
              >
                <Icon className="w-4 h-4" style={{ color: tracker.color ?? "#6b7280" }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">
                  {tracker.name}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {tracker.type}
                </div>
              </div>
            </button>
          )
        })}
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
            onClick={() => setMode("activity")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              mode === "activity"
                ? "bg-[hsl(266_73%_63%)] text-white"
                : "text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)]"
            )}
          >
            <Activity className="w-4 h-4" />
            Log Activity
          </button>
          <button
            onClick={() => setMode("reminder")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              mode === "reminder"
                ? "bg-[hsl(266_73%_63%)] text-white"
                : "text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)]"
            )}
          >
            <Bell className="w-4 h-4" />
            Set Reminder
          </button>
        </div>

        {mode === "activity" ? (
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
              <div className="p-4">
                <button
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

                {/* Dynamic Input Fields Based on Entry Config */}
                {entryConfig && entryConfig.mainType === "rating" ? (
                  <div className="mb-4">
                    {/* 1-10 Scale for Mood */}
                    {selectedTrackerData?.icon === "smile" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => {
                            const moodEmojis = ["🤬", "😠", "😞", "☹️", "😐", "🙂", "😊", "😄", "🤩", "😍"]
                            return (
                              <button
                                key={rating}
                                onClick={() => setValue(rating.toString())}
                                className={cn(
                                  "py-2 rounded-lg border transition-all text-lg flex flex-col items-center gap-1",
                                  value === rating.toString()
                                    ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%/0.1)] text-[hsl(266_73%_63%)]"
                                    : "border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%/0.5)] text-[hsl(210_25%_97%)]"
                                )}
                              >
                                <span>{moodEmojis[rating - 1]}</span>
                                <span className="text-xs">{rating}</span>
                              </button>
                            )
                          })}
                        </div>
                        {value && (
                          <div className="text-center text-sm text-[hsl(210_12%_47%)]">
                            Selected: {value}/10
                          </div>
                        )}
                        {entryConfig.notePlaceholder && (
                          <Input
                            type="text"
                            placeholder={entryConfig.notePlaceholder}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)] mt-2"
                          />
                        )}
                      </div>
                    ) : (
                      /* Default 1-5 scale for other rating types */
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setValue(rating.toString())}
                            className={cn(
                              "flex-1 py-3 rounded-lg border transition-all text-lg",
                              value === rating.toString()
                                ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%/0.1)] text-[hsl(266_73%_63%)]"
                                : "border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%/0.5)] text-[hsl(210_25%_97%)]"
                            )}
                          >
                            {["😢", "😔", "😐", "🙂", "😄"][rating - 1]}
                          </button>
                        ))}
                      </div>
                    )}
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
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (note.trim() || value)) {
                            e.preventDefault()
                            handleSubmit()
                          }
                        }}
                        className="text-lg h-12 bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
                        autoFocus
                      />
                    </div>
                    {entryConfig.secondaryPlaceholder && (
                      <div>
                        {entryConfig.noteLabel && (
                          <label className="block text-xs text-[hsl(210_12%_47%)] mb-1.5">
                            {entryConfig.noteLabel}
                          </label>
                        )}
                        <Input
                          type="number"
                          placeholder={entryConfig.secondaryPlaceholder}
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (note.trim() || value)) {
                              e.preventDefault()
                              handleSubmit()
                            }
                          }}
                          className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
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
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && value) {
                            e.preventDefault()
                            handleSubmit()
                          }
                        }}
                        className="text-lg h-12 bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
                        autoFocus
                      />
                      {selectedTrackerData?.config.unit && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(210_12%_47%)]">
                          {selectedTrackerData.config.unit as string}
                        </span>
                      )}
                    </div>
                    {entryConfig.notePlaceholder && (
                      <div>
                        {entryConfig.noteLabel && (
                          <label className="block text-xs text-[hsl(210_12%_47%)] mb-1.5">
                            {entryConfig.noteLabel}
                          </label>
                        )}
                        {entryConfig.noteHint && (
                          <p className="text-xs text-[hsl(210_12%_47%)] mb-1.5">{entryConfig.noteHint}</p>
                        )}
                        <Input
                          type="text"
                          placeholder={entryConfig.notePlaceholder}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && value) {
                              e.preventDefault()
                              handleSubmit()
                            }
                          }}
                          className="bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (note.trim() || value)) {
                          e.preventDefault()
                          handleSubmit()
                        }
                      }}
                      className="text-lg h-12 bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
                      autoFocus
                    />
                  </div>
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
                    className="flex-1 bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
                    onClick={handleSubmit}
                    disabled={
                      selectedTrackerData?.type === "text" || selectedTrackerData?.type === "list"
                        ? !note.trim() && !value
                        : selectedTrackerData?.type === "binary" || selectedTrackerData?.type === "composite"
                        ? !note.trim()
                        : !value
                    }
                  >
                    Save Entry
                  </Button>
                </div>
              </div>
            </>
          )
        ) : (
          /* Reminder Mode */
          <div className="p-4 space-y-4">
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
                className="flex-1 bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)]"
                onClick={handleReminderSubmit}
                disabled={!reminderTitle || !reminderDate || !reminderTime}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Set Reminder
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
