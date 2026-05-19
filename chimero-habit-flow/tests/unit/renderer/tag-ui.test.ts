import { describe, expect, it } from 'vitest'

import { resolveVisibleTags, tagOverflowLabel } from '../../../apps/electron/src/renderer/src/features/tags/components/TagChips'
import type { Tag } from '@contracts/contracts'

const tags: Tag[] = [
  { id: 1, name: 'Health', color: '#22c55e' },
  { id: 2, name: 'Morning', color: '#38bdf8' },
  { id: 3, name: 'Private', color: null },
]

describe('renderer tag UI helpers', () => {
  it('resolves selected tag IDs to real tags and ignores unknown IDs', () => {
    expect(resolveVisibleTags([2, 99, 1], tags).map((tag) => tag.name)).toEqual(['Morning', 'Health'])
  })

  it('summarizes compact overflow without counting hidden unknown IDs', () => {
    expect(tagOverflowLabel([1, 3, 99, 2], tags, 2)).toBe('+1')
    expect(tagOverflowLabel([1, 99], tags, 2)).toBeNull()
  })
})
