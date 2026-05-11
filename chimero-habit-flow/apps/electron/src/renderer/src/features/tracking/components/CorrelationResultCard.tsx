"use client"

import { TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react"
import { cn } from "@shared/utils"
import type { EnhancedCorrelationResult } from "../types/correlation"

interface CorrelationResultCardProps {
  result: EnhancedCorrelationResult
  trackers: Array<{ id: number; name: string }>
}

export function CorrelationResultCard({ result, trackers }: CorrelationResultCardProps) {
  const getImpactStyle = (impact: number) => {
    if (impact > 10) {
      return {
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        glow: "shadow-emerald-500/20",
        icon: TrendingUp
      }
    } else if (impact < -10) {
      return {
        color: "text-rose-400",
        bg: "bg-rose-500/10", 
        border: "border-rose-500/30",
        glow: "shadow-rose-500/20",
        icon: TrendingDown
      }
    }
    return {
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30", 
      glow: "shadow-blue-500/20",
      icon: Target
    }
  }

  const getTrackerName = (id: number) => {
    return trackers.find(t => t.id === id)?.name || "Unknown"
  }

  const impactStyle = getImpactStyle(result.impact)
  const IconComponent = impactStyle.icon

  const getInsightDescription = (type: EnhancedCorrelationResult['insightType']) => {
    switch (type) {
      case 'positive_synergy':
        return "Positive signal"
      case 'destructive_interference':
        return "Negative signal"
      case 'neutral_correlation':
        return "No clear signal"
    }
  }

  const getDataQualityColor = (quality: string): string => {
    switch (quality) {
      case 'high':
        return 'text-emerald-400'
      case 'medium':
        return 'text-amber-400'
      case 'low':
        return 'text-rose-400'
      default:
        return 'text-[hsl(220_12%_58%)]'
    }
  }

  return (
    <div className="space-y-6">
      <div className="surface-panel relative overflow-hidden rounded-3xl p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.02] opacity-80" />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="section-kicker">Result</div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[hsl(210_28%_97%)]">
                {getTrackerName(result.sourceTrackerId)} → {getTrackerName(result.targetTrackerId)}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(220_12%_58%)]">
                {getInsightDescription(result.insightType)} between these trackers.
              </p>
            </div>

            <div className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
              impactStyle.bg,
              impactStyle.border,
              impactStyle.color
            )}>
              <IconComponent className="h-4 w-4" />
              {getInsightDescription(result.insightType)}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className={cn("rounded-3xl border border-white/8 bg-white/[0.04] p-6", impactStyle.border)}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="section-kicker">Impact</div>
                  <div className="mt-3 flex items-end gap-3">
                    <span className={cn("text-6xl font-display font-bold tracking-tight", impactStyle.color)}>
                      {result.impact > 0 ? "+" : ""}{result.impact}%
                    </span>
                    <span className="pb-2 text-sm text-[hsl(220_12%_58%)]">change</span>
                  </div>
                </div>

                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border", impactStyle.bg, impactStyle.border)}>
                  <IconComponent className={cn("h-6 w-6", impactStyle.color)} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">Confidence</div>
                  <div className="mt-2 text-2xl font-bold tracking-tight text-[hsl(210_28%_97%)]">{result.confidence}%</div>
                  <p className="mt-1 text-xs leading-5 text-[hsl(220_12%_58%)]">{result.userFriendlyConfidence}</p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_58%)]">Samples</div>
                  <div className="mt-2 text-2xl font-bold tracking-tight text-[hsl(210_28%_97%)]">
                    {result.triggeredDays + result.baselineDays}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[hsl(220_12%_58%)]">
                    {result.triggeredDays} triggered, {result.baselineDays} baseline
                  </p>
                </div>
              </div>
            </div>

            <div className="surface-panel rounded-3xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="section-kicker">Signal quality</div>
                  <p className="mt-2 text-sm text-[hsl(220_12%_58%)]">How steady this read feels.</p>
                </div>
                <span className={cn(
                  "rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                  getDataQualityColor(result.metadata.dataQuality)
                )}>
                  {result.metadata.dataQuality}
                </span>
              </div>

              {!result.metadata.hasSufficientData && (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                    <div className="text-sm leading-6 text-[hsl(210_25%_97%)]">
                      Results are still light. Keep tracking a little longer for a steadier read.
                    </div>
                  </div>
                </div>
              )}

              {result.metadata.recommendedActions.length > 0 && (
                <div className="mt-5 space-y-3">
                  <div className="section-kicker">Recommendations</div>
                  <ul className="space-y-2">
                    {result.metadata.recommendedActions.map((action, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm leading-6 text-[hsl(210_25%_97%)]">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[hsl(266_73%_63%)]" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="surface-panel rounded-2xl p-5">
          <div className="section-kicker">Triggered</div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[hsl(220_12%_58%)]">Days</span>
              <span className="font-mono text-[hsl(210_28%_97%)]">{result.triggeredDays}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[hsl(220_12%_58%)]">Average</span>
              <span className="font-mono text-[hsl(210_28%_97%)]">{result.impactedAvg}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[hsl(220_12%_58%)]">Condition</span>
              <span className="text-right font-mono text-sm text-[hsl(210_28%_97%)]">
                {getTrackerName(result.sourceTrackerId)} &gt; 0
              </span>
            </div>
          </div>
        </div>

        <div className="surface-panel rounded-2xl p-5">
          <div className="section-kicker">Baseline</div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[hsl(220_12%_58%)]">Days</span>
              <span className="font-mono text-[hsl(210_28%_97%)]">{result.baselineDays}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[hsl(220_12%_58%)]">Average</span>
              <span className="font-mono text-[hsl(210_28%_97%)]">{result.baselineAvg}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[hsl(220_12%_58%)]">Condition</span>
              <span className="text-right font-mono text-sm text-[hsl(210_28%_97%)]">
                {getTrackerName(result.sourceTrackerId)} = 0
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
