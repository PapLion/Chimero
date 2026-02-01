"use client"

import { useMemo } from "react"
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

function buildDefaultWidgets(trackers: { id: number }[]): Widget[] {
  const sizes: ("small" | "medium" | "large")[] = ["large", "medium", "medium", "small", "small", "large"]
  return trackers.slice(0, 6).map((t, i) => ({
    id: `widget-${t.id}`,
    trackerId: t.id,
    position: i,
    size: sizes[i] ?? "medium",
  }))
}

export function BentoGrid() {
  const { activeTracker } = useAppStore()
  const { data: trackers = [], isLoading: trackersLoading } = useTrackers()
  const { data: entries = [] } = useEntries({ limit: 500 })
  const { data: savedLayout } = useDashboardLayout()
  const saveLayoutMutation = useSaveDashboardLayoutMutation()

  const widgets = useMemo((): Widget[] => {
    if (savedLayout && Array.isArray(savedLayout) && savedLayout.length > 0) {
      return savedLayout.map((w) => ({
        id: w.id,
        trackerId: w.trackerId,
        position: w.position,
        size: (w.size as Widget["size"]) || "medium",
      }))
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
      const newWidgets = arrayMove(widgets, oldIndex, newIndex).map((w, i) => ({
        ...w,
        position: i,
      }))
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

            return (
              <WidgetCard
                key={widget.id}
                widget={widget}
                tracker={tracker}
                entries={trackerEntries}
              />
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
