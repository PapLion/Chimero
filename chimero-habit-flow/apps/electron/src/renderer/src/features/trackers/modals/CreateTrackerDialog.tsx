"use client"

import React from "react"

import { useState, useEffect } from "react"
import { cn } from "@shared/utils"
import { type Tracker, type TrackerType, type TrackerConfig } from "@shared/store"
import { useCreateTrackerMutation, useUpdateTrackerMutation } from "@shared/queries"
import { Dialog, DialogContent } from "@packages/ui/dialog"
import { Input } from "@packages/ui/input"
import { Button } from "@packages/ui/button"
import { formatToastError, useToast } from "@shared/components/toast"
import { X, Flame, Book, Dumbbell, Gamepad2, Smile, Scale, Heart, Coffee, Moon, Sun, Zap, Target, Music, Camera, Wallet, Users, Salad, LucideIcon } from "lucide-react"

interface CreateTrackerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTracker?: Tracker | null
}

// Lifestyle Presets - Human-centric tracker templates
interface TrackerPreset {
  name: string
  icon: string
  color: string
  type: TrackerType
  config: TrackerConfig
  description: string
}

const PRESETS: TrackerPreset[] = [
  {
    name: "Reading",
    icon: "book",
    color: "#3b82f6",
    type: "text",
    config: { unit: "pages" },
    description: "Track books and pages read",
  },
  {
    name: "Fitness",
    icon: "dumbbell",
    color: "#ef4444",
    type: "counter",
    config: { unit: "mins", goal: 30 },
    description: "Log workouts and exercise",
  },
  {
    name: "Hydration",
    icon: "coffee",
    color: "#14b8a6",
    type: "counter",
    config: { unit: "ml", goal: 2000 },
    description: "Track daily water intake",
  },
  {
    name: "Mood",
    icon: "smile",
    color: "#eab308",
    type: "rating",
    config: { min: 1, max: 10 },
    description: "Rate your daily mood",
  },
  {
    name: "Gaming",
    icon: "gamepad-2",
    color: "#a855f7",
    type: "text",
    config: { unit: "hours" },
    description: "Track games and playtime",
  },
  {
    name: "Social",
    icon: "users",
    color: "#ec4899",
    type: "counter",
    config: {},
    description: "Log social activities",
  },
  {
    name: "Finance",
    icon: "wallet",
    color: "#22c55e",
    type: "counter",
    config: { unit: "$" },
    description: "Track expenses and savings",
  },
  {
    name: "Weight",
    icon: "scale",
    color: "#f97316",
    type: "counter",
    config: { unit: "kg" },
    description: "Monitor body weight",
  },
  {
    name: "Diet",
    icon: "salad",
    color: "#22c55e",
    type: "counter",
    config: { unit: "kcal", goal: 2000 },
    description: "Track calories and meals",
  },
]

// Available icons for the picker
const availableIcons: { name: string; icon: LucideIcon }[] = [
  { name: "flame", icon: Flame },
  { name: "book", icon: Book },
  { name: "dumbbell", icon: Dumbbell },
  { name: "gamepad-2", icon: Gamepad2 },
  { name: "smile", icon: Smile },
  { name: "scale", icon: Scale },
  { name: "heart", icon: Heart },
  { name: "coffee", icon: Coffee },
  { name: "moon", icon: Moon },
  { name: "sun", icon: Sun },
  { name: "zap", icon: Zap },
  { name: "target", icon: Target },
  { name: "music", icon: Music },
  { name: "camera", icon: Camera },
  { name: "wallet", icon: Wallet },
  { name: "users", icon: Users },
  { name: "salad", icon: Salad },
]

// Available colors
const availableColors = [
  { name: "Purple", value: "#a855f7" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Yellow", value: "#eab308" },
]

// Tracker types
const trackerTypes: { type: TrackerType; label: string; description: string }[] = [
  { type: "counter", label: "Counter", description: "Track numeric values (e.g., hours, pages)" },
  { type: "rating", label: "Rating", description: "Rate on a scale (e.g., mood 1-5)" },
  { type: "list", label: "List", description: "Track items from a predefined list" },
]

export function CreateTrackerDialog({ open, onOpenChange, editTracker }: CreateTrackerDialogProps) {
  const createMutation = useCreateTrackerMutation()
  const updateMutation = useUpdateTrackerMutation()
  const toast = useToast()
  
  const [name, setName] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("flame")
  const [selectedColor, setSelectedColor] = useState("#a855f7")
  const [selectedType, setSelectedType] = useState<TrackerType>("counter")
  const [config, setConfig] = useState<TrackerConfig>({})
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  // Reset form when opening or when editTracker changes
  useEffect(() => {
    if (open) {
      if (editTracker) {
        setName(editTracker.name)
        setSelectedIcon(editTracker.icon ?? "flame")
        setSelectedColor(editTracker.color ?? "#a855f7")
        setSelectedType(editTracker.type)
        setConfig(editTracker.config ?? {})
        setSelectedPreset(null)
      } else {
        setName("")
        setSelectedIcon("flame")
        setSelectedColor("#a855f7")
        setSelectedType("counter")
        setConfig({})
        setSelectedPreset(null)
      }
    }
  }, [open, editTracker])

  const handlePresetSelect = (preset: TrackerPreset) => {
    setName(preset.name)
    setSelectedIcon(preset.icon)
    setSelectedColor(preset.color)
    setSelectedType(preset.type)
    setConfig(preset.config)
    setSelectedPreset(preset.name)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return

    const trackerData = {
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      type: selectedType,
      config,
      isCustom: true,
      order: 0,
      archived: false,
    }

    try {
      if (editTracker) {
        await updateMutation.mutateAsync({
          id: editTracker.id,
          updates: {
            name: trackerData.name,
            icon: trackerData.icon,
            color: trackerData.color,
            type: trackerData.type,
            config: trackerData.config,
          },
        })
        toast.info("Tracker updated.", trackerData.name)
      } else {
        await createMutation.mutateAsync({
          name: trackerData.name,
          type: trackerData.type,
          icon: trackerData.icon,
          color: trackerData.color,
          config: trackerData.config,
        })
        toast.success("Tracker created.", trackerData.name)
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(
        editTracker ? "We couldn't save that tracker." : "We couldn't create that tracker.",
        formatToastError(error, "Please try again in a moment."),
      )
    }
  }

  if (!open) return null

  const SelectedIconComponent = availableIcons.find((i) => i.name === selectedIcon)?.icon || Flame
  const isPending = createMutation.isPending || updateMutation.isPending

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg min-w-0 overflow-hidden p-0">
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border)/0.7)] px-6 py-5">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="surface-chip flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${selectedColor}20` }}
              >
                <SelectedIconComponent className="h-5 w-5" style={{ color: selectedColor }} />
              </div>
              <div className="min-w-0">
                <div className="section-kicker">Trackers</div>
                <h2 className="mt-1 truncate font-display text-lg font-semibold text-[hsl(var(--foreground))]">
                  {editTracker ? "Edit Tracker" : "Create New Tracker"}
                </h2>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-2 transition-colors hover:bg-white/5"
            >
              <X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {!editTracker && (
              <div>
                <label className="mb-3 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  Quick Start - Choose a Preset
                </label>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
                  {PRESETS.map((preset) => {
                    const PresetIcon = availableIcons.find((i) => i.name === preset.icon)?.icon || Flame
                    const isSelected = selectedPreset === preset.name
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                      className={cn(
                          "surface-card group min-w-0 rounded-2xl border p-3 text-center transition-all duration-200 ease-out",
                          isSelected
                            ? "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.08)]"
                            : "border-[hsl(var(--border)/0.7)] bg-white/5 hover:border-[hsl(var(--border)/0.95)] hover:bg-white/5"
                        )}
                      >
                        <div
                          className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${preset.color}20` }}
                        >
                          <PresetIcon
                            className="h-4 w-4"
                            style={{ color: isSelected ? preset.color : "hsl(var(--muted-foreground))" }}
                          />
                        </div>
                        <div className="mb-0.5 text-xs font-medium text-[hsl(var(--foreground))]">
                          {preset.name}
                        </div>
                        <div className="line-clamp-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                          {preset.description}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4 border-t border-[hsl(var(--border)/0.7)] pt-4">
                  <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
                    Or customize manually below
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                Tracker Name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setSelectedPreset(null)
                }}
                placeholder="e.g., Reading Hours, Water Intake..."
                className="h-11 bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                Icon
              </label>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(44px,1fr))] gap-2">
                {availableIcons.map(({ name: iconName, icon: Icon }) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      setSelectedIcon(iconName)
                      setSelectedPreset(null)
                    }}
                    className={cn(
                      "min-w-0 rounded-xl border border-[hsl(var(--border)/0.7)] bg-white/5 p-2.5 transition-all duration-200 ease-out",
                      selectedIcon === iconName
                        ? "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.08)]"
                        : "hover:border-[hsl(var(--border)/0.95)] hover:bg-white/5"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        selectedIcon === iconName
                          ? "text-[hsl(var(--foreground))]"
                          : "text-[hsl(var(--muted-foreground))]"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {availableColors.map(({ name: colorName, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSelectedColor(value)
                      setSelectedPreset(null)
                    }}
                    className={cn(
                      "h-8 w-8 rounded-full border border-[hsl(var(--border)/0.7)] transition-all duration-200 ease-out",
                      selectedColor === value && "scale-110 ring-2 ring-[hsl(var(--ring)/0.35)] ring-offset-2 ring-offset-[hsl(var(--background))]"
                    )}
                    style={{ backgroundColor: value }}
                    title={colorName}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                Tracker Type <span className="text-xs text-[hsl(var(--muted-foreground))]">(Advanced)</span>
              </label>
              <div className="space-y-2">
                {trackerTypes.map(({ type, label, description }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedType(type)
                      setSelectedPreset(null)
                      if (type === "rating") {
                        setConfig({ min: 1, max: 5 })
                      } else if (type === "list") {
                        setConfig({ options: [] })
                      } else {
                        setConfig({})
                      }
                    }}
                    className={cn(
                      "surface-card flex w-full min-w-0 items-start gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ease-out",
                      selectedType === type
                        ? "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.08)]"
                        : "border-[hsl(var(--border)/0.7)] bg-white/5 hover:border-[hsl(var(--border)/0.95)] hover:bg-white/5"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2",
                        selectedType === type
                          ? "border-[hsl(var(--primary))]"
                          : "border-[hsl(var(--border))]"
                      )}
                    >
                      {selectedType === type && (
                        <div className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-[hsl(var(--foreground))]">{label}</span>
                      <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedType === "counter" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    Unit (optional)
                  </label>
                  <Input
                    type="text"
                    value={config.unit || ""}
                    onChange={(e) => setConfig({ ...config, unit: e.target.value })}
                    placeholder="e.g., hours, pages"
                    className="bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    Daily Goal (optional)
                  </label>
                  <Input
                    type="number"
                    value={config.goal || ""}
                    onChange={(e) => setConfig({ ...config, goal: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="e.g., 30"
                    className="bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                  />
                </div>
              </div>
            )}

            {selectedType === "rating" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    Min Value
                  </label>
                  <Input
                    type="number"
                    value={config.min ?? 1}
                    onChange={(e) => setConfig({ ...config, min: Number(e.target.value) })}
                    className="bg-white/5 text-[hsl(var(--foreground))]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    Max Value
                  </label>
                  <Input
                    type="number"
                    value={config.max ?? 5}
                    onChange={(e) => setConfig({ ...config, max: Number(e.target.value) })}
                    className="bg-white/5 text-[hsl(var(--foreground))]"
                  />
                </div>
              </div>
            )}

            {selectedType === "list" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  Options (comma-separated)
                </label>
                <Input
                  type="text"
                  value={config.options?.join(", ") || ""}
                  onChange={(e) => setConfig({ ...config, options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                  placeholder="e.g., Option 1, Option 2, Option 3"
                  className="bg-white/5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-xl"
                disabled={!name.trim()}
                loading={isPending}
                loadingText={editTracker ? "Saving tracker..." : "Creating tracker..."}
              >
                {editTracker ? "Save Changes" : "Create Tracker"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
