import type { Asset } from '../../contracts/app-types'

export type AssetWithUrls = Asset & { assetUrl: string; thumbnailUrl: string }

export interface SaveAssetResult {
  filename: string
  originalName: string
  path: string
  type: 'image' | 'video'
  size: number
  thumbnailPath: string
}
