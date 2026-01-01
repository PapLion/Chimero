"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type {
  Asset,
  ActivityLog,
  ExerciseData,
  DietData,
  WeightData,
  TasksData,
  MediaData,
  BooksData,
  GamingData,
  TVData,
  MoodData,
  SocialData,
  CustomTrackerConfig,
  CustomTrackerEntry,
  DashboardLayout,
  DashboardWidget,
  TrackingPageLayouts,
  TrackingPageLayout,
} from "@/types"

interface AppDataContextType {
  assets: Asset[]
  activityLogs: ActivityLog[]
  customTrackers: CustomTrackerConfig[]
  customTrackerEntries: CustomTrackerEntry[]
  dashboardLayout: DashboardLayout
  trackingPageLayouts: TrackingPageLayouts
  addAsset: (asset: Omit<Asset, "id">) => void
  updateAsset: (id: number, updates: Partial<Asset>) => void
  deleteAsset: (id: number) => void
  addActivityLog: (log: Omit<ActivityLog, "id">) => void
  updateActivityLog: (id: number, updates: Partial<ActivityLog>) => void
  deleteActivityLog: (id: number) => void
  addCustomTracker: (tracker: Omit<CustomTrackerConfig, "id" | "createdAt" | "updatedAt">) => void
  updateCustomTracker: (id: string, updates: Partial<CustomTrackerConfig>) => void
  deleteCustomTracker: (id: string) => void
  addCustomTrackerEntry: (entry: Omit<CustomTrackerEntry, "id" | "timestamp">) => void
  updateCustomTrackerEntry: (id: number, updates: Partial<CustomTrackerEntry>) => void
  deleteCustomTrackerEntry: (id: number) => void
  getTrackerEntries: (trackerId: string) => CustomTrackerEntry[]
  updateWidgetPosition: (widgetId: string, x: number, y: number) => void
  updateDashboardLayout: (widgets: DashboardWidget[]) => void
  toggleWidgetVisibility: (widgetId: string) => void
  isTrackerVisibleOnDashboard: (trackerId: string) => boolean
  updateTrackingPageLayout: (pageId: string, layout: TrackingPageLayout) => void
  getTrackingPageLayout: (pageId: string) => TrackingPageLayout | undefined
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined)

const STORAGE_KEYS = {
  ASSETS: "habit-tracker-assets",
  ACTIVITY_LOGS: "habit-tracker-activity-logs",
  CUSTOM_TRACKERS: "habit-tracker-custom-trackers",
  CUSTOM_TRACKER_ENTRIES: "habit-tracker-custom-tracker-entries",
  DASHBOARD_LAYOUT: "habit-tracker-dashboard-layout",
  TRACKING_PAGE_LAYOUTS: "habit-tracker-tracking-page-layouts",
}

const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  gridColumns: 4,
  updatedAt: new Date(),
  widgets: [
    { id: "exercise", type: "builtin", size: { width: 1, height: 1 }, position: { x: 0, y: 0 }, visible: true },
    { id: "diet", type: "builtin", size: { width: 1, height: 1 }, position: { x: 1, y: 0 }, visible: true },
    { id: "weight", type: "builtin", size: { width: 2, height: 1 }, position: { x: 2, y: 0 }, visible: true },
    { id: "tasks", type: "builtin", size: { width: 1, height: 1 }, position: { x: 0, y: 1 }, visible: true },
    { id: "mood", type: "builtin", size: { width: 1, height: 1 }, position: { x: 1, y: 1 }, visible: true },
    { id: "social", type: "builtin", size: { width: 1, height: 1 }, position: { x: 2, y: 1 }, visible: true },
    { id: "media", type: "builtin", size: { width: 1, height: 1 }, position: { x: 3, y: 1 }, visible: true },
    { id: "tv", type: "builtin", size: { width: 1, height: 1 }, position: { x: 0, y: 2 }, visible: true },
    { id: "books", type: "builtin", size: { width: 1, height: 1 }, position: { x: 1, y: 2 }, visible: true },
    { id: "gaming", type: "builtin", size: { width: 1, height: 1 }, position: { x: 2, y: 2 }, visible: true },
  ],
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [customTrackers, setCustomTrackers] = useState<CustomTrackerConfig[]>([])
  const [customTrackerEntries, setCustomTrackerEntries] = useState<CustomTrackerEntry[]>([])
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>(DEFAULT_DASHBOARD_LAYOUT)
  const [trackingPageLayouts, setTrackingPageLayouts] = useState<TrackingPageLayouts>({})
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const storedAssets = localStorage.getItem(STORAGE_KEYS.ASSETS)
    const storedLogs = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS)
    const storedTrackers = localStorage.getItem(STORAGE_KEYS.CUSTOM_TRACKERS)
    const storedEntries = localStorage.getItem(STORAGE_KEYS.CUSTOM_TRACKER_ENTRIES)
    const storedLayout = localStorage.getItem(STORAGE_KEYS.DASHBOARD_LAYOUT)
    const storedTrackingLayouts = localStorage.getItem(STORAGE_KEYS.TRACKING_PAGE_LAYOUTS)

    if (storedAssets) {
      setAssets(JSON.parse(storedAssets))
    }
    if (storedLogs) {
      setActivityLogs(JSON.parse(storedLogs))
    }
    if (storedTrackers) {
      setCustomTrackers(JSON.parse(storedTrackers))
    }
    if (storedEntries) {
      setCustomTrackerEntries(JSON.parse(storedEntries))
    }
    if (storedLayout) {
      setDashboardLayout(JSON.parse(storedLayout))
    }
    if (storedTrackingLayouts) {
      setTrackingPageLayouts(JSON.parse(storedTrackingLayouts))
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets))
    }
  }, [assets, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(activityLogs))
    }
  }, [activityLogs, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_TRACKERS, JSON.stringify(customTrackers))
    }
  }, [customTrackers, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_TRACKER_ENTRIES, JSON.stringify(customTrackerEntries))
    }
  }, [customTrackerEntries, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.DASHBOARD_LAYOUT, JSON.stringify(dashboardLayout))
    }
  }, [dashboardLayout, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.TRACKING_PAGE_LAYOUTS, JSON.stringify(trackingPageLayouts))
    }
  }, [trackingPageLayouts, isHydrated])

  const addAsset = (asset: Omit<Asset, "id">) => {
    const newAsset: Asset = {
      ...asset,
      id: Date.now(),
      uploadedAt: new Date(),
      updatedAt: new Date(),
    }
    setAssets((prev) => [...prev, newAsset])
  }

  const updateAsset = (id: number, updates: Partial<Asset>) => {
    setAssets((prev) =>
      prev.map((asset) => (asset.id === id ? { ...asset, ...updates, updatedAt: new Date() } : asset)),
    )
  }

  const deleteAsset = (id: number) => {
    setAssets((prev) => prev.filter((asset) => asset.id !== id))
    setActivityLogs((prev) =>
      prev.map((log) => {
        const updatedLog = { ...log }

        if (log.type === "book") {
          const bookData = log.data as BooksData
          if (bookData.currentBook?.coverAssetId === id) {
            bookData.currentBook.coverAssetId = undefined
          }
        } else if (log.type === "game") {
          const gameData = log.data as GamingData
          if (gameData.coverAssetId === id) {
            gameData.coverAssetId = undefined
          }
        } else if (log.type === "tv") {
          const tvData = log.data as TVData
          if (tvData.currentShow?.posterAssetId === id) {
            tvData.currentShow.posterAssetId = undefined
          }
        } else if (log.type === "exercise") {
          const exerciseData = log.data as ExerciseData
          if (exerciseData.guideAssetIds) {
            exerciseData.guideAssetIds = exerciseData.guideAssetIds.filter((assetId: number) => assetId !== id)
          }
        } else if (log.type === "diet") {
          const dietData = log.data as DietData
          if (dietData.photoAssetIds) {
            dietData.photoAssetIds = dietData.photoAssetIds.filter((assetId: number) => assetId !== id)
          }
        } else if (log.type === "weight") {
          const weightData = log.data as WeightData
          if (weightData.photoAssetIds) {
            weightData.photoAssetIds = weightData.photoAssetIds.filter((assetId: number) => assetId !== id)
          }
        } else if (log.type === "task") {
          const taskData = log.data as TasksData
          if (taskData.attachmentAssetIds) {
            taskData.attachmentAssetIds = taskData.attachmentAssetIds.filter((assetId: number) => assetId !== id)
          }
        } else if (log.type === "media") {
          const mediaData = log.data as MediaData
          if (mediaData.thumbnailAssetId === id) {
            mediaData.thumbnailAssetId = undefined
          }
        } else if (log.type === "mood") {
          const moodData = log.data as MoodData
          if (moodData.photoAssetIds) {
            moodData.photoAssetIds = moodData.photoAssetIds.filter((assetId: number) => assetId !== id)
          }
        } else if (log.type === "social") {
          const socialData = log.data as SocialData
          if (socialData.photoAssetIds) {
            socialData.photoAssetIds = socialData.photoAssetIds.filter((assetId: number) => assetId !== id)
          }
        }

        return updatedLog
      }),
    )
  }

  const addActivityLog = (log: Omit<ActivityLog, "id">) => {
    const newLog: ActivityLog = {
      ...log,
      id: Date.now(),
    }
    setActivityLogs((prev) => [...prev, newLog])
  }

  const updateActivityLog = (id: number, updates: Partial<ActivityLog>) => {
    setActivityLogs((prev) => prev.map((log) => (log.id === id ? { ...log, ...updates } : log)))
  }

  const deleteActivityLog = (id: number) => {
    setActivityLogs((prev) => prev.filter((log) => log.id !== id))
  }

  const addCustomTracker = (tracker: Omit<CustomTrackerConfig, "id" | "createdAt" | "updatedAt">) => {
    const newTracker: CustomTrackerConfig = {
      ...tracker,
      id: `custom-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setCustomTrackers((prev) => [...prev, newTracker])

    if (newTracker.showOnDashboard) {
      setDashboardLayout((prev) => {
        const newWidget: DashboardWidget = {
          id: newTracker.id,
          type: "custom",
          size: { width: 1, height: 1 },
          position: { x: 0, y: 999 },
          visible: true,
        }
        return {
          ...prev,
          widgets: [...prev.widgets, newWidget],
          updatedAt: new Date(),
        }
      })
    }
  }

  const updateCustomTracker = (id: string, updates: Partial<CustomTrackerConfig>) => {
    setCustomTrackers((prev) =>
      prev.map((tracker) => (tracker.id === id ? { ...tracker, ...updates, updatedAt: new Date() } : tracker)),
    )

    if ("showOnDashboard" in updates) {
      setDashboardLayout((prev) => {
        const existingWidget = prev.widgets.find((w) => w.id === id)

        if (updates.showOnDashboard && !existingWidget) {
          const newWidget: DashboardWidget = {
            id,
            type: "custom",
            size: { width: 1, height: 1 },
            position: { x: 0, y: 999 },
            visible: true,
          }
          return {
            ...prev,
            widgets: [...prev.widgets, newWidget],
            updatedAt: new Date(),
          }
        } else if (!updates.showOnDashboard && existingWidget) {
          return {
            ...prev,
            widgets: prev.widgets.filter((w) => w.id !== id),
            updatedAt: new Date(),
          }
        }

        return prev
      })
    }
  }

  const deleteCustomTracker = (id: string) => {
    setCustomTrackers((prev) => prev.filter((tracker) => tracker.id !== id))
    setCustomTrackerEntries((prev) => prev.filter((entry) => entry.trackerId !== id))
    setDashboardLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== id),
      updatedAt: new Date(),
    }))
  }

  const addCustomTrackerEntry = (entry: Omit<CustomTrackerEntry, "id" | "timestamp">) => {
    const newEntry: CustomTrackerEntry = {
      ...entry,
      id: Date.now(),
      timestamp: new Date(),
    }
    setCustomTrackerEntries((prev) => [...prev, newEntry])
  }

  const updateCustomTrackerEntry = (id: number, updates: Partial<CustomTrackerEntry>) => {
    setCustomTrackerEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)))
  }

  const deleteCustomTrackerEntry = (id: number) => {
    setCustomTrackerEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const getTrackerEntries = (trackerId: string) => {
    return customTrackerEntries.filter((entry) => entry.trackerId === trackerId)
  }

  const updateWidgetPosition = (widgetId: string, x: number, y: number) => {
    setDashboardLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === widgetId ? { ...w, position: { x, y } } : w)),
      updatedAt: new Date(),
    }))
  }

  const updateDashboardLayout = (widgets: DashboardWidget[]) => {
    setDashboardLayout((prev) => ({
      ...prev,
      widgets,
      updatedAt: new Date(),
    }))
  }

  const toggleWidgetVisibility = (widgetId: string) => {
    setDashboardLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === widgetId ? { ...w, visible: !w.visible } : w)),
      updatedAt: new Date(),
    }))
  }

  const isTrackerVisibleOnDashboard = (trackerId: string) => {
    const widget = dashboardLayout.widgets.find((w) => w.id === trackerId)
    return widget?.visible ?? false
  }

  const updateTrackingPageLayout = (pageId: string, layout: TrackingPageLayout) => {
    setTrackingPageLayouts((prev) => ({
      ...prev,
      [pageId]: layout,
    }))
  }

  const getTrackingPageLayout = (pageId: string) => {
    return trackingPageLayouts[pageId]
  }

  return (
    <AppDataContext.Provider
      value={{
        assets,
        activityLogs,
        customTrackers,
        customTrackerEntries,
        dashboardLayout,
        trackingPageLayouts,
        addAsset,
        updateAsset,
        deleteAsset,
        addActivityLog,
        updateActivityLog,
        deleteActivityLog,
        addCustomTracker,
        updateCustomTracker,
        deleteCustomTracker,
        addCustomTrackerEntry,
        updateCustomTrackerEntry,
        deleteCustomTrackerEntry,
        getTrackerEntries,
        updateWidgetPosition,
        updateDashboardLayout,
        toggleWidgetVisibility,
        isTrackerVisibleOnDashboard,
        updateTrackingPageLayout,
        getTrackingPageLayout,
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider")
  }
  return context
}
