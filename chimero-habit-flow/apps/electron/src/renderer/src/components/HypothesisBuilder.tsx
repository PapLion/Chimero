"use client"

import { Activity, Zap } from "lucide-react"
import { cn } from "../lib/utils"
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
    <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[hsl(266_73%_63%/0.2)] flex items-center justify-center">
          <Activity className="w-5 h-5 text-[hsl(266_73%_63%)]" />
        </div>
        <span className="text-sm font-mono text-[hsl(210_12%_47%)] uppercase tracking-wider">
          Hypothesis Builder
        </span>
      </div>

      {/* Hypothesis Builder Interface */}
      <div className="space-y-4">
        {/* Mobile-friendly layout */}
        <div className="flex flex-wrap items-center gap-3 text-lg">
          <span className="text-[hsl(210_25%_97%)] font-medium">IF I DO...</span>
          
          <CyberpunkSelect
            value={sourceTracker}
            onValueChange={(value) => onSourceChange(value === null ? null : Number(value))}
            options={trackers.map(tracker => ({ value: tracker.id, label: tracker.name }))}
            placeholder="Select Source"
            className="min-w-0 flex-1 sm:flex-initial"
          />

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[hsl(210_25%_97%)] font-medium">...AND WAIT</span>
            
            <div className="flex gap-2">
              <button
                onClick={() => onOffsetChange(0)}
                className={cn(
                  "px-3 py-1 rounded-lg border font-mono text-sm transition-all",
                  "hover:scale-105 active:scale-95 transform",
                  offsetDays === 0 
                    ? "bg-[hsl(266_73%_63%)] text-white border-[hsl(266_73%_63%)] shadow-[hsl(266_73%_63%)/20] shadow-lg"
                    : "bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_20%)]"
                )}
              >
                Same Day
              </button>
              <button
                onClick={() => onOffsetChange(1)}
                className={cn(
                  "px-3 py-1 rounded-lg border font-mono text-sm transition-all",
                  "hover:scale-105 active:scale-95 transform",
                  offsetDays === 1 
                    ? "bg-[hsl(266_73%_63%)] text-white border-[hsl(266_73%_63%)] shadow-[hsl(266_73%_63%)/20] shadow-lg"
                    : "bg-[hsl(210_20%_15%)] border-[hsl(210_18%_22%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_20%)]"
                )}
              >
                Next Day
              </button>
            </div>
          </div>

          <span className="text-[hsl(210_25%_97%)] font-medium">...THEN</span>
          
          <CyberpunkSelect
            value={targetTracker}
            onValueChange={(value) => onTargetChange(value === null ? null : Number(value))}
            options={trackers.map(tracker => ({ value: tracker.id, label: tracker.name }))}
            placeholder="Select Target"
            className="min-w-0 flex-1 sm:flex-initial"
          />

          <span className="text-[hsl(210_25%_97%)] font-medium">IS...</span>
        </div>

        {/* Calculate Button */}
        <button
          onClick={onCalculate}
          disabled={disabled || isCalculating}
          className={cn(
            "w-full sm:w-auto px-6 py-3 rounded-lg font-mono transition-all flex items-center justify-center gap-2",
            "hover:scale-105 active:scale-95 transform",
            !disabled && !isCalculating
              ? "bg-[hsl(266_73%_63%)] text-white hover:bg-[hsl(266_73%_58%)] shadow-[hsl(266_73%_63%)/20] shadow-lg"
              : "bg-[hsl(210_20%_15%)] text-[hsl(210_12%_47%)] cursor-not-allowed opacity-50"
          )}
        >
          {isCalculating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Calculate Impact
            </>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
            <p className="text-sm text-rose-400 font-mono">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
