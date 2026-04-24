"use client"

import { useState } from "react"
import { cn } from "../lib/utils"
import { type Tracker } from "../lib/store"
import { useTrackers, useDeleteTrackerMutation } from "../lib/queries"
import { CreateTrackerDialog } from "../components/modals/CreateTrackerDialog"
import { Plus, Pencil, Trash2, Flame, Book, Dumbbell, Gamepad2, Smile, Scale, Heart, Coffee, Moon, Sun, Zap, Target, Music, Camera, Wallet, Users, Sparkles, LucideIcon } from "lucide-react"

// Icon mapping for dynamic rendering
const iconMap: Record<string, LucideIcon> = {
  flame: Flame,
  book: Book,
  dumbbell: Dumbbell,
  "gamepad-2": Gamepad2,
  smile: Smile,
  scale: Scale,
  heart: Heart,
  coffee: Coffee,
  moon: Moon,
  sun: Sun,
  zap: Zap,
  target: Target,
  music: Music,
  camera: Camera,
  wallet: Wallet,
  users: Users,
}

export function CustomTrackersPage() {
  const { data: trackers = [] } = useTrackers()
  const deleteTrackerMutation = useDeleteTrackerMutation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTracker, setEditingTracker] = useState<Tracker | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const customTrackers = trackers.filter((t) => t.isCustom)

  const handleEdit = (tracker: Tracker) => {
    setEditingTracker(tracker)
    setDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    deleteTrackerMutation.mutate(id, { onSettled: () => setDeleteConfirmId(null) })
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingTracker(null)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "counter":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      case "rating":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "list":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      default:
        return "bg-[hsl(210_20%_15%)] text-[hsl(210_12%_47%)]"
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-[hsl(210_25%_97%)]">
            Custom Trackers
          </h1>
          <p className="text-[hsl(210_12%_47%)] mt-1">
            Create and manage your personalized tracking categories
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(266_73%_63%)] text-white rounded-lg font-medium hover:bg-[hsl(266_73%_58%)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create New
        </button>
      </div>

      {/* Content */}
      {customTrackers.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-8 bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(266_73%_63%/0.1)] flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-[hsl(266_73%_63%)]" />
          </div>
          <h2 className="font-display font-bold text-xl text-[hsl(210_25%_97%)] mb-2">
            No Custom Trackers Yet
          </h2>
          <p className="text-[hsl(210_12%_47%)] text-center max-w-md mb-6">
            Create your first custom tracker to start monitoring activities that matter to you.
            Track gaming hours, reading progress, or anything else!
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-[hsl(266_73%_63%)] text-white rounded-lg font-medium hover:bg-[hsl(266_73%_58%)] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First Tracker
          </button>
        </div>
      ) : (
        /* Tracker Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customTrackers.map((tracker) => {
            const iconKey = (tracker.icon ?? "").trim() || "flame"
            const Icon = iconMap[iconKey] || Flame
            const isDeleting = deleteConfirmId === tracker.id
            const color = tracker.color ?? "hsl(266 73% 63%)"

            return (
              <div
                key={tracker.id}
                className={cn(
                  "group relative bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-6",
                  "hover:border-[hsl(210_18%_28%)] transition-all duration-200",
                  "widget-glow"
                )}
              >
                {/* Delete Confirmation Overlay */}
                {isDeleting && (
                  <div className="absolute inset-0 bg-[hsl(210_25%_11%)/95] backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10 p-6">
                    <p className="text-[hsl(210_25%_97%)] font-medium text-center mb-4">
                      Delete &quot;{tracker.name}&quot;?
                    </p>
                    <p className="text-[hsl(210_12%_47%)] text-sm text-center mb-6">
                      This will also remove all associated entries.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-4 py-2 bg-[hsl(210_20%_15%)] border border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] rounded-lg text-sm font-medium hover:bg-[hsl(210_20%_18%)] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(tracker.id)}
                        className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Card Content */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  
                  {/* Actions: z-10 and pointer-events-auto so buttons stay clickable above card content */}
                  <div className="relative z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleEdit(tracker); }}
                      className="p-2 rounded-lg hover:bg-[hsl(210_20%_15%)] transition-colors pointer-events-auto"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4 text-[hsl(210_12%_47%)]" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(tracker.id); }}
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors pointer-events-auto"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-[hsl(210_12%_47%)] hover:text-red-400" />
                    </button>
                  </div>
                </div>

                <h3 className="font-display font-bold text-lg text-[hsl(210_25%_97%)] mb-2">
                  {tracker.name}
                </h3>

                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={cn(
                      "text-xs font-medium px-2.5 py-1 rounded-full border capitalize",
                      getTypeBadgeColor(tracker.type)
                    )}
                  >
                    {tracker.type}
                  </span>
                  {tracker.config.unit && (
                    <span className="text-xs text-[hsl(210_12%_47%)]">
                      · {tracker.config.unit}
                    </span>
                  )}
                  {tracker.config.goal && (
                    <span className="text-xs text-[hsl(210_12%_47%)]">
                      · Goal: {tracker.config.goal}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[hsl(210_12%_47%)]">
                  Created {formatDate(Number(tracker.createdAt))}
                </p>
              </div>
            )
          })}

          {/* Add New Card */}
          <button
            onClick={() => setDialogOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center min-h-[200px]",
              "bg-[hsl(210_25%_11%)/50] border-2 border-dashed border-[hsl(210_18%_22%)] rounded-2xl",
              "hover:border-[hsl(266_73%_63%/0.5)] hover:bg-[hsl(266_73%_63%/0.05)]",
              "transition-all duration-200 group"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-[hsl(210_20%_15%)] flex items-center justify-center mb-3 group-hover:bg-[hsl(266_73%_63%/0.2)] transition-colors">
              <Plus className="w-6 h-6 text-[hsl(210_12%_47%)] group-hover:text-[hsl(266_73%_63%)] transition-colors" />
            </div>
            <span className="text-[hsl(210_12%_47%)] group-hover:text-[hsl(266_73%_63%)] font-medium transition-colors">
              Add New Tracker
            </span>
          </button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CreateTrackerDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editTracker={editingTracker}
      />
    </div>
  )
}
