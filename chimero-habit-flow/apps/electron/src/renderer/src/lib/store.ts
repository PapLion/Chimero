import { create } from "zustand"
import type { Tracker, Entry, TrackerConfig, Reminder } from "@packages/db"

export type { Tracker, Entry, TrackerConfig, Reminder }
export type TrackerType = Tracker["type"]
export type PageType = "home" | "calendar" | "assets" | "custom-trackers" | "tracking" | "stats"
export type AssetCategory = "games" | "books" | "tv" | "apps" | "person" | "other"
export type AssetType = "svg" | "png" | "jpg" | "gif" | "webp" | "other"

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
  // Optional optimized thumbnail URL for previews (when available from backend)
  thumbnailUrl?: string | null
}

/** UI-only state. Server data lives in TanStack Query (lib/queries.ts). */
interface AppState {
  activeTracker: number | null
  currentPage: PageType
  sidebarCollapsed: boolean
  commandBarOpen: boolean
  isQuickEntryOpen: boolean
  isNotificationsOpen: boolean
  selectedDate: Date
  setActiveTracker: (id: number | null) => void
  setCurrentPage: (page: PageType) => void
  toggleSidebar: () => void
  toggleCommandBar: () => void
  setQuickEntryOpen: (open: boolean) => void
  toggleNotifications: () => void
  setNotificationsOpen: (open: boolean) => void
  setSelectedDate: (date: Date) => void
  goToPreviousDay: () => void
  goToNextDay: () => void
  goToToday: () => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTracker: null,
  currentPage: "home",
  sidebarCollapsed: false,
  commandBarOpen: false,
  isQuickEntryOpen: false,
  isNotificationsOpen: false,
  selectedDate: new Date(),
  setActiveTracker: (id) => set({ activeTracker: id }),
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleCommandBar: () => set((state) => ({ commandBarOpen: !state.commandBarOpen })),
  setQuickEntryOpen: (open) => set({ isQuickEntryOpen: open, commandBarOpen: open }),
  toggleNotifications: () => set((state) => ({ isNotificationsOpen: !state.isNotificationsOpen })),
  setNotificationsOpen: (open) => set({ isNotificationsOpen: open }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  goToPreviousDay: () => set((state) => {
    const newDate = new Date(state.selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    return { selectedDate: newDate }
  }),
  goToNextDay: () => set((state) => {
    const newDate = new Date(state.selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    return { selectedDate: newDate }
  }),
  goToToday: () => set({ selectedDate: new Date() }),
}))
