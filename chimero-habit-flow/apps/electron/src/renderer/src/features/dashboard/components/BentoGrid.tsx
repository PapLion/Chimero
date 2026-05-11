"use client"

import { createElement, useMemo, type ComponentProps } from "react"
import type { AssetWithUrls } from "@contracts/features/assets"
import { useAppStore } from "@shared/store"
import { useTrackers, useEntries, useDashboardLayout, useSaveDashboardLayoutMutation, useAssets } from "@shared/queries"
import { WidgetCard } from "./WidgetCard"
import { TrackerDetailView } from "../../tracking/components/TrackerDetailView"
import type { Widget } from "@shared/store"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable"

const DEFAULT_SIZE_CYCLE: Widget["size"][] = ["large", "medium", "medium", "small", "small", "large"]

function buildDefaultWidgets(trackers: { id: number }[]): Widget[] {
  return trackers.map((t, i) => ({
    id: `widget-${t.id}`,
    trackerId: t.id,
    position: i,
    size: DEFAULT_SIZE_CYCLE[i % DEFAULT_SIZE_CYCLE.length],
  }))
}

/** Merge saved layout with current trackers: add a widget for any tracker not in the layout. */
function mergeLayoutWithTrackers(
  savedLayout: Array<{ id: string; trackerId: number; position: number; size: string }>,
  trackers: { id: number }[]
): Widget[] {
  const byTrackerId = new Map(savedLayout.map((w) => [w.trackerId, w]))
  const maxPosition = savedLayout.length > 0 ? Math.max(...savedLayout.map((w) => w.position), -1) + 1 : 0
  let nextPosition = maxPosition
  let newWidgetIndex = 0
  const result: Widget[] = []
  for (const t of trackers) {
    const existing = byTrackerId.get(t.id)
    if (existing) {
      result.push({
        id: existing.id,
        trackerId: existing.trackerId,
        position: existing.position,
        size: (existing.size as Widget["size"]) || "medium",
      })
    } else {
      result.push({
        id: `widget-${t.id}`,
        trackerId: t.id,
        position: nextPosition++,
        size: DEFAULT_SIZE_CYCLE[newWidgetIndex++ % DEFAULT_SIZE_CYCLE.length],
      })
    }
  }
  return result.sort((a, b) => a.position - b.position)
}

export function BentoGrid() {
  const { activeTracker, selectedDate } = useAppStore()
  const { data: trackers = [], isLoading: trackersLoading } = useTrackers()
  const { data: entries = [] } = useEntries({ limit: 500 })
  const { data: savedLayout } = useDashboardLayout()
  const { data: assetsData = [] } = useAssets({ limit: 200 })
  const saveLayoutMutation = useSaveDashboardLayoutMutation()

  const assetsById = useMemo(() => {
    return new Map<number, AssetWithUrls>(assetsData.map((asset) => [asset.id, asset] as const))
  }, [assetsData])

  const widgets = useMemo((): Widget[] => {
    if (savedLayout && Array.isArray(savedLayout) && savedLayout.length > 0) {
      return mergeLayoutWithTrackers(savedLayout, trackers)
    }
    return buildDefaultWidgets(trackers)
  }, [savedLayout, trackers])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id)
      const newIndex = widgets.findIndex((w) => w.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      const moved = arrayMove(widgets, oldIndex, newIndex) as Widget[]
      const newWidgets = moved.map((w, i) => ({ ...w, position: i }))
      saveLayoutMutation.mutate(
        newWidgets.map((w) => ({ id: w.id, trackerId: w.trackerId, position: w.position, size: w.size }))
      )
    }
  }

  // Filter widgets based on active tracker
  const filteredWidgets = activeTracker
    ? widgets.filter((w) => w.trackerId === activeTracker)
    : widgets

  const sortedWidgets = [...filteredWidgets].sort((a, b) => a.position - b.position)

  if (trackersLoading) {
    return (
      <div className="surface-panel flex min-h-[240px] items-center justify-center rounded-3xl px-6 text-[hsl(var(--muted-foreground))]">
        Loading dashboard...
      </div>
    )
  }

  // Show TrackerDetailView when a specific tracker is selected
  if (activeTracker) {
    return (
      <TrackerDetailView
        trackerId={activeTracker}
        selectedDate={selectedDate}
        assets={assetsById}
      />
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortedWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-12 auto-rows-[minmax(150px,auto)] gap-4 md:gap-5">
          {sortedWidgets.map((widget) => {
            const tracker = trackers.find((t) => t.id === widget.trackerId)
            const trackerEntries = entries.filter((e) => e.trackerId === widget.trackerId)

            if (!tracker) return null

            const widgetCardProps: ComponentProps<typeof WidgetCard> = {
              widget,
              tracker,
              entries: trackerEntries,
              assets: assetsById,
              selectedDate,
            }
            return createElement(WidgetCard, { key: widget.id, ...widgetCardProps })
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
