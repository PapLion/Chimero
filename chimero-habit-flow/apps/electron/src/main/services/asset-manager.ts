/**
 * Asset Manager: copies files to userData/assets with UUID names, deletes files.
 * No BLOBs in DB; only references on disk.
 */
import { copyFileSync, mkdirSync, unlinkSync, existsSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { randomUUID } from 'crypto';

const ASSETS_DIR = 'assets';

export interface SaveAssetResult {
  filename: string;
  originalName: string;
  path: string;
  type: 'image' | 'video';
  size: number;
  thumbnailPath: string;
}

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv']);

let sharpModule: typeof import('sharp') | null = null;

// Try to load sharp defensively. If it fails (e.g., platform build issue),
// we'll fall back to using the original asset as thumbnail to avoid crashes.
try {
  // Dynamic require for optional dependency; ES import would fail if sharp is missing
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sharpModule = require('sharp');
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[asset-manager] sharp not available, using original image as thumbnail.', e);
  sharpModule = null;
}

function inferType(filePath: string): 'image' | 'video' {
  const ext = extname(filePath).toLowerCase();
  if (IMAGE_EXT.has(ext)) return 'image';
  if (VIDEO_EXT.has(ext)) return 'video';
  return 'image';
}

/**
 * Copies file from sourcePath to userData/assets with a UUID filename.
 * Ensures assets dir exists. Returns metadata for DB insert.
 * Generates thumbnail synchronously to avoid race conditions.
 */
export async function saveFile(sourcePath: string, userDataPath: string): Promise<SaveAssetResult> {
  const assetsDir = join(userDataPath, ASSETS_DIR);
  if (!existsSync(assetsDir)) {
    mkdirSync(assetsDir, { recursive: true });
  }

  const ext = extname(sourcePath).toLowerCase() || '.bin';
  const filename = `${randomUUID()}${ext}`;
  const destPath = join(assetsDir, filename);
  copyFileSync(sourcePath, destPath);

  const size = statSync(destPath).size;
  const originalName = sourcePath.split(/[/\\]/).pop() ?? filename;
  const type = inferType(sourcePath);

  let thumbnailRelativePath = `${ASSETS_DIR}/${filename}`; // fallback: original file

  if (type === 'image' && sharpModule) {
    try {
      const thumbFilename = `${basename(filename, ext)}-thumb.webp`;
      const thumbPath = join(assetsDir, thumbFilename);

      // Generate a 300x300 thumbnail (fit inside, keep aspect ratio)
      // Await to ensure thumbnail is written before returning
      await sharpModule(destPath)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(thumbPath);

      thumbnailRelativePath = `${ASSETS_DIR}/${thumbFilename}`;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[asset-manager] sharp thumbnail generation failed, using original image.', err);
      thumbnailRelativePath = `${ASSETS_DIR}/${filename}`;
    }
  }

  // Use forward slashes for path so chimero-asset:// URLs work cross-platform
  return {
    filename,
    originalName,
    path: `${ASSETS_DIR}/${filename}`,
    type,
    size,
    thumbnailPath: thumbnailRelativePath,
  };
}

/**
 * Deletes the physical file at userDataPath/assets/relativePath.
 * Does not remove DB record (caller must delete from DB).
 */
export function deleteFile(userDataPath: string, relativePath: string): void {
  const fullPath = join(userDataPath, relativePath);
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
  }
}

/**
 * Returns absolute path for an asset (for Main process or file URL).
 */
export function getAssetAbsolutePath(userDataPath: string, relativePath: string): string {
  return join(userDataPath, relativePath);
}
