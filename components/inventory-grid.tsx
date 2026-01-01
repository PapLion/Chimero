"use client"

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core"
import { GridDraggableWidget } from "@/components/grid-draggable-widget"
import type { TrackingPageSection } from "@/types"
import { cn } from "@/lib/utils"

interface InventoryGridProps {
  widgets: TrackingPageSection[]
  onWidgetsChange: (widgets: TrackingPageSection[]) => void
  renderWidget: (widgetId: string, isOverlay?: boolean) => ReactNode
  gridCols?: number
  gridRows?: number
  gap?: number
}

export function InventoryGrid({
  widgets,
  onWidgetsChange,
  renderWidget,
  gridCols = 10,
  gridRows = 8,
  gap = 8,
}: InventoryGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
  const [isValidDrop, setIsValidDrop] = useState(false)
  const [willDisplace, setWillDisplace] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(60)

  useEffect(() => {
    const calculateCellSize = () => {
      if (!containerRef.current) return

      const container = containerRef.current
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight

      const availableWidth = containerWidth - 32
      const availableHeight = containerHeight - 32

      const cellByWidth = (availableWidth - (gridCols - 1) * gap) / gridCols
      const cellByHeight = (availableHeight - (gridRows - 1) * gap) / gridRows

      const newCellSize = Math.floor(Math.min(cellByWidth, cellByHeight))
      setCellSize(Math.max(40, Math.min(80, newCellSize)))
    }

    calculateCellSize()

    const resizeObserver = new ResizeObserver(calculateCellSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [gridCols, gridRows, gap])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  // Check if a position is valid for a widget
  const isValidPosition = useCallback(
    (x: number, y: number, width: number, height: number, excludeId?: string): boolean => {
      if (x < 0 || y < 0 || x + width > gridCols || y + height > gridRows) {
        return false
      }

      for (const widget of widgets) {
        if (widget.id === excludeId) continue

        const noOverlap =
          x >= widget.position.x + widget.size.width ||
          x + width <= widget.position.x ||
          y >= widget.position.y + widget.size.height ||
          y + height <= widget.position.y

        if (!noOverlap) {
          return false
        }
      }

      return true
    },
    [widgets, gridCols, gridRows],
  )

  // Find overlapping widgets
  const findOverlappingWidgets = useCallback(
    (x: number, y: number, width: number, height: number, excludeId: string): TrackingPageSection[] => {
      const overlapping: TrackingPageSection[] = []

      for (const widget of widgets) {
        if (widget.id === excludeId) continue

        const overlaps =
          x < widget.position.x + widget.size.width &&
          x + width > widget.position.x &&
          y < widget.position.y + widget.size.height &&
          y + height > widget.position.y

        if (overlaps) {
          overlapping.push(widget)
        }
      }
      return overlapping
    },
    [widgets],
  )

  // Find first available position
  const findFirstAvailablePosition = useCallback(
    (width: number, height: number, excludeIds: string[]): { x: number; y: number } | null => {
      for (let y = 0; y <= gridRows - height; y++) {
        for (let x = 0; x <= gridCols - width; x++) {
          let isValid = true

          for (const widget of widgets) {
            if (excludeIds.includes(widget.id)) continue

            const noOverlap =
              x >= widget.position.x + widget.size.width ||
              x + width <= widget.position.x ||
              y >= widget.position.y + widget.size.height ||
              y + height <= widget.position.y

            if (!noOverlap) {
              isValid = false
              break
            }
          }

          if (isValid) {
            return { x, y }
          }
        }
      }
      return null
    },
    [widgets, gridCols, gridRows],
  )

  // Relocate widgets when dragging over them
  const relocateWidgets = useCallback(
    (
      activeWidgetId: string,
      newX: number,
      newY: number,
      activeWidth: number,
      activeHeight: number,
    ): TrackingPageSection[] | null => {
      const displaced = findOverlappingWidgets(newX, newY, activeWidth, activeHeight, activeWidgetId)

      if (displaced.length === 0) {
        return widgets.map((w) => (w.id === activeWidgetId ? { ...w, position: { x: newX, y: newY } } : w))
      }

      let newWidgets = widgets.map((w) => (w.id === activeWidgetId ? { ...w, position: { x: newX, y: newY } } : w))

      for (const displacedWidget of displaced) {
        const newPos = findFirstAvailablePosition(displacedWidget.size.width, displacedWidget.size.height, [
          displacedWidget.id,
        ])

        if (!newPos) {
          return null
        }

        newWidgets = newWidgets.map((w) =>
          w.id === displacedWidget.id ? { ...w, position: { x: newPos.x, y: newPos.y } } : w,
        )
      }

      return newWidgets
    },
    [widgets, findOverlappingWidgets, findFirstAvailablePosition],
  )

  // Create occupation map for visual grid
  const createOccupationMap = useCallback(
    (excludeId?: string): boolean[][] => {
      const map: boolean[][] = Array(gridRows)
        .fill(null)
        .map(() => Array(gridCols).fill(false))

      for (const widget of widgets) {
        if (widget.id === excludeId) continue

        for (let dy = 0; dy < widget.size.height; dy++) {
          for (let dx = 0; dx < widget.size.width; dx++) {
            const cy = widget.position.y + dy
            const cx = widget.position.x + dx
            if (cy < gridRows && cx < gridCols) {
              map[cy][cx] = true
            }
          }
        }
      }

      return map
    },
    [widgets, gridCols, gridRows],
  )

  const pixelToGrid = useCallback(
    (pixelX: number, pixelY: number) => {
      const gridX = Math.round(pixelX / (cellSize + gap))
      const gridY = Math.round(pixelY / (cellSize + gap))
      return {
        x: Math.max(0, Math.min(gridX, gridCols - 1)),
        y: Math.max(0, Math.min(gridY, gridRows - 1)),
      }
    },
    [cellSize, gap, gridCols, gridRows],
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, delta } = event
    const activeWidget = widgets.find((w) => w.id === active.id)

    if (!activeWidget) return

    const originalLeft = activeWidget.position.x * (cellSize + gap)
    const originalTop = activeWidget.position.y * (cellSize + gap)

    const newPixelX = originalLeft + delta.x
    const newPixelY = originalTop + delta.y

    const gridPos = pixelToGrid(newPixelX, newPixelY)

    const clampedX = Math.max(0, Math.min(gridPos.x, gridCols - activeWidget.size.width))
    const clampedY = Math.max(0, Math.min(gridPos.y, gridRows - activeWidget.size.height))

    setPreviewPosition({ x: clampedX, y: clampedY })

    const directValid = isValidPosition(
      clampedX,
      clampedY,
      activeWidget.size.width,
      activeWidget.size.height,
      activeWidget.id,
    )

    if (directValid) {
      setIsValidDrop(true)
      setWillDisplace(false)
    } else {
      const relocated = relocateWidgets(
        activeWidget.id,
        clampedX,
        clampedY,
        activeWidget.size.width,
        activeWidget.size.height,
      )

      if (relocated) {
        setIsValidDrop(true)
        setWillDisplace(true)
      } else {
        setIsValidDrop(false)
        setWillDisplace(false)
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active } = event
    const activeWidget = widgets.find((w) => w.id === active.id)

    if (!activeWidget || !previewPosition) {
      resetDragState()
      return
    }

    if (isValidDrop) {
      const relocated = relocateWidgets(
        activeWidget.id,
        previewPosition.x,
        previewPosition.y,
        activeWidget.size.width,
        activeWidget.size.height,
      )

      if (relocated) {
        onWidgetsChange(relocated)
      }
    }

    resetDragState()
  }

  const resetDragState = () => {
    setActiveId(null)
    setPreviewPosition(null)
    setIsValidDrop(false)
    setWillDisplace(false)
  }

  const handleDragCancel = () => {
    resetDragState()
  }

  const activeWidget = widgets.find((w) => w.id === activeId)
  const occupationMap = createOccupationMap(activeId || undefined)

  const isDragging = activeId !== null

  const gridWidth = gridCols * (cellSize + gap) - gap
  const gridHeight = gridRows * (cellSize + gap) - gap

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div ref={containerRef} className="flex-1 min-h-0 flex items-center justify-center p-4">
        <div
          className="relative"
          style={{
            width: `${gridWidth}px`,
            height: `${gridHeight}px`,
          }}
        >
          {/* Grid cells - only visible when dragging */}
          {isDragging && (
            <div className="absolute inset-0 pointer-events-none z-0">
              {Array.from({ length: gridRows }).map((_, row) =>
                Array.from({ length: gridCols }).map((_, col) => {
                  const isOccupied = occupationMap[row][col]
                  const isPreviewCell =
                    previewPosition &&
                    activeWidget &&
                    col >= previewPosition.x &&
                    col < previewPosition.x + activeWidget.size.width &&
                    row >= previewPosition.y &&
                    row < previewPosition.y + activeWidget.size.height

                  const showDisplaceIndicator = isPreviewCell && isValidDrop && willDisplace

                  return (
                    <div
                      key={`${row}-${col}`}
                      className={cn(
                        "absolute rounded border transition-all duration-100",
                        isOccupied ? "border-transparent bg-transparent" : "border-dashed border-border/40 bg-muted/20",
                        isPreviewCell &&
                          isValidDrop &&
                          !showDisplaceIndicator &&
                          "bg-primary/30 border-primary border-solid",
                        showDisplaceIndicator && "bg-amber-500/30 border-amber-500 border-solid",
                        isPreviewCell && !isValidDrop && "bg-destructive/30 border-destructive border-solid",
                      )}
                      style={{
                        left: col * (cellSize + gap),
                        top: row * (cellSize + gap),
                        width: cellSize,
                        height: cellSize,
                      }}
                    />
                  )
                }),
              )}
            </div>
          )}

          {/* Widgets */}
          {widgets.map((widget) => (
            <GridDraggableWidget
              key={widget.id}
              id={widget.id}
              gridWidth={widget.size.width}
              gridHeight={widget.size.height}
              position={widget.position}
              cellSize={cellSize}
              gap={gap}
            >
              {renderWidget(widget.id)}
            </GridDraggableWidget>
          ))}

          {/* Drag overlay */}
          <DragOverlay>
            {activeWidget && (
              <div
                style={{
                  width: activeWidget.size.width * cellSize + (activeWidget.size.width - 1) * gap,
                  height: activeWidget.size.height * cellSize + (activeWidget.size.height - 1) * gap,
                }}
              >
                {renderWidget(activeWidget.id, true)}
              </div>
            )}
          </DragOverlay>
        </div>
      </div>
    </DndContext>
  )
}
