"use client"

import { useMemo, type ComponentProps } from "react"
import { useAppStore } from "../lib/store"
import { useTrackers, useEntries, useDashboardLayout, useSaveDashboardLayoutMutation } from "../lib/queries"
import { WidgetCard } from "./widget-card"
import type { Widget } from "../lib/store"
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
  const { activeTracker } = useAppStore()
  const { data: trackers = [], isLoading: trackersLoading } = useTrackers()
  const { data: entries = [] } = useEntries({ limit: 500 })
  const { data: savedLayout } = useDashboardLayout()
  const saveLayoutMutation = useSaveDashboardLayoutMutation()

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
      <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
        Loading dashboard...
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortedWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-12 gap-6 auto-rows-[minmax(140px,auto)]">
          {sortedWidgets.map((widget) => {
            const tracker = trackers.find((t) => t.id === widget.trackerId)
            const trackerEntries = entries.filter((e) => e.trackerId === widget.trackerId)

            if (!tracker) return null

            const widgetCardProps: ComponentProps<typeof WidgetCard> = {
              widget,
              tracker,
              entries: trackerEntries,
            }
            return <WidgetCard key={widget.id} {...widgetCardProps} />
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
