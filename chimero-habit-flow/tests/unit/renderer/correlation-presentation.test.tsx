import "@testing-library/jest-dom/vitest"
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CorrelationResultCard } from '../../../apps/electron/src/renderer/src/features/tracking/components/CorrelationResultCard'
import type { EnhancedCorrelationResult } from '../../../apps/electron/src/renderer/src/features/tracking/types/correlation'

const result: EnhancedCorrelationResult = {
  sourceTrackerId: 1, targetTrackerId: 2, offsetDays: 0, impact: 25, confidence: 100,
  baselineAvg: 4, impactedAvg: 5, triggeredDays: 20, baselineDays: 20,
  insightType: 'positive_synergy', userFriendlyConfidence: '100% confidence',
  metadata: {totalDays: 40, dataQuality: 'high', hasSufficientData: true, recommendedActions: []},
}
const trackers = [{id:1,name:'Walking'},{id:2,name:'Mood'}]
describe('exploratory result presentation', () => {
  it('labels the heuristic as coverage rather than statistical confidence', () => {
    render(<CorrelationResultCard result={result} trackers={trackers} />)
    expect(screen.getByText('Data coverage score')).toBeInTheDocument()
    expect(screen.getByText('100 / 100')).toBeInTheDocument()
    expect(screen.queryByText('100% confidence')).not.toBeInTheDocument()
    expect(screen.getByText(/not statistical confidence/)).toBeInTheDocument()
  })
  it('does not display a numeric change without a recorded baseline', () => {
    render(<CorrelationResultCard result={{...result, baselineDays:0, baselineAvg:0}} trackers={trackers} />)
    expect(screen.getByText('No comparison')).toBeInTheDocument()
    expect(screen.queryByText('+25%')).not.toBeInTheDocument()
  })
})
