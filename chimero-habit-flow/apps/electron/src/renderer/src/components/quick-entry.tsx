"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useAppStore } from "../lib/store"
import { useTrackers, useRecentTrackers, useFavoriteTrackers, useAddEntryMutation } from "../lib/queries"
import { cn } from "../lib/utils"
import type { Tracker } from "../lib/store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@packages/ui/dialog"
import { Input } from "@packages/ui/input"
import { Button } from "@packages/ui/button"
import { Scale, Smile, Dumbbell, Users, CheckSquare, Wallet, Command, Bell, Activity, Calendar, Flame, Book, Gamepad2, Heart, Coffee, Moon, Sun, Zap, Target, Music, Camera, type LucideIcon } from "lucide-react"

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
  // Reminders: no IPC yet; no-op until API exists
  const addReminder = (_r: Omit<import("../lib/store").Reminder, "id" | "createdAt">) => {}
  const { data: trackers = [], isLoading: trackersLoading } = useTrackers()
  const { data: recentTrackers = [] } = useRecentTrackers(10)
  const { data: favoriteTrackers = [] } = useFavoriteTrackers()
  const addEntryMutation = useAddEntryMutation()

  const [search, setSearch] = useState("")
  const [selectedTracker, setSelectedTracker] = useState<number | null>(null)
  const [value, setValue] = useState("")
  const [mode, setMode] = useState<QuickEntryMode>("activity")
  
  // Reminder state
  const [reminderTitle, setReminderTitle] = useState("")
  const [reminderDescription, setReminderDescription] = useState("")
  const [reminderDate, setReminderDate] = useState("")
  const [reminderTime, setReminderTime] = useState("")
  const [linkedTrackerId, setLinkedTrackerId] = useState<number | undefined>(undefined)

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
      setMode("activity")
      setReminderTitle("")
      setReminderDescription("")
      setReminderDate("")
      setReminderTime("")
      setLinkedTrackerId(undefined)
    }
  }, [commandBarOpen])

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
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
    if (selectedTracker && value) {
      addEntryMutation.mutate(
        {
          trackerId: selectedTracker,
          value: parseFloat(value),
          metadata: {},
          timestamp: Date.now(),
        },
        { onSuccess: () => setQuickEntryOpen(false) }
      )
    }
  }, [selectedTracker, value, addEntryMutation, setQuickEntryOpen])

  const handleReminderSubmit = useCallback(() => {
    if (reminderTitle && reminderDate && reminderTime) {
      const dueDateTime = new Date(`${reminderDate}T${reminderTime}`).getTime()
      addReminder({
        title: reminderTitle,
        description: reminderDescription || undefined,
        dueDateTime,
        isCompleted: false,
        linkedTrackerId,
      })
      setQuickEntryOpen(false)
    }
  }, [reminderTitle, reminderDescription, reminderDate, reminderTime, linkedTrackerId, addReminder, setQuickEntryOpen])

  const selectedTrackerData = trackers.find((t) => t.id === selectedTracker)

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
                  <span className="text-xs">⌘</span>K
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

                {selectedTrackerData?.type === "rating" ? (
                  <div className="flex gap-2 mb-4">
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
                ) : (
                  <div className="relative mb-4">
                    <Input
                      type="number"
                      placeholder="Enter value..."
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="text-lg h-12 bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
                      autoFocus
                    />
                    {selectedTrackerData?.config.unit && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(210_12%_47%)]">
                        {selectedTrackerData.config.unit as string}
                      </span>
                    )}
                  </div>
                )}

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
                    disabled={!value}
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
              <select
                value={linkedTrackerId || ""}
                onChange={(e) => setLinkedTrackerId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] rounded-lg text-[hsl(210_25%_97%)] focus:outline-none focus:ring-2 focus:ring-[hsl(266_73%_63%)]"
              >
                <option value="">No tracker linked</option>
                {trackers.map((tracker) => (
                  <option key={tracker.id} value={tracker.id}>
                    {tracker.name}
                  </option>
                ))}
              </select>
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
