"use client"

import { Sidebar } from "./components/sidebar"
import { BentoGrid } from "./components/bento-grid"
import { QuickEntry } from "./components/quick-entry"
import { FloatingActionButton } from "./components/floating-action-button"
import { CalendarPage } from "./pages/CalendarPage"
import { AssetsPage } from "./pages/AssetsPage"
import { useAppStore } from "./lib/store"

export default function ChimeroApp() {
  const { currentPage } = useAppStore()

  const renderPage = () => {
    switch (currentPage) {
      case "calendar":
        return <CalendarPage />
      case "assets":
        return <AssetsPage />
      case "home":
      default:
        return <BentoGrid />
    }
  }

  return (
    <div className="h-screen bg-[hsl(210_35%_7%)]">
      {/* Main App Layout */}
      <div className="flex h-full overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Dashboard Content */}
          <div className="flex-1 overflow-y-auto p-8">
            {renderPage()}
          </div>
        </main>
      </div>

      {/* Quick Entry Command Bar */}
      <QuickEntry />

      {/* Floating Action Button */}
      <FloatingActionButton />

      {/* Keyboard Shortcut Hint */}
      <div className="fixed bottom-6 left-[272px] hidden md:flex items-center gap-2 text-xs text-[hsl(210_12%_47%)] bg-[hsl(210_25%_11%)] backdrop-blur-md px-3 py-2 rounded-lg border border-[hsl(210_18%_22%)]">
        <kbd className="px-1.5 py-0.5 bg-[hsl(210_20%_15%)] rounded text-[10px] font-mono text-[hsl(210_25%_97%)]">⌘K</kbd>
        <span>Quick Entry</span>
      </div>
    </div>
  )
}
