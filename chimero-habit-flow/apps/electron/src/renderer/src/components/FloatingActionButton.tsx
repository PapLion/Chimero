"use client"

import { useAppStore } from "../lib/store"
import { Plus } from "lucide-react"
import { cn } from "../lib/utils"

export function FloatingActionButton() {
  const { setQuickEntryOpen, isQuickEntryOpen } = useAppStore()

  return (
    <button
      onClick={() => setQuickEntryOpen(!isQuickEntryOpen)}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "w-14 h-14 rounded-full",
        "bg-primary text-primary-foreground",
        "flex items-center justify-center",
        "shadow-lg shadow-primary/25",
        "hover:scale-105 active:scale-95",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      )}
      aria-label="Quick entry"
    >
      <Plus className="w-6 h-6" />
    </button>
  )
}
