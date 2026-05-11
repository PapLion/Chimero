import { useState, useCallback, useRef } from "react"
import type { EnhancedCorrelationResult } from "../types/correlation"
import type { CorrelationResultResponse } from "@contracts/contracts"
import { api } from "@shared/api"

function toEnhancedCorrelationResult(result: CorrelationResultResponse): EnhancedCorrelationResult {
  const totalSamples = result.triggeredDays + result.baselineDays
  const cohortBalance = result.triggeredDays > 0 && result.baselineDays > 0
    ? Math.min(result.triggeredDays, result.baselineDays) / Math.max(result.triggeredDays, result.baselineDays)
    : 0
  const dataQuality = totalSamples >= 30 && cohortBalance >= 0.3
    ? 'high'
    : totalSamples >= 15 && cohortBalance >= 0.2
      ? 'medium'
      : 'low'
  const hasSufficientData = totalSamples >= 5 && dataQuality !== 'low'
  const insightType: EnhancedCorrelationResult['insightType'] =
    Math.abs(result.impact) > 10 && result.confidence > 30
      ? result.impact > 0 ? 'positive_synergy' : 'destructive_interference'
      : 'neutral_correlation'

  const recommendations = hasSufficientData
    ? [result.caveat]
    : ['Continue tracking for more reliable insights', result.caveat]

  return {
    sourceTrackerId: result.sourceTrackerId,
    targetTrackerId: result.targetTrackerId,
    offsetDays: result.offsetDays,
    impact: result.impact,
    confidence: result.confidence,
    baselineAvg: result.baselineAvg,
    impactedAvg: result.impactedAvg,
    triggeredDays: result.triggeredDays,
    baselineDays: result.baselineDays,
    metadata: {
      totalDays: totalSamples,
      dataQuality,
      hasSufficientData,
      recommendedActions: recommendations,
    },
    insightType,
    userFriendlyConfidence: `${result.confidence}% confidence (${totalSamples} samples)`,
  }
}

export function useCorrelationCalculation() {
  const [result, setResult] = useState<EnhancedCorrelationResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const calculateCorrelation = useCallback(async (
    sourceTrackerId: number,
    targetTrackerId: number,
    offsetDays: number
  ) => {
    // Abort any existing calculation first
    const oldController = abortControllerRef.current
    if (oldController) {
      oldController.abort()
    }

    // Create new abort controller for this calculation
    const newController = new AbortController()
    abortControllerRef.current = newController

    setIsCalculating(true)
    setError(null)
    
    try {
      // Check if calculation was aborted
      if (newController.signal.aborted) {
        return
      }
      
      const correlation = await api.getCorrelationResult({
        sourceTrackerId,
        targetTrackerId,
        offsetDays,
      })
      
      // Only set result if not aborted and result is complete
      if (!newController.signal.aborted && correlation) {
        setResult(toEnhancedCorrelationResult(correlation))
      }
    } catch (err) {
      // Only set error if not aborted
      if (!newController.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : 'Calculation failed'
        setError(errorMessage)
        console.error("Failed to calculate correlation:", err)
      }
    } finally {
      // Only update loading state if not aborted
      if (!newController.signal.aborted) {
        setIsCalculating(false)
      }
    }
  }, [])

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setResult(null)
    setError(null)
    setIsCalculating(false)
  }, [])

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return { 
    result, 
    isCalculating, 
    error, 
    calculateCorrelation,
    reset,
    cleanup
  }
}
