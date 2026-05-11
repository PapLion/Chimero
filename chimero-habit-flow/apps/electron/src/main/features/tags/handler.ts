import { ipcMain } from 'electron'
import {
  createTag,
  deleteTag,
  getTags,
  getTagTree,
  resolveTagInheritance,
  updateTag,
  updateTagRelationships,
} from './service'
import type { TagRelationship } from '@contracts/contracts'

export function registerTagHandlers(): void {
  ipcMain.handle('get-tags', async () => {
    try {
      return await getTags()
    } catch (e) {
      console.error('get-tags error:', e)
      return []
    }
  })

  ipcMain.handle('create-tag', async (_, data: { name: string; color?: string | null }) => {
    try {
      return await createTag(data)
    } catch (e) {
      console.error('create-tag error:', e)
      return null
    }
  })

  ipcMain.handle('update-tag', async (_, id: number, updates: { name?: string; color?: string | null }) => {
    try {
      return await updateTag(id, updates)
    } catch (e) {
      console.error('update-tag error:', e)
      return null
    }
  })

  ipcMain.handle('delete-tag', async (_, id: number) => {
    try {
      return await deleteTag(id)
    } catch (e) {
      console.error('delete-tag error:', e)
      return false
    }
  })

  ipcMain.handle('get-tag-tree', async () => {
    try {
      return await getTagTree()
    } catch (e) {
      console.error('get-tag-tree error:', e)
      return { tags: [], relationships: [], tree: [] }
    }
  })

  ipcMain.handle('update-tag-relationships', async (_, input: TagRelationship[] | { relationships: TagRelationship[] }) => {
    try {
      return await updateTagRelationships(input)
    } catch (e) {
      console.error('update-tag-relationships error:', e)
      return { tags: [], relationships: [], tree: [] }
    }
  })

  ipcMain.handle('resolve-tag-inheritance', async (_, input: number[] | { tagIds: number[] }) => {
    try {
      const tagIds = Array.isArray(input) ? input : input.tagIds
      return await resolveTagInheritance(tagIds)
    } catch (e) {
      console.error('resolve-tag-inheritance error:', e)
      return { requestedTagIds: [], resolvedTagIds: [], tags: [] }
    }
  })
}
