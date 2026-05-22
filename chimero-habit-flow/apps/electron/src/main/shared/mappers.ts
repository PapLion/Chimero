import type {
  Contact,
  ContactInteraction,
  Entry,
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
  return {
    id: row.id as number,
    trackerId: (row.trackerId ?? row.tracker_id) as number,
    value: (row.value as number) ?? null,
    note: (row.note as string) ?? null,
    metadata: parseJsonObject(row.metadata),
    timestamp: row.timestamp as number,
    dateStr: (row.dateStr ?? row.date_str) as string,
    assetId: (row.assetId ?? row.asset_id) as number | null,
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
  const traitsRaw = row.traits
  let traits: string[] | null = null
  if (traitsRaw && typeof traitsRaw === 'string') {
    try {
      traits = JSON.parse(traitsRaw)
    } catch {
      // ignore invalid JSON
    }
  } else if (Array.isArray(traitsRaw)) {
    traits = traitsRaw as string[]
  }
  return {
    id: row.id as number,
    name: (row.name as string) ?? '',
    avatarAssetId: (row.avatarAssetId ?? row.avatar_asset_id) as number | null,
    birthday: (row.birthday as string) ?? null,
    dateMet: (row.dateMet ?? row.date_met) as string | null,
    dateLastTalked: (row.dateLastTalked ?? row.date_last_talked) as string | null,
    traits,
    notes: (row.notes as string) ?? null,
    createdAt: (row.createdAt ?? row.created_at) as number | null,
  }
}

export function mapContactInteraction(row: Record<string, unknown>): ContactInteraction {
  return {
    id: row.id as number,
    contactId: (row.contactId ?? row.contact_id) as number,
    entryId: (row.entryId ?? row.entry_id) as number | null,
    mood: (row.mood as 'positive' | 'negative' | 'neutral') ?? 'neutral',
    timestamp: row.timestamp as number,
    notes: (row.notes as string) ?? null,
  }
}
