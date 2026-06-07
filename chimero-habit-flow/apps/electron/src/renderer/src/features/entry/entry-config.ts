/**
 * Human-centric entry configuration based on tracker type/name/icon
 * Returns dynamic labels and placeholders for QuickEntry
 */

import type { Tracker } from "@shared/store"
import { getTrackerIdentity } from "@contracts/features/tracking"

export interface EntryConfig {
  mainLabel?: string
  mainPlaceholder: string
  mainType: "text" | "number" | "rating"
  secondaryLabel?: string
  secondaryPlaceholder?: string
  noteLabel?: string
  notePlaceholder?: string
  noteHint?: string
}

export function getEntryConfig(tracker: Tracker): EntryConfig {
  const nameLower = tracker.name.toLowerCase()
  const identity = getTrackerIdentity(tracker)

  // 📚 Books
  if (identity === "books") {
    return {
      mainLabel: "Book Title",
      mainPlaceholder: "What book are you logging?",
      mainType: "text",
    }
  }

  // 📺 TV
  if (identity === "tv") {
    return {
      mainLabel: "TV Title",
      mainPlaceholder: "What did you watch?",
      mainType: "text",
      noteLabel: "Episode / Rating",
      secondaryPlaceholder: "Episode or Rating",
      notePlaceholder: "e.g., S01E03, 4.5 stars",
    }
  }

  if (identity === "legacy-media-tv") {
    return {
      mainLabel: "Media / TV Title",
      mainPlaceholder: "What did you watch or log?",
      mainType: "text",
      noteLabel: "Episode / Rating",
      secondaryPlaceholder: "Episode or Rating",
      notePlaceholder: "e.g., S01E03, 4.5 stars",
    }
  }

  // 🎮 Gaming
  if (identity === "gaming") {
    return {
      mainLabel: "Game Name",
      mainPlaceholder: "What game did you play?",
      mainType: "text",
      noteLabel: "Hours Played",
      secondaryPlaceholder: "Hours",
      notePlaceholder: "e.g., 2.5 hours",
    }
  }

  // 📱 Media (generic - apps, etc.)
  if (identity === "media") {
    return {
      mainLabel: "Media Title",
      mainPlaceholder: "What media did you log?",
      mainType: "text",
      noteLabel: "Rating / Progress",
      secondaryPlaceholder: "Rating or hours",
      notePlaceholder: "e.g., 4 stars, 1h",
    }
  }

  // 🩺 Health / Symptoms
  if (identity === "health") {
    return {
      mainLabel: "Symptom",
      mainPlaceholder: "What symptom are you logging?",
      mainType: "text",
      noteLabel: "Context",
      notePlaceholder: "Optional note or context",
      noteHint: "Add any extra detail you want to remember.",
    }
  }

  // 🏋️‍♀️ Exercise
  if (identity === "exercise") {
    return {
      mainPlaceholder: "Duration (minutes) or Calories",
      mainType: "number",
      noteLabel: "Activity Name",
      notePlaceholder: "e.g., Leg Day, Cardio, Morning Run",
      noteHint: "What did you do?",
    }
  }

  // ⚖️ Weight
  if (identity === "weight") {
    return {
      mainPlaceholder: "Current Weight",
      mainType: "number",
      noteLabel: "Context",
      notePlaceholder: "e.g., Morning, Post-workout, Before bed",
      noteHint: "When did you weigh?",
    }
  }

  // 👥 Social
  if (identity === "social" || nameLower.includes("friends") || nameLower.includes("people")) {
    return {
      mainPlaceholder: "Satisfaction Level (1-10) or Hours",
      mainType: "number",
      noteLabel: "Who were you with?",
      notePlaceholder: "@tag friends or names",
      noteHint: "e.g., @Mom, with John and Sarah",
    }
  }

  // 🥑 Diet
  if (identity === "diet" || nameLower.includes("nutrition")) {
    return {
      mainLabel: "Calories",
      mainPlaceholder: "Calories (e.g., 450)",
      mainType: "number",
      noteLabel: "Meal Name",
      notePlaceholder: "e.g., Lunch, Breakfast, Snack",
      noteHint: "What meal was this?",
    }
  }

  // 💧 Water / Hydration
  if (nameLower.includes("water") || nameLower.includes("hydration") || nameLower.includes("drink") || tracker.icon === "coffee") {
    return {
      mainPlaceholder: "Amount (ml or cups)",
      mainType: "number",
      noteLabel: "Type",
      notePlaceholder: "e.g., Water, Coffee, Tea",
      noteHint: "What did you drink?",
    }
  }

  // 🧠 Mood
  if (identity === "mood") {
    return {
      mainPlaceholder: "How are you feeling?",
      mainType: "rating",
      noteLabel: "Why do you feel this way?",
      notePlaceholder: "Tell us what's on your mind...",
      noteHint: "Optional: Add context",
    }
  }

  // ✅ Tasks
  if (identity === "tasks" || nameLower.includes("checklist") || tracker.type === "list" || tracker.type === "binary") {
    return {
      mainPlaceholder: "Task Description",
      mainType: "text",
      noteHint: "What do you need to do?",
    }
  }

  // Default fallback based on tracker type
  if (tracker.type === "rating") {
    return {
      mainPlaceholder: "Rate this (1-10)",
      mainType: "rating",
      notePlaceholder: "Optional note...",
    }
  }

  const typeStr = tracker.type as string
  if (typeStr === "text" || typeStr === "list" || typeStr === "binary") {
    return {
      mainPlaceholder: "Enter title or note...",
      mainType: "text",
      secondaryPlaceholder: "Optional: Pages, Hours, Rating...",
    }
  }

  // Default: Numeric tracker
  return {
    mainPlaceholder: "Enter value...",
    mainType: "number",
    notePlaceholder: "Optional note or comment...",
  }
}
