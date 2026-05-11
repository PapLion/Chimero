"use client"

import { motion } from "framer-motion"
import { Brain, Plus } from "lucide-react"

interface EmptyStateProps {
  hasTrackers: boolean
  onTrackerSelect?: () => void
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
}

export function EmptyState({ hasTrackers, onTrackerSelect }: EmptyStateProps) {
  const title = hasTrackers ? "Pick two habits" : "No habits yet"
  const body = hasTrackers
    ? "Choose source, target, and lag."
    : "Add a habit first. The Insight Lab needs data before it can surface a signal."

  return (
    <motion.div
      className="surface-panel relative overflow-hidden rounded-3xl p-10 text-center sm:p-12"
      initial={panelMotion.initial}
      animate={panelMotion.animate}
      transition={panelMotion.transition}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent opacity-70" />
      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(266_73%_63%/0.18)] to-[hsl(187_84%_44%/0.12)]">
          <Brain className="h-8 w-8 text-[hsl(266_73%_63%)]" />
        </div>

        <div className="section-kicker">Insight Lab</div>
        <h3 className="mt-3 text-2xl font-display font-semibold tracking-tight text-[hsl(210_28%_97%)]">
          {title}
        </h3>
        <p className="mx-auto mt-3 max-w-lg leading-7 text-[hsl(220_12%_58%)]">
          {body}
        </p>

        {!hasTrackers && onTrackerSelect && (
          <button
            onClick={onTrackerSelect}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[hsl(266_73%_63%)] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[hsl(266_73%_58%)]"
          >
            <Plus className="h-4 w-4" />
            Add a habit
          </button>
        )}
      </div>
    </motion.div>
  )
}
