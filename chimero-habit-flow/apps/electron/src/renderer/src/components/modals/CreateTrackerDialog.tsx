"use client"

import React from "react"

import { useState, useEffect } from "react"
import { cn } from "../../lib/utils"
import { type Tracker, type TrackerType, type TrackerConfig } from "../../lib/store"
import { useCreateTrackerMutation, useUpdateTrackerMutation } from "../../lib/queries"
import { X, Flame, Book, Dumbbell, Gamepad2, Smile, Scale, Heart, Coffee, Moon, Sun, Zap, Target, Music, Camera, Wallet, Users, Type as type, LucideIcon } from "lucide-react"

interface CreateTrackerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTracker?: Tracker | null
}

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
  
  const [name, setName] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("flame")
  const [selectedColor, setSelectedColor] = useState("#a855f7")
  const [selectedType, setSelectedType] = useState<TrackerType>("counter")
  const [config, setConfig] = useState<TrackerConfig>({})

  // Reset form when opening or when editTracker changes
  useEffect(() => {
    if (open) {
      if (editTracker) {
        setName(editTracker.name)
        setSelectedIcon(editTracker.icon ?? "flame")
        setSelectedColor(editTracker.color ?? "#a855f7")
        setSelectedType(editTracker.type)
        setConfig(editTracker.config ?? {})
      } else {
        setName("")
        setSelectedIcon("flame")
        setSelectedColor("#a855f7")
        setSelectedType("counter")
        setConfig({})
      }
    }
  }, [open, editTracker])

  const handleSubmit = (e: React.FormEvent) => {
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

    if (editTracker) {
      updateMutation.mutate(
        {
          id: editTracker.id,
          updates: {
            name: trackerData.name,
            icon: trackerData.icon,
            color: trackerData.color,
            type: trackerData.type,
            config: trackerData.config,
          },
        },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createMutation.mutate(
        {
          name: trackerData.name,
          type: trackerData.type,
          icon: trackerData.icon,
          color: trackerData.color,
          config: trackerData.config,
        },
        { onSuccess: () => onOpenChange(false) }
      )
    }
  }

  if (!open) return null

  const SelectedIconComponent = availableIcons.find((i) => i.name === selectedIcon)?.icon || Flame

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[hsl(210_18%_22%)]">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${selectedColor}20` }}
            >
              <SelectedIconComponent className="w-5 h-5" style={{ color: selectedColor }} />
            </div>
            <h2 className="font-display font-bold text-lg text-[hsl(210_25%_97%)]">
              {editTracker ? "Edit Tracker" : "Create New Tracker"}
            </h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-lg hover:bg-[hsl(210_20%_15%)] transition-colors"
          >
            <X className="w-5 h-5 text-[hsl(210_12%_47%)]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
              Tracker Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Reading Hours, Water Intake..."
              className="w-full px-4 py-3 bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] rounded-lg text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)/50] focus:outline-none focus:ring-2 focus:ring-[hsl(266_73%_63%)] transition-all"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
              Icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {availableIcons.map(({ name: iconName, icon: Icon }) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setSelectedIcon(iconName)}
                  className={cn(
                    "p-2.5 rounded-lg transition-all duration-200",
                    selectedIcon === iconName
                      ? "bg-[hsl(266_73%_63%/0.2)] ring-2 ring-[hsl(266_73%_63%)]"
                      : "bg-[hsl(210_20%_15%)] hover:bg-[hsl(210_20%_18%)]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      selectedIcon === iconName
                        ? "text-[hsl(266_73%_63%)]"
                        : "text-[hsl(210_12%_47%)]"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
              Color
            </label>
            <div className="flex gap-2">
              {availableColors.map(({ name: colorName, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedColor(value)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all duration-200",
                    selectedColor === value && "ring-2 ring-offset-2 ring-offset-[hsl(210_25%_11%)]"
                  )}
                  style={{ 
                    backgroundColor: value,
                    ringColor: value,
                  }}
                  title={colorName}
                />
              ))}
            </div>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
              Tracker Type
            </label>
            <div className="space-y-2">
              {trackerTypes.map(({ type, label, description }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSelectedType(type)
                    // Reset config based on type
                    if (type === "rating") {
                      setConfig({ min: 1, max: 5 })
                    } else if (type === "list") {
                      setConfig({ options: [] })
                    } else {
                      setConfig({})
                    }
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg transition-all duration-200 text-left",
                    selectedType === type
                      ? "bg-[hsl(266_73%_63%/0.1)] border border-[hsl(266_73%_63%/0.3)]"
                      : "bg-[hsl(210_20%_15%)] border border-transparent hover:bg-[hsl(210_20%_18%)]"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center",
                      selectedType === type
                        ? "border-[hsl(266_73%_63%)]"
                        : "border-[hsl(210_12%_47%)]"
                    )}
                  >
                    {selectedType === type && (
                      <div className="w-2 h-2 rounded-full bg-[hsl(266_73%_63%)]" />
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-[hsl(210_25%_97%)]">{label}</span>
                    <p className="text-xs text-[hsl(210_12%_47%)] mt-0.5">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Config Fields based on type */}
          {selectedType === "counter" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
                  Unit (optional)
                </label>
                <input
                  type="text"
                  value={config.unit || ""}
                  onChange={(e) => setConfig({ ...config, unit: e.target.value })}
                  placeholder="e.g., hours, pages"
                  className="w-full px-4 py-2.5 bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] rounded-lg text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)/50] focus:outline-none focus:ring-2 focus:ring-[hsl(266_73%_63%)] transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
                  Daily Goal (optional)
                </label>
                <input
                  type="number"
                  value={config.goal || ""}
                  onChange={(e) => setConfig({ ...config, goal: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="e.g., 30"
                  className="w-full px-4 py-2.5 bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] rounded-lg text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)/50] focus:outline-none focus:ring-2 focus:ring-[hsl(266_73%_63%)] transition-all text-sm"
                />
              </div>
            </div>
          )}

          {selectedType === "rating" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
                  Min Value
                </label>
                <input
                  type="number"
                  value={config.min ?? 1}
                  onChange={(e) => setConfig({ ...config, min: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] rounded-lg text-[hsl(210_25%_97%)] focus:outline-none focus:ring-2 focus:ring-[hsl(266_73%_63%)] transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
                  Max Value
                </label>
                <input
                  type="number"
                  value={config.max ?? 5}
                  onChange={(e) => setConfig({ ...config, max: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] rounded-lg text-[hsl(210_25%_97%)] focus:outline-none focus:ring-2 focus:ring-[hsl(266_73%_63%)] transition-all text-sm"
                />
              </div>
            </div>
          )}

          {selectedType === "list" && (
            <div>
              <label className="block text-sm font-medium text-[hsl(210_12%_47%)] mb-2">
                Options (comma-separated)
              </label>
              <input
                type="text"
                value={config.options?.join(", ") || ""}
                onChange={(e) => setConfig({ ...config, options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                placeholder="e.g., Option 1, Option 2, Option 3"
                className="w-full px-4 py-2.5 bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] rounded-lg text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)/50] focus:outline-none focus:ring-2 focus:ring-[hsl(266_73%_63%)] transition-all text-sm"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-3 bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] rounded-lg font-medium hover:bg-[hsl(210_20%_18%)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-3 bg-[hsl(266_73%_63%)] text-white rounded-lg font-medium hover:bg-[hsl(266_73%_58%)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editTracker ? "Save Changes" : "Create Tracker"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
