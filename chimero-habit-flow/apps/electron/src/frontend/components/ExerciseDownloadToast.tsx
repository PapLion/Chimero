"use client"

import { useState } from "react"
import { useExerciseDbStatus } from "../lib/queries"

export function ExerciseDownloadToast() {
  const { data: dbStatus } = useExerciseDbStatus()
  const [collapsed, setCollapsed] = useState(false)

  // Solo mostrar si está loading o error
  // No mostrar si está ready o idle
  if (!dbStatus || dbStatus.status === 'ready' || dbStatus.status === 'idle') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 bg-[hsl(210_20%_12%)] border border-[hsl(210_18%_22%)] rounded-xl shadow-xl">
      {/* Header con botón de colapsar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {dbStatus.status === 'loading' && (
            <div className="w-3 h-3 border-2 border-[hsl(266_73%_63%)] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          {dbStatus.status === 'error' && (
            <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-[hsl(210_25%_97%)]">
            {dbStatus.status === 'loading' ? 'Downloading exercises...' : 'Download failed'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-[hsl(210_12%_47%)] hover:text-[hsl(210_25%_97%)] transition-colors text-xs"
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {/* Body colapsable */}
      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {dbStatus.status === 'loading' && (
            <>
              <div className="w-full bg-[hsl(210_20%_18%)] rounded-full h-1.5">
                <div
                  className="bg-[hsl(266_73%_63%)] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${dbStatus.progress}%` }}
                />
              </div>
              <p className="text-xs text-[hsl(210_12%_47%)]">
                {dbStatus.progress < 10
                  ? 'Connecting...'
                  : dbStatus.progress < 80
                  ? `Downloading exercise database... ${dbStatus.progress}%`
                  : 'Processing...'}
              </p>
              <p className="text-xs text-[hsl(210_12%_47%)]">
                This only happens once. Future loads will be instant.
              </p>
            </>
          )}
          {dbStatus.status === 'error' && (
            <p className="text-xs text-red-400">
              {dbStatus.error || 'Check your internet connection and restart the app.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
