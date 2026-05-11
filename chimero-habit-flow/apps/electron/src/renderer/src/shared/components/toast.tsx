"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type ToastTone = "info" | "success" | "error" | "destructive"

export interface ToastInput {
  title: string
  description?: string
  tone?: ToastTone
  duration?: number | null
}

export interface ToastRecord extends Required<Pick<ToastInput, "title" | "tone">> {
  id: string
  description?: string
  duration?: number | null
  createdAt: number
}

interface ToastContextValue {
  toasts: ToastRecord[]
  notify: (toast: ToastInput) => string
  success: (title: string, description?: string, duration?: number | null) => string
  destructive: (title: string, description?: string, duration?: number | null) => string
  error: (title: string, description?: string, duration?: number | null) => string
  info: (title: string, description?: string, duration?: number | null) => string
  dismiss: (id: string) => void
  clear: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION = 4200
const DEFAULT_SUCCESS_DURATION = 3200
const DEFAULT_ERROR_DURATION = 5200
const DEFAULT_DESTRUCTIVE_DURATION = 5200

function createToastId() {
  return globalThis.crypto?.randomUUID?.() ?? `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const clear = useCallback(() => {
    setToasts([])
  }, [])

  const notify = useCallback((toast: ToastInput) => {
    const id = createToastId()
    const nextToast: ToastRecord = {
      id,
      title: toast.title,
      description: toast.description,
      tone: toast.tone ?? "info",
      duration: toast.duration ?? DEFAULT_DURATION,
      createdAt: Date.now(),
    }

    setToasts((current) => [...current, nextToast])
    return id
  }, [])

  const success = useCallback(
    (title: string, description?: string, duration?: number | null) =>
      notify({
        title,
        description,
        tone: "success",
        duration: duration ?? DEFAULT_SUCCESS_DURATION,
      }),
    [notify],
  )

  const error = useCallback(
    (title: string, description?: string, duration?: number | null) =>
      notify({
        title,
        description,
        tone: "error",
        duration: duration ?? DEFAULT_ERROR_DURATION,
      }),
    [notify],
  )

  const destructive = useCallback(
    (title: string, description?: string, duration?: number | null) =>
      notify({
        title,
        description,
        tone: "destructive",
        duration: duration ?? DEFAULT_DESTRUCTIVE_DURATION,
      }),
    [notify],
  )

  const info = useCallback(
    (title: string, description?: string, duration?: number | null) =>
      notify({
        title,
        description,
        tone: "info",
        duration: duration ?? DEFAULT_DURATION,
      }),
    [notify],
  )

  const value = useMemo(
    () => ({ toasts, notify, success, destructive, error, info, dismiss, clear }),
    [toasts, notify, success, destructive, error, info, dismiss, clear],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }

  return context
}

export function formatToastError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === "string" && error.trim()) {
    return error
  }

  return fallback
}
