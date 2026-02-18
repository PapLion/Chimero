import { useState, useCallback, useRef } from "react"
import type { EnhancedCorrelationResult } from "../types/correlation"

// Type guard for window API
const hasCalculateImpactAPI = (window: Window & { api?: { calculateImpact?: (sourceTrackerId: number, targetTrackerId: number, offsetDays: number) => Promise<EnhancedCorrelationResult | Partial<EnhancedCorrelationResult>> } }): window is Window & { api: { calculateImpact: (sourceTrackerId: number, targetTrackerId: number, offsetDays: number) => Promise<EnhancedCorrelationResult | Partial<EnhancedCorrelationResult>> } } => {
  return !!(window?.api?.calculateImpact && typeof window.api.calculateImpact === 'function')
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
      // Validate API exists before calling
      if (!hasCalculateImpactAPI(window)) {
        throw new Error('Correlation API not available')
      }
      
      // Check if calculation was aborted
      if (newController.signal.aborted) {
        return
      }
      
      const correlation = await window.api.calculateImpact(
        sourceTrackerId, 
        targetTrackerId, 
        offsetDays
      )
      
      // Only set result if not aborted and result is complete
      if (!newController.signal.aborted && correlation && 'metadata' in correlation) {
        setResult(correlation as EnhancedCorrelationResult)
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
