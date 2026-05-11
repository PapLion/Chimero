"use client"

import { Activity, Zap } from "lucide-react"
import { cn } from "@shared/utils"
import { CyberpunkSelect } from "./CyberpunkSelect"

interface HypothesisBuilderProps {
  trackers: Array<{ id: number; name: string }>
  sourceTracker: number | null
  targetTracker: number | null
  offsetDays: number
  onSourceChange: (id: number | null) => void
  onTargetChange: (id: number | null) => void
  onOffsetChange: (days: number) => void
  onCalculate: () => void
  isCalculating: boolean
  disabled: boolean
  error?: string | null
}

export function HypothesisBuilder({
  trackers,
  sourceTracker,
  targetTracker,
  offsetDays,
  onSourceChange,
  onTargetChange,
  onOffsetChange,
  onCalculate,
  isCalculating,
  disabled,
  error
}: HypothesisBuilderProps) {
  return (
    <div className="surface-panel rounded-3xl p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(266_73%_63%/0.22)] to-[hsl(187_84%_44%/0.14)]">
          <Activity className="h-5 w-5 text-[hsl(266_73%_63%)]" />
        </div>
        <div className="min-w-0">
          <div className="section-kicker">Hypothesis Builder</div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[hsl(220_12%_58%)]">
            Pick two habits and a lag.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="section-kicker">Source habit</div>
            <CyberpunkSelect
              value={sourceTracker}
              onValueChange={(value) => onSourceChange(value === null ? null : Number(value))}
              options={trackers.map(tracker => ({ value: tracker.id, label: tracker.name }))}
              placeholder="Select source"
              className="w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="section-kicker">Lag</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onOffsetChange(0)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-95",
                  offsetDays === 0
                    ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%)] text-white shadow-lg shadow-primary/20"
                    : "border-white/8 bg-white/[0.04] text-[hsl(210_28%_97%)] hover:border-white/12 hover:bg-white/[0.06]"
                )}
              >
                Same day
              </button>
              <button
                onClick={() => onOffsetChange(1)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-95",
                  offsetDays === 1
                    ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%)] text-white shadow-lg shadow-primary/20"
                    : "border-white/8 bg-white/[0.04] text-[hsl(210_28%_97%)] hover:border-white/12 hover:bg-white/[0.06]"
                )}
              >
                Next day
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="section-kicker">Target habit</div>
            <CyberpunkSelect
              value={targetTracker}
              onValueChange={(value) => onTargetChange(value === null ? null : Number(value))}
              options={trackers.map(tracker => ({ value: tracker.id, label: tracker.name }))}
              placeholder="Select target"
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-3 lg:min-w-[220px]">
          <button
            onClick={onCalculate}
            disabled={disabled || isCalculating}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-medium transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-95",
              !disabled && !isCalculating
                ? "bg-[hsl(266_73%_63%)] text-white shadow-lg shadow-primary/20 hover:bg-[hsl(266_73%_58%)]"
                : "cursor-not-allowed bg-white/[0.05] text-[hsl(220_12%_58%)] opacity-60"
            )}
          >
            {isCalculating ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Run analysis
              </>
            )}
          </button>

          {error && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
              <p className="text-sm leading-6 text-rose-200">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
