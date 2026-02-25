"use client"

import { cn } from "../lib/utils"
import { Minus, Square, X } from "lucide-react"

export function TitleBar() {
  return (
    <div
      className={cn(
        "flex items-center justify-between h-8 px-3",
        "bg-sidebar border-b border-sidebar-border",
        "select-none"
      )}
    >
      {/* Window Controls (macOS style) */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer" />
        <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer" />
        <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 cursor-pointer" />
      </div>

      {/* Title */}
      <div className="absolute left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground">
        Chimero Habit Flow
      </div>

      {/* Windows style controls (alternative) */}
      <div className="hidden items-center gap-0.5">
        <button className="p-1.5 hover:bg-muted rounded transition-colors">
          <Minus className="w-3 h-3 text-muted-foreground" />
        </button>
        <button className="p-1.5 hover:bg-muted rounded transition-colors">
          <Square className="w-3 h-3 text-muted-foreground" />
        </button>
        <button className="p-1.5 hover:bg-destructive rounded transition-colors group">
          <X className="w-3 h-3 text-muted-foreground group-hover:text-destructive-foreground" />
        </button>
      </div>
    </div>
  )
}
