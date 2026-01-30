"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "../lib/store"
import { cn } from "../lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@packages/ui/dialog"
import { Input } from "@packages/ui/input"
import { Button } from "@packages/ui/button"
import { Scale, Smile, Dumbbell, Users, CheckSquare, Wallet, Command, Type as type, LucideIcon } from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  scale: Scale,
  smile: Smile,
  dumbbell: Dumbbell,
  users: Users,
  "check-square": CheckSquare,
  wallet: Wallet,
}

export function QuickEntry() {
  const { commandBarOpen, toggleCommandBar, trackers, addEntry } = useAppStore()
  const [search, setSearch] = useState("")
  const [selectedTracker, setSelectedTracker] = useState<number | null>(null)
  const [value, setValue] = useState("")

  // Reset state when dialog closes
  useEffect(() => {
    if (!commandBarOpen) {
      setSearch("")
      setSelectedTracker(null)
      setValue("")
    }
  }, [commandBarOpen])

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        toggleCommandBar()
      }
      if (e.key === "Escape" && commandBarOpen) {
        toggleCommandBar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [commandBarOpen, toggleCommandBar])

  const filteredTrackers = trackers.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = useCallback(() => {
    if (selectedTracker && value) {
      addEntry({
        trackerId: selectedTracker,
        value: parseFloat(value),
        metadata: {},
        timestamp: Date.now(),
      })
      toggleCommandBar()
    }
  }, [selectedTracker, value, addEntry, toggleCommandBar])

  const selectedTrackerData = trackers.find((t) => t.id === selectedTracker)

  return (
    <Dialog open={commandBarOpen} onOpenChange={toggleCommandBar}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-popover border-border">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Quick Entry</DialogTitle>
        </DialogHeader>

        {!selectedTracker ? (
          <>
            {/* Search Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Command className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search trackers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 p-0 h-auto text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>

            {/* Tracker List */}
            <div className="max-h-[300px] overflow-y-auto p-2">
              {filteredTrackers.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No trackers found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTrackers.map((tracker) => {
                    const Icon = iconMap[tracker.icon] || CheckSquare
                    return (
                      <button
                        key={tracker.id}
                        onClick={() => setSelectedTracker(tracker.id)}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-left",
                          "hover:bg-accent"
                        )}
                      >
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="w-4 h-4 text-primary" />
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
              )}
            </div>
          </>
        ) : (
          <>
            {/* Entry Form */}
            <div className="p-4">
              <button
                onClick={() => setSelectedTracker(null)}
                className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
              >
                ← Back to trackers
              </button>

              <div className="flex items-center gap-3 mb-4">
                {selectedTrackerData && (
                  <>
                    {(() => {
                      const Icon = iconMap[selectedTrackerData.icon] || CheckSquare
                      return (
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                      )
                    })()}
                    <div>
                      <div className="font-medium text-foreground">
                        {selectedTrackerData.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
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
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-foreground"
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
                    className="text-lg h-12 bg-input border-border text-foreground placeholder:text-muted-foreground"
                    autoFocus
                  />
                  {selectedTrackerData?.config.unit && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {selectedTrackerData.config.unit as string}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={toggleCommandBar}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSubmit}
                  disabled={!value}
                >
                  Save Entry
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
