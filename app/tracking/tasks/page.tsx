"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
import { TrackerWidget } from "@/components/tracker-widget"
import { GridDraggableWidget } from "@/components/grid-draggable-widget"
import { useAppData } from "@/contexts/app-data-context"
import type { DashboardWidget } from "@/types"
import { cn } from "@/lib/utils"

const GRID_COLS = 10
const GRID_ROWS = 8
const GRID_GAP = 8

export default function HomePage() {
  const { customTrackers, dashboardLayout, updateDashboardLayout } = useAppData()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
  const [isValidDrop, setIsValidDrop] = useState(false)
  const [willDisplace, setWillDisplace] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(60)

  const visibleWidgets = dashboardLayout.widgets.filter((w) => w.visible)

  useEffect(() => {
    const calculateCellSize = () => {
      if (!containerRef.current) return

      const container = containerRef.current
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight

      const availableWidth = containerWidth - 32
      const availableHeight = containerHeight - 32

      const cellByWidth = (availableWidth - (GRID_COLS - 1) * GRID_GAP) / GRID_COLS
      const cellByHeight = (availableHeight - (GRID_ROWS - 1) * GRID_GAP) / GRID_ROWS

      const newCellSize = Math.floor(Math.min(cellByWidth, cellByHeight))
      setCellSize(Math.max(40, Math.min(80, newCellSize)))
    }

    calculateCellSize()

    const resizeObserver = new ResizeObserver(calculateCellSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  const isValidPosition = useCallback(
    (x: number, y: number, width: number, height: number, excludeId?: string): boolean => {
      if (x < 0 || y < 0 || x + width > GRID_COLS || y + height > GRID_ROWS) {
        return false
      }

      for (const widget of visibleWidgets) {
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
    [visibleWidgets],
  )

  const findOverlappingWidgets = useCallback(
    (x: number, y: number, width: number, height: number, excludeId: string): DashboardWidget[] => {
      const overlapping: DashboardWidget[] = []

      for (const widget of visibleWidgets) {
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
    [visibleWidgets],
  )

  const findFirstAvailablePosition = useCallback(
    (width: number, height: number, excludeIds: string[]): { x: number; y: number } | null => {
      for (let y = 0; y <= GRID_ROWS - height; y++) {
        for (let x = 0; x <= GRID_COLS - width; x++) {
          let isValid = true

          for (const widget of visibleWidgets) {
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
    [visibleWidgets],
  )

  const relocateWidgets = useCallback(
    (
      activeWidgetId: string,
      newX: number,
      newY: number,
      activeWidth: number,
      activeHeight: number,
    ): DashboardWidget[] | null => {
      const displaced = findOverlappingWidgets(newX, newY, activeWidth, activeHeight, activeWidgetId)

      if (displaced.length === 0) {
        return visibleWidgets.map((w) => (w.id === activeWidgetId ? { ...w, position: { x: newX, y: newY } } : w))
      }

      let newWidgets = visibleWidgets.map((w) =>
        w.id === activeWidgetId ? { ...w, position: { x: newX, y: newY } } : w,
      )

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
    [visibleWidgets, findOverlappingWidgets, findFirstAvailablePosition],
  )

  const createOccupationMap = useCallback(
    (excludeId?: string): boolean[][] => {
      const map: boolean[][] = Array(GRID_ROWS)
        .fill(null)
        .map(() => Array(GRID_COLS).fill(false))

      for (const widget of visibleWidgets) {
        if (widget.id === excludeId) continue

        for (let dy = 0; dy < widget.size.height; dy++) {
          for (let dx = 0; dx < widget.size.width; dx++) {
            const cy = widget.position.y + dy
            const cx = widget.position.x + dx
            if (cy < GRID_ROWS && cx < GRID_COLS) {
              map[cy][cx] = true
            }
          }
        }
      }

      return map
    },
    [visibleWidgets],
  )

  const pixelToGrid = useCallback(
    (pixelX: number, pixelY: number) => {
      const gridX = Math.round(pixelX / (cellSize + GRID_GAP))
      const gridY = Math.round(pixelY / (cellSize + GRID_GAP))
      return {
        x: Math.max(0, Math.min(gridX, GRID_COLS - 1)),
        y: Math.max(0, Math.min(gridY, GRID_ROWS - 1)),
      }
    },
    [cellSize],
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, delta } = event
    const activeWidget = visibleWidgets.find((w) => w.id === active.id)

    if (!activeWidget) return

    const originalLeft = activeWidget.position.x * (cellSize + GRID_GAP)
    const originalTop = activeWidget.position.y * (cellSize + GRID_GAP)

    const newPixelX = originalLeft + delta.x
    const newPixelY = originalTop + delta.y

    const gridPos = pixelToGrid(newPixelX, newPixelY)

    const clampedX = Math.max(0, Math.min(gridPos.x, GRID_COLS - activeWidget.size.width))
    const clampedY = Math.max(0, Math.min(gridPos.y, GRID_ROWS - activeWidget.size.height))

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
    const activeWidget = visibleWidgets.find((w) => w.id === active.id)

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
        const allWidgets = [...relocated, ...dashboardLayout.widgets.filter((w) => !w.visible)]
        updateDashboardLayout(allWidgets)
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

  const renderWidget = (widget: DashboardWidget, isOverlay = false) => {
    const baseClasses = cn("h-full", isOverlay && "shadow-2xl")

    if (widget.type === "custom") {
      const tracker = customTrackers.find((t) => t.id === widget.id)
      if (!tracker) return null
      return (
        <div className={baseClasses}>
          <TrackerWidget key={widget.id} type="custom" customTracker={tracker} />
        </div>
      )
    }

    return (
      <div className={baseClasses}>
        <TrackerWidget key={widget.id} type={widget.id as any} />
      </div>
    )
  }

  const activeWidget = visibleWidgets.find((w) => w.id === activeId)
  const occupationMap = createOccupationMap(activeId || undefined)
  const isDragging = activeId !== null

  const gridWidth = GRID_COLS * (cellSize + GRID_GAP) - GRID_GAP
  const gridHeight = GRID_ROWS * (cellSize + GRID_GAP) - GRID_GAP

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
              {Array.from({ length: GRID_ROWS }).map((_, row) =>
                Array.from({ length: GRID_COLS }).map((_, col) => {
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
                        left: col * (cellSize + GRID_GAP),
                        top: row * (cellSize + GRID_GAP),
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
          {visibleWidgets.map((widget) => (
            <GridDraggableWidget
              key={widget.id}
              id={widget.id}
              gridWidth={widget.size.width}
              gridHeight={widget.size.height}
              position={widget.position}
              cellSize={cellSize}
              gap={GRID_GAP}
            >
              {renderWidget(widget)}
            </GridDraggableWidget>
          ))}

          {/* Drag overlay */}
          <DragOverlay>
            {activeWidget && (
              <div
                style={{
                  width: activeWidget.size.width * cellSize + (activeWidget.size.width - 1) * GRID_GAP,
                  height: activeWidget.size.height * cellSize + (activeWidget.size.height - 1) * GRID_GAP,
                }}
              >
                {renderWidget(activeWidget, true)}
              </div>
            )}
          </DragOverlay>
        </div>
      </div>
    </DndContext>
  )
}
