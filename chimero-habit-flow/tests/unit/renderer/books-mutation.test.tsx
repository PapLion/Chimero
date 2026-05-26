import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  createBookMock: vi.fn(),
}))

vi.mock('@shared/api', () => ({
  api: {
    createBook: mocks.createBookMock,
  },
}))

import { queryKeys, useCreateBookMutation } from '../../../apps/electron/src/renderer/src/shared/queries'

describe('Books mutations', () => {
  beforeEach(() => {
    mocks.createBookMock.mockReset()
  })

  it('invalidates the books surface after creating a structured book', async () => {
    mocks.createBookMock.mockResolvedValue({
      book: {
        id: 42,
        title: 'Want to Read smoke',
        titleKey: 'want to read smoke',
        shelf: 'tbr',
        status: 'planned',
        startedDate: null,
        finishedDate: null,
        ratingTenths: null,
        createdAt: 1,
        updatedAt: 1,
      },
    })

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const refetchSpy = vi.spyOn(client, 'refetchQueries')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useCreateBookMutation(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        title: 'Want to Read smoke',
        shelf: 'tbr',
        status: 'planned',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: queryKeys.booksRoot }))
    expect(refetchSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: queryKeys.entriesRoot, type: 'active' }))
  })
})
