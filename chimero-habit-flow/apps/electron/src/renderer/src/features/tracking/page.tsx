"use client"

import { useState, useMemo, useEffect } from "react"
import { memo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useTrackers } from "@shared/queries"
import { Brain } from "lucide-react"
import { HypothesisBuilder } from "./components/HypothesisBuilder"
import { CorrelationResultCard } from "./components/CorrelationResultCard"
import { EmptyState } from "./components/EmptyState"
import { MemoizedChart } from "./components/MemoizedChart"
import { useCorrelationCalculation } from "./hooks/useCorrelationCalculation"

function StatsPageComponent() {
  const { data: trackers = [] } = useTrackers()
  const [sourceTracker, setSourceTracker] = useState<number | null>(null)
  const [targetTracker, setTargetTracker] = useState<number | null>(null)
  const [offsetDays, setOffsetDays] = useState(0)
  
  const { result, isCalculating, error, calculateCorrelation, cleanup } = useCorrelationCalculation()

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  const resultKey = result
    ? `${result.sourceTrackerId}-${result.targetTrackerId}-${offsetDays}`
    : "empty-state"

  const handleCalculate = () => {
    if (sourceTracker && targetTracker) {
      calculateCorrelation(sourceTracker, targetTracker, offsetDays)
    }
  }

  // Memoized chart data to prevent re-renders - only depends on specific values
  const chartData = useMemo(() => {
    if (!result) return []
    
    const { baselineAvg, impactedAvg, impact } = result
    
    return [
      {
        name: "Baseline",
        value: baselineAvg,
        fill: "#64748b"
      },
      {
        name: "Impacted", 
        value: impactedAvg,
        fill: impact > 10 ? "#10b981" : impact < -10 ? "#f43f5e" : "#3b82f6"
      }
    ]
  }, [result])

  return (
    <div className="space-y-8">
      <div className="surface-panel rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(266_73%_63%/0.24)] to-[hsl(187_84%_44%/0.18)]">
            <Brain className="h-6 w-6 text-[hsl(266_73%_63%)]" />
          </div>
          <div className="min-w-0">
            <div className="section-kicker">Insight Lab</div>
            <h1 className="page-title mt-1 text-[2.35rem]">The Butterfly Effect Engine</h1>
            <p className="page-subtitle mt-2 max-w-2xl">Compare two habits and read the signal.</p>
          </div>
        </div>
      </div>

      {/* Hypothesis Builder */}
      <HypothesisBuilder
        trackers={trackers}
        sourceTracker={sourceTracker}
        targetTracker={targetTracker}
        offsetDays={offsetDays}
        onSourceChange={setSourceTracker}
        onTargetChange={setTargetTracker}
        onOffsetChange={setOffsetDays}
        onCalculate={handleCalculate}
        isCalculating={isCalculating}
        disabled={!sourceTracker || !targetTracker}
        error={error}
      />

      {/* Results */}
      <AnimatePresence mode="wait" initial={false}>
        {result ? (
          <motion.div
            key={resultKey}
            className="space-y-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Correlation Result Card */}
            <CorrelationResultCard result={result} trackers={trackers} />

            {/* Chart */}
            <div className="surface-panel rounded-3xl p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-[hsl(210_28%_97%)]">Comparison</h3>
                  <p className="mt-1 text-sm text-[hsl(220_12%_58%)]">Baseline vs triggered averages.</p>
                </div>
              </div>
              <div className="h-64">
                <MemoizedChart data={chartData} />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={resultKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <EmptyState
              hasTrackers={trackers.length > 0}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
const StatsPage = memo(StatsPageComponent)
StatsPage.displayName = 'StatsPage'

export default StatsPage
