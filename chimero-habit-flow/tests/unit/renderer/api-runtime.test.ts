import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('renderer API runtime selection', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    delete (window as Window & { api?: unknown }).api
  })

  it('uses the Electron preload API when window.api is available', async () => {
    const electronApi = {
      getTrackers: vi.fn().mockResolvedValue([]),
    }
    ;(window as Window & { api?: unknown }).api = electronApi

    const { api } = await import('../../../apps/electron/src/renderer/src/shared/api')

    expect(api).toBe(electronApi)
    await expect(api.getTrackers()).resolves.toEqual([])
    expect(electronApi.getTrackers).toHaveBeenCalledOnce()
  })

  it('falls back to same-origin HTTP when Electron preload is unavailable', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([{ id: 1, name: 'Weight' }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { api } = await import('../../../apps/electron/src/renderer/src/shared/api')

    await expect(api.getTrackers()).resolves.toEqual([{ id: 1, name: 'Weight' }])
    expect(fetchMock).toHaveBeenCalledWith('/api/trackers', expect.objectContaining({ method: 'GET' }))
  })

  it('reports native file dialogs as unsupported in browser mode', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const { api } = await import('../../../apps/electron/src/renderer/src/shared/api')

    await expect(api.openFileDialog()).rejects.toThrow('Native file dialogs are only available in Electron')
  })
})
