"use client"

import { useAppStore } from "@shared/store"
import { Plus } from "lucide-react"
import { cn } from "@shared/utils"

export function FloatingActionButton() {
  const { setQuickEntryOpen, isQuickEntryOpen } = useAppStore()

  return (
    <button
      onClick={() => setQuickEntryOpen(!isQuickEntryOpen)}
      className={cn(
        "shell-interactive fixed bottom-6 right-6 z-50",
        "flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--border)/0.7)]",
        "bg-[hsl(var(--primary))] text-white shadow-[0_18px_40px_hsl(var(--primary)/0.26)]",
        "hover:border-[hsl(var(--border)/0.8)] hover:bg-[hsl(var(--primary)/0.92)] hover:shadow-[0_20px_44px_hsl(var(--primary)/0.3)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
      )}
      aria-label="Quick entry"
    >
      <Plus className="w-6 h-6" />
    </button>
  )
}
