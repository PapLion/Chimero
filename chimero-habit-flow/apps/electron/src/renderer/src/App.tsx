"use client"

import { Sidebar } from "@features/dashboard/components/Sidebar"
import { Header } from "@features/dashboard/components/Header"
import { BentoGrid } from "@features/dashboard/components/BentoGrid"
import { QuickEntry } from "@features/entry/components/QuickEntry"
import { FloatingActionButton } from "@shared/components/FloatingActionButton"
import { NotificationsModal } from "@features/reminders/modals/NotificationsModal"
import { CalendarPage } from "@features/calendar/page"
import { AssetsPage } from "@features/assets/page"
import { CustomTrackersPage } from "@features/trackers/page"
import StatsPage from "@features/tracking/page"
import { ContactsPage, ContactProfilePage } from "@features/contacts/page"
import { ExerciseDownloadToast } from "@features/exercises/components/ExerciseDownloadToast"
import { useAppStore } from "@shared/store"
import { ToastHost } from "@shared/components/ToastHost"
import { ToastProvider } from "@shared/components/toast"

export default function ChimeroApp() {
  const { currentPage } = useAppStore()

  const renderPage = () => {
    switch (currentPage) {
      case "calendar":
        return <CalendarPage />
      case "assets":
        return <AssetsPage />
      case "custom-trackers":
        return <CustomTrackersPage />
      // NEW CASE
      case "stats":
        return <StatsPage />
      case "contacts":
        return <ContactsPage />
      case "contact":
        return <ContactProfilePage />
      case "home":
      default:
        return <BentoGrid />
    }
  }

  return (
    <ToastProvider>
      <div className="app-shell relative h-[100dvh] overflow-hidden">
        {/* Main App Layout */}
        <div className="relative z-10 flex h-full min-w-0 overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {/* Header */}
            <Header />

            {/* Dashboard Content */}
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6 lg:px-8 lg:py-7">
              {renderPage()}
            </div>
          </main>
        </div>

        {/* Quick Entry Command Bar */}
        <QuickEntry />

        {/* Notifications Modal */}
        <NotificationsModal />

        {/* Floating Action Button */}
        <FloatingActionButton />

        {/* Keyboard Shortcut Hint */}
        <div className="surface-chip shell-interactive fixed bottom-6 left-[calc(var(--dashboard-sidebar-width)+1rem)] z-50 hidden items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] md:flex">
          <kbd className="rounded-md border border-[hsl(var(--border)/0.75)] bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[hsl(var(--foreground))]">
            Alt+Q
          </kbd>
          <span>Quick Entry</span>
        </div>

        {/* Exercise Download Toast */}
        <ExerciseDownloadToast />

        <ToastHost />
      </div>
    </ToastProvider>
  )
}
