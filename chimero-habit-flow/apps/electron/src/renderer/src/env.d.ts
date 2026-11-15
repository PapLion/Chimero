import type { ElectronApi } from '@contracts/contracts'

declare global {
  interface Window {
    api: ElectronApi
  }
}

export {}
