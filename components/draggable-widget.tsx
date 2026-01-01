"use client"

import type React from "react"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { GripVertical } from "lucide-react"

interface DraggableWidgetProps {
  id: string
  children: React.ReactNode
  gridWidth: number
  gridHeight: number
}

export function DraggableWidget({ id, children, gridWidth, gridHeight }: DraggableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${gridWidth}`,
    gridRow: `span ${gridHeight}`,
  }

  return (
    <div ref={setNodeRef} style={style} className={cn("relative group", isDragging && "z-50 opacity-50")}>
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
      <div className={cn("h-full", isDragging && "pointer-events-none")}>{children}</div>
    </div>
  )
}
