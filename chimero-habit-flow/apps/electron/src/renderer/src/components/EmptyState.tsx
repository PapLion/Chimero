"use client"

import { Brain, Plus } from "lucide-react"

interface EmptyStateProps {
  hasTrackers: boolean;
  onTrackerSelect?: () => void;
}

export function EmptyState({ hasTrackers, onTrackerSelect }: EmptyStateProps) {
  if (!hasTrackers) {
    return (
      <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-[hsl(266_73%_63%/0.1)] flex items-center justify-center">
          <Brain className="w-8 h-8 text-[hsl(210_12%_47%)]" />
        </div>
        <h3 className="text-xl font-display font-semibold text-[hsl(210_25%_97%)] mb-3">
          No Habits Tracked Yet
        </h3>
        <p className="text-[hsl(210_12%_47%)] max-w-md mx-auto mb-6 leading-relaxed">
          Start tracking habits to discover patterns and correlations in your behavior. 
          The Butterfly Effect Engine needs data to reveal insights.
        </p>
        {onTrackerSelect && (
          <button
            onClick={onTrackerSelect}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(266_73%_63%)] text-white rounded-lg hover:bg-[hsl(266_73%_58%)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Habit
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-[hsl(266_73%_63%/0.1)] flex items-center justify-center">
        <Brain className="w-8 h-8 text-[hsl(210_12%_47%)]" />
      </div>
      <h3 className="text-xl font-display font-semibold text-[hsl(210_25%_97%)] mb-3">
        Select Two Habits to Begin Research
      </h3>
      <p className="text-[hsl(210_12%_47%)] max-w-md mx-auto leading-relaxed">
        Choose a source habit and target habit to uncover how they influence each other. 
        The Butterfly Effect Engine will analyze their relationship across time.
      </p>
    </div>
  )
}
