import type { ElectronApi } from '@contracts/contracts'

/** The typed IPC bridge exposed by the preload script. */
export const api: ElectronApi = window.api

/** Turn the bridge's "null means it failed" convention into a thrown error. */
export async function must<T>(promise: Promise<T | null | undefined | false>, failure: string): Promise<T> {
  const result = await promise
  if (result === null || result === undefined || result === false) throw new Error(failure)
  return result as T
}

export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  // Electron prefixes rejected invocations with the channel name.
  return raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return `chimero-asset://local/${path.replace(/^\/+/, '')}`
}
