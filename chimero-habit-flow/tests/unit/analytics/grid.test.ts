import { describe, expect, it } from 'vitest'
import { addItem, buildDefaultLayout, compact, findSlot, hasOverlap, layoutHeight, moveItem, removeItem, resizeItem, sanitizeLayout, type GridItem } from '@contracts/domain/grid'
import { WIDGET_SIZE_RULES } from '@contracts/contracts'

const item = (id: string, x: number, y: number, w: number, h: number): GridItem => ({ id, x, y, w, h })
const at = (items: GridItem[], id: string) => items.find((i) => i.id === id) as GridItem

function expectValid(items: GridItem[], cols = 12) {
  expect(hasOverlap(items)).toBe(false)
  for (const i of items) {
    expect(i.x).toBeGreaterThanOrEqual(0)
    expect(i.x + i.w).toBeLessThanOrEqual(cols)
    expect(i.y).toBeGreaterThanOrEqual(0)
  }
  // Nothing could move further up.
  expect(compact(items)).toEqual(items)
}

describe('grid engine', () => {
  const base = [item('a', 0, 0, 4, 2), item('b', 4, 0, 4, 2), item('c', 8, 0, 4, 2), item('d', 0, 2, 6, 3), item('e', 6, 2, 6, 3)]

  it('compacts gaps upward', () => {
    const result = compact([item('a', 0, 5, 4, 2), item('b', 0, 9, 4, 2), item('c', 6, 3, 2, 2)])
    expect(at(result, 'a').y).toBe(0)
    expect(at(result, 'b').y).toBe(2)
    expect(at(result, 'c').y).toBe(0)
  })

  it('moves an item into an occupied slot and pushes the occupant down', () => {
    const result = moveItem(base, 'd', 4, 0)
    expect(at(result, 'd')).toMatchObject({ x: 4, y: 0 })
    expect(at(result, 'b').y).toBeGreaterThanOrEqual(3)
    expectValid(result)
  })

  it('swaps vertically stacked items', () => {
    const stack = [item('top', 0, 0, 4, 2), item('bottom', 0, 2, 4, 2)]
    const result = moveItem(stack, 'bottom', 0, 0)
    expect(at(result, 'bottom').y).toBe(0)
    expect(at(result, 'top').y).toBe(2)
  })

  it('clamps moves to the grid', () => {
    expect(at(moveItem(base, 'a', 99, 0), 'a').x).toBe(8)
    expect(at(moveItem(base, 'a', -5, -5), 'a')).toMatchObject({ x: 0, y: 0 })
    expectValid(moveItem(base, 'a', 99, 50))
  })

  it('resizes within the rules and pushes neighbours', () => {
    const rule = WIDGET_SIZE_RULES.tracker
    const grown = resizeItem(base, 'a', 6, 4, rule)
    expect(at(grown, 'a')).toMatchObject({ w: 6, h: 4 })
    expectValid(grown)
    expect(at(resizeItem(base, 'a', 1, 1, rule), 'a')).toMatchObject({ w: rule.minW, h: rule.minH })
    expect(at(resizeItem(base, 'c', 12, 2, rule), 'c').w).toBe(4)
  })

  it('never produces overlaps across many random operations', () => {
    let items = base
    let seed = 7
    const next = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed % n
    }
    for (let step = 0; step < 400; step++) {
      const id = items[next(items.length)].id
      items = next(2) === 0 ? moveItem(items, id, next(14) - 1, next(12)) : resizeItem(items, id, 1 + next(12), 1 + next(8))
      expectValid(items)
      expect(items).toHaveLength(5)
    }
  })

  it('adds into the first free slot and removes cleanly', () => {
    expect(findSlot(base, 4, 2)).toEqual({ x: 0, y: 5 })
    expect(findSlot([item('a', 0, 0, 4, 2)], 4, 2)).toEqual({ x: 4, y: 0 })
    const added = addItem(base, { id: 'f', w: 3, h: 2 } as GridItem)
    expect(added).toHaveLength(6)
    expectValid(added)
    const removed = removeItem(base, 'a')
    expect(removed).toHaveLength(4)
    expect(layoutHeight(removed)).toBe(5)
    expectValid(removed)
  })

  it('sanitises stored layouts', () => {
    expect(sanitizeLayout(null)).toBeNull()
    expect(sanitizeLayout([{ trackerId: 1 }])).toBeNull()
    const layout = sanitizeLayout({
      version: 2,
      widgets: [
        { id: 'a', type: 'tracker', trackerId: 3, x: 0, y: 0, w: 4, h: 3 },
        { id: 'a', type: 'tracker', trackerId: 4, x: 0, y: 0, w: 4, h: 3 },
        { id: 'b', type: 'tracker', x: 0, y: 0, w: 4, h: 3 },
        { id: 'c', type: 'nonsense', x: 0, y: 0, w: 4, h: 3 },
        { id: 'd', type: 'heatmap', x: 2, y: 0, w: 40, h: 40 },
        { id: 'e', type: 'note', x: -4, y: 2, w: 0, h: 0, text: 'hello' },
      ],
    })
    expect(layout?.widgets.map((w) => w.id)).toEqual(['a', 'd', 'e'])
    expectValid(layout?.widgets ?? [])
    expect(at(layout?.widgets ?? [], 'd')).toMatchObject({ w: 12, h: 5 })
    expect(layout?.widgets[2]).toMatchObject({ text: 'hello', w: WIDGET_SIZE_RULES.note.defaultW })
  })

  it('builds a valid default layout', () => {
    const layout = buildDefaultLayout([{ id: 1, identity: 'weight' }, { id: 2, identity: 'mood' }, { id: 3, identity: 'tasks' }, { id: 4, identity: 'generic' }])
    expectValid(layout.widgets)
    expect(layout.widgets.filter((w) => w.type === 'tracker')).toHaveLength(4)
    expect(sanitizeLayout(layout)).toEqual(layout)
  })
})
