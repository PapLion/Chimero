/**
 * Asset Manager: copies files to userData/assets with UUID names, deletes files.
 * No BLOBs in DB; only references on disk.
 */
import { copyFileSync, mkdirSync, unlinkSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const ASSETS_DIR = 'assets';

export interface SaveAssetResult {
  filename: string;
  originalName: string;
  path: string;
  type: 'image' | 'video';
  size: number;
}

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv']);

function inferType(filePath: string): 'image' | 'video' {
  const ext = extname(filePath).toLowerCase();
  if (IMAGE_EXT.has(ext)) return 'image';
  if (VIDEO_EXT.has(ext)) return 'video';
  return 'image';
}

/**
 * Copies file from sourcePath to userData/assets with a UUID filename.
 * Ensures assets dir exists. Returns metadata for DB insert.
 */
export function saveFile(sourcePath: string, userDataPath: string): SaveAssetResult {
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

  // Use forward slashes for path so chimero-asset:// URLs work cross-platform
  return {
    filename,
    originalName,
    path: `${ASSETS_DIR}/${filename}`,
    type,
    size,
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
