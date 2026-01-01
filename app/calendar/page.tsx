"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const categories = [
  { id: "exercise", name: "Exercise", color: "bg-primary" },
  { id: "diet", name: "Diet", color: "bg-accent" },
  { id: "weight", name: "Weight", color: "bg-primary/70" },
  { id: "tasks", name: "Tasks", color: "bg-accent/70" },
  { id: "tv", name: "TV", color: "bg-primary/50" },
  { id: "books", name: "Books", color: "bg-accent/50" },
  { id: "media", name: "Media", color: "bg-primary/30" },
  { id: "gaming", name: "Gaming", color: "bg-accent/30" },
]

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

// Sample data - days with activity
const activeDays = [1, 3, 5, 7, 8, 10, 12, 14, 15, 16, 18, 20, 22, 24, 25, 27, 28, 29]

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
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
            <h1 className="text-4xl font-display font-bold mb-2">Calendar</h1>
            <p className="text-muted-foreground">Track your progress over time</p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousMonth}
              className="hover:bg-primary hover:text-primary-foreground transition-colors bg-transparent"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-[200px] text-center">
              <h2 className="text-2xl font-display font-bold">
                {months[currentMonth]} {currentYear}
              </h2>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
              className="hover:bg-primary hover:text-primary-foreground transition-colors bg-transparent"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by:</span>
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategories.includes(category.id) ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all hover:scale-105",
                selectedCategories.includes(category.id) && category.color,
              )}
              onClick={() => toggleCategory(category.id)}
            >
              {category.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card border border-border rounded-2xl p-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {daysOfWeek.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
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
                  "aspect-square rounded-xl border border-border transition-all duration-200",
                  "hover:border-primary hover:bg-muted",
                  "flex flex-col items-center justify-center gap-1",
                  isSelected && "border-primary bg-primary/10",
                  isToday && "border-accent bg-accent/10",
                )}
              >
                <span className={cn("font-medium", isSelected && "text-primary", isToday && "text-accent")}>{day}</span>
                {isActive && (
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <div className="w-1 h-1 rounded-full bg-accent" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day Details (when a day is selected) */}
      {selectedDay && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-xl font-display font-bold mb-4">
            {months[currentMonth]} {selectedDay}, {currentYear}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.slice(0, 6).map((category) => (
              <div
                key={category.id}
                className="bg-muted rounded-xl p-4 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{category.name}</span>
                  <div className={cn("w-2 h-2 rounded-full", category.color)} />
                </div>
                <p className="text-sm text-muted-foreground">2.5 hours logged</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
