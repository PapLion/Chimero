/**
 * Tracker Configuration - SINGLE SOURCE OF TRUTH
 *
 * This file defines how each tracker type behaves across the entire app:
 * - What fields to show in entry forms
 * - How to display values in widgets
 * - What chart type to use
 * - What icons to use
 * - What units are supported
 *
 * Instead of hardcoding these behaviors in 10 different components,
 * everything flows from here. Change once, works everywhere.
 */

import type { LucideIcon } from "lucide-react"
import {
  Scale,
  Smile,
  Dumbbell,
  Users,
  CheckSquare,
  Wallet,
  Flame,
  Book,
  Gamepad2,
  Heart,
  Coffee,
  Moon,
  Sun,
  Zap,
  Music,
  Target,
  Camera,
  Salad,
  Tv,
  Smartphone,
  Sparkles,
  Brain,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// Icon Map (used everywhere - ONE place to maintain)
// ─────────────────────────────────────────────────────────────────────────────

export const ICON_MAP: Record<string, LucideIcon> = {
  scale: Scale,
  smile: Smile,
  dumbbell: Dumbbell,
  users: Users,
  "check-square": CheckSquare,
  wallet: Wallet,
  flame: Flame,
  book: Book,
  "gamepad-2": Gamepad2,
  heart: Heart,
  coffee: Coffee,
  moon: Moon,
  sun: Sun,
  zap: Zap,
  music: Music,
  target: Target,
  camera: Camera,
  salad: Salad,
  tv: Tv,
  smartphone: Smartphone,
  sparkles: Sparkles,
  brain: Brain,
}

export type IconName = keyof typeof ICON_MAP

// ─────────────────────────────────────────────────────────────────────────────
// Tracker Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type TrackerFamily =
  | "weight"
  | "mood"
  | "sleep"
  | "exercise"
  | "social"
  | "tasks"
  | "savings"
  | "books"
  | "gaming"
  | "media"
  | "diet"
  | "meditation"
  | "health"
  | "generic"

export interface TrackerField {
  /** Key stored in entry metadata */
  key: string
  /** Human-readable label */
  label: string
  /** Placeholder text */
  placeholder: string
  /** Input type */
  inputType: "number" | "text" | "rating"
  /** Unit options (if numeric) */
  unitOptions?: Array<"lbs" | "kg" | "in" | "cm" | "kcal" | "ml" | "cups">
  /** Default unit */
  defaultUnit?: string
  /** Is this field optional? */
  optional?: boolean
}

export interface TrackerTypeConfig {
  /** The family/category of tracker */
  family: TrackerFamily
  /** Human-readable name */
  label: string
  /** Primary input field config */
  primaryField: TrackerField
  /** Optional secondary fields (shown in expandable section) */
  secondaryFields?: TrackerField[]
  /** Note/description field config */
  noteField?: {
    label: string
    placeholder: string
    hint?: string
  }
  /** What chart type to use */
  chartType: "line" | "bar" | "area" | "pie" | "none"
  /** Emoji map for mood trackers (rating values) */
  moodEmojis?: Record<number, string>
  /** Icon suggestion */
  icon: IconName
  /** Default color (hsl string) */
  defaultColor: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Tracker Configurations Registry
// ─────────────────────────────────────────────────────────────────────────────

export const TRACKER_CONFIGS: Record<TrackerFamily, TrackerTypeConfig> = {
  weight: {
    family: "weight",
    label: "Weight",
    icon: "scale",
    defaultColor: "hsl(266, 73%, 63%)",
    chartType: "line",
    primaryField: {
      key: "value",
      label: "Weight",
      placeholder: "Current Weight",
      inputType: "number",
      unitOptions: ["lbs", "kg"],
      defaultUnit: "lbs",
    },
    secondaryFields: [
      {
        key: "waist",
        label: "Waist",
        placeholder: "Waist measurement",
        inputType: "number",
        unitOptions: ["in", "cm"],
        defaultUnit: "in",
        optional: true,
      },
      {
        key: "hips",
        label: "Hips",
        placeholder: "Hips measurement",
        inputType: "number",
        unitOptions: ["in", "cm"],
        defaultUnit: "in",
        optional: true,
      },
      {
        key: "chest",
        label: "Chest",
        placeholder: "Chest measurement",
        inputType: "number",
        unitOptions: ["in", "cm"],
        defaultUnit: "in",
        optional: true,
      },
      {
        key: "arms",
        label: "Arms",
        placeholder: "Arms measurement",
        inputType: "number",
        unitOptions: ["in", "cm"],
        defaultUnit: "in",
        optional: true,
      },
    ],
    noteField: {
      label: "Context",
      placeholder: "e.g., Morning, Post-workout, Before bed",
      hint: "When did you weigh?",
    },
  },

  mood: {
    family: "mood",
    label: "Mood",
    icon: "smile",
    defaultColor: "hsl(48, 100%, 50%)",
    chartType: "bar",
    primaryField: {
      key: "moodValue",
      label: "How are you feeling?",
      placeholder: "Rate your mood (1-10)",
      inputType: "rating",
    },
    secondaryFields: [
      {
        key: "causeTags",
        label: "Cause Tags",
        placeholder: "What caused this mood?",
        inputType: "text",
      },
    ],
    noteField: {
      label: "Why do you feel this way?",
      placeholder: "Tell us what's on your mind...",
      hint: "Optional: Add context",
    },
  },

  sleep: {
    family: "sleep",
    label: "Sleep",
    icon: "moon",
    defaultColor: "hsl(239, 84%, 67%)",
    chartType: "bar",
    primaryField: {
      key: "quality",
      label: "Sleep Quality",
      placeholder: "Rate sleep quality (1-10)",
      inputType: "rating",
    },
    noteField: {
      label: "Notes",
      placeholder: "Optional notes about your sleep...",
      hint: "Optional: Add context",
    },
  },

  exercise: {
    family: "exercise",
    label: "Exercise",
    icon: "dumbbell",
    defaultColor: "hsl(0, 84%, 60%)",
    chartType: "area",
    primaryField: {
      key: "value",
      label: "Duration",
      placeholder: "Duration (minutes) or Calories",
      inputType: "number",
      unitOptions: ["kcal"],
      defaultUnit: "kcal",
    },
    noteField: {
      label: "Activity Name",
      placeholder: "e.g., Leg Day, Cardio, Morning Run",
      hint: "What did you do?",
    },
  },

  social: {
    family: "social",
    label: "Social",
    icon: "users",
    defaultColor: "hsl(280, 65%, 60%)",
    chartType: "bar",
    primaryField: {
      key: "value",
      label: "Satisfaction Level",
      placeholder: "Satisfaction Level (1-10) or Hours",
      inputType: "number",
    },
    noteField: {
      label: "Who were you with?",
      placeholder: "@tag friends or names",
      hint: "e.g., @Mom, with John and Sarah",
    },
  },

  tasks: {
    family: "tasks",
    label: "Tasks",
    icon: "check-square",
    defaultColor: "hsl(142, 76%, 40%)",
    chartType: "bar",
    primaryField: {
      key: "value",
      label: "Task Description",
      placeholder: "Task Description",
      inputType: "text",
    },
  },

  savings: {
    family: "savings",
    label: "Savings",
    icon: "wallet",
    defaultColor: "hsl(142, 70%, 45%)",
    chartType: "line",
    primaryField: {
      key: "value",
      label: "Amount",
      placeholder: "Amount ($)",
      inputType: "number",
      unitOptions: ["kcal"],
      defaultUnit: "$",
    },
    noteField: {
      label: "Category / Item",
      placeholder: "e.g., Groceries, Coffee, Salary",
      hint: "What was this for?",
    },
  },

  books: {
    family: "books",
    label: "Books",
    icon: "book",
    defaultColor: "hsl(200, 80%, 50%)",
    chartType: "bar",
    primaryField: {
      key: "value",
      label: "Book Title",
      placeholder: "What book are you reading?",
      inputType: "text",
    },
    noteField: {
      label: "Pages Read",
      placeholder: "e.g., 250 pages, Chapter 5",
    },
  },

  gaming: {
    family: "gaming",
    label: "Gaming",
    icon: "gamepad-2",
    defaultColor: "hsl(280, 80%, 55%)",
    chartType: "bar",
    primaryField: {
      key: "value",
      label: "Game Name",
      placeholder: "What game did you play?",
      inputType: "text",
    },
    noteField: {
      label: "Hours Played",
      placeholder: "e.g., 2.5 hours",
    },
  },

  media: {
    family: "media",
    label: "Media",
    icon: "music",
    defaultColor: "hsl(330, 75%, 55%)",
    chartType: "bar",
    primaryField: {
      key: "value",
      label: "Title",
      placeholder: "Show, Book, or App name...",
      inputType: "text",
    },
    noteField: {
      label: "Rating / Progress",
      placeholder: "e.g., 4 stars, 1h",
    },
  },

  diet: {
    family: "diet",
    label: "Diet",
    icon: "flame",
    defaultColor: "hsl(25, 95%, 53%)",
    chartType: "bar",
    primaryField: {
      key: "mealType",
      label: "Meal Type",
      placeholder: "Select meal type",
      inputType: "text",
    },
    secondaryFields: [
      {
        key: "mealName",
        label: "Food",
        placeholder: "e.g., Grilled chicken, Salad, Protein shake",
        inputType: "text",
      },
      {
        key: "calories",
        label: "Calories",
        placeholder: "e.g., 450",
        inputType: "number",
        unitOptions: ["kcal"],
        defaultUnit: "kcal",
        optional: true,
      },
    ],
    noteField: {
      label: "Food Tags (for Health correlation)",
      placeholder: "e.g., dairy, gluten, nuts, spicy, fried",
      hint: "Tags correlate with Health tracker symptoms",
    },
  },

  meditation: {
    family: "meditation",
    label: "Meditation",
    icon: "brain",
    defaultColor: "hsl(270, 60%, 55%)",
    chartType: "bar",
    primaryField: {
      key: "duration",
      label: "Duration",
      placeholder: "Minutes",
      inputType: "number",
    },
    secondaryFields: [
      {
        key: "sessionType",
        label: "Session Type",
        placeholder: "guided, unguided, breathing, body scan",
        inputType: "text",
      },
    ],
    noteField: {
      label: "How did it make you feel?",
      placeholder: "e.g., Calm, Refreshed, Restless",
      hint: "Tags about how you felt during and after",
    },
  },

  health: {
    family: "health",
    label: "Health",
    icon: "heart",
    defaultColor: "hsl(0, 70%, 50%)",
    chartType: "bar",
    primaryField: {
      key: "category",
      label: "Category",
      placeholder: "Select category",
      inputType: "text",
    },
    secondaryFields: [
      {
        key: "symptom",
        label: "Symptom",
        placeholder: "e.g., Headache, Fatigue, Brain fog",
        inputType: "text",
      },
      {
        key: "severity",
        label: "Severity",
        placeholder: "1-10",
        inputType: "rating",
      },
    ],
    noteField: {
      label: "Possible Causes",
      placeholder: "e.g., dairy, gluten, lack of sleep, stress",
      hint: "Foods or factors that might have caused this (correlates with Diet)",
    },
  },

  generic: {
    family: "generic",
    label: "Generic",
    icon: "zap",
    defaultColor: "hsl(210, 12%, 50%)",
    chartType: "none",
    primaryField: {
      key: "value",
      label: "Value",
      placeholder: "Enter value...",
      inputType: "number",
    },
    noteField: {
      label: "Note",
      placeholder: "Optional note or comment...",
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Family Detection
// ─────────────────────────────────────────────────────────────────────────────

const FAMILY_KEYWORDS: Record<TrackerFamily, string[]> = {
  weight: ["weight", "peso"],
  mood: ["mood", "feeling"],
  sleep: ["sleep", "sleeping", "bedtime", "siesta"],
  exercise: ["exercise", "workout", "fitness"],
  social: ["social", "friends", "people"],
  tasks: ["task", "todo", "checklist"],
  savings: ["money", "finance", "saving", "budget", "expense", "savings"],
  books: ["book", "reading"],
  gaming: ["game", "gaming"],
  media: ["tv", "show", "movie", "series", "media", "app"],
  diet: ["diet", "food", "meal", "calorie", "nutrition"],
  meditation: ["meditation", "meditate", "mindfulness", "breathing"],
  health: ["health", "symptom", "sickness", "pain", "depression", "injury", "allergy", "inflammation"],
  generic: [],
}

/**
 * Detect the tracker family from its name and icon.
 * This is the SINGLE place for family detection logic.
 */
export function detectTrackerFamily(
  name: string,
  icon?: string | null,
  semanticType?: string | null
): TrackerFamily {
  // Priority 1: semanticType (for custom trackers based on presets)
  if (semanticType) {
    const semanticToFamily: Record<string, TrackerFamily> = {
      weight: "weight",
      mood: "mood",
      sleep: "sleep",
      exercise: "exercise",
      diet: "diet",
      gaming: "gaming",
      book: "books",
      books: "books",
      meditation: "meditation",
      social: "social",
      health: "health",
      tasks: "tasks",
      savings: "savings",
      media: "media",
    }
    if (semanticToFamily[semanticType]) {
      return semanticToFamily[semanticType]
    }
  }

  // Priority 2: name and icon keywords
  const nameLower = name.toLowerCase()
  const iconLower = (icon || "").toLowerCase()

  for (const [family, keywords] of Object.entries(FAMILY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (nameLower.includes(keyword) || iconLower === keyword) {
        return family as TrackerFamily
      }
    }
  }

  return "generic"
}

/**
 * Get the full config for a tracker based on its name, icon, and semanticType.
 * semanticType takes priority for custom trackers.
 */
export function getTrackerConfig(
  name: string,
  icon?: string | null,
  semanticType?: string | null
): TrackerTypeConfig {
  const family = detectTrackerFamily(name, icon, semanticType)
  return TRACKER_CONFIGS[family]
}

/**
 * Semantic type for tracker-specific UI rendering.
 * More specific than TrackerFamily for detail view differentiation.
 */
export type TrackerSemanticType =
  | "sleep"
  | "meditation"
  | "health"
  | "diet"
  | "gaming"
  | "book"
  | "mood"
  | "exercise"
  | "weight"
  | "social"
  | "generic"

const FAMILY_TO_SEMANTIC: Record<TrackerFamily, TrackerSemanticType> = {
  weight: "weight",
  mood: "mood",
  sleep: "sleep",
  exercise: "exercise",
  social: "social",
  tasks: "generic",
  savings: "generic",
  books: "book",
  gaming: "gaming",
  media: "generic",
  diet: "diet",
  meditation: "meditation",
  health: "health",
  generic: "generic",
}

/**
 * Get the semantic type for a tracker.
 * Used by TrackerDetailView to determine which specialized UI to render.
 *
 * Priority:
 * 1. tracker.config.semanticType (explicit override)
 * 2. Detect from name + icon keywords
 */
export function getTrackerSemanticType(tracker: { name: string; icon?: string | null; config?: { semanticType?: string | null } | null }): TrackerSemanticType {
  // Priority 1: explicit semanticType in tracker config
  if (tracker.config?.semanticType) {
    const semanticType = tracker.config.semanticType
    // Map semanticType strings to TrackerSemanticType
    const semanticMap: Record<string, TrackerSemanticType> = {
      sleep: "sleep",
      meditation: "meditation",
      health: "health",
      diet: "diet",
      gaming: "gaming",
      book: "book",
      books: "book",
      mood: "mood",
      exercise: "exercise",
      weight: "weight",
      social: "social",
    }
    if (semanticMap[semanticType]) {
      return semanticMap[semanticType]
    }
  }

  // Priority 2: detect from name + icon using existing detectTrackerFamily
  const family = detectTrackerFamily(tracker.name, tracker.icon, tracker.config?.semanticType)
  return FAMILY_TO_SEMANTIC[family] ?? "generic"
}

/**
 * Get all trackers of a specific family.
 */
export function getTrackersByFamily<K extends TrackerFamily>(
  family: K
): TrackerTypeConfig[] {
  return [TRACKER_CONFIGS[family]]
}
