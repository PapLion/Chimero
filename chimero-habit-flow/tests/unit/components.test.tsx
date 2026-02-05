import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Header } from '../../apps/electron/src/renderer/src/components/header'

vi.mock('../../apps/electron/src/renderer/src/lib/store', () => ({
  useAppStore: () => ({
    activeTracker: null,
    toggleNotifications: vi.fn(),
    selectedDate: new Date(),
    goToPreviousDay: vi.fn(),
    goToNextDay: vi.fn(),
    goToToday: vi.fn(),
  }),
}))

vi.mock('../../apps/electron/src/renderer/src/lib/queries', () => ({
  useTrackers: () => ({ data: [] }),
  useStats: () => ({ data: { totalActivities: 0, totalEntriesMonth: 0 } }),
}))


function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders and shows Activities label', () => {
    render(
      <Wrapper>
        <Header />
      </Wrapper>
    )
    expect(screen.getByText('Activities')).toBeInTheDocument()
  })

  it('shows Entries this month', () => {
    render(
      <Wrapper>
        <Header />
      </Wrapper>
    )
    expect(screen.getByText('Entries this month')).toBeInTheDocument()
  })
})
