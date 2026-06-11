import type {
  Contact,
  ContactInteraction,
  ContactProfileBlock,
  ContactReminderSettings,
  SocialMethod,
  SocialInteractionReadModel,
  Entry,
  MealType,
  Reminder,
  Tag,
  TagRelationship,
  Tracker,
  TrackerGoal,
  WeightEntry,
  AssetLink,
} from '@contracts/contracts'
import type { AssetWithUrls } from '@contracts/features/assets'

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function parseJsonArray(value: unknown): string[] | null {
  if (!value) return null
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (typeof value !== 'string') return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : null
  } catch {
    return null
  }
}

function mapSocialInteractions(value: unknown): SocialInteractionReadModel[] | undefined {
  if (!Array.isArray(value)) return undefined
  const interactions: SocialInteractionReadModel[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const contactId = Number(row.contactId ?? row.contact_id)
    if (!Number.isInteger(contactId) || contactId <= 0) continue
    interactions.push({
      contactId,
      contactName: (row.contactName ?? row.contact_name ?? null) as string | null,
      contactInitials: (row.contactInitials ?? row.contact_initials ?? null) as string | null,
      method: (row.method ?? null) as SocialInteractionReadModel['method'],
      moodImpact: (row.moodImpact ?? row.mood_impact ?? row.mood ?? 'neutral') as SocialInteractionReadModel['moodImpact'],
      note: (row.note ?? row.notes ?? null) as string | null,
    })
  }
  return interactions.length > 0 ? interactions : undefined
}

export function schemaTypeToUI(type: string, config: Record<string, unknown>): string {
  if (type === 'numeric') return 'counter'
  if (type === 'range' && (config?.max === 5 || config?.max === 10)) return 'rating'
  if (type === 'text' || type === 'composite') return 'list'
  return type
}

export function mapTracker(row: Record<string, unknown>): Tracker {
  const config = (row.config as Record<string, unknown>) || {}
  const schemaType = (row.type as string) || 'numeric'
  const isCustomCol = row.isCustom ?? row.is_custom
  const isFavoriteCol = row.isFavorite ?? row.is_favorite
  return {
    id: row.id as number,
    name: row.name as string,
    type: schemaTypeToUI(schemaType, config) as Tracker['type'],
    icon: (row.icon as string) ?? null,
    color: (row.color as string) ?? null,
    order: (row.order as number) ?? 0,
    config: config as Tracker['config'],
    archived: !!(row.archived as number | boolean),
    isCustom: isCustomCol !== undefined ? !!(isCustomCol as number | boolean) : !!(config as { isCustom?: boolean }).isCustom,
    isFavorite: isFavoriteCol !== undefined ? !!(isFavoriteCol as number | boolean) : false,
    createdAt: (row.createdAt ?? row.created_at) as number | null,
  }
}

export function mapEntry(row: Record<string, unknown>): Entry {
  const gamingStructured = row.gamingStructured ?? row.gaming_structured
  const gameTitle = row.gameTitle ?? row.game_title
  const gameKey = row.gameKey ?? row.game_key
  const estimatedHours = row.estimatedHours ?? row.estimated_hours
  const foodStructured = row.foodStructured ?? row.food_structured
  const foodName = row.foodName ?? row.food_name
  const foodKey = row.foodKey ?? row.food_key
  const calories = row.calories ?? row.foodCalories ?? row.food_calories ?? row.value
  const mealType = row.mealType ?? row.meal_type
  const healthStructured = row.healthStructured ?? row.health_structured
  const symptomId = row.symptomId ?? row.symptom_id
  const symptomName = row.symptomName ?? row.symptom_name
  const symptomKey = row.symptomKey ?? row.symptom_key
  const symptomCategory = row.category ?? row.symptomCategory ?? row.symptom_category
  const symptomSeverity = row.severity ?? row.symptomSeverity ?? row.symptom_severity
  const intakeStructured = row.intakeStructured ?? row.intake_structured
  const itemId = row.itemId ?? row.item_id
  const itemName = row.itemName ?? row.item_name
  const itemKey = row.itemKey ?? row.item_key
  const itemType = row.itemType ?? row.item_type
  const variant = row.variant ?? row.itemVariant ?? row.item_variant
  const dosage = row.dosage ?? row.itemDosage ?? row.item_dosage
  const unit = row.unit ?? row.itemUnit ?? row.item_unit
  const bookStructured = row.bookStructured ?? row.book_structured
  const bookId = row.bookId ?? row.book_id
  const bookTitle = row.bookTitle ?? row.book_title
  const bookTitleKey = row.bookTitleKey ?? row.book_title_key
  const bookActivityType = row.bookActivityType ?? row.book_activity_type
  const socialInteractions = mapSocialInteractions(row.socialInteractions ?? row.social_interactions)
  return {
    id: row.id as number,
    trackerId: (row.trackerId ?? row.tracker_id) as number,
    value: (row.value as number) ?? null,
    note: (row.note as string) ?? null,
    metadata: parseJsonObject(row.metadata),
    timestamp: row.timestamp as number,
    dateStr: (row.dateStr ?? row.date_str) as string,
    assetId: (row.assetId ?? row.asset_id) as number | null,
    gaming:
      gamingStructured
        ? {
            structured: true,
            gameTitle: (gameTitle as string) ?? '',
            gameKey: (gameKey as string) ?? '',
            estimatedHours: (estimatedHours as number) ?? 0,
          }
        : undefined,
    food:
      foodStructured
        ? {
            structured: true,
            foodName: (foodName as string) ?? '',
            foodKey: (foodKey as string) ?? '',
            calories: calories == null ? null : Number(calories),
            mealType: (mealType as MealType | null) ?? null,
          }
        : undefined,
    health:
      healthStructured
        ? {
            structured: true,
            symptomId: Number(symptomId),
            symptomName: (symptomName as string) ?? '',
            symptomKey: (symptomKey as string) ?? '',
            category: (symptomCategory as 'physical' | 'mental' | 'general' | 'other') ?? 'general',
            severity: symptomSeverity == null ? null : Number(symptomSeverity),
          }
        : undefined,
    intake:
      intakeStructured
        ? {
            structured: true,
            itemId: Number(itemId),
            itemName: (itemName as string) ?? '',
            itemKey: (itemKey as string) ?? '',
            itemType: (itemType as 'vitamin' | 'medication' | 'supplement' | 'other') ?? 'other',
            variant: (variant as string | null) ?? null,
            dosage: dosage == null ? null : Number(dosage),
            unit: (unit as string | null) ?? null,
          }
        : undefined,
    book:
      bookStructured
        ? {
            structured: true,
            bookId: Number(bookId),
            title: (bookTitle as string) ?? '',
            titleKey: (bookTitleKey as string) ?? '',
            activityType: bookActivityType as 'started' | 'read' | 'finished',
          }
        : undefined,
    socialInteractions,
  }
}

export function mapTag(row: Record<string, unknown>): Tag {
  return {
    id: row.id as number,
    name: (row.name as string) ?? '',
    color: (row.color as string) ?? null,
  }
}

export function mapTagRelationship(row: Record<string, unknown>): TagRelationship {
  return {
    parentTagId: (row.parentTagId ?? row.parent_tag_id) as number,
    childTagId: (row.childTagId ?? row.child_tag_id) as number,
    relationshipType: 'parent',
  }
}

export function mapTrackerGoal(row: Record<string, unknown>): TrackerGoal {
  return {
    id: row.id as number,
    trackerId: (row.trackerId ?? row.tracker_id) as number,
    goalType: (row.goalType ?? row.goal_type) as TrackerGoal['goalType'],
    targetValue: (row.targetValue ?? row.target_value) as number,
    unit: (row.unit as string) ?? null,
    direction: (row.direction as TrackerGoal['direction']) ?? null,
    startDate: (row.startDate ?? row.start_date) as string | null,
    targetDate: (row.targetDate ?? row.target_date) as string | null,
    active: !!(row.active as boolean | number),
    createdAt: (row.createdAt ?? row.created_at) as number | null,
    updatedAt: (row.updatedAt ?? row.updated_at) as number | null,
  }
}

export function mapWeightEntry(row: Record<string, unknown>): WeightEntry {
  return {
    entryId: (row.entryId ?? row.entry_id ?? row.id) as number,
    trackerId: (row.trackerId ?? row.tracker_id) as number,
    weight: (row.weight ?? row.weightValue ?? row.weight_value ?? row.value) as number,
    weightUnit: (row.weightUnit ?? row.weight_unit ?? 'kg') as WeightEntry['weightUnit'],
    waist: (row.waist ?? row.waistValue ?? row.waist_value ?? null) as number | null,
    waistUnit: (row.waistUnit ?? row.waist_unit ?? null) as WeightEntry['waistUnit'],
    bodyFatPercentage: (row.bodyFatPercentage ?? row.body_fat_percentage ?? null) as number | null,
    note: (row.note as string) ?? null,
    timestamp: row.timestamp as number,
    dateStr: (row.dateStr ?? row.date_str) as string,
    assetId: (row.assetId ?? row.asset_id ?? null) as number | null,
  }
}

export function mapAssetLink(row: Record<string, unknown>): AssetLink {
  return {
    id: row.id as number,
    assetId: (row.assetId ?? row.asset_id) as number,
    entityType: (row.entityType ?? row.entity_type) as AssetLink['entityType'],
    entityId: (row.entityId ?? row.entity_id) as number,
    relationType: (row.relationType ?? row.relation_type) as string | null,
    createdAt: (row.createdAt ?? row.created_at) as number | null,
  }
}

export function toTimestampMs(val: unknown): number | null {
  if (val == null) return null
  if (val instanceof Date) return val.getTime()
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

export function mapReminder(row: Record<string, unknown>): Reminder {
  const daysRaw = row.days
  let days: number[] | null = null
  if (Array.isArray(daysRaw)) days = daysRaw
  else if (typeof daysRaw === 'string') {
    try {
      days = JSON.parse(daysRaw)
    } catch {
      // ignore invalid JSON
    }
  }
  const completedRaw = row.completedAt ?? row.completed_at
  const lastTriggeredRaw = row.lastTriggered ?? row.last_triggered
  return {
    id: row.id as number,
    trackerId: (row.trackerId ?? row.tracker_id) as number | null,
    title: row.title as string,
    description: (row.description as string) ?? null,
    time: (row.time as string) ?? '',
    date: (row.date as string) ?? null,
    days,
    enabled: !!(row.enabled as number | boolean),
    lastTriggered: toTimestampMs(lastTriggeredRaw),
    completedAt: toTimestampMs(completedRaw),
    createdAt: (row.createdAt ?? row.created_at) as number | null,
  }
}

export function mapAsset(row: Record<string, unknown>): AssetWithUrls {
  const path = (row.path as string) ?? ''
  const thumbnailPath = (row.thumbnailPath ?? row.thumbnail_path) as string | null
  const assetUrl = `chimero-asset:///${path.replace(/^\/+/, '')}`
  const thumbnailUrl = thumbnailPath
    ? `chimero-asset:///${thumbnailPath.replace(/^\/+/, '')}`
    : assetUrl
  return {
    id: row.id as number,
    filename: (row.filename as string) ?? '',
    originalName: (row.originalName ?? row.original_name) as string | null,
    path,
    type: (row.type as string) ?? 'image',
    mimeType: (row.mimeType ?? row.mime_type) as string | null,
    size: (row.size as number) ?? null,
    thumbnailPath,
    createdAt: (row.createdAt ?? row.created_at) as number | null,
    assetUrl,
    thumbnailUrl,
  }
}

export function mapContact(row: Record<string, unknown>): Contact {
  const name = (row.name as string) ?? ''
  const dateLastTalked = (row.dateLastTalked ?? row.date_last_talked) as string | null
  const lastTalkedAtRaw = row.lastTalkedAt ?? row.last_talked_at
  return {
    id: row.id as number,
    name,
    avatarAssetId: (row.avatarAssetId ?? row.avatar_asset_id) as number | null,
    initials: name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || null,
    birthday: (row.birthday as string) ?? null,
    dateMet: (row.dateMet ?? row.date_met) as string | null,
    dateLastTalked,
    lastTalkedAt: lastTalkedAtRaw == null
      ? (dateLastTalked ? Date.parse(`${dateLastTalked}T00:00:00Z`) : null)
      : Number(lastTalkedAtRaw),
    likes: parseJsonArray(row.likes),
    dislikes: parseJsonArray(row.dislikes),
    traits: parseJsonArray(row.traits),
    hasKids: row.hasKids !== undefined || row.has_kids !== undefined ? !!(row.hasKids ?? row.has_kids) : null,
    kidsNotes: (row.kidsNotes ?? row.kids_notes) as string | null,
    notes: (row.notes as string) ?? null,
    createdAt: (row.createdAt ?? row.created_at) as number | null,
  }
}

export function mapContactInteraction(row: Record<string, unknown>): ContactInteraction {
  const moodImpact = (row.moodImpact ?? row.mood_impact ?? row.mood ?? 'neutral') as 'positive' | 'negative' | 'neutral'
  const methodRaw = row.method
  const method = typeof methodRaw === 'string' && ['in-person', 'call', 'text', 'video', 'other'].includes(methodRaw)
    ? methodRaw as SocialMethod
    : null
  return {
    id: row.id as number,
    contactId: (row.contactId ?? row.contact_id) as number,
    entryId: (row.entryId ?? row.entry_id) as number | null,
    method,
    moodImpact,
    mood: moodImpact,
    timestamp: row.timestamp as number,
    notes: (row.notes as string) ?? null,
  }
}

export function mapContactReminderSettings(row: Record<string, unknown>): ContactReminderSettings {
  return {
    id: row.id as number,
    contactId: (row.contactId ?? row.contact_id) as number,
    birthdayReminderEnabled: !!(row.birthdayReminderEnabled ?? row.birthday_reminder_enabled),
    birthdayReminderDaysBefore: Number(row.birthdayReminderDaysBefore ?? row.birthday_reminder_days_before ?? 7),
    checkInReminderEnabled: !!(row.checkInReminderEnabled ?? row.check_in_reminder_enabled),
    checkInAfterDays: Number(row.checkInAfterDays ?? row.check_in_after_days ?? 14),
    createdAt: (row.createdAt ?? row.created_at) as number | null,
    updatedAt: (row.updatedAt ?? row.updated_at) as number | null,
  }
}

export function mapContactProfileBlock(row: Record<string, unknown>): ContactProfileBlock {
  return {
    id: row.id as number,
    contactId: (row.contactId ?? row.contact_id) as number,
    title: (row.title as string) ?? '',
    body: (row.body as string) ?? '',
    orderIndex: Number(row.orderIndex ?? row.order_index ?? 0),
    blockType: (row.blockType ?? row.block_type ?? 'text') as ContactProfileBlock['blockType'],
    createdAt: (row.createdAt ?? row.created_at) as number | null,
    updatedAt: (row.updatedAt ?? row.updated_at) as number | null,
  }
}
