"use client"

import { TrendingUp, TrendingDown, Target, Activity, BarChart3, AlertTriangle } from "lucide-react"
import { cn } from "../lib/utils"
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
        return "Positive Synergy Detected"
      case 'destructive_interference':
        return "Destructive Interference"
      case 'neutral_correlation':
        return "Neutral Correlation"
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
        return 'text-[hsl(210_12%_47%)]'
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Impact Display */}
      <div className={cn(
        "bg-[hsl(210_25%_11%)] border rounded-2xl p-8 text-center relative overflow-hidden",
        impactStyle.border, 
        impactStyle.glow,
        "backdrop-blur-sm"
      )}>
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210_25%_11%)] via-[hsl(210_25%_11%)] to-[hsl(210_20%_15%)] opacity-50" />
        
        <div className="relative z-10">
          {/* Icon */}
          <div className="flex items-center justify-center mb-4">
            <div className={cn(
              "w-16 h-16 rounded-xl flex items-center justify-center",
              impactStyle.bg,
              "border",
              impactStyle.border
            )}>
              <IconComponent className={cn("w-8 h-8", impactStyle.color)} />
            </div>
          </div>
          
          {/* Impact Percentage */}
          <div className="text-6xl font-display font-bold mb-2">
            <span className={impactStyle.color}>
              {result.impact > 0 ? "+" : ""}{result.impact}%
            </span>
          </div>
          
          {/* Insight Description */}
          <div className="text-lg text-[hsl(210_25%_97%)] mb-4 font-medium">
            {getInsightDescription(result.insightType)}
          </div>

          {/* Confidence and Sample Info */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 group relative">
              <Activity className="w-4 h-4 text-[hsl(210_12%_47%)]" />
              <span className="text-[hsl(210_12%_47%)]">Confidence:</span>
              <span className="text-[hsl(210_25%_97%)] font-mono">{result.confidence}%</span>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-lg text-xs text-[hsl(210_25%_97%)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                {result.userFriendlyConfidence}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[hsl(210_12%_47%)]" />
              <span className="text-[hsl(210_12%_47%)]">Samples:</span>
              <span className="text-[hsl(210_25%_97%)] font-mono">{result.triggeredDays + result.baselineDays}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Quality Assessment */}
      <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-mono text-[hsl(210_12%_47%)] uppercase tracking-wider">
            Data Quality
          </h4>
          <span className={cn("text-sm font-mono uppercase", getDataQualityColor(result.metadata.dataQuality))}>
            {result.metadata.dataQuality}
          </span>
        </div>
        
        {!result.metadata.hasSufficientData && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-amber-400 font-medium mb-1">Limited Data</p>
              <p className="text-[hsl(210_12%_47%)]">
                Results may not be reliable. Continue tracking for more accurate insights.
              </p>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {result.metadata.recommendedActions.length > 0 && (
          <div className="mt-3">
            <h5 className="text-xs font-mono text-[hsl(210_12%_47%)] uppercase tracking-wider mb-2">
              Recommendations
            </h5>
            <ul className="space-y-1">
              {result.metadata.recommendedActions.map((action, index) => (
                <li key={index} className="text-sm text-[hsl(210_25%_97%)] flex items-start gap-2">
                  <span className="text-[hsl(266_73%_63%)] mt-1">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-xl p-6">
          <h4 className="text-sm font-mono text-[hsl(210_12%_47%)] uppercase tracking-wider mb-3">
            Cohort A (Triggered)
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[hsl(210_12%_47%)]">Days:</span>
              <span className="text-[hsl(210_25%_97%)] font-mono">{result.triggeredDays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(210_12%_47%)]">Average:</span>
              <span className="text-[hsl(210_25%_97%)] font-mono">{result.impactedAvg}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(210_12%_47%)]">Condition:</span>
              <span className="text-[hsl(210_25%_97%)] font-mono text-sm">
                {getTrackerName(result.sourceTrackerId)} &gt; 0
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-xl p-6">
          <h4 className="text-sm font-mono text-[hsl(210_12%_47%)] uppercase tracking-wider mb-3">
            Cohort B (Baseline)
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[hsl(210_12%_47%)]">Days:</span>
              <span className="text-[hsl(210_25%_97%)] font-mono">{result.baselineDays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(210_12%_47%)]">Average:</span>
              <span className="text-[hsl(210_25%_97%)] font-mono">{result.baselineAvg}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(210_12%_47%)]">Condition:</span>
              <span className="text-[hsl(210_25%_97%)] font-mono text-sm">
                {getTrackerName(result.sourceTrackerId)} = 0
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
