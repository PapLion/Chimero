/**
 * Dashboard grid engine: pure layout math for a fixed-column grid with vertical
 * compaction. Every operation returns a new, valid layout — no overlaps, nothing
 * outside the columns, no gaps above an item that could move up.
 */
import type { DashboardLayoutV2, DashboardWidget, GridRect, WidgetSizeRule, WidgetType } from '../contracts/dashboard'
import { GRID_COLUMNS, WIDGET_SIZE_RULES } from '../contracts/dashboard'

export type GridItem = GridRect & { id: string }

export function collides(a: GridRect, b: GridRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function byPosition(a: GridItem, b: GridItem): number {
  return a.y - b.y || a.x - b.x || a.id.localeCompare(b.id)
}

function clampRect<T extends GridItem>(item: T, cols: number, rule?: WidgetSizeRule): T {
  const minW = Math.min(rule?.minW ?? 1, cols)
  const maxW = Math.min(rule?.maxW ?? cols, cols)
  const w = Math.max(minW, Math.min(maxW, Math.round(item.w) || minW))
  const h = Math.max(rule?.minH ?? 1, Math.min(rule?.maxH ?? 99, Math.round(item.h) || 1))
  const x = Math.max(0, Math.min(cols - w, Math.round(item.x) || 0))
  const y = Math.max(0, Math.round(item.y) || 0)
  return { ...item, x, y, w, h }
}

/**
 * Move every item as far up as it can go without overlapping. Items are settled
 * in reading order; `first` (the item being dragged) settles before its peers so
 * it keeps the slot the user is pointing at.
 */
export function compact<T extends GridItem>(items: readonly T[], first?: string): T[] {
  const order = items.filter((item) => item.id !== first).sort(byPosition)
  const leader = first ? items.find((item) => item.id === first) : undefined
  if (leader) {
    const at = order.findIndex((item) => item.y >= leader.y)
    order.splice(at === -1 ? order.length : at, 0, leader)
  }
  const placed: T[] = []
  for (const item of order) {
    let y = item.y
    // Resolve any overlap by moving down, then pull up as far as possible.
    while (placed.some((p) => collides({ ...item, y }, p))) y++
    while (y > 0 && !placed.some((p) => collides({ ...item, y: y - 1 }, p))) y--
    placed.push({ ...item, y })
  }
  const byId = new Map(placed.map((p) => [p.id, p]))
  return items.map((item) => byId.get(item.id) as T)
}

/** Push anything overlapping `mover` below it, cascading through the stack. */
function pushDown<T extends GridItem>(items: T[], mover: T): T[] {
  const result = items.map((item) => ({ ...item }))
  const queue: GridItem[] = [mover]
  let guard = result.length * result.length + 8
  while (queue.length > 0 && guard-- > 0) {
    const current = queue.shift() as GridItem
    for (const other of result) {
      if (other.id === current.id || other.id === mover.id) continue
      if (collides(current, other)) {
        other.y = current.y + current.h
        queue.push(other)
      }
    }
  }
  return result
}

export function moveItem<T extends GridItem>(items: readonly T[], id: string, x: number, y: number, cols = GRID_COLUMNS): T[] {
  const target = items.find((item) => item.id === id)
  if (!target) return [...items]
  const moved = clampRect({ ...target, x, y }, cols)
  const others = items.filter((item) => item.id !== id)
  return compact([...pushDown(others, moved), moved], id).sort((a, b) => indexOf(items, a.id) - indexOf(items, b.id))
}

export function resizeItem<T extends GridItem>(
  items: readonly T[],
  id: string,
  w: number,
  h: number,
  rule?: WidgetSizeRule,
  cols = GRID_COLUMNS,
): T[] {
  const target = items.find((item) => item.id === id)
  if (!target) return [...items]
  const maxW = cols - target.x
  const resized = clampRect({ ...target, w: Math.min(w, maxW), h }, cols, rule)
  resized.x = target.x
  resized.w = Math.min(resized.w, maxW)
  const others = items.filter((item) => item.id !== id)
  return compact([...pushDown(others, resized), resized], id).sort((a, b) => indexOf(items, a.id) - indexOf(items, b.id))
}

function indexOf(items: readonly GridItem[], id: string): number {
  return items.findIndex((item) => item.id === id)
}

/** First free slot in reading order for a w×h item. */
export function findSlot(items: readonly GridItem[], w: number, h: number, cols = GRID_COLUMNS): { x: number; y: number } {
  const width = Math.min(w, cols)
  const bottom = layoutHeight(items)
  for (let y = 0; y <= bottom; y++) {
    for (let x = 0; x <= cols - width; x++) {
      if (!items.some((item) => collides({ x, y, w: width, h }, item))) return { x, y }
    }
  }
  return { x: 0, y: bottom }
}

export function addItem<T extends GridItem>(items: readonly T[], item: Omit<T, 'x' | 'y'> & Partial<GridRect>, cols = GRID_COLUMNS): T[] {
  const slot = findSlot(items, item.w as number, item.h as number, cols)
  return compact([...items, { ...item, ...slot } as T])
}

export function removeItem<T extends GridItem>(items: readonly T[], id: string): T[] {
  return compact(items.filter((item) => item.id !== id))
}

export function layoutHeight(items: readonly GridRect[]): number {
  return items.reduce((max, item) => Math.max(max, item.y + item.h), 0)
}

export function hasOverlap(items: readonly GridItem[]): boolean {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) if (collides(items[i], items[j])) return true
  }
  return false
}

const WIDGET_TYPES = Object.keys(WIDGET_SIZE_RULES) as WidgetType[]

/** Validate untrusted layout JSON into a consistent v2 layout. Returns null when nothing is usable. */
export function sanitizeLayout(input: unknown, cols = GRID_COLUMNS): DashboardLayoutV2 | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const raw = input as { version?: unknown; widgets?: unknown }
  if (raw.version !== 2 || !Array.isArray(raw.widgets)) return null
  const seen = new Set<string>()
  const widgets: DashboardWidget[] = []
  for (const candidate of raw.widgets) {
    if (!candidate || typeof candidate !== 'object') continue
    const w = candidate as Partial<DashboardWidget>
    if (typeof w.id !== 'string' || !w.id || seen.has(w.id)) continue
    if (!WIDGET_TYPES.includes(w.type as WidgetType)) continue
    if (w.type === 'tracker' && !(Number.isInteger(w.trackerId) && (w.trackerId as number) > 0)) continue
    seen.add(w.id)
    const rule = WIDGET_SIZE_RULES[w.type as WidgetType]
    const rect = clampRect(
      { id: w.id, x: Number(w.x), y: Number(w.y), w: Number(w.w) || rule.defaultW, h: Number(w.h) || rule.defaultH },
      cols,
      rule,
    )
    const widget: DashboardWidget = { ...rect, type: w.type as WidgetType }
    if (Number.isInteger(w.trackerId)) widget.trackerId = w.trackerId
    if (typeof w.metricId === 'string') widget.metricId = w.metricId
    if (w.pair && typeof w.pair.a === 'string' && typeof w.pair.b === 'string') {
      widget.pair = { a: w.pair.a, b: w.pair.b, lagDays: Number(w.pair.lagDays) || 0 }
    }
    if (Number.isFinite(w.days)) widget.days = Math.max(7, Math.min(730, Math.round(w.days as number)))
    if (typeof w.text === 'string') widget.text = w.text.slice(0, 4000)
    if (typeof w.title === 'string') widget.title = w.title.slice(0, 80)
    widgets.push(widget)
  }
  return { version: 2, widgets: compact(widgets) }
}

/** Default arrangement for a set of trackers (first run, reset, legacy upgrade). */
export function buildDefaultLayout(trackers: ReadonlyArray<{ id: number; identity: string }>): DashboardLayoutV2 {
  const sizes: Record<string, [number, number]> = {
    weight: [5, 4],
    mood: [4, 4],
    tasks: [3, 4],
    exercise: [4, 3],
    social: [4, 3],
    diet: [4, 3],
  }
  let widgets: DashboardWidget[] = []
  const push = (widget: Omit<DashboardWidget, 'x' | 'y'>) => {
    widgets = addItem(widgets, widget)
  }
  for (const tracker of trackers.slice(0, 9)) {
    const [w, h] = sizes[tracker.identity] ?? [3, 3]
    push({ id: `tracker-${tracker.id}`, type: 'tracker', trackerId: tracker.id, w, h })
  }
  push({ id: 'heatmap', type: 'heatmap', w: 8, h: 3 })
  push({ id: 'day-log', type: 'day-log', w: 4, h: 5 })
  push({ id: 'streak', type: 'streak', w: 2, h: 2 })
  push({ id: 'reminders', type: 'reminders', w: 3, h: 2 })
  push({ id: 'people', type: 'people', w: 3, h: 2 })
  return { version: 2, widgets }
}
