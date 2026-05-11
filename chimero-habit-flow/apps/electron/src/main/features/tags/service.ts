import { asc, eq, inArray } from 'drizzle-orm'
import { entriesToTags, tagRelationships, tags } from '@packages/db'
import { getDb } from '@packages/db/database'
import type { DrizzleDB } from '@packages/db/database'
import { buildTagTree, resolveInheritedTagIds } from '@contracts/domain'
import type {
  ResolveTagInheritanceResponse,
  ResolvedTagTreeResponse,
  Tag,
  TagRelationship,
} from '@contracts/contracts'
import { mapTag, mapTagRelationship } from '../../shared/mappers'

type TagMutationDb = Pick<DrizzleDB, 'delete' | 'insert' | 'select'>

function normalizeTagIds(tagIds?: number[]): number[] {
  if (!Array.isArray(tagIds)) return []
  return Array.from(new Set(tagIds.filter((id) => Number.isInteger(id) && id > 0)))
}

async function validateReplacementTagIds(tagIds?: number[], database: TagMutationDb = getDb()): Promise<number[] | null> {
  if (!Array.isArray(tagIds)) return null
  const normalized = normalizeTagIds(tagIds)
  if (normalized.length === 0) return []

  const rows = await database
    .select({ id: tags.id })
    .from(tags)
    .where(inArray(tags.id, normalized))
  const existing = new Set((rows as Array<{ id: number }>).map((row) => row.id))
  const missing = normalized.filter((id) => !existing.has(id))
  if (missing.length > 0) {
    throw new Error(`Unknown tag IDs: ${missing.join(', ')}`)
  }
  return normalized
}

export async function getTags(): Promise<Tag[]> {
  const rows = await getDb().select().from(tags).orderBy(asc(tags.name))
  return rows.map((row) => mapTag(row as Record<string, unknown>))
}

export async function createTag(data: { name: string; color?: string | null }): Promise<Tag | null> {
  const name = data.name.trim()
  if (!name) throw new Error('Tag name is required')
  const [inserted] = await getDb()
    .insert(tags)
    .values({ name, color: data.color ?? null })
    .returning()
  return inserted ? mapTag(inserted as Record<string, unknown>) : null
}

export async function updateTag(id: number, updates: { name?: string; color?: string | null }): Promise<Tag | null> {
  const set: Record<string, unknown> = {}
  if (updates.name !== undefined) {
    const name = updates.name.trim()
    if (!name) throw new Error('Tag name is required')
    set.name = name
  }
  if (updates.color !== undefined) set.color = updates.color
  if (Object.keys(set).length === 0) return null

  await getDb().update(tags).set(set).where(eq(tags.id, id))
  const [updated] = await getDb().select().from(tags).where(eq(tags.id, id))
  return updated ? mapTag(updated as Record<string, unknown>) : null
}

export async function deleteTag(id: number): Promise<boolean> {
  await getDb().delete(tags).where(eq(tags.id, id))
  return true
}

export async function getTagRelationships(): Promise<TagRelationship[]> {
  const rows = await getDb().select().from(tagRelationships)
  return rows.map((row) => mapTagRelationship(row as Record<string, unknown>))
}

export async function getTagTree(): Promise<ResolvedTagTreeResponse> {
  const allTags = await getTags()
  const relationships = await getTagRelationships()
  return {
    tags: allTags,
    relationships,
    tree: buildTagTree(allTags, relationships),
  }
}

export async function updateTagRelationships(input: TagRelationship[] | { relationships: TagRelationship[] }): Promise<ResolvedTagTreeResponse> {
  const relationships = Array.isArray(input) ? input : input.relationships
  const unique = new Map<string, TagRelationship>()

  for (const relationship of relationships) {
    if (
      Number.isInteger(relationship.parentTagId) &&
      Number.isInteger(relationship.childTagId) &&
      relationship.parentTagId > 0 &&
      relationship.childTagId > 0 &&
      relationship.parentTagId !== relationship.childTagId
    ) {
      unique.set(`${relationship.parentTagId}:${relationship.childTagId}`, relationship)
    }
  }

  await getDb().transaction(async (tx) => {
    await tx.delete(tagRelationships)
    const values = Array.from(unique.values()).map((relationship) => ({
      parentTagId: relationship.parentTagId,
      childTagId: relationship.childTagId,
      relationshipType: 'parent',
    }))
    if (values.length > 0) {
      await tx.insert(tagRelationships).values(values)
    }
  })

  return getTagTree()
}

export async function resolveTagInheritance(tagIds: number[]): Promise<ResolveTagInheritanceResponse> {
  const requestedTagIds = normalizeTagIds(tagIds)
  const relationships = await getTagRelationships()
  const resolvedTagIds = resolveInheritedTagIds(requestedTagIds, relationships)
  const allTags = await getTags()
  const tagById = new Map(allTags.map((tag) => [tag.id, tag]))

  return {
    requestedTagIds,
    resolvedTagIds,
    tags: resolvedTagIds.map((id) => tagById.get(id)).filter((tag): tag is Tag => tag !== undefined),
  }
}

export async function replaceEntryTags(entryId: number, tagIds?: number[], database: TagMutationDb = getDb()): Promise<void> {
  if (!Array.isArray(tagIds)) return
  const normalized = await validateReplacementTagIds(tagIds, database)
  if (!normalized) return
  await database.delete(entriesToTags).where(eq(entriesToTags.entryId, entryId))
  if (normalized.length === 0) return
  await database.insert(entriesToTags).values(normalized.map((tagId) => ({ entryId, tagId })))
}

export async function getEntryTagIds(entryIds: number[]): Promise<Map<number, number[]>> {
  const normalized = normalizeTagIds(entryIds)
  const result = new Map<number, number[]>()
  if (normalized.length === 0) return result

  const rows = await getDb()
    .select()
    .from(entriesToTags)
    .where(inArray(entriesToTags.entryId, normalized))

  for (const row of rows as Array<{ entryId: number; tagId: number }>) {
    const current = result.get(row.entryId) ?? []
    current.push(row.tagId)
    result.set(row.entryId, current)
  }

  return result
}
