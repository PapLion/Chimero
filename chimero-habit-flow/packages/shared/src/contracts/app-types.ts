/**
 * Shared app-level contracts used across Main, Preload, and Renderer.
 * These align with the Drizzle schema but intentionally stay separate from DB runtime.
 */

export type TrackerSchemaType = 'numeric' | 'range' | 'binary' | 'text' | 'composite'

export type TrackerUIType = 'counter' | 'rating' | 'list' | TrackerSchemaType

export interface TrackerConfig {
  min?: number
  max?: number
  unit?: string
  goal?: number
  step?: number
  options?: string[]
  isCustom?: boolean
}

export interface Tracker {
  id: number
  name: string
  type: TrackerSchemaType | TrackerUIType
  icon: string | null
  color: string | null
  order: number
  config: TrackerConfig
  archived: boolean
  isCustom?: boolean
  isFavorite?: boolean
  createdAt: number | null
}

export interface Entry {
  id: number
  trackerId: number
  value: number | null
  note: string | null
  metadata: Record<string, unknown>
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
}

export interface BaseEntryRequest {
  trackerId: number
  value?: number | null
  note?: string | null
  metadata?: Record<string, unknown>
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
}

export interface EntryInsert extends BaseEntryRequest {
  dateStr: string
}

export interface BaseEntryResponse {
  entry: Entry
  tags: Tag[]
}

export interface EntryMutationResponse {
  success: boolean
  entry: Entry | null
  tags?: Tag[]
  error?: string
}

export interface TrackerInsert {
  name: string
  type: TrackerSchemaType
  icon?: string | null
  color?: string | null
  order?: number
  config?: TrackerConfig
  isCustom?: boolean
  archived?: boolean
}

export interface Reminder {
  id: number
  trackerId?: number | null
  title: string
  description?: string | null
  time: string
  date?: string | null
  days: number[] | null
  enabled: boolean
  lastTriggered?: number | null
  completedAt?: number | null
  createdAt: number | null
}

export interface ReminderInsert {
  title: string
  description?: string | null
  trackerId?: number | null
  time: string
  date?: string | null
  days?: number[] | null
  enabled?: boolean
}

export interface Asset {
  id: number
  filename: string
  originalName?: string | null
  path: string
  type: string
  mimeType?: string | null
  size?: number | null
  thumbnailPath?: string | null
  createdAt: number | null
}

export type TagRelationshipKind = 'parent'

export interface Tag {
  id: number
  name: string
  color: string | null
}

export interface TagRelationship {
  parentTagId: number
  childTagId: number
  relationshipType?: TagRelationshipKind
}

export interface TagTree extends Tag {
  children: TagTree[]
}

export interface ResolvedTagTreeResponse {
  tags: Tag[]
  relationships: TagRelationship[]
  tree: TagTree[]
}

export interface ResolveTagInheritanceRequest {
  tagIds: number[]
}

export interface ResolveTagInheritanceResponse {
  requestedTagIds: number[]
  resolvedTagIds: number[]
  tags: Tag[]
}

export interface QuickEntryOpenRequest {
  trackerId?: number | null
  mode?: 'activity' | 'reminder'
  timestamp?: number
}

export interface QuickEntryContextResponse {
  recentTrackers: Tracker[]
  favoriteTrackers: Tracker[]
  tags: Tag[]
  suggestedTags: Tag[]
}

export type AssetLinkEntityType = 'entry' | 'tracker' | 'contact' | 'tag' | 'goal'

export interface AssetLink {
  id: number
  assetId: number
  entityType: AssetLinkEntityType
  entityId: number
  relationType: string | null
  createdAt: number | null
}

export type TimelineEventSource = 'entry' | 'reminder' | 'asset' | 'contact'

export interface TimelineEvent {
  id: string
  source: TimelineEventSource
  timestamp: number
  dateStr: string
  title: string
  description?: string | null
  trackerId?: number | null
  entryId?: number | null
  assetId?: number | null
  tagIds?: number[]
  metadata?: Record<string, unknown>
}

export interface StatsQueryRequest {
  trackerIds?: number[]
  tagIds?: number[]
  startDate?: string
  endDate?: string
  groupBy?: 'day' | 'week' | 'month'
}

export interface StatsSeriesPoint {
  date: string
  value: number
  count: number
}

export interface StatsQueryResponse {
  totals: {
    entryCount: number
    trackerCount: number
    activeDays: number
  }
  series: StatsSeriesPoint[]
  caveat: string
}

export interface CorrelationQueryRequest {
  sourceTrackerId: number
  targetTrackerId: number
  offsetDays?: number
  minSampleSize?: number
}

export interface CorrelationResultResponse {
  sourceTrackerId: number
  targetTrackerId: number
  offsetDays: number
  impact: number
  confidence: number
  baselineAvg: number
  impactedAvg: number
  triggeredDays: number
  baselineDays: number
  caveat: string
}

export type WeightUnit = 'kg' | 'lb'
export type MeasurementUnit = 'cm' | 'in'

export interface WeightEntry {
  entryId: number
  trackerId: number
  weight: number
  weightUnit: WeightUnit
  waist: number | null
  waistUnit: MeasurementUnit | null
  bodyFatPercentage: number | null
  note: string | null
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
}

export interface CreateWeightEntryRequest {
  trackerId: number
  weight: number
  weightUnit: WeightUnit
  waist?: number | null
  waistUnit?: MeasurementUnit | null
  bodyFatPercentage?: number | null
  note?: string | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
}

export interface UpdateWeightEntryRequest {
  weight?: number
  weightUnit?: WeightUnit
  waist?: number | null
  waistUnit?: MeasurementUnit | null
  bodyFatPercentage?: number | null
  note?: string | null
  timestamp?: number
  assetId?: number | null
  tagIds?: number[]
}

export interface WeightEntryResponse {
  entry: WeightEntry
  tags: Tag[]
}

export interface WeightEntryHistoryItem {
  entryId: number
  trackerId: number
  weight: number
  weightUnit: WeightUnit
  waist: number | null
  waistUnit: MeasurementUnit | null
  note: string | null
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
  tags?: Tag[]
}

export interface WeightEntriesTabReadModel {
  entries: WeightEntryHistoryItem[]
}

export interface WeightStatisticsReadModel {
  totalEntries: number
  streakDays: number
  weeklyAvg: number | null
  deltaPrevious: number | null
  deltaWeek: number | null
  distanceToGoal: number | null
  goalAchieved: boolean | null
  chartData: Array<{ date: string; weight: number; waist: number | null }>
  waistStats?: {
    latest: number
    unit: MeasurementUnit
    deltaPrevious?: number | null
    trend?: 'up' | 'down' | 'neutral'
  }
}

export interface WeightHomeWidgetReadModel {
  trackerId: number
  title: string
  currentWeight: number | null
  weightUnit: WeightUnit
  deltaPrevious?: number | null
  sparkline: Array<{ date: string; value: number }>
  trend: 'up' | 'down' | 'neutral'
  secondaryWaist?: {
    value: number
    unit: MeasurementUnit
  } | null
}

export type MoodVisualState = 'low' | 'neutral' | 'high'

export interface MoodEntryReadModel {
  entryId: number
  trackerId: number
  moodScore: number
  visualState: MoodVisualState
  color: string
  label: string
  note: string | null
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
}

export interface MoodDailyAggregate {
  date: string
  averageScore: number
  highScore: number
  lowScore: number
  latestScore: number
  count: number
  visualState: MoodVisualState
  color: string
  label: string
  entries: MoodEntryReadModel[]
}

export interface MoodBentoReadModel {
  trackerId: number
  title: string
  selectedDateScore: number | null
  latestScore: number | null
  selectedDayAggregate: MoodDailyAggregate | null
  sparkline: Array<{ date: string; value: number }>
  visualState: MoodVisualState | null
  color: string | null
  label: string | null
}

export interface MoodEntriesReadModel {
  entries: MoodEntryReadModel[]
}

export interface MoodStatisticsReadModel {
  count: number
  averageScore: number | null
  highScore: number | null
  lowScore: number | null
  latestScore: number | null
  chartData: Array<{ date: string; value: number; count: number }>
}

export interface MoodCalendarDayReadModel {
  entries: MoodEntryReadModel[]
  aggregate: MoodDailyAggregate | null
}

export interface WeightDetailResponse {
  current: WeightEntry | null
  history: WeightEntry[]
  chartData: Array<{ date: string; weight: number; waist: number | null }>
  deltaPrevious: number | null
  deltaWeek: number | null
  weeklyAvg: number | null
  activeGoal: TrackerGoal | null
  distanceToGoal: number | null
  goalAchieved: boolean | null
  streakDays: number
}

export type TrackerGoalType = 'target' | 'range' | 'minimum' | 'maximum'
export type TrackerGoalDirection = 'decrease' | 'increase' | 'maintain'

export interface TrackerGoal {
  id: number
  trackerId: number
  goalType: TrackerGoalType
  targetValue: number
  unit: string | null
  direction: TrackerGoalDirection | null
  startDate: string | null
  targetDate: string | null
  active: boolean
  createdAt: number | null
  updatedAt: number | null
}

export interface SetTrackerGoalRequest {
  trackerId: number
  goalType: TrackerGoalType
  targetValue: number
  unit?: string | null
  direction?: TrackerGoalDirection | null
  startDate?: string | null
  targetDate?: string | null
  active?: boolean
}

export interface TrackerGoalResponse {
  goal: TrackerGoal | null
}

export interface Contact {
  id: number
  name: string
  avatarAssetId?: number | null
  birthday?: string | null
  dateMet?: string | null
  dateLastTalked?: string | null
  traits?: string[] | null
  notes?: string | null
  createdAt: number | null
}

export interface ContactInsert {
  name: string
  avatarAssetId?: number | null
  birthday?: string | null
  dateMet?: string | null
  notes?: string | null
}

export interface ContactUpdate {
  name?: string
  avatarAssetId?: number | null
  birthday?: string | null
  dateMet?: string | null
  dateLastTalked?: string | null
  traits?: string[] | null
  notes?: string | null
}

export interface ContactInteraction {
  id: number
  contactId: number
  entryId?: number | null
  mood: 'positive' | 'negative' | 'neutral'
  timestamp: number
  notes?: string | null
}

export interface ContactInteractionInsert {
  contactId: number
  entryId?: number | null
  mood: 'positive' | 'negative' | 'neutral'
  notes?: string | null
}
