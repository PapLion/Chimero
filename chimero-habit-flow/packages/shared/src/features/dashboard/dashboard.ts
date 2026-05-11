export interface DashboardLayoutItem {
  id: string
  trackerId: number
  position: number
  size: string
}

export type DashboardLayout = DashboardLayoutItem[]

export interface DashboardStats {
  currentStreak: number
  bestStreak: number
  totalActivities: number
  totalEntriesMonth: number
}
