import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAppStore } from '@shared/store'
import { Sidebar } from '../../../apps/electron/src/renderer/src/features/dashboard/components/Sidebar'

vi.mock('@shared/queries', () => ({
  useTrackers: () => ({ data: [{ id: 42, name: 'Reading', icon: 'book' }] }),
  useStats: () => ({ data: { currentStreak: 3 } }),
}))

describe('sidebar navigation', () => {
  beforeEach(() => useAppStore.setState({ currentPage: 'home', activeTracker: null, sidebarCollapsed: false }))

  it('collapses and expands the rail without losing navigation labels', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(useAppStore.getState().sidebarCollapsed).toBe(true)
    expect(screen.getByRole('button', { name: 'Reading' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    expect(useAppStore.getState().sidebarCollapsed).toBe(false)
  })

  it('opens tracker detail and clears the tracker selection when navigating away', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'Reading' }))
    expect(useAppStore.getState().activeTracker).toBe(42)
    expect(screen.getByRole('button', { name: 'Reading' }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }))
    expect(useAppStore.getState().activeTracker).toBeNull()
    expect(useAppStore.getState().currentPage).toBe('calendar')
  })
})
