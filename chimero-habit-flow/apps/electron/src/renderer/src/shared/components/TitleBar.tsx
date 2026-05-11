"use client"

import { cn } from "@shared/utils"
import { Minus, Square, X } from "lucide-react"

export function TitleBar() {
  return (
    <div
      className={cn(
        "drag-region relative flex h-9 select-none items-center justify-between px-4",
        "border-b border-[hsl(var(--border)/0.52)] bg-[hsl(var(--background)/0.9)] backdrop-blur-xl",
        "shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 cursor-pointer rounded-full bg-red-500/90 transition-all duration-150 ease-out hover:scale-110 hover:bg-red-500" />
        <div className="h-3 w-3 cursor-pointer rounded-full bg-amber-400/90 transition-all duration-150 ease-out hover:scale-110 hover:bg-amber-400" />
        <div className="h-3 w-3 cursor-pointer rounded-full bg-emerald-400/90 transition-all duration-150 ease-out hover:scale-110 hover:bg-emerald-400" />
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/55">
        Chimero Habit Flow
      </div>

      <div className="hidden items-center gap-0.5">
        <button className="shell-interactive rounded-md p-1.5 hover:bg-white/5">
          <Minus className="h-3 w-3 text-white/45" />
        </button>
        <button className="shell-interactive rounded-md p-1.5 hover:bg-white/5">
          <Square className="h-3 w-3 text-white/45" />
        </button>
        <button className="shell-interactive group rounded-md p-1.5 hover:bg-rose-500/10">
          <X className="h-3 w-3 text-white/45 group-hover:text-rose-300" />
        </button>
      </div>
    </div>
  )
}
