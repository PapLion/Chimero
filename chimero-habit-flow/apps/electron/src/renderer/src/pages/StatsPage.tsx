"use client"

import { useState, useMemo, useEffect } from "react"
import { memo } from "react"
import { useTrackers } from "../lib/queries"
import { Brain } from "lucide-react"
import { HypothesisBuilder } from "../components/HypothesisBuilder"
import { CorrelationResultCard } from "../components/CorrelationResultCard"
import { EmptyState } from "../components/EmptyState"
import { MemoizedChart } from "../components/MemoizedChart"
import { useCorrelationCalculation } from "../hooks/useCorrelationCalculation"

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
    <div className="min-h-screen bg-[hsl(210_35%_7%)] p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-[hsl(266_73%_63%/0.2)]">
            <Brain className="w-6 h-6 text-[hsl(266_73%_63%)]" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-[hsl(210_25%_97%)]">Insight Lab</h1>
            <p className="text-sm text-[hsl(210_12%_47%)]">The Butterfly Effect Engine</p>
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
      {result && (
        <div className="space-y-8">
          {/* Correlation Result Card */}
          <CorrelationResultCard result={result} trackers={trackers} />

          {/* Chart */}
          <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-[hsl(210_25%_97%)] mb-4">Cohort Comparison</h3>
            <div className="h-64">
              <MemoizedChart data={chartData} />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && (
        <EmptyState 
          hasTrackers={trackers.length > 0}
        />
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
const StatsPage = memo(StatsPageComponent)
StatsPage.displayName = 'StatsPage'

export default StatsPage
