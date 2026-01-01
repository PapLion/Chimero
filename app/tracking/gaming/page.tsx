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
import { Gamepad2, Clock, Trophy, Target, Calendar, Flame } from "lucide-react"

interface GamingWidget {
  id: string
  size: { width: number; height: number }
  position: { x: number; y: number }
  visible: boolean
}

const INITIAL_WIDGETS: GamingWidget[] = [
  { id: "playtime-today", size: { width: 2, height: 2 }, position: { x: 0, y: 0 }, visible: true },
  { id: "current-game", size: { width: 3, height: 3 }, position: { x: 2, y: 0 }, visible: true },
  { id: "achievements", size: { width: 2, height: 2 }, position: { x: 5, y: 0 }, visible: true },
  { id: "gaming-streak", size: { width: 2, height: 2 }, position: { x: 7, y: 0 }, visible: true },
  { id: "recent-games", size: { width: 4, height: 3 }, position: { x: 0, y: 2 }, visible: true },
  { id: "weekly-stats", size: { width: 3, height: 2 }, position: { x: 4, y: 3 }, visible: true },
]

const GRID_COLS = 10
const GRID_ROWS = 8
const GRID_GAP = 8

export default function GamingPage() {
  const [widgets, setWidgets] = useState<GamingWidget[]>(INITIAL_WIDGETS)
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
      const availableWidth = containerRef.current.clientWidth - 32
      const availableHeight = containerRef.current.clientHeight - 32
      setCellSize(
        Math.max(
          40,
          Math.min(
            80,
            Math.floor(
              Math.min(
                (availableWidth - (GRID_COLS - 1) * GRID_GAP) / GRID_COLS,
                (availableHeight - (GRID_ROWS - 1) * GRID_GAP) / GRID_ROWS,
              ),
            ),
          ),
        ),
      )
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
      return visibleWidgets.every(
        (w) =>
          w.id === excludeId ||
          x >= w.position.x + w.size.width ||
          x + width <= w.position.x ||
          y >= w.position.y + w.size.height ||
          y + height <= w.position.y,
      )
    },
    [visibleWidgets],
  )

  const findOverlappingWidgets = useCallback(
    (x: number, y: number, width: number, height: number, excludeId: string): GamingWidget[] =>
      visibleWidgets.filter(
        (w) =>
          w.id !== excludeId &&
          x < w.position.x + w.size.width &&
          x + width > w.position.x &&
          y < w.position.y + w.size.height &&
          y + height > w.position.y,
      ),
    [visibleWidgets],
  )

  const findFirstAvailablePosition = useCallback(
    (width: number, height: number, excludeIds: string[]): { x: number; y: number } | null => {
      for (let y = 0; y <= GRID_ROWS - height; y++)
        for (let x = 0; x <= GRID_COLS - width; x++)
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
    ): GamingWidget[] | null => {
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
    const aw = visibleWidgets.find((w) => w.id === event.active.id)
    if (!aw) return
    const gp = pixelToGrid(
      aw.position.x * (cellSize + GRID_GAP) + event.delta.x,
      aw.position.y * (cellSize + GRID_GAP) + event.delta.y,
    )
    const cx = Math.max(0, Math.min(gp.x, GRID_COLS - aw.size.width)),
      cy = Math.max(0, Math.min(gp.y, GRID_ROWS - aw.size.height))
    setPreviewPosition({ x: cx, y: cy })
    if (isValidPosition(cx, cy, aw.size.width, aw.size.height, aw.id)) {
      setIsValidDrop(true)
      setWillDisplace(false)
    } else if (relocateWidgets(aw.id, cx, cy, aw.size.width, aw.size.height)) {
      setIsValidDrop(true)
      setWillDisplace(true)
    } else {
      setIsValidDrop(false)
      setWillDisplace(false)
    }
  }
  const handleDragEnd = (event: DragEndEvent) => {
    const aw = visibleWidgets.find((w) => w.id === event.active.id)
    if (aw && previewPosition && isValidDrop) {
      const r = relocateWidgets(aw.id, previewPosition.x, previewPosition.y, aw.size.width, aw.size.height)
      if (r) setWidgets([...r, ...widgets.filter((w) => !w.visible)])
    }
    resetDragState()
  }
  const resetDragState = () => {
    setActiveId(null)
    setPreviewPosition(null)
    setIsValidDrop(false)
    setWillDisplace(false)
  }

  const renderWidget = (widget: GamingWidget, isOverlay = false) => {
    const baseClasses = cn("h-full", isOverlay && "shadow-2xl")
    switch (widget.id) {
      case "playtime-today":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Play Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">2.5h</div>
              <p className="text-xs text-muted-foreground">today</p>
            </CardContent>
          </Card>
        )
      case "current-game":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-purple-500" />
                Now Playing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">Elden Ring</div>
              <p className="text-xs text-muted-foreground mt-1">Level 85 • 120h played</p>
              <div className="w-full bg-muted rounded-full h-2 mt-3">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: "68%" }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">68% completion</p>
            </CardContent>
          </Card>
        )
      case "achievements":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">342</div>
              <p className="text-xs text-muted-foreground">total unlocked</p>
            </CardContent>
          </Card>
        )
      case "gaming-streak":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">days in a row</p>
            </CardContent>
          </Card>
        )
      case "recent-games":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Recent Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {[
                  { name: "Elden Ring", time: "2.5h today" },
                  { name: "Baldur's Gate 3", time: "3h yesterday" },
                  { name: "Hades II", time: "1.5h Dec 13" },
                  { name: "Cyberpunk 2077", time: "4h Dec 12" },
                ].map((g) => (
                  <div key={g.name} className="flex justify-between">
                    <span>{g.name}</span>
                    <span className="text-muted-foreground">{g.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      case "weekly-stats":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Hours:</span> 18h
                </div>
                <div>
                  <span className="text-muted-foreground">Games:</span> 4
                </div>
                <div>
                  <span className="text-muted-foreground">Trophies:</span> 12
                </div>
                <div>
                  <span className="text-muted-foreground">Sessions:</span> 8
                </div>
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
