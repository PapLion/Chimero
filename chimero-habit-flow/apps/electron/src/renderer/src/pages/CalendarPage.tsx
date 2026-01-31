"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Filter, Scale, Dumbbell, Smile, Users, CheckSquare, Wallet } from "lucide-react"
import { cn } from "../lib/utils"
import { useAppStore } from "../lib/store"

const categories = [
  { id: "weight", name: "Weight", icon: Scale, color: "bg-[hsl(266_73%_63%)]" },
  { id: "exercise", name: "Exercise", icon: Dumbbell, color: "bg-[hsl(280_65%_60%)]" },
  { id: "mood", name: "Mood", icon: Smile, color: "bg-[hsl(250_70%_65%)]" },
  { id: "social", name: "Social", icon: Users, color: "bg-[hsl(290_60%_58%)]" },
  { id: "tasks", name: "Tasks", icon: CheckSquare, color: "bg-[hsl(270_80%_70%)]" },
  { id: "assets", name: "Assets", icon: Wallet, color: "bg-[hsl(266_73%_63%/0.7)]" },
]

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function CalendarPage() {
  const { entries, trackers } = useAppStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  // Get days with activity from entries
  const activeDays = useMemo(() => {
    const days = new Set<number>()
    entries.forEach((entry) => {
      const entryDate = new Date(entry.timestamp)
      if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
        days.add(entryDate.getDate())
      }
    })
    return Array.from(days)
  }, [entries, currentMonth, currentYear])

  // Get entries for selected day
  const selectedDayEntries = useMemo(() => {
    if (!selectedDay) return []
    return entries.filter((entry) => {
      const entryDate = new Date(entry.timestamp)
      return (
        entryDate.getDate() === selectedDay &&
        entryDate.getMonth() === currentMonth &&
        entryDate.getFullYear() === currentYear
      )
    })
  }, [entries, selectedDay, currentMonth, currentYear])

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    setSelectedDay(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    setSelectedDay(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDay(new Date().getDate())
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    )
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2 text-[hsl(210_25%_97%)]">Calendar</h1>
            <p className="text-[hsl(210_12%_47%)]">Track your progress over time</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[hsl(210_20%_15%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(210_20%_18%)] transition-colors border border-[hsl(210_18%_22%)]"
            >
              Today
            </button>
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg bg-[hsl(210_20%_15%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(266_73%_63%)] hover:text-white transition-colors border border-[hsl(210_18%_22%)]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-[200px] text-center">
              <h2 className="text-2xl font-display font-bold text-[hsl(210_25%_97%)]">
                {months[currentMonth]} {currentYear}
              </h2>
            </div>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg bg-[hsl(210_20%_15%)] text-[hsl(210_25%_97%)] hover:bg-[hsl(266_73%_63%)] hover:text-white transition-colors border border-[hsl(210_18%_22%)]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-[hsl(210_12%_47%)]" />
          <span className="text-sm text-[hsl(210_12%_47%)]">Filter by:</span>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border",
                selectedCategories.includes(category.id)
                  ? "bg-[hsl(266_73%_63%)] text-white border-[hsl(266_73%_63%)]"
                  : "bg-transparent text-[hsl(210_25%_97%)] border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%/0.5)]"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {daysOfWeek.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-[hsl(210_12%_47%)] py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {days.map((day) => {
            const isActive = activeDays.includes(day)
            const isSelected = selectedDay === day
            const isToday =
              day === new Date().getDate() &&
              currentMonth === new Date().getMonth() &&
              currentYear === new Date().getFullYear()

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "aspect-square rounded-xl border transition-all duration-200",
                  "flex flex-col items-center justify-center gap-1",
                  "hover:border-[hsl(266_73%_63%)] hover:bg-[hsl(210_20%_15%)]",
                  isSelected
                    ? "border-[hsl(266_73%_63%)] bg-[hsl(266_73%_63%/0.1)]"
                    : "border-[hsl(210_18%_22%)]",
                  isToday && !isSelected && "border-[hsl(266_73%_63%/0.5)] bg-[hsl(266_73%_63%/0.05)]"
                )}
              >
                <span
                  className={cn(
                    "font-medium",
                    isSelected && "text-[hsl(266_73%_63%)]",
                    isToday && !isSelected && "text-[hsl(266_73%_63%)]",
                    !isSelected && !isToday && "text-[hsl(210_25%_97%)]"
                  )}
                >
                  {day}
                </span>
                {isActive && (
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[hsl(266_73%_63%)]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[hsl(280_65%_60%)]" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day Details (when a day is selected) */}
      {selectedDay && (
        <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-2xl p-6">
          <h3 className="text-xl font-display font-bold mb-4 text-[hsl(210_25%_97%)]">
            {months[currentMonth]} {selectedDay}, {currentYear}
          </h3>

          {selectedDayEntries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedDayEntries.map((entry) => {
                const tracker = trackers.find((t) => t.id === entry.trackerId)
                const category = categories.find(
                  (c) => c.id === tracker?.icon || c.id === tracker?.name.toLowerCase()
                )

                return (
                  <div
                    key={entry.id}
                    className="bg-[hsl(210_20%_15%)] rounded-xl p-4 border border-[hsl(210_18%_22%)] hover:border-[hsl(266_73%_63%/0.5)] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[hsl(210_25%_97%)]">{tracker?.name || "Unknown"}</span>
                      <div className={cn("w-2 h-2 rounded-full", category?.color || "bg-[hsl(266_73%_63%)]")} />
                    </div>
                    <p className="text-2xl font-display font-bold text-[hsl(266_73%_63%)]">
                      {entry.value}
                      {tracker?.config.unit && (
                        <span className="text-sm font-normal text-[hsl(210_12%_47%)] ml-1">
                          {tracker.config.unit as string}
                        </span>
                      )}
                    </p>
                    {entry.metadata?.note && (
                      <p className="text-sm text-[hsl(210_12%_47%)] mt-2">{entry.metadata.note as string}</p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[hsl(210_12%_47%)]">No entries for this day</p>
              <button className="mt-4 px-4 py-2 rounded-lg bg-[hsl(266_73%_63%)] text-white font-medium hover:bg-[hsl(266_73%_58%)] transition-colors">
                Add Entry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-xl p-4">
          <p className="text-sm text-[hsl(210_12%_47%)] mb-1">Active Days</p>
          <p className="text-2xl font-display font-bold text-[hsl(266_73%_63%)]">{activeDays.length}</p>
        </div>
        <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-xl p-4">
          <p className="text-sm text-[hsl(210_12%_47%)] mb-1">Total Entries</p>
          <p className="text-2xl font-display font-bold text-[hsl(280_65%_60%)]">
            {entries.filter((e) => {
              const d = new Date(e.timestamp)
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear
            }).length}
          </p>
        </div>
        <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-xl p-4">
          <p className="text-sm text-[hsl(210_12%_47%)] mb-1">Current Streak</p>
          <p className="text-2xl font-display font-bold text-[hsl(250_70%_65%)]">14 days</p>
        </div>
        <div className="bg-[hsl(210_25%_11%)] border border-[hsl(210_18%_22%)] rounded-xl p-4">
          <p className="text-sm text-[hsl(210_12%_47%)] mb-1">Best Streak</p>
          <p className="text-2xl font-display font-bold text-[hsl(290_60%_58%)]">21 days</p>
        </div>
      </div>
    </div>
  )
}
