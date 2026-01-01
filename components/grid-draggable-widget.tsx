"use client"

import type React from "react"
import { useDraggable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { GripVertical } from "lucide-react"

interface GridDraggableWidgetProps {
  id: string
  children: React.ReactNode
  gridWidth: number
  gridHeight: number
  position: { x: number; y: number }
  cellSize: number
  gap: number
}

export function GridDraggableWidget({
  id,
  children,
  gridWidth,
  gridHeight,
  position,
  cellSize,
  gap,
}: GridDraggableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })

  // Calculate actual pixel position based on grid coordinates
  const left = position.x * (cellSize + gap)
  const top = position.y * (cellSize + gap)
  const width = gridWidth * cellSize + (gridWidth - 1) * gap
  const height = gridHeight * cellSize + (gridHeight - 1) * gap

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    zIndex: isDragging ? 50 : 1,
    // Apply transform directly without CSS.Transform for better control
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className={cn("relative group touch-none", isDragging && "opacity-70")}>
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute -top-2 -right-2 z-10",
          "w-8 h-8 rounded-full",
          "bg-primary/90 text-primary-foreground",
          "flex items-center justify-center",
          "cursor-grab active:cursor-grabbing",
          "opacity-0 group-hover:opacity-100",
          "transition-opacity duration-200",
          "shadow-lg hover:scale-110 hover:bg-primary",
          "border-2 border-background",
        )}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Widget Content */}
      <div className={cn("w-full h-full overflow-hidden rounded-lg", isDragging && "pointer-events-none")}>
        {children}
      </div>
    </div>
  )
}
