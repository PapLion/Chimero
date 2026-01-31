"use client"

import { useAppStore } from "../lib/store"
import { WidgetCard } from "./widget-card"
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

export function BentoGrid() {
  const { widgets, trackers, entries, reorderWidgets, activeTracker } = useAppStore()

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
      const newWidgets = arrayMove(widgets, oldIndex, newIndex).map((w, i) => ({
        ...w,
        position: i,
      }))
      reorderWidgets(newWidgets)
    }
  }

  // Filter widgets based on active tracker
  const filteredWidgets = activeTracker
    ? widgets.filter((w) => w.trackerId === activeTracker)
    : widgets

  const sortedWidgets = [...filteredWidgets].sort((a, b) => a.position - b.position)

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
