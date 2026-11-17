import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { DashboardWidget } from '@contracts/contracts'
import { GRID_COLUMNS, WIDGET_SIZE_RULES } from '@contracts/contracts'
import { layoutHeight, moveItem, resizeItem } from '@contracts/domain/grid'
import { useSize } from '@/charts/scale'
import { cn } from '@/lib/cn'

export const ROW_HEIGHT = 76
export const GAP = 14

interface DragState {
  id: string
  mode: 'move' | 'resize'
  start: DashboardWidget[]
  /** Pointer offset from the item's top-left corner (move) or bottom-right corner (resize). */
  anchorX: number
  anchorY: number
  startRect: { left: number; top: number; width: number; height: number }
}

interface GridCanvasProps {
  widgets: DashboardWidget[]
  editing: boolean
  onCommit: (widgets: DashboardWidget[]) => void
  children: (widget: DashboardWidget) => ReactNode
  /** Controls rendered on top of a widget while editing (remove, configure). */
  controls?: (widget: DashboardWidget) => ReactNode
  label: (widget: DashboardWidget) => string
}

/**
 * The dashboard surface. Layout math lives in the shared grid engine; this
 * component turns pointer and keyboard input into engine calls and animates the
 * result. While dragging, the item follows the pointer and a placeholder shows
 * where it will land once released.
 */
export function GridCanvas({ widgets, editing, onCommit, children, controls, label }: GridCanvasProps) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const [drag, setDrag] = useState<DragState | null>(null)
  const [preview, setPreview] = useState<DashboardWidget[] | null>(null)
  const [free, setFree] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const previewRef = useRef<DashboardWidget[] | null>(null)

  const colWidth = Math.max(0, (width - GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS)
  const stepX = colWidth + GAP
  const stepY = ROW_HEIGHT + GAP
  const layout = preview ?? widgets
  const rectOf = useCallback(
    (item: { x: number; y: number; w: number; h: number }) => ({ left: item.x * stepX, top: item.y * stepY, width: item.w * stepX - GAP, height: item.h * stepY - GAP }),
    [stepX, stepY],
  )

  // One frame loop per drag: follows the pointer, scrolls the page near its edges
  // and recomputes the landing layout only when the target cell changes.
  useEffect(() => {
    if (!drag) return
    let frame = 0
    let lastKey = ''
    const scroller = findScrollParent(ref.current)
    const tick = () => {
      const state = dragRef.current
      const point = pointer.current
      const container = ref.current
      if (state && point && container) {
        if (scroller) {
          const bounds = scroller.getBoundingClientRect()
          if (point.y > bounds.bottom - 56) scroller.scrollTop += 12
          else if (point.y < bounds.top + 56) scroller.scrollTop -= 12
        }
        const origin = container.getBoundingClientRect()
        if (state.mode === 'move') {
          const left = point.x - origin.left - state.anchorX
          const top = point.y - origin.top - state.anchorY
          setFree({ left, top, width: state.startRect.width, height: state.startRect.height })
          const gx = Math.round(left / stepX)
          const gy = Math.max(0, Math.round(top / stepY))
          const key = `${gx}:${gy}`
          if (key !== lastKey) {
            lastKey = key
            previewRef.current = moveItem(state.start, state.id, gx, gy)
            setPreview(previewRef.current)
          }
        } else {
          const widget = state.start.find((w) => w.id === state.id) as DashboardWidget
          const rule = WIDGET_SIZE_RULES[widget.type]
          // Measured against the container, so scrolling mid-drag keeps the corner under the pointer.
          const widthPx = Math.max(rule.minW * stepX - GAP, point.x - origin.left - state.anchorX - state.startRect.left)
          const heightPx = Math.max(rule.minH * stepY - GAP, point.y - origin.top - state.anchorY - state.startRect.top)
          setFree({ left: state.startRect.left, top: state.startRect.top, width: Math.min(widthPx, width - state.startRect.left), height: heightPx })
          const gw = Math.round((widthPx + GAP) / stepX)
          const gh = Math.round((heightPx + GAP) / stepY)
          const key = `${gw}x${gh}`
          if (key !== lastKey) {
            lastKey = key
            previewRef.current = resizeItem(state.start, state.id, gw, gh, rule)
            setPreview(previewRef.current)
          }
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [drag, ref, stepX, stepY, width])

  const begin = (event: ReactPointerEvent<HTMLElement>, widget: DashboardWidget, mode: DragState['mode']) => {
    if (!editing || event.button !== 0 || !ref.current) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const origin = ref.current.getBoundingClientRect()
    const startRect = rectOf(widget)
    const state: DragState = {
      id: widget.id,
      mode,
      start: widgets,
      // move: where inside the item it was grabbed. resize: distance from its bottom-right corner.
      anchorX: event.clientX - origin.left - startRect.left - (mode === 'resize' ? startRect.width : 0),
      anchorY: event.clientY - origin.top - startRect.top - (mode === 'resize' ? startRect.height : 0),
      startRect,
    }
    pointer.current = { x: event.clientX, y: event.clientY }
    dragRef.current = state
    previewRef.current = widgets
    setFree(startRect)
    setPreview(widgets)
    setDrag(state)
  }

  const move = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current) pointer.current = { x: event.clientX, y: event.clientY }
  }

  const end = (commit: boolean) => {
    const result = previewRef.current
    const state = dragRef.current
    dragRef.current = null
    previewRef.current = null
    pointer.current = null
    setDrag(null)
    setFree(null)
    setPreview(null)
    if (commit && state && result && JSON.stringify(result) !== JSON.stringify(state.start)) onCommit(result)
  }

  // Escape cancels an in-flight drag and restores the layout it started from.
  useEffect(() => {
    if (!drag) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') end(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, widget: DashboardWidget) => {
    if (!editing || event.target !== event.currentTarget) return
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
    if (!delta) return
    event.preventDefault()
    const next = event.shiftKey
      ? resizeItem(widgets, widget.id, widget.w + delta[0], widget.h + delta[1], WIDGET_SIZE_RULES[widget.type])
      : moveItem(widgets, widget.id, widget.x + delta[0], Math.max(0, widget.y + delta[1]))
    if (JSON.stringify(next) !== JSON.stringify(widgets)) onCommit(next)
  }

  const rows = Math.max(layoutHeight(layout), free ? Math.ceil((free.top + free.height) / stepY) : 0)

  return (
    <div ref={ref} className="relative w-full" style={{ height: Math.max(0, rows * stepY - GAP) + (editing ? stepY : 0) }} data-testid="dashboard-grid" data-editing={editing}>
      {editing && width > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-widget opacity-60"
          style={{
            backgroundImage: `linear-gradient(to right, rgb(var(--line) / 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--line) / 0.35) 1px, transparent 1px)`,
            backgroundSize: `${stepX}px ${stepY}px`,
            backgroundPosition: `-${GAP / 2}px -${GAP / 2}px`,
          }}
        />
      )}
      {width > 0 &&
        layout.map((widget) => {
          const rect = rectOf(widget)
          const active = drag?.id === widget.id
          const box = active && free ? free : rect
          return (
            <div key={widget.id}>
              {active && <div aria-hidden className="absolute rounded-widget border-2 border-dashed border-accent/70 bg-accent/10" style={{ ...rect, transition: 'all 140ms cubic-bezier(0.2, 0.8, 0.2, 1)' }} />}
              <div
                data-widget-id={widget.id}
                data-grid={`${widget.x},${widget.y},${widget.w},${widget.h}`}
                tabIndex={editing ? 0 : undefined}
                role={editing ? 'group' : undefined}
                aria-label={editing ? `${label(widget)}. Column ${widget.x + 1}, row ${widget.y + 1}, ${widget.w} wide, ${widget.h} tall. Arrow keys move, Shift plus arrow keys resize.` : undefined}
                onKeyDown={(event) => onKeyDown(event, widget)}
                className={cn('group/widget absolute', active ? 'z-30' : 'z-0', editing && 'rounded-widget focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent')}
                style={{
                  width: box.width,
                  height: box.height,
                  transform: `translate(${box.left}px, ${box.top}px)`,
                  transition: active ? 'none' : 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1), width 200ms cubic-bezier(0.2, 0.8, 0.2, 1), height 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              >
                <div className={cn('h-full w-full transition-[box-shadow,scale] duration-150', active && 'scale-[1.012] rounded-widget shadow-lift', editing && 'pointer-events-none select-none [&_[data-widget-tools]]:invisible')}>{children(widget)}</div>
                {editing && (
                  <>
                    <div
                      data-drag-handle
                      onPointerDown={(event) => begin(event, widget, 'move')}
                      onPointerMove={move}
                      onPointerUp={() => end(true)}
                      onPointerCancel={() => end(false)}
                      className={cn('absolute inset-0 rounded-widget border border-dashed border-faint/50 transition-colors hover:border-accent/80', active ? 'cursor-grabbing' : 'cursor-grab')}
                    />
                    <div className="absolute right-2 top-2 z-10 flex gap-1">{controls?.(widget)}</div>
                    <div
                      data-resize-handle
                      onPointerDown={(event) => begin(event, widget, 'resize')}
                      onPointerMove={move}
                      onPointerUp={() => end(true)}
                      onPointerCancel={() => end(false)}
                      className="absolute -bottom-1 -right-1 z-10 grid h-7 w-7 cursor-nwse-resize place-items-center"
                      aria-hidden
                    >
                      <span className="h-3 w-3 rounded-br-[10px] border-b-[3px] border-r-[3px] border-accent" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
    </div>
  )
}

function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  let node = element?.parentElement ?? null
  while (node) {
    const overflow = getComputedStyle(node).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return node
    node = node.parentElement
  }
  return null
}
