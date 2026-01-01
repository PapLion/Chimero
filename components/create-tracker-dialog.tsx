"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2 } from "lucide-react"
import { useAppData } from "@/contexts/app-data-context"
import type { CustomTrackerFieldConfig, CustomTrackerFieldType } from "@/types"

interface CreateTrackerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FIELD_TYPES: { value: CustomTrackerFieldType; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "scale", label: "Scale (1-10)" },
  { value: "checkbox", label: "Checkbox" },
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "time", label: "Time Duration" },
  { value: "counter", label: "Counter" },
  { value: "rating", label: "Star Rating" },
  { value: "select", label: "Dropdown" },
]

const ICON_OPTIONS = [
  "Target",
  "Flame",
  "Star",
  "Heart",
  "Coffee",
  "Zap",
  "Award",
  "TrendingUp",
  "Activity",
  "BarChart3",
]

export function CreateTrackerDialog({ open, onOpenChange }: CreateTrackerDialogProps) {
  const { addCustomTracker } = useAppData()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState("BarChart3")
  const [color, setColor] = useState("#9353ED")
  const [fields, setFields] = useState<CustomTrackerFieldConfig[]>([
    {
      id: "field-1",
      label: "Value",
      type: "number",
      required: true,
    },
  ])
  const [hasGoal, setHasGoal] = useState(false)
  const [goalValue, setGoalValue] = useState("")
  const [showOnDashboard, setShowOnDashboard] = useState(true)

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        id: `field-${Date.now()}`,
        label: `Field ${fields.length + 1}`,
        type: "number",
        required: false,
      },
    ])
  }

  const handleRemoveField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id))
  }

  const handleFieldChange = (id: string, updates: Partial<CustomTrackerFieldConfig>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      alert("Please enter a tracker name")
      return
    }

    if (fields.length === 0) {
      alert("Please add at least one field")
      return
    }

    addCustomTracker({
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      fields,
      showOnDashboard,
      widgetSize: "small",
      hasGoal,
      goalField: hasGoal ? fields[0].id : undefined,
      goalValue: hasGoal && goalValue ? Number(goalValue) : undefined,
      goalType: "daily",
      chartType: "line",
    })

    // Reset form
    setName("")
    setDescription("")
    setIcon("BarChart3")
    setColor("#9353ED")
    setFields([
      {
        id: "field-1",
        label: "Value",
        type: "number",
        required: true,
      },
    ])
    setHasGoal(false)
    setGoalValue("")
    setShowOnDashboard(true)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Tracker</DialogTitle>
          <DialogDescription>Design your own tracking widget with custom fields and goals</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Tracker Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Water Intake, Room Cleaning, Meditation"
                className="bg-background border-border"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this tracker measure?"
                rows={2}
                className="bg-background border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="icon">Icon</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((iconName) => (
                      <SelectItem key={iconName} value={iconName}>
                        {iconName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-16 h-10 bg-background border-border cursor-pointer"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#9353ED"
                    className="flex-1 bg-background border-border"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Fields</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddField}
                className="gap-2 bg-transparent"
              >
                <Plus className="w-4 h-4" />
                Add Field
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border border-border rounded-lg space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Field {index + 1}</span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(field.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => handleFieldChange(field.id, { label: e.target.value })}
                        placeholder="Field label"
                        className="bg-background border-border"
                      />
                    </div>

                    <div>
                      <Label>Type</Label>
                      <Select
                        value={field.type}
                        onValueChange={(value) =>
                          handleFieldChange(field.id, { type: value as CustomTrackerFieldType })
                        }
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {field.type === "scale" && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label>Min</Label>
                        <Input
                          type="number"
                          value={field.min ?? 1}
                          onChange={(e) => handleFieldChange(field.id, { min: Number(e.target.value) })}
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <Label>Max</Label>
                        <Input
                          type="number"
                          value={field.max ?? 10}
                          onChange={(e) => handleFieldChange(field.id, { max: Number(e.target.value) })}
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <Label>Step</Label>
                        <Input
                          type="number"
                          value={field.step ?? 1}
                          onChange={(e) => handleFieldChange(field.id, { step: Number(e.target.value) })}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Goal Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Goal Tracking</Label>
                <p className="text-xs text-muted-foreground">Track progress towards a daily goal</p>
              </div>
              <Switch checked={hasGoal} onCheckedChange={setHasGoal} />
            </div>

            {hasGoal && (
              <div>
                <Label htmlFor="goalValue">Daily Goal</Label>
                <Input
                  id="goalValue"
                  type="number"
                  value={goalValue}
                  onChange={(e) => setGoalValue(e.target.value)}
                  placeholder="e.g., 8 for 8 glasses of water"
                  className="bg-background border-border"
                />
              </div>
            )}
          </div>

          {/* Dashboard Visibility Toggle */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <Label>Show on Dashboard</Label>
                <p className="text-xs text-muted-foreground">Display this tracker on the main dashboard</p>
              </div>
              <Switch checked={showOnDashboard} onCheckedChange={setShowOnDashboard} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Create Tracker</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
