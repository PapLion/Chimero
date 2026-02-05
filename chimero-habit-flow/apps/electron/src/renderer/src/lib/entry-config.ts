/**
 * Human-centric entry configuration based on tracker type/name/icon
 * Returns dynamic labels and placeholders for QuickEntry
 */

import type { Tracker } from "./store"

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
  const icon = tracker.icon?.toLowerCase() || ""

  // 📚 Books
  if (nameLower.includes("book") || nameLower.includes("reading") || icon === "book") {
    return {
      mainLabel: "Book Title",
      mainPlaceholder: "What book are you reading?",
      mainType: "text",
      noteLabel: "Pages Read",
      secondaryPlaceholder: "Pages or Chapter",
      notePlaceholder: "e.g., 250 pages, Chapter 5",
    }
  }

  // 📺 TV / Movies
  if (nameLower.includes("tv") || nameLower.includes("show") || nameLower.includes("movie") || nameLower.includes("series") || icon === "music") {
    return {
      mainLabel: "Show / Movie",
      mainPlaceholder: "Show or Movie Title",
      mainType: "text",
      noteLabel: "Episode / Rating",
      secondaryPlaceholder: "Episode or Rating",
      notePlaceholder: "e.g., S01E03, 4.5 stars",
    }
  }

  // 🎮 Gaming
  if (nameLower.includes("game") || nameLower.includes("gaming") || icon === "gamepad-2") {
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
  if (nameLower.includes("media") || nameLower.includes("app")) {
    return {
      mainLabel: "Title",
      mainPlaceholder: "Show, Book, or App name...",
      mainType: "text",
      noteLabel: "Rating / Progress",
      secondaryPlaceholder: "Rating or hours",
      notePlaceholder: "e.g., 4 stars, 1h",
    }
  }

  // 🏋️‍♀️ Exercise
  if (nameLower.includes("exercise") || nameLower.includes("workout") || nameLower.includes("fitness") || icon === "dumbbell") {
    return {
      mainPlaceholder: "Duration (minutes) or Calories",
      mainType: "number",
      noteLabel: "Activity Name",
      notePlaceholder: "e.g., Leg Day, Cardio, Morning Run",
      noteHint: "What did you do?",
    }
  }

  // ⚖️ Weight
  if (nameLower.includes("weight") || nameLower.includes("peso") || icon === "scale") {
    return {
      mainPlaceholder: "Current Weight",
      mainType: "number",
      noteLabel: "Context",
      notePlaceholder: "e.g., Morning, Post-workout, Before bed",
      noteHint: "When did you weigh?",
    }
  }

  // 👥 Social
  if (nameLower.includes("social") || nameLower.includes("friends") || nameLower.includes("people") || icon === "users") {
    return {
      mainPlaceholder: "Satisfaction Level (1-10) or Hours",
      mainType: "number",
      noteLabel: "Who were you with?",
      notePlaceholder: "@tag friends or names",
      noteHint: "e.g., @Mom, with John and Sarah",
    }
  }

  // 🥑 Diet
  if (nameLower.includes("diet") || nameLower.includes("food") || nameLower.includes("meal") || nameLower.includes("calorie") || nameLower.includes("nutrition") || icon === "salad") {
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
  if (nameLower.includes("water") || nameLower.includes("hydration") || nameLower.includes("drink") || icon === "coffee") {
    return {
      mainPlaceholder: "Amount (ml or cups)",
      mainType: "number",
      noteLabel: "Type",
      notePlaceholder: "e.g., Water, Coffee, Tea",
      noteHint: "What did you drink?",
    }
  }

  // 🧠 Mood
  if (nameLower.includes("mood") || nameLower.includes("feeling") || icon === "smile") {
    return {
      mainPlaceholder: "How are you feeling?",
      mainType: "rating",
      noteLabel: "Why do you feel this way?",
      notePlaceholder: "Tell us what's on your mind...",
      noteHint: "Optional: Add context",
    }
  }

  // ✅ Tasks
  if (nameLower.includes("task") || nameLower.includes("todo") || nameLower.includes("checklist") || tracker.type === "list" || tracker.type === "binary") {
    return {
      mainPlaceholder: "Task Description",
      mainType: "text",
      noteHint: "What do you need to do?",
    }
  }

  // 💰 Finance / Savings
  if (nameLower.includes("money") || nameLower.includes("finance") || nameLower.includes("saving") || nameLower.includes("budget") || nameLower.includes("expense") || nameLower.includes("savings") || icon === "wallet") {
    return {
      mainLabel: "Amount",
      mainPlaceholder: "Amount ($)",
      mainType: "number",
      noteLabel: "Category / Item",
      notePlaceholder: "e.g., Groceries, Coffee, Salary",
      noteHint: "What was this for?",
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
