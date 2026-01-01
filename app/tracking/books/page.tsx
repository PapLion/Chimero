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
import { BookOpen, Clock, Target, Library, Star, Bookmark } from "lucide-react"

interface BooksWidget {
  id: string
  size: { width: number; height: number }
  position: { x: number; y: number }
  visible: boolean
}

const INITIAL_WIDGETS: BooksWidget[] = [
  { id: "currently-reading", size: { width: 3, height: 3 }, position: { x: 0, y: 0 }, visible: true },
  { id: "reading-time", size: { width: 2, height: 2 }, position: { x: 3, y: 0 }, visible: true },
  { id: "yearly-goal", size: { width: 2, height: 2 }, position: { x: 5, y: 0 }, visible: true },
  { id: "books-completed", size: { width: 2, height: 2 }, position: { x: 7, y: 0 }, visible: true },
  { id: "reading-list", size: { width: 4, height: 3 }, position: { x: 0, y: 3 }, visible: true },
  { id: "favorite-genres", size: { width: 3, height: 2 }, position: { x: 4, y: 3 }, visible: true },
]

const GRID_COLS = 10
const GRID_ROWS = 8
const GRID_GAP = 8

export default function BooksPage() {
  const [widgets, setWidgets] = useState<BooksWidget[]>(INITIAL_WIDGETS)
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
    (x: number, y: number, width: number, height: number, excludeId: string): BooksWidget[] =>
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
    ): BooksWidget[] | null => {
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

  const renderWidget = (widget: BooksWidget, isOverlay = false) => {
    const baseClasses = cn("h-full", isOverlay && "shadow-2xl")
    switch (widget.id) {
      case "currently-reading":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Currently Reading
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">Atomic Habits</div>
              <p className="text-xs text-muted-foreground">by James Clear</p>
              <div className="w-full bg-muted rounded-full h-2 mt-3">
                <div className="bg-primary h-2 rounded-full" style={{ width: "65%" }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Page 195 of 300 (65%)</p>
            </CardContent>
          </Card>
        )
      case "reading-time":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">45</div>
              <p className="text-xs text-muted-foreground">minutes read</p>
            </CardContent>
          </Card>
        )
      case "yearly-goal":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                2025 Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">18/24</div>
              <p className="text-xs text-muted-foreground">books</p>
            </CardContent>
          </Card>
        )
      case "books-completed":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Library className="h-4 w-4 text-purple-500" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">18</div>
              <p className="text-xs text-muted-foreground">this year</p>
            </CardContent>
          </Card>
        )
      case "reading-list":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-orange-500" />
                Reading List
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {[
                  { title: "Deep Work", author: "Cal Newport" },
                  { title: "The Psychology of Money", author: "Morgan Housel" },
                  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman" },
                  { title: "Range", author: "David Epstein" },
                ].map((b) => (
                  <div key={b.title} className="flex justify-between">
                    <span>{b.title}</span>
                    <span className="text-muted-foreground">{b.author}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      case "favorite-genres":
        return (
          <Card className={cn(baseClasses, "bg-card border-border")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Top Genres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["Self-Help", "Psychology", "Business", "Science", "Fiction"].map((g) => (
                  <span key={g} className="px-2 py-1 bg-muted rounded-full text-xs">
                    {g}
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
