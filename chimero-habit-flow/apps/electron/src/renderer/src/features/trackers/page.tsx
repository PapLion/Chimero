"use client"

import { useState } from "react"
import { cn } from "@shared/utils"
import { type Tracker } from "@shared/store"
import { useTrackers, useDeleteTrackerMutation } from "@shared/queries"
import { CreateTrackerDialog } from "./modals/CreateTrackerDialog"
import { Button } from "@packages/ui/button"
import { ConfirmDeleteDialog } from "@shared/components/ConfirmDeleteDialog"
import { formatToastError, useToast } from "@shared/components/toast"
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
  const toast = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTracker, setEditingTracker] = useState<Tracker | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const customTrackers = trackers.filter((t) => t.isCustom)
  const trackerToDelete = trackers.find((t) => t.id === deleteConfirmId) ?? null

  const handleEdit = (tracker: Tracker) => {
    setEditingTracker(tracker)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!trackerToDelete) return

    try {
      await deleteTrackerMutation.mutateAsync(trackerToDelete.id)
      setDeleteConfirmId(null)
      toast.destructive("Tracker removed.", trackerToDelete.name)
    } catch (error) {
      toast.error(
        "We couldn't delete that tracker.",
        formatToastError(error, "Please try again in a moment."),
      )
    }
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
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="surface-panel flex flex-col items-start gap-4 rounded-2xl p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title text-[1.9rem]">
            Custom Trackers
          </h1>
          <p className="page-subtitle mt-1">
            Create and manage your personalized tracking categories
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-xl"
        >
          <Plus className="w-5 h-5" />
          Create New
        </Button>
      </div>

      {/* Content */}
      {customTrackers.length === 0 ? (
        /* Empty State */
        <div className="surface-panel flex flex-col items-center justify-center rounded-2xl px-6 py-16">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.12)]">
            <Sparkles className="h-7 w-7 text-[hsl(var(--primary))]" />
          </div>
          <h2 className="font-display mb-2 text-lg font-bold text-[hsl(var(--foreground))]">
            No Custom Trackers Yet
          </h2>
          <p className="mb-6 max-w-md text-center text-[hsl(var(--muted-foreground))]">
            Create your first custom tracker to start monitoring activities that matter to you.
            Track gaming hours, reading progress, or anything else!
          </p>
          <Button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 rounded-xl"
          >
            <Plus className="w-5 h-5" />
            Create Your First Tracker
          </Button>
        </div>
      ) : (
        /* Tracker Grid */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {customTrackers.map((tracker) => {
            const iconKey = (tracker.icon ?? "").trim() || "flame"
            const Icon = iconMap[iconKey] || Flame
            const color = tracker.color ?? "hsl(266 73% 63%)"
            const isDeleteBusy = deleteTrackerMutation.isPending && deleteConfirmId === tracker.id

            return (
              <div
                key={tracker.id}
                className={cn(
                  "group relative surface-panel rounded-2xl p-5 transition-all duration-200 hover:border-[hsl(var(--border)/0.9)]",
                  "widget-glow"
                )}
              >
                {/* Card Content */}
                <div className="mb-4 flex items-start justify-between">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  
                  {/* Actions: z-10 and pointer-events-auto so buttons stay clickable above card content */}
                  <div className="relative z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleEdit(tracker); }}
                      className="pointer-events-auto rounded-lg p-2 transition-colors hover:bg-white/5"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(tracker.id); }}
                      disabled={deleteTrackerMutation.isPending}
                      className="pointer-events-auto rounded-lg p-2 transition-colors hover:bg-[hsl(var(--destructive)/0.1)] disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className={cn("w-4 h-4 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]", isDeleteBusy && "opacity-0")} />
                    </button>
                  </div>
                </div>

                <h3 className="font-display mb-2 text-base font-bold text-[hsl(var(--foreground))]">
                  {tracker.name}
                </h3>

                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
                      getTypeBadgeColor(tracker.type)
                    )}
                  >
                    {tracker.type}
                  </span>
                  {tracker.config.unit && (
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      · {tracker.config.unit}
                    </span>
                  )}
                  {tracker.config.goal && (
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      · Goal: {tracker.config.goal}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Created {formatDate(Number(tracker.createdAt))}
                </p>
              </div>
            )
          })}

          {/* Add New Card */}
          <button
            onClick={() => setDialogOpen(true)}
            className={cn(
              "surface-card flex min-h-[188px] flex-col items-center justify-center rounded-2xl border-dashed transition-all duration-200 group",
              "hover:border-[hsl(var(--primary)/0.45)] hover:bg-[hsl(var(--primary)/0.05)]"
            )}
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 transition-colors group-hover:bg-[hsl(var(--primary)/0.12)]">
              <Plus className="h-5 w-5 text-[hsl(var(--muted-foreground))] transition-colors group-hover:text-[hsl(var(--primary))]" />
            </div>
            <span className="font-medium text-[hsl(var(--muted-foreground))] transition-colors group-hover:text-[hsl(var(--primary))]">
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

      <ConfirmDeleteDialog
        open={deleteConfirmId !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
        title={trackerToDelete ? `Delete "${trackerToDelete.name}"?` : "Delete tracker"}
        body="This will remove the tracker and every entry attached to it."
        description="This action cannot be undone."
        confirmLabel="Delete tracker"
        pendingLabel="Deleting tracker..."
      />
    </div>
  )
}
