import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { addDays, todayStr } from '@/lib/dates'
import { usePreferences } from '@/lib/queries'
import { useApp } from '@/lib/store'
import { Button } from '@/ui/primitives'
import { ToastHost, toast } from '@/ui/toast'
import { TitleBar } from '@/shell/TitleBar'
import { Sidebar } from '@/shell/Sidebar'
import { CommandPalette } from '@/shell/CommandPalette'
import { EntryDialog } from '@/features/entry/EntryDialog'
import { TodayPage } from '@/features/dashboard/TodayPage'
import { JournalPage } from '@/features/journal/JournalPage'
import { InsightsPage } from '@/features/insights/InsightsPage'
import { TrackersPage } from '@/features/trackers/TrackersPage'
import { TrackerPage } from '@/features/tracker/TrackerPage'
import { PeoplePage } from '@/features/people/PeoplePage'
import { TagsPage } from '@/features/tags/TagsPage'
import { RemindersPage } from '@/features/reminders/RemindersPage'
import { FilesPage } from '@/features/assets/FilesPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

function useTheme(): void {
  const { theme, accent } = usePreferences()
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme
      document.documentElement.dataset.accent = accent
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme, accent])
}

function useShortcuts(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const state = useApp.getState()
      const typing = event.target instanceof HTMLElement && (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))
      if (event.altKey && event.key.toLowerCase() === 'q') {
        event.preventDefault()
        // On a tracker page, log straight into that tracker.
        state.openEntry(state.route.page === 'tracker' ? { trackerId: state.route.id } : {})
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        state.setPaletteOpen(!state.paletteOpen)
        return
      }
      if ((event.ctrlKey || event.metaKey) && ['1', '2', '3'].includes(event.key)) {
        event.preventDefault()
        state.navigate({ page: (['today', 'journal', 'insights'] as const)[Number(event.key) - 1] })
        return
      }
      if (typing || state.entry || state.paletteOpen || document.querySelector('[role="dialog"]')) return
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        state.setSelectedDate(addDays(state.selectedDate, -1))
      } else if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        if (state.selectedDate < todayStr()) state.setSelectedDate(addDays(state.selectedDate, 1))
      } else if (event.altKey && event.key.toLowerCase() === 't') {
        event.preventDefault()
        state.setSelectedDate(todayStr())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function useReminderEvents(): void {
  const client = useQueryClient()
  useEffect(
    () =>
      api.onReminder((reminder) => {
        toast.info(reminder.title, 'Reminder')
        void client.invalidateQueries({ queryKey: ['reminders'] })
      }),
    [client],
  )
}

function Page() {
  const route = useApp((state) => state.route)
  switch (route.page) {
    case 'today':
      return <TodayPage />
    case 'journal':
      return <JournalPage />
    case 'insights':
      return <InsightsPage key={`${route.a}|${route.b}|${route.lagDays}`} initial={route} />
    case 'trackers':
      return <TrackersPage />
    case 'tracker':
      return <TrackerPage key={route.id} trackerId={route.id} />
    case 'people':
      return <PeoplePage initialId={route.id} />
    case 'tags':
      return <TagsPage />
    case 'reminders':
      return <RemindersPage />
    case 'files':
      return <FilesPage />
    case 'settings':
      return <SettingsPage />
  }
}

class PageBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack)
  }
  componentDidUpdate(previous: { resetKey: string }) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid h-full place-items-center p-10">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold">This page hit a problem</h2>
          <p className="mt-2 text-sm text-muted">Your data is untouched. Try the page again, or go back to Today.</p>
          <p className="selectable mt-3 rounded-lg bg-raised px-3 py-2 text-left text-xs text-faint">{this.state.error.message}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => this.setState({ error: null })}>Try again</Button>
            <Button variant="primary" onClick={() => useApp.getState().navigate({ page: 'today' })}>
              Go to Today
            </Button>
          </div>
        </div>
      </div>
    )
  }
}

export function App() {
  useTheme()
  useShortcuts()
  useReminderEvents()
  const route = useApp((state) => state.route)
  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-hidden">
          <PageBoundary resetKey={JSON.stringify(route)}>
            <Page />
          </PageBoundary>
        </main>
      </div>
      <EntryDialog />
      <CommandPalette />
      <ToastHost />
    </div>
  )
}
