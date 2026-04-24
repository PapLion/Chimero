/**
 * Acceso tipado a `window.api` (contrato en packages/shared).
 */
import type { ChimeroElectronApi } from 'shared'

declare global {
  interface Window {
    api: ChimeroElectronApi
  }
}

export const api: ChimeroElectronApi = typeof window !== 'undefined' ? window.api : ({} as ChimeroElectronApi)
