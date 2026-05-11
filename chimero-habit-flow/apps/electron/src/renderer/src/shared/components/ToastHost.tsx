"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, CheckCircle2, Info, Trash2, X } from "lucide-react"

import { cn } from "@shared/utils"
import { useToast, type ToastRecord, type ToastTone } from "./toast"

const toneStyles: Record<ToastTone, string> = {
  success:
    "border-emerald-500/25 bg-[hsl(160_20%_11%/0.96)] text-emerald-50 shadow-emerald-950/25",
  destructive:
    "border-rose-500/25 bg-[hsl(352_24%_10%/0.96)] text-rose-50 shadow-rose-950/25",
  error:
    "border-red-500/25 bg-[hsl(0_24%_10%/0.96)] text-red-50 shadow-red-950/25",
  info:
    "border-sky-500/20 bg-[hsl(214_24%_11%/0.96)] text-sky-50 shadow-sky-950/20",
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-300" />
  }

  if (tone === "error") {
    return <AlertTriangle className="h-4 w-4 text-rose-300" />
  }

  if (tone === "destructive") {
    return <Trash2 className="h-4 w-4 text-rose-300" />
  }

  return <Info className="h-4 w-4 text-sky-300" />
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastRecord
  onDismiss: (id: string) => void
}) {
  const [entered, setEntered] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (toast.duration == null || toast.duration <= 0) return

    const timeout = window.setTimeout(() => {
      setExiting(true)
      window.setTimeout(() => onDismiss(toast.id), 180)
    }, toast.duration)

    return () => window.clearTimeout(timeout)
  }, [toast.duration, onDismiss, toast.id])

  const handleDismiss = () => {
    if (exiting) return
    setExiting(true)
    window.setTimeout(() => onDismiss(toast.id), 180)
  }

  return (
    <div
      data-tone={toast.tone}
      className={cn(
        "pointer-events-auto overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-200 ease-out",
        toneStyles[toast.tone],
        entered && !exiting ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/5">
          <ToastIcon tone={toast.tone} />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold leading-5 text-inherit">{toast.title}</p>
          {toast.description && (
            <p className="text-sm leading-5 text-inherit/80">{toast.description}</p>
          )}
        </div>

        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={handleDismiss}
          className="rounded-full p-1 text-inherit/60 transition-colors hover:bg-white/5 hover:text-inherit"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function ToastHost() {
  const { toasts, dismiss } = useToast()

  if (typeof document === "undefined" || toasts.length === 0) {
    return null
  }

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-24 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6"
    >
      {toasts
        .slice()
        .reverse()
        .map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastCard toast={toast} onDismiss={dismiss} />
          </div>
        ))}
    </div>,
    document.body,
  )
}
