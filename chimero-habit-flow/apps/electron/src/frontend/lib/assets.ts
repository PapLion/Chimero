/**
 * Modelo de presentación de assets (único lugar para categorías UI + UIAsset).
 *
 * Persistencia / fuente de verdad de archivos: `Asset` en packages/db + disco userData/assets.
 */

import type { Asset } from '@packages/db'

export type AssetCategory = 'games' | 'books' | 'tv' | 'apps' | 'person' | 'other'
export type AssetType = 'svg' | 'png' | 'jpg' | 'gif' | 'webp' | 'other'

/** Maps DB Asset to UIAsset for frontend rendering */
export function toUIAsset(
  dbAsset: Asset & { assetUrl: string; thumbnailUrl?: string | null },
  category: AssetCategory
): UIAsset {
  return {
    id: String(dbAsset.id),
    name: dbAsset.originalName ?? dbAsset.filename,
    category,
    url: dbAsset.assetUrl,
    type: dbAsset.type as AssetType,
    size: dbAsset.size ?? undefined,
    createdAt: dbAsset.createdAt ?? Date.now(),
    thumbnailUrl: dbAsset.thumbnailUrl,
  }
}

/** UI Asset Model - presentation layer asset with resolved URLs */
export interface UIAsset {
  id: string
  name: string
  category: AssetCategory
  url: string
  type: AssetType
  size?: number
  createdAt: number
  thumbnailUrl?: string | null
}

/** Derive AssetCategory from file extension */
export function categoryFromExtension(filename: string): AssetCategory {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv']

  if (imageExts.includes(ext)) return 'person' // Default to person for images
  if (videoExts.includes(ext)) return 'tv'
  return 'other'
}