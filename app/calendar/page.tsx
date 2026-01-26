"use client"

import { useState, useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Circle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useAppData } from "@/contexts/app-data-context"
import { aggregateEvents, type CalendarEvent } from "@/lib/calendar-service"

export default function CalendarPage() {
  const { activityLogs, customTrackers, customTrackerEntries } = useAppData()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Aggregate events from all data sources
  const allEvents = useMemo(() => {
    const appData = { activityLogs, customTrackers, customTrackerEntries }
    return aggregateEvents(appData)
  }, [activityLogs, customTrackers, customTrackerEntries])

  // Filter events for selected day
  const selectedDayEvents = useMemo(() => {
    return allEvents.filter(event =>
      event.date.getDate() === selectedDate.getDate() &&
      event.date.getMonth() === selectedDate.getMonth() &&
      event.date.getFullYear() === selectedDate.getFullYear()
    )
  }, [allEvents, selectedDate])

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  const monthName = currentDate.toLocaleString('default', { month: 'long' })
  const year = currentDate.getFullYear()

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
    setIsSheetOpen(true)
  }

  // Generate days array
  const days = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))
  }

  return (
    <div className="h-[calc(100vh-2rem)] p-6 overflow-hidden flex flex-col">

      {/* HEADER DEL CALENDARIO */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-display font-bold capitalize">{monthName}</h2>
          <p className="text-muted-foreground text-lg">{year}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* GRID DEL CALENDARIO (OCUPA TODO EL ANCHO) */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-7 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-medium text-muted-foreground text-sm uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
          {days.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="p-2" />

            const isToday = day.toDateString() === new Date().toDateString()
            const hasEvents = allEvents.some(e => e.date.toDateString() === day.toDateString())

            return (
              <button
                key={index}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "relative rounded-xl border p-3 flex flex-col items-start justify-between transition-all hover:border-primary/50 hover:bg-muted/50 group text-left",
                  isToday ? "bg-accent/5 border-accent ring-1 ring-accent" : "bg-card/50 border-border/50",
                )}
              >
                <span className={cn(
                  "text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                  isToday ? "bg-accent text-accent-foreground" : "text-muted-foreground group-hover:text-foreground",
                )}>
                  {day.getDate()}
                </span>

                {/* Preview de eventos (Puntos) */}
                {hasEvents && (
                  <div className="flex gap-1.5 mt-auto w-full px-1">
                    <div className="h-2 w-2 rounded-full bg-primary/70" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* --- PANEL LATERAL DESLIZANTE (SHEET) --- */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] border-l border-border p-0 flex flex-col gap-0">

          {/* Header del Panel */}
          <SheetHeader className="p-6 border-b border-border bg-muted/20">
            <SheetTitle className="text-2xl font-display font-bold">
              {selectedDate.toLocaleDateString('default', { weekday: 'long' })}
            </SheetTitle>
            <SheetDescription className="text-lg">
              {selectedDate.toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}
            </SheetDescription>
          </SheetHeader>

          {/* Cuerpo del Panel (Scrollable) */}
          <ScrollArea className="flex-1 p-6">
            {selectedDayEvents.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-center opacity-50">
                <CalendarIcon className="w-16 h-16 mb-4 text-muted-foreground/30" />
                <p className="font-medium text-lg">No activities</p>
                <p className="text-sm text-muted-foreground">This day is completely free.</p>
              </div>
            ) : (
              <div className="space-y-6 relative ml-2">
                {/* Línea de tiempo vertical */}
                <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-border/50 z-0" />

                {selectedDayEvents.map((event) => (
                  <div key={event.id} className="relative z-10 grid grid-cols-[40px_1fr] gap-4">

                    {/* Icono de estado */}
                    <div className="flex flex-col items-center pt-1">
                      <div className={cn(
                        "w-10 h-10 rounded-full border-4 border-background flex items-center justify-center shadow-sm",
                        event.color
                      )}>
                        {event.completed ? (
                           <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : (
                           <Circle className="w-4 h-4 text-white fill-white/20" />
                        )}
                      </div>
                    </div>

                    {/* Tarjeta de actividad */}
                    <div className="bg-card border border-border/60 rounded-xl p-4 hover:border-primary/30 transition-colors shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                           <Clock className="w-3.5 h-3.5" />
                           {event.startTime ? event.startTime : "All Day"}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-5 px-2 uppercase border-border">
                          {event.type}
                        </Badge>
                      </div>
                      <h4 className={cn(
                        "font-semibold text-base",
                        event.completed && "line-through text-muted-foreground"
                      )}>
                        {event.title}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer del Panel */}
          <div className="p-6 border-t border-border bg-background">
             <Button className="w-full h-12 text-base shadow-lg" size="lg">
                + Add New Activity
             </Button>
          </div>

        </SheetContent>
      </Sheet>
    </div>
  )
}
