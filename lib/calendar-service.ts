import type { TrackerType } from "@/types/database"

export interface CalendarEvent {
  id: string
  title: string
  date: Date
  startTime?: string // Format "HH:MM"
  endTime?: string
  type: TrackerType | string
  color: string
  completed: boolean
  metadata?: any // To store original object for editing
}

// This function is the "API" that listens to your data and converts them into events
export function aggregateEvents(appData: any): CalendarEvent[] {
  const events: CalendarEvent[] = []

  // 1. INTEGRATION OF TASKS
  if (appData.activityLogs) {
    appData.activityLogs
      .filter((log: any) => log.type === "tasks")
      .forEach((log: any) => {
        const taskData = log.data as any
        if (taskData && taskData.dueDate) {
          events.push({
            id: `task-${log.id}`,
            title: taskData.title || "Task",
            date: new Date(taskData.dueDate),
            startTime: taskData.time,
            type: "tasks",
            color: "bg-accent",
            completed: taskData.completed || false,
            metadata: log
          })
        }
      })
  }

  // 2. INTEGRATION OF DIET
  if (appData.activityLogs) {
    appData.activityLogs
      .filter((log: any) => log.type === "diet")
      .forEach((log: any) => {
        const dietData = log.data as any
        if (dietData) {
          events.push({
            id: `diet-${log.id}`,
            title: `Meal: ${dietData.status || "Diet Entry"}`,
            date: new Date(log.timestamp),
            startTime: dietData.time,
            type: "diet",
            color: "bg-green-500",
            completed: true,
            metadata: log
          })
        }
      })
  }

  // 3. INTEGRATION OF EXERCISE
  if (appData.activityLogs) {
    appData.activityLogs
      .filter((log: any) => log.type === "exercise")
      .forEach((log: any) => {
        const exerciseData = log.data as any
        if (exerciseData) {
          events.push({
            id: `exercise-${log.id}`,
            title: `Exercise: ${exerciseData.hoursCompleted || 0}h`,
            date: new Date(log.timestamp),
            startTime: exerciseData.time,
            type: "exercise",
            color: "bg-orange-500",
            completed: true,
            metadata: log
          })
        }
      })
  }

  // 4. INTEGRATION OF MOOD
  if (appData.activityLogs) {
    appData.activityLogs
      .filter((log: any) => log.type === "mood")
      .forEach((log: any) => {
        const moodData = log.data as any
        if (moodData) {
          events.push({
            id: `mood-${log.id}`,
            title: `Mood: ${moodData.currentRating || "Entry"}`,
            date: new Date(log.timestamp),
            type: "mood",
            color: "bg-purple-500",
            completed: true,
            metadata: log
          })
        }
      })
  }

  // 5. INTEGRATION OF SOCIAL
  if (appData.activityLogs) {
    appData.activityLogs
      .filter((log: any) => log.type === "social")
      .forEach((log: any) => {
        const socialData = log.data as any
        if (socialData && socialData.lastInteraction) {
          events.push({
            id: `social-${log.id}`,
            title: `Social: ${socialData.lastInteraction.person}`,
            date: new Date(log.timestamp),
            startTime: socialData.time,
            type: "social",
            color: "bg-blue-500",
            completed: true,
            metadata: log
          })
        }
      })
  }

  // 6. INTEGRATION OF CUSTOM TRACKERS
  if (appData.customTrackerEntries) {
    appData.customTrackerEntries.forEach((entry: any) => {
      const tracker = appData.customTrackers?.find((t: any) => t.id === entry.trackerId)
      if (tracker) {
        events.push({
          id: `custom-${entry.id}`,
          title: `${tracker.name}: Entry`,
          date: new Date(entry.timestamp),
          type: "custom",
          color: tracker.color || "bg-primary",
          completed: true,
          metadata: { entry, tracker }
        })
      }
    })
  }

  // Sort by time if exists, put all-day events first
  return events.sort((a, b) => {
    if (!a.startTime && !b.startTime) return 0
    if (!a.startTime) return -1
    if (!b.startTime) return 1
    return a.startTime.localeCompare(b.startTime)
  })
}