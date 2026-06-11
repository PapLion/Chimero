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
  identity?: string
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
  gaming?: {
    structured: true
    gameTitle: string
    gameKey: string
    estimatedHours: number
  }
  food?: {
    structured: true
    foodName: string
    foodKey: string
    calories: number | null
    mealType: MealType | null
  }
  health?: {
    structured: true
    symptomId: number
    symptomName: string
    symptomKey: string
    category: SymptomCategory
    severity: number | null
  }
  intake?: {
    structured: true
    itemId: number
    itemName: string
    itemKey: string
    itemType: IntakeItemType
    variant: string | null
    dosage: number | null
    unit: string | null
  }
  book?: {
    structured: true
    bookId: number
    title: string
    titleKey: string
    activityType: BookActivityType
  }
}

export type EntryUpdateRequest = {
  value?: number | null
  note?: string | null
  metadata?: Record<string, unknown>
  timestamp?: number
  assetId?: number | null
  tagIds?: number[]
  socialInteractions?: ContactInteractionDraft[]
}

export interface BaseEntryRequest {
  trackerId: number
  value?: number | null
  note?: string | null
  metadata?: Record<string, unknown>
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
  socialInteractions?: ContactInteractionDraft[]
}

export interface GamingEntryReadModel {
  entryId: number
  trackerId: number
  gameTitle: string
  gameKey: string
  estimatedHours: number
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
  structured: true
}

export interface LegacyGamingEntryReadModel {
  entryId: number
  trackerId: number
  legacyText: string | null
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
  structured: false
}

export type GamingHistoryItem = GamingEntryReadModel | LegacyGamingEntryReadModel

export interface CreateGamingEntryRequest {
  trackerId: number
  gameTitle: string
  estimatedHours: number
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
}

export interface UpdateGamingEntryRequest {
  gameTitle?: string
  estimatedHours?: number
  timestamp?: number
  assetId?: number | null
  tagIds?: number[]
}

export interface GamingEntryResponse {
  entry: GamingEntryReadModel
  tags: Tag[]
}

export interface GamingDetailResponse {
  current: GamingEntryReadModel | null
  history: GamingHistoryItem[]
  chartData: Array<{ date: string; value: number; count: number }>
  totalHours: number
  structuredEntryCount: number
  legacyEntryCount: number
  perGameHours: Array<{ gameTitle: string; gameKey: string; hours: number; entryCount: number }>
}

export interface GamingStatisticsReadModel {
  entryCount: number
  structuredEntryCount: number
  legacyEntryCount: number
  totalHours: number
  chartData: Array<{ date: string; value: number; count: number }>
  perGameHours: Array<{ gameTitle: string; gameKey: string; hours: number; entryCount: number }>
}

export interface GamingHomeWidgetReadModel {
  trackerId: number
  title: string
  currentGameTitle: string | null
  currentEstimatedHours: number | null
  selectedDayGameTitle: string | null
  selectedDayEstimatedHours: number | null
  totalHours: number
  legacyEntryCount: number
  sparkline: Array<{ date: string; value: number }>
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'

export interface FoodEntryReadModel {
  entryId: number
  trackerId: number
  foodName: string
  foodKey: string
  calories: number | null
  mealType: MealType | null
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
  structured: true
}

export interface LegacyFoodEntryReadModel {
  entryId: number
  trackerId: number
  legacyText: string | null
  legacyValue: number | null
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
  structured: false
}

export type FoodHistoryItem = FoodEntryReadModel | LegacyFoodEntryReadModel

export interface CreateFoodEntryRequest {
  trackerId: number
  foodName: string
  calories?: number | null
  mealType?: MealType | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
}

export interface UpdateFoodEntryRequest {
  foodName?: string
  calories?: number | null
  mealType?: MealType | null
  timestamp?: number
  assetId?: number | null
  tagIds?: number[]
}

export interface FoodEntryResponse {
  entry: FoodEntryReadModel
  tags: Tag[]
}

export interface FoodStatisticsReadModel {
  entryCount: number
  structuredEntryCount: number
  legacyEntryCount: number
  totalCalories: number
  chartData: Array<{ date: string; value: number; count: number }>
  foodFrequency: Array<{ foodName: string; foodKey: string; entryCount: number; totalCalories: number }>
  tagFrequency: Array<{ tagId: number; tagName: string; entryCount: number }>
}

export interface FoodDetailResponse {
  current: FoodEntryReadModel | null
  history: FoodHistoryItem[]
  chartData: Array<{ date: string; value: number; count: number }>
  totalCalories: number
  structuredEntryCount: number
  legacyEntryCount: number
  foodFrequency: Array<{ foodName: string; foodKey: string; entryCount: number; totalCalories: number }>
  tagFrequency: Array<{ tagId: number; tagName: string; entryCount: number }>
}

export interface FoodHomeWidgetReadModel {
  trackerId: number
  title: string
  currentFoodName: string | null
  currentCalories: number | null
  selectedDayEntries: FoodHistoryItem[]
  totalCalories: number
  legacyEntryCount: number
  sparkline: Array<{ date: string; value: number }>
}

export type SymptomCategory = 'physical' | 'mental' | 'general' | 'other'

export interface HealthSymptom {
  id: number
  trackerId: number
  name: string
  symptomKey: string
  category: SymptomCategory
  createdAt: number | null
  updatedAt: number | null
}

export interface HealthSymptomEntryReadModel {
  entryId: number
  trackerId: number
  symptomId: number
  symptomName: string
  symptomKey: string
  category: SymptomCategory
  severity: number | null
  note: string | null
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
  structured: true
}

export interface LegacyHealthEntryReadModel {
  entryId: number
  trackerId: number
  legacyText: string | null
  legacyValue: number | null
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
  structured: false
}

export type HealthHistoryItem = HealthSymptomEntryReadModel | LegacyHealthEntryReadModel

export interface HealthSeveritySummary {
  averageSeverity: number | null
  maxSeverity: number | null
  severityCount: number
  missingSeverityCount: number
}

export interface HealthStatisticsReadModel {
  totalOccurrences: number
  structuredEntryCount: number
  legacyEntryCount: number
  daysWithSymptoms: number
  symptomFrequency: Array<{ symptomName: string; symptomKey: string; category: SymptomCategory; entryCount: number }>
  severitySummary: HealthSeveritySummary
  chartData: Array<{ date: string; value: number; count: number }>
}

export interface HealthDetailResponse extends HealthStatisticsReadModel {
  current: HealthSymptomEntryReadModel | null
  history: HealthHistoryItem[]
}

export interface HealthHomeWidgetReadModel {
  trackerId: number
  title: string
  currentSymptomName: string | null
  currentSymptomCategory: SymptomCategory | null
  currentSeverity: number | null
  selectedDayEntries: HealthHistoryItem[]
  totalOccurrences: number
  daysWithSymptoms: number
  legacyEntryCount: number
  sparkline: Array<{ date: string; value: number }>
}

export type IntakeItemType = 'vitamin' | 'medication' | 'supplement' | 'other'

export interface IntakeItem {
  id: number
  trackerId: number
  itemName: string
  itemKey: string
  itemType: IntakeItemType
  variant: string | null
  createdAt: number | null
  updatedAt: number | null
}

export interface IntakeEntryReadModel {
  entryId: number
  trackerId: number
  itemId: number
  itemName: string
  itemKey: string
  itemType: IntakeItemType
  variant: string | null
  dosage: number | null
  unit: string | null
  note: string | null
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
  structured: true
}

export interface LegacyIntakeEntryReadModel {
  entryId: number
  trackerId: number
  legacyText: string | null
  legacyValue: number | null
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
  structured: false
}

export type IntakeHistoryItem = IntakeEntryReadModel | LegacyIntakeEntryReadModel

export interface IntakeItemFrequency {
  itemName: string
  itemKey: string
  itemType: IntakeItemType
  variant: string | null
  entryCount: number
  daysWithIntakes: number
}

export interface IntakeDoseSummary {
  itemName: string
  itemKey: string
  itemType: IntakeItemType
  variant: string | null
  unit: string | null
  totalDosage: number | null
  dosageCount: number
  missingDosageCount: number
  entryCount: number
}

export interface IntakeStatisticsReadModel {
  intakeCount: number
  structuredEntryCount: number
  legacyEntryCount: number
  daysWithIntakes: number
  itemFrequency: IntakeItemFrequency[]
  doseSummary: IntakeDoseSummary[]
  chartData: Array<{ date: string; value: number; count: number }>
}

export interface IntakeDetailResponse extends IntakeStatisticsReadModel {
  current: IntakeEntryReadModel | null
  history: IntakeHistoryItem[]
}

export interface IntakeHomeWidgetReadModel {
  trackerId: number
  title: string
  currentItemName: string | null
  currentItemType: IntakeItemType | null
  currentVariant: string | null
  currentDosage: number | null
  currentUnit: string | null
  selectedDayEntries: IntakeHistoryItem[]
  intakeCount: number
  daysWithIntakes: number
  legacyEntryCount: number
  sparkline: Array<{ date: string; value: number }>
}

export interface CreateIntakeEntryRequest {
  trackerId: number
  itemName: string
  itemType?: IntakeItemType
  variant?: string | null
  dosage?: number | null
  unit?: string | null
  note?: string | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
}

export interface UpdateIntakeEntryRequest {
  itemName?: string
  itemType?: IntakeItemType
  variant?: string | null
  dosage?: number | null
  unit?: string | null
  note?: string | null
  timestamp?: number
  assetId?: number | null
  tagIds?: number[]
}

export interface IntakeEntryResponse {
  entry: IntakeEntryReadModel
  tags: Tag[]
}

export interface CreateHealthSymptomRequest {
  trackerId: number
  symptomName: string
  category?: SymptomCategory
  severity?: number | null
  note?: string | null
  timestamp?: number
  tagIds?: number[]
  assetId?: number | null
}

export interface UpdateHealthSymptomRequest {
  symptomName?: string
  category?: SymptomCategory
  severity?: number | null
  note?: string | null
  timestamp?: number
  tagIds?: number[]
  assetId?: number | null
}

export interface HealthSymptomResponse {
  entry: HealthSymptomEntryReadModel
  tags: Tag[]
}

export type BookShelf = 'tbr' | 'reading' | 'finished' | 'paused' | 'dropped'
export type BookStatus = 'planned' | 'active' | 'completed' | 'paused' | 'dropped'
export type BookActivityType = 'started' | 'read' | 'finished'

export interface Book {
  id: number
  title: string
  titleKey: string
  shelf: BookShelf
  status: BookStatus
  startedDate: string | null
  finishedDate: string | null
  ratingTenths: number | null
  createdAt: number | null
  updatedAt: number | null
}

export interface BookEntryReadModel {
  entryId: number
  trackerId: number
  bookId: number
  title: string
  titleKey: string
  activityType: BookActivityType
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
  structured: true
}

export interface LegacyBookEntryReadModel {
  entryId: number
  trackerId: number
  legacyText: string | null
  timestamp: number
  dateStr: string
  assetId?: number | null
  tagIds?: number[]
  structured: false
}

export type BookHistoryItem = BookEntryReadModel | LegacyBookEntryReadModel

export interface BookStatisticsReadModel {
  entryCount: number
  structuredEntryCount: number
  legacyEntryCount: number
  uniqueBookCount: number
  startedCount: number
  readCount: number
  finishedCount: number
  chartData: Array<{ date: string; value: number; count: number }>
}

export interface BookSelectedDaySummaryReadModel {
  trackerId: number
  title: string
  currentBookTitle: string | null
  currentActivityType: BookActivityType | null
  selectedDayBookTitle: string | null
  selectedDayActivityType: BookActivityType | null
  selectedDayEntries: BookHistoryItem[]
  uniqueBookCount: number
  structuredEntryCount: number
  legacyEntryCount: number
  sparkline: Array<{ date: string; value: number }>
}

export interface BookResponse {
  book: Book
}

export interface BookActivityResponse {
  entry: BookEntryReadModel
  book: Book
  tags: Tag[]
}

export interface CreateBookRequest {
  title: string
  shelf?: BookShelf
  status?: BookStatus
  ratingTenths?: number | null
  startedDate?: string | null
  finishedDate?: string | null
}

export interface UpdateBookRequest extends Partial<CreateBookRequest> {}

export interface CreateBookActivityRequest {
  trackerId: number
  bookId: number
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
}

export interface UpdateBookActivityRequest {
  timestamp?: number
  assetId?: number | null
  tagIds?: number[]
}

export type TaskPostponement = {
  fromDate: string
  toDate: string
  timestamp: number
}

export type TaskStateMetadata = {
  activeDate: string
  postponements: TaskPostponement[]
}

export type TaskDayState = 'actionable' | 'postponed' | 'hidden'

export interface TaskEntryReadModel {
  entryId: number
  trackerId: number
  text: string
  completed: boolean
  state: Exclude<TaskDayState, 'hidden'>
  selectedDate: string
  dateStr: string
  activeDate: string
  postponements: TaskPostponement[]
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
}

export interface TaskDayReadModel {
  dateStr: string
  entries: TaskEntryReadModel[]
  actionable: TaskEntryReadModel[]
  postponed: TaskEntryReadModel[]
}

export interface PostponeTaskRequest {
  entryId: number
  fromDate: string
  toDate: string
  timestamp: number
}

export interface PostponeTaskResponse {
  entry: Entry
  task: TaskEntryReadModel
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
  initials?: string | null
  birthday?: string | null
  dateMet?: string | null
  dateLastTalked?: string | null
  lastTalkedAt?: number | null
  likes?: string[] | null
  dislikes?: string[] | null
  traits?: string[] | null
  hasKids?: boolean | null
  kidsNotes?: string | null
  notes?: string | null
  createdAt: number | null
}

export interface ContactInsert {
  name: string
  avatarAssetId?: number | null
  birthday?: string | null
  dateMet?: string | null
  likes?: string[] | null
  dislikes?: string[] | null
  traits?: string[] | null
  hasKids?: boolean | null
  kidsNotes?: string | null
  notes?: string | null
}

export interface ContactUpdate {
  name?: string
  avatarAssetId?: number | null
  birthday?: string | null
  dateMet?: string | null
  dateLastTalked?: string | null
  lastTalkedAt?: number | null
  likes?: string[] | null
  dislikes?: string[] | null
  traits?: string[] | null
  hasKids?: boolean | null
  kidsNotes?: string | null
  notes?: string | null
}

export type SocialMethod = 'in-person' | 'call' | 'text' | 'video' | 'other'
export type SocialMoodImpact = 'positive' | 'negative' | 'neutral'
export type ContactMoodImpact = SocialMoodImpact
export type ContactInteractionMethod = SocialMethod

export interface ContactInteractionDraft {
  contactId: number
  method?: ContactInteractionMethod | null
  moodImpact?: ContactMoodImpact | null
  mood?: ContactMoodImpact | null
  notes?: string | null
}

export interface ContactInteraction {
  id: number
  contactId: number
  entryId?: number | null
  method?: ContactInteractionMethod | null
  moodImpact: ContactMoodImpact
  mood?: ContactMoodImpact
  timestamp: number
  notes?: string | null
}

export interface ContactInteractionInsert {
  contactId: number
  entryId?: number | null
  method?: ContactInteractionMethod | null
  moodImpact?: ContactMoodImpact | null
  mood?: ContactMoodImpact | null
  notes?: string | null
}

export interface CreateSocialEntryRequest extends BaseEntryRequest {
  socialInteractions: ContactInteractionDraft[]
}

export interface UpdateSocialEntryRequest extends EntryUpdateRequest {
  socialInteractions?: ContactInteractionDraft[]
}

export interface SocialInteractionReadModel {
  contactId: number
  contactName?: string | null
  contactInitials?: string | null
  method?: SocialMethod | null
  moodImpact: SocialMoodImpact
  note?: string | null
}

export interface SocialEntryReadModel {
  entryId: number
  trackerId: number
  timestamp: number
  dateStr?: string | null
  note?: string | null
  interactions: SocialInteractionReadModel[]
  tagIds?: number[]
  assetId?: number | null
  structured: true
}

export interface LegacySocialEntryReadModel {
  entryId: number
  trackerId: number
  timestamp: number
  dateStr?: string | null
  note?: string | null
  structured: false
}

export interface ContactProfileReadModel {
  contact: Contact
  reminderSettings?: ContactReminderSettings | null
  profileBlocks: ContactProfileBlock[]
  interactions: ContactInteraction[]
}

export interface ContactReminderSettings {
  id?: number
  contactId: number
  birthdayReminderEnabled: boolean
  birthdayReminderDaysBefore: number
  checkInReminderEnabled: boolean
  checkInAfterDays: number
  createdAt: number | null
  updatedAt: number | null
}

export type ContactReminderSettingsInput = Partial<Omit<ContactReminderSettings, 'id' | 'contactId' | 'createdAt' | 'updatedAt'>> & {
  contactId: number
}

export type ContactProfileBlockType = 'text' | 'list' | 'note'

export interface ContactProfileBlock {
  id: number
  contactId: number
  title: string
  body: string
  orderIndex: number
  blockType: ContactProfileBlockType
  createdAt: number | null
  updatedAt: number | null
}

export interface ContactProfileBlockInput {
  contactId: number
  title: string
  body: string
  orderIndex?: number
  blockType?: ContactProfileBlockType
}
