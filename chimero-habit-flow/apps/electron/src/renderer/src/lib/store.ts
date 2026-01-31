import { create } from "zustand"

export type TrackerType = "counter" | "rating" | "list"
export type PageType = "home" | "calendar" | "assets" | "custom-trackers" | "tracking"
export type AssetCategory = "games" | "books" | "tv" | "apps" | "other"
export type AssetType = "svg" | "png" | "jpg" | "gif" | "webp" | "other"

export interface TrackerConfig {
  min?: number
  max?: number
  unit?: string
  goal?: number
  options?: string[]
}

export interface Tracker {
  id: number
  name: string
  type: TrackerType
  icon: string
  color: string
  config: TrackerConfig
  isCustom: boolean
  createdAt: number
}

export interface Entry {
  id: number
  trackerId: number
  value: number
  metadata: Record<string, unknown>
  timestamp: number
}

export interface Widget {
  id: string
  trackerId: number
  position: number
  size: "small" | "medium" | "large"
}

export interface Asset {
  id: string
  name: string
  category: AssetCategory
  url: string
  type: AssetType
  size?: number
  createdAt: number
}

interface AppState {
  trackers: Tracker[]
  entries: Entry[]
  widgets: Widget[]
  assets: Asset[]
  activeTracker: number | null
  currentPage: PageType
  sidebarCollapsed: boolean
  commandBarOpen: boolean
  setActiveTracker: (id: number | null) => void
  setCurrentPage: (page: PageType) => void
  toggleSidebar: () => void
  toggleCommandBar: () => void
  addEntry: (entry: Omit<Entry, "id">) => void
  reorderWidgets: (widgets: Widget[]) => void
  addAsset: (asset: Omit<Asset, "id" | "createdAt">) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  deleteAsset: (id: string) => void
  // Custom Tracker CRUD
  addTracker: (tracker: Omit<Tracker, "id" | "createdAt">) => void
  updateTracker: (id: number, updates: Partial<Tracker>) => void
  deleteTracker: (id: number) => void
}

// Mock data simulating SQLite database
const mockTrackers: Tracker[] = [
  { id: 1, name: "Weight", type: "counter", icon: "scale", color: "#a855f7", config: { unit: "kg", goal: 70 }, isCustom: false, createdAt: Date.now() - 86400000 * 30 },
  { id: 2, name: "Mood", type: "rating", icon: "smile", color: "#f59e0b", config: { max: 5 }, isCustom: false, createdAt: Date.now() - 86400000 * 30 },
  { id: 3, name: "Exercise", type: "counter", icon: "dumbbell", color: "#22c55e", config: { unit: "min", goal: 30 }, isCustom: false, createdAt: Date.now() - 86400000 * 30 },
  { id: 4, name: "Social", type: "counter", icon: "users", color: "#3b82f6", config: { unit: "interactions" }, isCustom: false, createdAt: Date.now() - 86400000 * 30 },
  { id: 5, name: "Tasks", type: "list", icon: "check-square", color: "#ef4444", config: {}, isCustom: false, createdAt: Date.now() - 86400000 * 30 },
  { id: 6, name: "Savings", type: "counter", icon: "wallet", color: "#10b981", config: { unit: "$", goal: 10000 }, isCustom: false, createdAt: Date.now() - 86400000 * 30 },
  // Custom trackers
  { id: 7, name: "CS2 Hours", type: "counter", icon: "gamepad-2", color: "#f97316", config: { unit: "hours" }, isCustom: true, createdAt: Date.now() - 86400000 * 5 },
  { id: 8, name: "Reading", type: "counter", icon: "book", color: "#8b5cf6", config: { unit: "pages", goal: 50 }, isCustom: true, createdAt: Date.now() - 86400000 * 3 },
]

const mockEntries: Entry[] = [
  { id: 1, trackerId: 1, value: 72.5, metadata: { note: "Morning weigh-in" }, timestamp: Date.now() - 86400000 * 6 },
  { id: 2, trackerId: 1, value: 72.2, metadata: {}, timestamp: Date.now() - 86400000 * 5 },
  { id: 3, trackerId: 1, value: 71.8, metadata: {}, timestamp: Date.now() - 86400000 * 4 },
  { id: 4, trackerId: 1, value: 71.5, metadata: {}, timestamp: Date.now() - 86400000 * 3 },
  { id: 5, trackerId: 1, value: 71.9, metadata: {}, timestamp: Date.now() - 86400000 * 2 },
  { id: 6, trackerId: 1, value: 71.3, metadata: {}, timestamp: Date.now() - 86400000 },
  { id: 7, trackerId: 1, value: 71.0, metadata: {}, timestamp: Date.now() },
  { id: 8, trackerId: 2, value: 4, metadata: { note: "Great day!" }, timestamp: Date.now() - 86400000 * 6 },
  { id: 9, trackerId: 2, value: 3, metadata: {}, timestamp: Date.now() - 86400000 * 5 },
  { id: 10, trackerId: 2, value: 5, metadata: {}, timestamp: Date.now() - 86400000 * 4 },
  { id: 11, trackerId: 2, value: 4, metadata: {}, timestamp: Date.now() - 86400000 * 3 },
  { id: 12, trackerId: 2, value: 3, metadata: {}, timestamp: Date.now() - 86400000 * 2 },
  { id: 13, trackerId: 2, value: 4, metadata: {}, timestamp: Date.now() - 86400000 },
  { id: 14, trackerId: 2, value: 5, metadata: {}, timestamp: Date.now() },
  { id: 15, trackerId: 3, value: 45, metadata: { activity: "Running" }, timestamp: Date.now() - 86400000 * 6 },
  { id: 16, trackerId: 3, value: 30, metadata: { activity: "Gym" }, timestamp: Date.now() - 86400000 * 4 },
  { id: 17, trackerId: 3, value: 60, metadata: { activity: "Swimming" }, timestamp: Date.now() - 86400000 * 2 },
  { id: 18, trackerId: 3, value: 25, metadata: { activity: "Walking" }, timestamp: Date.now() },
  { id: 19, trackerId: 4, value: 5, metadata: {}, timestamp: Date.now() - 86400000 * 3 },
  { id: 20, trackerId: 4, value: 8, metadata: {}, timestamp: Date.now() - 86400000 },
  { id: 21, trackerId: 4, value: 3, metadata: {}, timestamp: Date.now() },
  { id: 22, trackerId: 6, value: 8500, metadata: {}, timestamp: Date.now() - 86400000 * 6 },
  { id: 23, trackerId: 6, value: 8750, metadata: {}, timestamp: Date.now() - 86400000 * 3 },
  { id: 24, trackerId: 6, value: 9200, metadata: {}, timestamp: Date.now() },
]

const mockWidgets: Widget[] = [
  { id: "widget-1", trackerId: 1, position: 0, size: "large" },
  { id: "widget-2", trackerId: 2, position: 1, size: "medium" },
  { id: "widget-3", trackerId: 3, position: 2, size: "medium" },
  { id: "widget-4", trackerId: 4, position: 3, size: "small" },
  { id: "widget-5", trackerId: 5, position: 4, size: "small" },
  { id: "widget-6", trackerId: 6, position: 5, size: "large" },
]

const mockAssets: Asset[] = [
  {
    id: "asset-1",
    name: "Elden Ring",
    category: "games",
    url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23764ba2' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='12'%3EER%3C/text%3E%3C/svg%3E",
    type: "svg",
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: "asset-2",
    name: "Dune",
    category: "books",
    url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='12'%3EDune%3C/text%3E%3C/svg%3E",
    type: "svg",
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: "asset-3",
    name: "Breaking Bad",
    category: "tv",
    url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%2343a047' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='12'%3EBB%3C/text%3E%3C/svg%3E",
    type: "svg",
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: "asset-4",
    name: "Spotify",
    category: "apps",
    url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%231db954' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='12'%3ESpotify%3C/text%3E%3C/svg%3E",
    type: "svg",
    createdAt: Date.now() - 86400000 * 2,
  },
]

export const useAppStore = create<AppState>((set) => ({
  trackers: mockTrackers,
  entries: mockEntries,
  widgets: mockWidgets,
  assets: mockAssets,
  activeTracker: null,
  currentPage: "home",
  sidebarCollapsed: false,
  commandBarOpen: false,
  setActiveTracker: (id) => set({ activeTracker: id }),
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleCommandBar: () => set((state) => ({ commandBarOpen: !state.commandBarOpen })),
  addEntry: (entry) =>
    set((state) => ({
      entries: [...state.entries, { ...entry, id: state.entries.length + 1 }],
    })),
  reorderWidgets: (widgets) => set({ widgets }),
  addAsset: (asset) =>
    set((state) => ({
      assets: [
        ...state.assets,
        { ...asset, id: `asset-${Date.now()}`, createdAt: Date.now() },
      ],
    })),
  updateAsset: (id, updates) =>
    set((state) => ({
      assets: state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  deleteAsset: (id) =>
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
    })),
  // Custom Tracker CRUD
  addTracker: (tracker) =>
    set((state) => ({
      trackers: [
        ...state.trackers,
        { ...tracker, id: Math.max(...state.trackers.map((t) => t.id)) + 1, createdAt: Date.now() },
      ],
    })),
  updateTracker: (id, updates) =>
    set((state) => ({
      trackers: state.trackers.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  deleteTracker: (id) =>
    set((state) => ({
      trackers: state.trackers.filter((t) => t.id !== id),
      // Also remove associated entries and widgets
      entries: state.entries.filter((e) => e.trackerId !== id),
      widgets: state.widgets.filter((w) => w.trackerId !== id),
    })),
}))
