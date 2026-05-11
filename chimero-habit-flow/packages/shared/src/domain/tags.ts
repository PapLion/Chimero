import type { Tag, TagRelationship, TagTree } from '../contracts'

function sortTags<T extends Tag>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id)
}

export function buildTagTree(tags: Tag[], relationships: TagRelationship[]): TagTree[] {
  const byId = new Map(tags.map((tag) => [tag.id, tag]))
  const childrenByParent = new Map<number, number[]>()
  const childIds = new Set<number>()

  for (const relationship of relationships) {
    if (!byId.has(relationship.parentTagId) || !byId.has(relationship.childTagId)) continue
    childIds.add(relationship.childTagId)
    const children = childrenByParent.get(relationship.parentTagId) ?? []
    children.push(relationship.childTagId)
    childrenByParent.set(relationship.parentTagId, children)
  }

  const buildNode = (tagId: number, path: Set<number>): TagTree | null => {
    const tag = byId.get(tagId)
    if (!tag || path.has(tagId)) return null

    const nextPath = new Set(path)
    nextPath.add(tagId)
    const childNodes = (childrenByParent.get(tagId) ?? [])
      .map((childId) => buildNode(childId, nextPath))
      .filter((node): node is TagTree => node !== null)

    return {
      ...tag,
      children: sortTags(childNodes),
    }
  }

  return sortTags(tags.filter((tag) => !childIds.has(tag.id)))
    .map((tag) => buildNode(tag.id, new Set()))
    .filter((node): node is TagTree => node !== null)
}

export function resolveInheritedTagIds(tagIds: number[], relationships: TagRelationship[]): number[] {
  const parentsByChild = new Map<number, number[]>()

  for (const relationship of relationships) {
    const parents = parentsByChild.get(relationship.childTagId) ?? []
    parents.push(relationship.parentTagId)
    parentsByChild.set(relationship.childTagId, parents)
  }

  const resolved = new Set<number>()
  const visit = (tagId: number, path: Set<number>) => {
    if (path.has(tagId)) return
    resolved.add(tagId)
    const nextPath = new Set(path)
    nextPath.add(tagId)
    for (const parentId of parentsByChild.get(tagId) ?? []) {
      visit(parentId, nextPath)
    }
  }

  for (const tagId of tagIds) {
    visit(tagId, new Set())
  }

  return Array.from(resolved).sort((a, b) => a - b)
}
