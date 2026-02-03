import { create } from "zustand"
import type { Tracker, Entry, TrackerConfig, Reminder } from "@packages/db"

export type { Tracker, Entry, TrackerConfig, Reminder }
export type TrackerType = Tracker["type"]
export type PageType = "home" | "calendar" | "assets" | "custom-trackers" | "tracking"
export type AssetCategory = "games" | "books" | "tv" | "apps" | "other"
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
}

/** UI-only state. Server data lives in TanStack Query (lib/queries.ts). */
interface AppState {
  activeTracker: number | null
  currentPage: PageType
  sidebarCollapsed: boolean
  commandBarOpen: boolean
  isQuickEntryOpen: boolean
  isNotificationsOpen: boolean
  setActiveTracker: (id: number | null) => void
  setCurrentPage: (page: PageType) => void
  toggleSidebar: () => void
  toggleCommandBar: () => void
  setQuickEntryOpen: (open: boolean) => void
  toggleNotifications: () => void
  setNotificationsOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTracker: null,
  currentPage: "home",
  sidebarCollapsed: false,
  commandBarOpen: false,
  isQuickEntryOpen: false,
  isNotificationsOpen: false,
  setActiveTracker: (id) => set({ activeTracker: id }),
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleCommandBar: () => set((state) => ({ commandBarOpen: !state.commandBarOpen })),
  setQuickEntryOpen: (open) => set({ isQuickEntryOpen: open, commandBarOpen: open }),
  toggleNotifications: () => set((state) => ({ isNotificationsOpen: !state.isNotificationsOpen })),
  setNotificationsOpen: (open) => set({ isNotificationsOpen: open }),
}))
