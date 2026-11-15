import { useCallback } from 'react'
import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import type { AppPreferences, Tracker } from '@contracts/contracts'
import { DEFAULT_PREFERENCES } from '@contracts/contracts'
import { api, errorMessage } from './api'
import { toast } from '@/ui/toast'

/**
 * Read data through the bridge. Keys are `[name, ...args]`; after any write the
 * whole cache is invalidated — the dataset is one person's records, so
 * refetching what is on screen is cheap and can never show stale numbers.
 */
export function useData<T>(key: readonly unknown[], fetcher: () => Promise<T>, options?: Partial<UseQueryOptions<T>>) {
  return useQuery<T>({ queryKey: key, queryFn: fetcher, ...options })
}

export function useTrackers() {
  return useData(['trackers'], () => api.getTrackers())
}

export function useTracker(id: number | null | undefined): Tracker | undefined {
  const { data } = useTrackers()
  return data?.find((t) => t.id === id)
}

export function usePreferences(): AppPreferences {
  const { data } = useData(['preferences'], () => api.getPreferences())
  return data ?? DEFAULT_PREFERENCES
}

export function useTags() {
  return useData(['tags'], () => api.getTags())
}

export function useContacts() {
  return useData(['contacts'], () => api.getContacts({ sortBy: 'name' }))
}

export function useOverview(from: string, to: string) {
  return useData(['overview', from, to], () => api.getOverview({ from, to }))
}

export function useMetrics() {
  return useData(['metrics'], () => api.getMetrics())
}

/**
 * Run a write: awaits it, refreshes every query, and reports failure as a toast.
 * Resolves to the result, or undefined when it failed.
 */
export function useAction() {
  const client = useQueryClient()
  return useCallback(
    async <T,>(work: () => Promise<T>, messages?: { success?: string; failure?: string }): Promise<T | undefined> => {
      try {
        const result = await work()
        await client.invalidateQueries()
        if (messages?.success) toast.success(messages.success)
        return result
      } catch (error) {
        toast.error(messages?.failure ?? 'That did not save', errorMessage(error))
        return undefined
      }
    },
    [client],
  )
}
