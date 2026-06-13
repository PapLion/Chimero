"use client"

import { createPortal } from "react-dom"
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@shared/utils"

interface CyberpunkSelectProps {
  value: string | number | null
  onValueChange: (value: string | number | null) => void
  options: Array<{ value: string | number; label: string }>
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CyberpunkSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  className,
  disabled = false
}: CyberpunkSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (dropdownRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setIsOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuStyle(null)
      return
    }

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const width = Math.min(rect.width, window.innerWidth - 16)
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const menuHeight = 240
      const openUpwards = spaceBelow < menuHeight && rect.top > spaceBelow

      setMenuStyle(
          openUpwards
            ? {
                position: "fixed",
                left,
                bottom: Math.max(8, window.innerHeight - rect.top + 8),
                width,
                minWidth: width,
              }
            : {
                position: "fixed",
                left,
                top: rect.bottom + 8,
                width,
                minWidth: width,
              },
      )
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)

    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [isOpen])

  const selectedOption = options.find((option) => option.value === value)
  const displayValue = selectedOption?.label || placeholder

  const handleSelect = (optionValue: string | number) => {
    onValueChange(optionValue === "" ? null : optionValue)
    setIsOpen(false)
  }

  const handleOptionPointerDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "surface-chip flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.4)]",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          isOpen
            ? "border-[hsl(var(--primary))] bg-[hsl(var(--card)/0.98)] text-[hsl(var(--foreground))] shadow-lg shadow-primary/10"
            : "border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.88)] text-[hsl(var(--foreground))] hover:border-[hsl(var(--border)/0.95)] hover:bg-[hsl(var(--card)/0.95)]"
        )}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && typeof document !== "undefined" && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              style={menuStyle}
              className="surface-panel z-[80] overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.72)] shadow-[0_18px_38px_rgba(2,6,23,0.2)]"
            >
              <div className="max-h-60 overflow-y-auto py-1">
                {placeholder && (
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === null}
                    onMouseDown={handleOptionPointerDown}
                    onClick={() => handleSelect("")}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors duration-150",
                      "text-[hsl(var(--muted-foreground))] hover:bg-white/[0.04] focus:bg-white/[0.08]"
                    )}
                  >
                    <span>{placeholder}</span>
                    {value === null && <Check className="h-4 w-4 text-[hsl(266_73%_63%)]" />}
                  </button>
                )}

                {options.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    role="option"
                    aria-selected={value === option.value}
                    onMouseDown={handleOptionPointerDown}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors duration-150 last:border-b-0",
                      "text-[hsl(var(--foreground))] hover:bg-white/[0.04] focus:bg-white/[0.08]"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {value === option.value && <Check className="h-4 w-4 text-[hsl(266_73%_63%)]" />}
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
