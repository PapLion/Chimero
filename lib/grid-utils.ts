import type { TrackingPageSection } from "@/types"

// Grid configuration for Resident Evil style inventory
export const GRID_COLS = 4
export const GRID_ROWS = 6 // Maximum rows
export const CELL_SIZE = 120 // pixels per grid cell
export const GRID_GAP = 4 // pixels between cells

// Function to check if a position is valid for a widget size
export function isValidPosition(
  widgets: TrackingPageSection[], 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  excludeId?: string
): boolean {
  // Check boundaries
  if (x < 0 || y < 0 || x + width > GRID_COLS || y + height > GRID_ROWS) {
    return false
  }

  // Check collision with other widgets
  for (const widget of widgets) {
    if (widget.id === excludeId) continue
    
    const widgetRight = widget.position.x + widget.size.width
    const widgetBottom = widget.position.y + widget.size.height
    const newRight = x + width
    const newBottom = y + height

    // Check if rectangles overlap
    if (
      x < widgetRight &&
      newRight > widget.position.x &&
      y < widgetBottom &&
      newBottom > widget.position.y
    ) {
      return false
    }
  }

  return true
}

// Function to find the first available position for a widget
export function findAvailablePosition(
  widgets: TrackingPageSection[], 
  width: number, 
  height: number, 
  excludeId?: string
): { x: number; y: number } | null {
  for (let y = 0; y <= GRID_ROWS - height; y++) {
    for (let x = 0; x <= GRID_COLS - width; x++) {
      if (isValidPosition(widgets, x, y, width, height, excludeId)) {
        return { x, y }
      }
    }
  }
  return null
}

// Function to compact widgets to eliminate empty spaces
export function compactWidgets(widgets: TrackingPageSection[]): TrackingPageSection[] {
  const sortedWidgets = [...widgets].sort((a, b) => {
    // Sort by y, then by x (top-left to bottom-right)
    if (a.position.y !== b.position.y) return a.position.y - b.position.y
    return a.position.x - b.position.x
  })

  const result: TrackingPageSection[] = []
  
  for (const widget of sortedWidgets) {
    const position = findAvailablePosition(result, widget.size.width, widget.size.height, widget.id)
    if (position) {
      result.push({
        ...widget,
        position
      })
    } else {
      // If no position found, keep original
      result.push(widget)
    }
  }

  return result
}

// Function to handle drag end with grid positioning
export function handleGridDragEnd(
  event: any,
  widgets: TrackingPageSection[],
  setWidgets: (widgets: TrackingPageSection[]) => void,
  updateTrackingPageLayout: (page: string, layout: any) => void,
  pageName: string
) {
  const { active, over } = event

  if (!over || active.id === over.id) {
    return
  }

  const activeWidget = widgets.find((w) => w.id === active.id)
  const overWidget = widgets.find((w) => w.id === over.id)

  if (!activeWidget || !overWidget) {
    return
  }

  // Try to place the active widget at the over widget's position
  const newX = overWidget.position.x
  const newY = overWidget.position.y

  // Check if the position is valid for the active widget
  if (isValidPosition(widgets, newX, newY, activeWidget.size.width, activeWidget.size.height, activeWidget.id)) {
    // Update the active widget's position
    const updatedWidgets = widgets.map((w) =>
      w.id === active.id ? { ...w, position: { x: newX, y: newY } } : w
    )

    // Compact all widgets to eliminate empty spaces
    const compactedWidgets = compactWidgets(updatedWidgets)
    
    setWidgets(compactedWidgets)
    updateTrackingPageLayout(pageName, {
      sections: compactedWidgets,
      gridColumns: GRID_COLS,
      updatedAt: new Date(),
    })
  }
}
