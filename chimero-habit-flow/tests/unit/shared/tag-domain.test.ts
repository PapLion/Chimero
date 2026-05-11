import { describe, expect, it } from 'vitest'
import { buildTagTree, resolveInheritedTagIds } from '@contracts/domain'
import type { Tag, TagRelationship } from '@contracts/contracts'

const tags: Tag[] = [
  { id: 1, name: 'Health', color: '#22c55e' },
  { id: 2, name: 'Exercise', color: '#3b82f6' },
  { id: 3, name: 'Running', color: '#f97316' },
  { id: 4, name: 'Food', color: '#a855f7' },
]

const relationships: TagRelationship[] = [
  { parentTagId: 1, childTagId: 2 },
  { parentTagId: 2, childTagId: 3 },
]

describe('shared tag domain', () => {
  it('builds a stable parent-child tag tree', () => {
    expect(buildTagTree(tags, relationships)).toEqual([
      {
        id: 4,
        name: 'Food',
        color: '#a855f7',
        children: [],
      },
      {
        id: 1,
        name: 'Health',
        color: '#22c55e',
        children: [
          {
            id: 2,
            name: 'Exercise',
            color: '#3b82f6',
            children: [
              {
                id: 3,
                name: 'Running',
                color: '#f97316',
                children: [],
              },
            ],
          },
        ],
      },
    ])
  })

  it('resolves inherited ancestor tags for retroactive queries', () => {
    expect(resolveInheritedTagIds([3], relationships)).toEqual([1, 2, 3])
  })
})
