/**
 * Asset Manager: copies files to userData/assets with UUID names, deletes files.
 * No BLOBs in DB; only references on disk.
 */
import { copyFileSync, mkdirSync, unlinkSync, existsSync, statSync } from 'fs'
import { join, extname, basename } from 'path'
import { randomUUID } from 'crypto'
import type { SaveAssetResult } from '@contracts/features/assets'

const ASSETS_DIR = 'assets'

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'])
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv'])

type SharpModule = typeof import('sharp')
let sharpModule: SharpModule | null | undefined

function getSharpModule(): SharpModule | null {
  if (sharpModule !== undefined) return sharpModule
  try {
    // Dynamic require for optional dependency; ES import would fail if sharp is missing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sharpModule = require('sharp') as SharpModule
  } catch {
    sharpModule = null
  }
  return sharpModule
}

function inferType(filePath: string): 'image' | 'video' {
  const ext = extname(filePath).toLowerCase()
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'
  return 'image'
}

export async function saveFile(sourcePath: string, userDataPath: string): Promise<SaveAssetResult> {
  const assetsDir = join(userDataPath, ASSETS_DIR)
  if (!existsSync(assetsDir)) {
    mkdirSync(assetsDir, { recursive: true })
  }

  const ext = extname(sourcePath).toLowerCase() || '.bin'
  const filename = `${randomUUID()}${ext}`
  const destPath = join(assetsDir, filename)
  copyFileSync(sourcePath, destPath)

  const size = statSync(destPath).size
  const originalName = sourcePath.split(/[/\\]/).pop() ?? filename
  const type = inferType(sourcePath)

  let thumbnailRelativePath = `${ASSETS_DIR}/${filename}`

  if (type === 'image') {
    const sharp = getSharpModule()
    if (sharp) {
      try {
        const thumbFilename = `${basename(filename, ext)}-thumb.webp`
        const thumbPath = join(assetsDir, thumbFilename)
        await sharp(destPath)
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(thumbPath)

        thumbnailRelativePath = `${ASSETS_DIR}/${thumbFilename}`
      } catch (err) {
        console.error('[asset-manager] sharp thumbnail generation failed, using original image.', err)
        thumbnailRelativePath = `${ASSETS_DIR}/${filename}`
      }
    }
  }

  return {
    filename,
    originalName,
    path: `${ASSETS_DIR}/${filename}`,
    type,
    size,
    thumbnailPath: thumbnailRelativePath,
  }
}

export function deleteFile(userDataPath: string, relativePath: string): void {
  const fullPath = join(userDataPath, relativePath)
  if (existsSync(fullPath)) {
    unlinkSync(fullPath)
  }
}

export function getAssetAbsolutePath(userDataPath: string, relativePath: string): string {
  return join(userDataPath, relativePath)
}
