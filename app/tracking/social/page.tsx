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
import { GridDraggableWidget } from "@/components/grid-draggable-widget"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MessageCircle, Phone, Video, Calendar, Heart } from "lucide-react"

interface SocialWidget {
  id: string
  size: { width: number; height: number }
  position: { x: number; y: number }
  visible: boolean
}

const INITIAL_WIDGETS: SocialWidget[] = [
  { id: "interactions-today", size: { width: 2, height: 2 }, position: { x: 0, y: 0 }, visible: true },
  { id: "weekly-summary", size: { width: 2, height: 2 }, position: { x: 2, y: 0 }, visible: true },
  { id: "contact-methods", size: { width: 3, height: 3 }, position: { x: 4, y: 0 }, visible: true },
  { id: "recent-contacts", size: { width: 3, height: 3 }, position: { x: 7, y: 0 }, visible: true },
  { id: "upcoming-plans", size: { width: 4, height: 3 }, position: { x: 0, y: 2 }, visible: true },
  { id: "close-friends", size: { width: 3, height: 2 }, position: { x: 4, y: 3 }, visible: true },
]

const GRID_COLS = 10
const GRID_ROWS = 8
const GRID_GAP = 8

export default function SocialPage() {
  const [widgets, setWidgets] = useState<SocialWidget[]>(INITIAL_WIDGETS)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
  const [isValidDrop, setIsValidDrop] = useState(false)
  const [willDisplace, setWillDisplace] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(60)

  const visibleWidgets = widgets.filter((w) => w.visible)

  useEffect(() => {
    const calculateCellSize = () => {
      if (!containerRef.current) return
      const container = containerRef.current
      const availableWidth = container.clientWidth - 32
      const availableHeight = container.clientHeight - 32
      const cellByWidth = (availableWidth - (GRID_COLS - 1) * GRID_GAP) / GRID_COLS
      const cellByHeight = (availableHeight - (GRID_ROWS - 1) * GRID_GAP) / GRID_ROWS
      setCellSize(Math.max(40, Math.min(80, Math.floor(Math.min(cellByWidth, cellByHeight)))))
    }
    calculateCellSize()
    const resizeObserver = new ResizeObserver(calculateCellSize)
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const isValidPosition = useCallback(
    (x: number, y: number, width: number, height: number, excludeId?: string): boolean => {
      if (x < 0 || y < 0 || x + width > GRID_COLS || y + height > GRID_ROWS) return false
      for (const widget of visibleWidgets) {
        if (widget.id === excludeId) continue
        if (
          !(
            x >= widget.position.x + widget.size.width ||
            x + width <= widget.position.x ||
            y >= widget.position.y + widget.size.height ||
            y + height <= widget.position.y
          )
        )
          return false
      }
      return true
    },
    [visibleWidgets],
  )

  const findOverlappingWidgets = useCallback(
    (x: number, y: number, width: number, height: number, excludeId: string): SocialWidget[] => {
      return visibleWidgets.filter(
        (widget) =>
          widget.id !== excludeId &&
          x < widget.position.x + widget.size.width &&
          x + width > widget.position.x &&
          y < widget.position.y + widget.size.height &&
          y + height > widget.position.y,
      )
    },
    [visibleWidgets],
  )

  const findFirstAvailablePosition = useCallback(
    (width: number, height: number, excludeIds: string[]): { x: number; y: number } | null => {
      for (let y = 0; y <= GRID_ROWS - height; y++) {
        for (let x = 0; x <= GRID_COLS - width; x++) {
          if (
            visibleWidgets.every(
              (w) =>
                excludeIds.includes(w.id) ||
                x >= w.position.x + w.size.width ||
                x + width <= w.position.x ||
                y >= w.position.y + w.size.height ||
                y + height <= w.position.y,
            )
          )
            return { x, y }
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
    ): SocialWidget[] | null => {
      const displaced = findOverlappingWidgets(newX, newY, activeWidth, activeHeight, activeWidgetId)
      let newWidgets = visibleWidgets.map((w) =>
        w.id === activeWidgetId ? { ...w, position: { x: newX, y: newY } } : w,
      )
      if (displaced.length === 0) return newWidgets
      for (const dw of displaced) {
        const newPos = findFirstAvailablePosition(dw.size.width, dw.size.height, [dw.id])
        if (!newPos) return null
        newWidgets = newWidgets.map((w) => (w.id === dw.id ? { ...w, position: newPos } : w))
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
      visibleWidgets
        .filter((w) => w.id !== excludeId)
        .forEach((w) => {
          for (let dy = 0; dy < w.size.height; dy++)
            for (let dx = 0; dx < w.size.width; dx++)
              if (w.position.y + dy < GRID_ROWS && w.position.x + dx < GRID_COLS)
                map[w.position.y + dy][w.position.x + dx] = true
        })
      return map
    },
    [visibleWidgets],
  )

  const pixelToGrid = useCallback(
    (pixelX: number, pixelY: number) => ({
      x: Math.max(0, Math.min(Math.round(pixelX / (cellSize + GRID_GAP)), GRID_COLS - 1)),
      y: Math.max(0, Math.min(Math.round(pixelY / (cellSize + GRID_GAP)), GRID_ROWS - 1)),
    }),
    [cellSize],
  )

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string)
  const handleDragMove = (event: DragMoveEvent) => {
    const activeWidget = visibleWidgets.find((w) => w.id === event.active.id)
    if (!activeWidget) return
    const gridPos = pixelToGrid(
      activeWidget.position.x * (cellSize + GRID_GAP) + event.delta.x,
      activeWidget.position.y * (cellSize + GRID_GAP) + event.delta.y,
    )
    const clampedX = Math.max(0, Math.min(gridPos.x, GRID_COLS - activeWidget.size.width))
    const clampedY = Math.max(0, Math.min(gridPos.y, GRID_ROWS - activeWidget.size.height))
    setPreviewPosition({ x: clampedX, y: clampedY })
    if (isValidPosition(clampedX, clampedY, activeWidget.size.width, activeWidget.size.height, activeWidget.id)) {
      setIsValidDrop(true)
      setWillDisplace(false)
    } else if (
      relocateWidgets(activeWidget.id, clampedX, clampedY, activeWidget.size.width, activeWidget.size.height)
    ) {
      setIsValidDrop(true)
      setWillDisplace(true)
    } else {
      setIsValidDrop(false)
      setWillDisplace(false)
    }
  }
  const handleDragEnd = (event: DragEndEvent) => {
    const activeWidget = visibleWidgets.find((w) => w.id === event.active.id)
    if (activeWidget && previewPosition && isValidDrop) {
      const relocated = relocateWidgets(
        activeWidget.id,
        previewPosition.x,
        previewPosition.y,
        activeWidget.size.width,
        activeWidget.size.height,
      )
      if (relocated) setWidgets([...relocated, ...widgets.filter((w) => !w.visible)])
    }
    resetDragState()
  }
  const resetDragState = () => {
    setActiveId(null)
    setPreviewPosition(null)
    setIsValidDrop(false)
    setWillDisplace(false)
  }

  const renderWidget = (widget: SocialWidget, isOverlay = false) => {
    const baseClasses = cn("h-full", isOverlay && "shadow-2xl")
    switch (widget.id) {
      case "interactions-today":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">interactions</p>
            </CardContent>
          </Card>
        )
      case "weekly-summary":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">total contacts</p>
            </CardContent>
          </Card>
        )
      case "contact-methods":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-blue-500" />
                Contact Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-3 w-3" />
                    Text
                  </span>
                  <span>12</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    Call
                  </span>
                  <span>6</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Video className="h-3 w-3" />
                    Video
                  </span>
                  <span>3</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    In-person
                  </span>
                  <span>2</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      case "recent-contacts":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                Recent Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {[
                  { name: "Sarah", time: "2h ago" },
                  { name: "Mike", time: "5h ago" },
                  { name: "Emma", time: "Yesterday" },
                  { name: "John", time: "2 days ago" },
                ].map((c) => (
                  <div key={c.name} className="flex justify-between">
                    <span>{c.name}</span>
                    <span className="text-muted-foreground">{c.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      case "upcoming-plans":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-500" />
                Upcoming Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {[
                  { event: "Coffee with Sarah", date: "Tomorrow 10am" },
                  { event: "Team lunch", date: "Wed 12pm" },
                  { event: "Movie night", date: "Fri 7pm" },
                ].map((p) => (
                  <div key={p.event} className="flex justify-between">
                    <span>{p.event}</span>
                    <span className="text-muted-foreground">{p.date}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      case "close-friends":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                Close Friends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["Sarah", "Mike", "Emma", "John", "Lisa"].map((f) => (
                  <span key={f} className="px-2 py-1 bg-muted rounded-full text-xs">
                    {f}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      default:
        return null
    }
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
      onDragCancel={resetDragState}
    >
      <div ref={containerRef} className="flex-1 min-h-0 flex items-center justify-center p-4">
        <div className="relative" style={{ width: `${gridWidth}px`, height: `${gridHeight}px` }}>
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
                  return (
                    <div
                      key={`${row}-${col}`}
                      className={cn(
                        "absolute rounded border transition-all duration-100",
                        isOccupied ? "border-transparent bg-transparent" : "border-dashed border-border/40 bg-muted/20",
                        isPreviewCell && isValidDrop && !willDisplace && "bg-primary/30 border-primary border-solid",
                        isPreviewCell && isValidDrop && willDisplace && "bg-amber-500/30 border-amber-500 border-solid",
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
