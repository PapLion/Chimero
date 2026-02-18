"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "../lib/utils"

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const selectedOption = options.find(option => option.value === value)
  const displayValue = selectedOption?.label || placeholder

  const handleSelect = (optionValue: string | number) => {
    onValueChange(optionValue === "" ? null : optionValue)
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full px-4 py-2.5 bg-[hsl(210_20%_15%)] border rounded-lg font-mono text-sm",
          "transition-all duration-200 flex items-center justify-between gap-2",
          "focus:outline-none focus:ring-2 focus:ring-[hsl(266_73%_63%)]",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          isOpen 
            ? "border-[hsl(266_73%_63%)] shadow-[hsl(266_73%_63%)/20] shadow-lg" 
            : "border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%/0.5)]",
          "text-[hsl(210_25%_97%)] placeholder:text-[hsl(210_12%_47%)]"
        )}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown 
          className={cn(
            "w-4 h-4 transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-lg shadow-lg overflow-hidden">
          {/* Terminal header */}
          <div className="px-3 py-2 bg-[hsl(210_20%_15%)] border-b border-[hsl(210_18%_22%)]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-[hsl(210_12%_47%)] font-mono ml-2">terminal</span>
            </div>
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {placeholder && (
              <button
                onClick={() => handleSelect("")}
                className={cn(
                  "w-full px-4 py-2 text-left font-mono text-sm transition-colors",
                  "hover:bg-[hsl(266_73%_63%/0.1)] focus:bg-[hsl(266_73%_63%/0.2)]",
                  "text-[hsl(210_12%_47%)] border-b border-[hsl(210_18%_22%)]",
                  "flex items-center justify-between gap-2"
                )}
              >
                <span>{placeholder}</span>
                {value === null && <Check className="w-4 h-4 text-[hsl(266_73%_63%)]" />}
              </button>
            )}
            
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "w-full px-4 py-2 text-left font-mono text-sm transition-colors",
                  "hover:bg-[hsl(266_73%_63%/0.1)] focus:bg-[hsl(266_73%_63%/0.2)]",
                  "text-[hsl(210_25%_97%)] border-b border-[hsl(210_18%_22%)] last:border-b-0",
                  "flex items-center justify-between gap-2"
                )}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && <Check className="w-4 h-4 text-[hsl(266_73%_63%)]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
