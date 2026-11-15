export const GRID_COLUMNS = 12

export type WidgetType =
  | 'tracker'
  | 'trend'
  | 'heatmap'
  | 'streak'
  | 'day-log'
  | 'reminders'
  | 'people'
  | 'insight'
  | 'note'

export interface GridRect {
  x: number
  y: number
  w: number
  h: number
}

export interface DashboardWidget extends GridRect {
  id: string
  type: WidgetType
  /** tracker widgets */
  trackerId?: number
  /** trend widgets: metric id from the analytics catalog */
  metricId?: string
  /** insight widgets: pinned pair */
  pair?: { a: string; b: string; lagDays: number }
  /** trend/insight: lookback window in days */
  days?: number
  /** note widgets */
  text?: string
  title?: string
}

export interface DashboardLayoutV2 {
  version: 2
  widgets: DashboardWidget[]
}

export interface WidgetSizeRule {
  minW: number
  minH: number
  maxW: number
  maxH: number
  defaultW: number
  defaultH: number
}

export const WIDGET_SIZE_RULES: Record<WidgetType, WidgetSizeRule> = {
  tracker: { minW: 2, minH: 2, maxW: 12, maxH: 8, defaultW: 3, defaultH: 3 },
  trend: { minW: 3, minH: 3, maxW: 12, maxH: 8, defaultW: 6, defaultH: 4 },
  heatmap: { minW: 4, minH: 3, maxW: 12, maxH: 5, defaultW: 8, defaultH: 3 },
  streak: { minW: 2, minH: 2, maxW: 4, maxH: 3, defaultW: 2, defaultH: 2 },
  'day-log': { minW: 3, minH: 3, maxW: 6, maxH: 10, defaultW: 4, defaultH: 5 },
  reminders: { minW: 3, minH: 2, maxW: 6, maxH: 8, defaultW: 3, defaultH: 3 },
  people: { minW: 3, minH: 2, maxW: 6, maxH: 8, defaultW: 3, defaultH: 3 },
  insight: { minW: 3, minH: 2, maxW: 8, maxH: 5, defaultW: 4, defaultH: 3 },
  note: { minW: 2, minH: 2, maxW: 6, maxH: 6, defaultW: 3, defaultH: 2 },
}
