export interface CorrelationResult {
  sourceTrackerId: number
  targetTrackerId: number
  offsetDays: number
  impact: number
  confidence: number
  baselineAvg: number
  impactedAvg: number
  triggeredDays: number
  baselineDays: number
}

export interface CorrelationMetadata {
  totalDays: number
  dataQuality: 'high' | 'medium' | 'low'
  hasSufficientData: boolean
  recommendedActions: string[]
}

export interface EnhancedCorrelationResult extends CorrelationResult {
  metadata: CorrelationMetadata
  insightType: 'positive_synergy' | 'destructive_interference' | 'neutral_correlation'
  userFriendlyConfidence: string
}

export interface CorrelationCalculationOptions {
  sourceTrackerId: number
  targetTrackerId: number
  offsetDays: number
  minSampleSize?: number
  confidenceThreshold?: number
}
