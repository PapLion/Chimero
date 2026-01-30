"use client"

import { Sidebar } from "./components/sidebar"
import { BentoGrid } from "./components/bento-grid"
import { QuickEntry } from "./components/quick-entry"
import { FloatingActionButton } from "./components/floating-action-button"
import { TitleBar } from "./components/title-bar"
import { Header } from "./components/header"
import { cn } from "./lib/utils"

export default function ChimeroApp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
      {/* Simulated Electron Window */}
      <div
        className={cn(
          "mx-auto max-w-[1400px] min-h-screen",
          "md:my-8 md:min-h-[calc(100vh-64px)] md:rounded-xl",
          "overflow-hidden",
          "border border-border/50",
          "shadow-2xl shadow-black/50",
          "flex flex-col"
        )}
      >
        {/* macOS-style Title Bar */}
        <TitleBar />

        {/* Main App Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <Header />

            {/* Dashboard Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <BentoGrid />
            </div>
          </main>
        </div>
      </div>

      {/* Quick Entry Command Bar */}
      <QuickEntry />

      {/* Floating Action Button */}
      <FloatingActionButton />

      {/* Keyboard Shortcut Hint */}
      <div className="fixed bottom-6 left-6 hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-2 rounded-lg border border-border">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘K</kbd>
        <span>Quick Entry</span>
      </div>
    </div>
  )
}
