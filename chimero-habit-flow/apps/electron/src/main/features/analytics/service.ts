/**
 * Insight Lab data layer: derives one-number-per-day metrics from persisted
 * records. All statistics are computed from these series by the pure functions in
 * @contracts/domain/analytics — nothing here is estimated or hardcoded.
 */
import type Database from 'better-sqlite3'
import type {
  ActivityDay,
  AnalyticsRange,
  AppPreferences,
  DailySeries,
  MetricDescriptor,
  MetricKind,
  OverviewResponse,
  PairAnalysis,
  PairRequest,
  ScanFinding,
  ScanRequest,
  ScanResult,
  SeriesResponse,
  Tracker,
  TrackerConfig,
} from '@contracts/contracts'
import { getTrackerIdentity, type TrackerIdentity } from '@contracts/features/tracking'
import { computeBestStreak, computeCurrentStreak, resolveInheritedTagIds } from '@contracts/domain'
import { analyzePair, buildDailySeries, localDateStr, summarizeSeries } from '@contracts/domain/analytics/series'

type Raw = Database.Database

const KG_PER_LB = 0.45359237
const CM_PER_IN = 2.54

interface TrackerRow {
  id: number
  name: string
  type: string
  icon: string | null
  color: string | null
  config: string | null
}

interface MetricData {
  descriptor: MetricDescriptor
  recorded: Map<string, number>
  observedFrom: string | null
}

type Bucket = Map<string, number[]>

function parseConfig(value: string | null): TrackerConfig {
  if (!value) return {}
  try {
    let parsed = JSON.parse(value)
    if (typeof parsed === 'string') parsed = JSON.parse(parsed)
    return parsed && typeof parsed === 'object' ? (parsed as TrackerConfig) : {}
  } catch {
    return {}
  }
}

function parseMeta(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'object') return value as Record<string, unknown>
  try {
    let parsed = JSON.parse(String(value))
    if (typeof parsed === 'string') parsed = JSON.parse(parsed)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function push(bucket: Bucket, date: string, value: number): void {
  const list = bucket.get(date)
  if (list) list.push(value)
  else bucket.set(date, [value])
}

function reduce(bucket: Bucket, how: MetricDescriptor['aggregate']): Map<string, number> {
  const out = new Map<string, number>()
  for (const [date, values] of bucket) {
    if (values.length === 0) continue
    let value: number
    switch (how) {
      case 'sum':
        value = values.reduce((a, b) => a + b, 0)
        break
      case 'max':
        value = Math.max(...values)
        break
      case 'any':
        value = 1
        break
      case 'last':
        value = values[values.length - 1]
        break
      default:
        value = values.reduce((a, b) => a + b, 0) / values.length
    }
    out.set(date, Math.round(value * 1000) / 1000)
  }
  return out
}

function convertWeight(value: number, from: string | null, to: 'kg' | 'lb'): number {
  const unit = from === 'lb' ? 'lb' : 'kg'
  if (unit === to) return value
  return to === 'kg' ? value * KG_PER_LB : value / KG_PER_LB
}

function convertLength(value: number, from: string | null, to: 'cm' | 'in'): number {
  const unit = from === 'in' ? 'in' : 'cm'
  if (unit === to) return value
  return to === 'cm' ? value * CM_PER_IN : value / CM_PER_IN
}

/** Builds every metric of every tracker. Cheap for personal-scale data; cached per request. */
export class MetricCatalog {
  private readonly metrics = new Map<string, MetricData>()
  private readonly order: string[] = []

  constructor(
    private readonly raw: Raw,
    private readonly prefs: Pick<AppPreferences, 'weightUnit' | 'measureUnit'>,
  ) {
    const trackers = raw
      .prepare('SELECT id, name, type, icon, color, config FROM trackers WHERE archived = 0 OR archived IS NULL ORDER BY "order", id')
      .all() as TrackerRow[]
    for (const tracker of trackers) this.buildTracker(tracker)
    this.buildTags()
  }

  list(): MetricDescriptor[] {
    return this.order.map((id) => (this.metrics.get(id) as MetricData).descriptor)
  }

  get(id: string): MetricData | undefined {
    return this.metrics.get(id)
  }

  series(id: string, range: AnalyticsRange): DailySeries | null {
    const data = this.metrics.get(id)
    if (!data) return null
    return buildDailySeries(data.descriptor, data.recorded, { ...range, observedFrom: data.observedFrom })
  }

  private add(
    tracker: TrackerRow | null,
    key: string,
    label: string,
    kind: MetricKind,
    aggregate: MetricDescriptor['aggregate'],
    unit: string | null,
    bucket: Bucket,
    observedFrom: string | null,
    minDays = 1,
  ): void {
    if (bucket.size < minDays) return
    const id = tracker ? `t:${tracker.id}:${key}` : key
    this.metrics.set(id, {
      descriptor: {
        id,
        trackerId: tracker?.id ?? null,
        label,
        group: tracker?.name ?? 'Tags',
        unit,
        kind,
        color: tracker?.color ?? null,
        aggregate,
      },
      recorded: reduce(bucket, aggregate),
      observedFrom,
    })
    this.order.push(id)
  }

  private buildTracker(tracker: TrackerRow): void {
    const config = parseConfig(tracker.config)
    const identity: TrackerIdentity = getTrackerIdentity({ name: tracker.name, icon: tracker.icon, config } as Pick<Tracker, 'name' | 'icon' | 'config'>)
    const rows = this.raw
      .prepare('SELECT id, value, note, metadata, timestamp, date_str AS date FROM entries WHERE tracker_id = ? ORDER BY timestamp')
      .all(tracker.id) as Array<{ id: number; value: number | null; note: string | null; metadata: string | null; timestamp: number; date: string }>
    if (rows.length === 0) return
    const first = rows.reduce((min, row) => (row.date < min ? row.date : min), rows[0].date)
    const dateOf = new Map(rows.map((row) => [row.id, row.date]))
    const ids = rows.map((row) => row.id)

    switch (identity) {
      case 'weight': {
        const structured = new Map(
          (this.selectIn('SELECT entry_id AS id, weight_value AS weight, weight_unit AS unit, waist_value AS waist, waist_unit AS waistUnit FROM entry_weight WHERE entry_id IN', ids) as Array<{
            id: number
            weight: number
            unit: string
            waist: number | null
            waistUnit: string | null
          }>).map((row) => [row.id, row]),
        )
        const weight: Bucket = new Map()
        const waist: Bucket = new Map()
        for (const row of rows) {
          const s = structured.get(row.id)
          if (s) {
            push(weight, row.date, convertWeight(s.weight, s.unit, this.prefs.weightUnit))
            if (s.waist != null) push(waist, row.date, convertLength(s.waist, s.waistUnit, this.prefs.measureUnit))
          } else if (row.value != null) {
            push(weight, row.date, convertWeight(row.value, config.unit ?? 'kg', this.prefs.weightUnit))
          }
        }
        this.add(tracker, 'weight', 'Body weight', 'measure', 'mean', this.prefs.weightUnit, weight, first)
        this.add(tracker, 'waist', 'Waist', 'measure', 'mean', this.prefs.measureUnit, waist, first, 2)
        return
      }
      case 'mood': {
        const avg: Bucket = new Map()
        for (const row of rows) if (row.value != null) push(avg, row.date, row.value)
        this.add(tracker, 'avg', 'Average mood', 'measure', 'mean', null, avg, first)
        const low: Bucket = new Map()
        for (const [date, values] of avg) low.set(date, [Math.min(...values)])
        this.add(tracker, 'low', 'Lowest mood of the day', 'measure', 'mean', null, low, first, 2)
        return
      }
      case 'exercise': {
        const sessions = new Map(
          (this.selectIn('SELECT entry_id AS id, duration_minutes AS minutes, load_unit AS unit FROM workout_sessions WHERE entry_id IN', ids) as Array<{
            id: number
            minutes: number | null
            unit: string
          }>).map((row) => [row.id, row]),
        )
        const sets = this.selectIn(
          'SELECT e.session_entry_id AS id, s.reps AS reps, s.load AS load FROM workout_sets s JOIN workout_session_exercises e ON e.id = s.session_exercise_id WHERE e.session_entry_id IN',
          ids,
        ) as Array<{ id: number; reps: number | null; load: number | null }>
        const trained: Bucket = new Map()
        const minutes: Bucket = new Map()
        const volume: Bucket = new Map()
        const setCount: Bucket = new Map()
        for (const row of rows) {
          push(trained, row.date, 1)
          const session = sessions.get(row.id)
          if (session?.minutes != null) push(minutes, row.date, session.minutes)
          else if (!session && row.value != null && (config.unit ?? 'min') === 'min') push(minutes, row.date, row.value)
        }
        for (const set of sets) {
          const date = dateOf.get(set.id)
          if (!date) continue
          push(setCount, date, 1)
          if (set.reps != null && set.load != null) {
            push(volume, date, set.reps * convertWeight(set.load, sessions.get(set.id)?.unit ?? 'kg', this.prefs.weightUnit))
          }
        }
        this.add(tracker, 'trained', 'Trained', 'flag', 'any', null, trained, first)
        this.add(tracker, 'minutes', 'Training time', 'activity', 'sum', 'min', minutes, first, 2)
        this.add(tracker, 'volume', 'Training volume', 'activity', 'sum', this.prefs.weightUnit, volume, first, 2)
        this.add(tracker, 'sets', 'Sets', 'activity', 'sum', null, setCount, first, 2)
        return
      }
      case 'social': {
        const interactions = this.selectIn(
          'SELECT i.entry_id AS id, i.contact_id AS contactId, COALESCE(i.mood_impact, i.mood) AS impact, c.name AS name FROM contact_interactions i LEFT JOIN contacts c ON c.id = i.contact_id WHERE i.entry_id IN',
          ids,
        ) as Array<{ id: number; contactId: number; impact: string | null; name: string | null }>
        const structuredIds = new Set(interactions.map((row) => row.id))
        const total: Bucket = new Map()
        const positive: Bucket = new Map()
        const negative: Bucket = new Map()
        const perContact = new Map<number, { name: string; bucket: Bucket }>()
        for (const row of rows) if (!structuredIds.has(row.id)) push(total, row.date, 1)
        for (const row of interactions) {
          const date = dateOf.get(row.id)
          if (!date) continue
          push(total, date, 1)
          if (row.impact === 'positive') push(positive, date, 1)
          if (row.impact === 'negative') push(negative, date, 1)
          const contact = perContact.get(row.contactId) ?? { name: row.name ?? 'Contact', bucket: new Map() }
          push(contact.bucket, date, 1)
          perContact.set(row.contactId, contact)
        }
        this.add(tracker, 'interactions', 'Interactions', 'activity', 'sum', null, total, first)
        this.add(tracker, 'positive', 'Uplifting interactions', 'activity', 'sum', null, positive, first, 2)
        this.add(tracker, 'negative', 'Draining interactions', 'activity', 'sum', null, negative, first, 2)
        for (const [contactId, contact] of perContact) {
          this.add(tracker, `contact:${contactId}`, `Time with ${contact.name}`, 'flag', 'any', null, contact.bucket, first, 3)
        }
        return
      }
      case 'tasks': {
        const done: Bucket = new Map()
        for (const row of rows) {
          if ((row.value ?? 0) < 1) continue
          const active = parseMeta(row.metadata).activeDate
          push(done, typeof active === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(active) ? active : row.date, 1)
        }
        this.add(tracker, 'completed', 'Tasks completed', 'activity', 'sum', null, done, first)
        return
      }
      case 'books': {
        const read: Bucket = new Map()
        for (const row of rows) push(read, row.date, 1)
        this.add(tracker, 'read', 'Read', 'flag', 'any', null, read, first)
        return
      }
      case 'gaming': {
        const structured = this.selectIn('SELECT entry_id AS id, game_title AS title, game_key AS key, estimated_hours AS hours FROM entry_gaming WHERE entry_id IN', ids) as Array<{
          id: number
          title: string
          key: string
          hours: number
        }>
        const hours: Bucket = new Map()
        const played: Bucket = new Map()
        const perGame = new Map<string, { title: string; bucket: Bucket }>()
        for (const row of rows) push(played, row.date, 1)
        for (const row of structured) {
          const date = dateOf.get(row.id)
          if (!date) continue
          push(hours, date, row.hours)
          const game = perGame.get(row.key) ?? { title: row.title, bucket: new Map() }
          push(game.bucket, date, row.hours)
          perGame.set(row.key, game)
        }
        this.add(tracker, 'hours', 'Hours played', 'activity', 'sum', 'h', hours, first)
        if (hours.size === 0) this.add(tracker, 'played', 'Played', 'flag', 'any', null, played, first)
        for (const [key, game] of perGame) {
          this.add(tracker, `game:${key}`, `${game.title} hours`, 'activity', 'sum', 'h', game.bucket, first, 3)
        }
        return
      }
      case 'diet': {
        const structured = this.selectIn('SELECT entry_id AS id, food_name AS name, food_key AS key, calories FROM entry_food WHERE entry_id IN', ids) as Array<{
          id: number
          name: string
          key: string
          calories: number | null
        }>
        const structuredIds = new Set(structured.map((row) => row.id))
        const items: Bucket = new Map()
        const calories: Bucket = new Map()
        const perFood = new Map<string, { name: string; bucket: Bucket }>()
        for (const row of rows) {
          push(items, row.date, 1)
          if (!structuredIds.has(row.id) && row.value != null && row.value > 0) push(calories, row.date, row.value)
        }
        for (const row of structured) {
          const date = dateOf.get(row.id)
          if (!date) continue
          if (row.calories != null) push(calories, date, row.calories)
          const food = perFood.get(row.key) ?? { name: row.name, bucket: new Map() }
          push(food.bucket, date, 1)
          perFood.set(row.key, food)
        }
        this.add(tracker, 'items', 'Foods logged', 'activity', 'sum', null, items, first)
        this.add(tracker, 'calories', 'Calories', 'activity', 'sum', 'kcal', calories, first, 2)
        for (const [key, food] of perFood) this.add(tracker, `food:${key}`, `Ate ${food.name}`, 'flag', 'any', null, food.bucket, first, 3)
        return
      }
      case 'health': {
        const structured = this.selectIn(
          'SELECT h.entry_id AS id, h.symptom_id AS symptomId, h.severity AS severity, s.name AS name FROM entry_health h JOIN symptoms s ON s.id = h.symptom_id WHERE h.entry_id IN',
          ids,
        ) as Array<{ id: number; symptomId: number; severity: number | null; name: string }>
        const any: Bucket = new Map()
        const count: Bucket = new Map()
        const worst: Bucket = new Map()
        const perSymptom = new Map<number, { name: string; bucket: Bucket }>()
        for (const row of rows) {
          push(any, row.date, 1)
          push(count, row.date, 1)
        }
        for (const row of structured) {
          const date = dateOf.get(row.id)
          if (!date) continue
          if (row.severity != null) push(worst, date, row.severity)
          const symptom = perSymptom.get(row.symptomId) ?? { name: row.name, bucket: new Map() }
          push(symptom.bucket, date, 1)
          perSymptom.set(row.symptomId, symptom)
        }
        this.add(tracker, 'any', 'Any symptom', 'flag', 'any', null, any, first)
        this.add(tracker, 'count', 'Symptoms logged', 'activity', 'sum', null, count, first, 2)
        this.add(tracker, 'severity', 'Worst severity', 'activity', 'max', null, worst, first, 2)
        for (const [id, symptom] of perSymptom) this.add(tracker, `symptom:${id}`, symptom.name, 'flag', 'any', null, symptom.bucket, first, 2)
        return
      }
      case 'intake': {
        const structured = this.selectIn(
          'SELECT e.entry_id AS id, e.item_id AS itemId, i.item_name AS name FROM entry_intake e JOIN intake_items i ON i.id = e.item_id WHERE e.entry_id IN',
          ids,
        ) as Array<{ id: number; itemId: number; name: string }>
        const count: Bucket = new Map()
        const perItem = new Map<number, { name: string; bucket: Bucket }>()
        for (const row of rows) push(count, row.date, 1)
        for (const row of structured) {
          const date = dateOf.get(row.id)
          if (!date) continue
          const item = perItem.get(row.itemId) ?? { name: row.name, bucket: new Map() }
          push(item.bucket, date, 1)
          perItem.set(row.itemId, item)
        }
        this.add(tracker, 'count', 'Doses taken', 'activity', 'sum', null, count, first)
        for (const [id, item] of perItem) this.add(tracker, `item:${id}`, `Took ${item.name}`, 'flag', 'any', null, item.bucket, first, 2)
        return
      }
      default:
        this.buildGeneric(tracker, config, rows, first)
    }
  }

  private buildGeneric(
    tracker: TrackerRow,
    config: TrackerConfig,
    rows: Array<{ id: number; value: number | null; metadata: string | null; date: string }>,
    first: string,
  ): void {
    const type = ({ counter: 'numeric', rating: 'range', list: 'text' } as Record<string, string>)[tracker.type] ?? tracker.type
    const values: Bucket = new Map()
    const logged: Bucket = new Map()
    const minutes: Bucket = new Map()
    const fieldBuckets = new Map<string, Bucket>()
    for (const row of rows) {
      push(logged, row.date, 1)
      if (row.value != null) push(values, row.date, row.value)
      const meta = parseMeta(row.metadata)
      if (typeof meta.minutes === 'number' && Number.isFinite(meta.minutes)) push(minutes, row.date, meta.minutes)
      const fields = meta.fields && typeof meta.fields === 'object' ? (meta.fields as Record<string, unknown>) : {}
      for (const field of config.fields ?? []) {
        const raw = fields[field.key]
        let numeric: number | null = null
        if (field.type === 'number' && typeof raw === 'number' && Number.isFinite(raw)) numeric = raw
        if (field.type === 'boolean' && typeof raw === 'boolean') numeric = raw ? 1 : 0
        if (numeric == null) continue
        const bucket = fieldBuckets.get(field.key) ?? new Map()
        push(bucket, row.date, numeric)
        fieldBuckets.set(field.key, bucket)
      }
    }
    if (type === 'numeric') {
      const aggregate = config.aggregate ?? 'sum'
      const kind: MetricKind = config.valueKind ?? (aggregate === 'sum' ? 'activity' : 'measure')
      this.add(tracker, 'value', tracker.name, kind, aggregate, config.unit ?? null, values, first)
    } else if (type === 'range') {
      this.add(tracker, 'value', tracker.name, 'measure', 'mean', null, values, first)
    } else if (type === 'binary') {
      const done: Bucket = new Map()
      for (const row of rows) if ((row.value ?? 1) >= 1) push(done, row.date, 1)
      this.add(tracker, 'done', tracker.name, 'flag', 'any', null, done, first)
    } else {
      this.add(tracker, 'count', `${tracker.name} entries`, 'activity', 'sum', null, logged, first)
      this.add(tracker, 'minutes', `${tracker.name} time`, 'activity', 'sum', 'min', minutes, first, 2)
    }
    for (const field of config.fields ?? []) {
      const bucket = fieldBuckets.get(field.key)
      if (!bucket) continue
      if (field.type === 'boolean') this.add(tracker, `f:${field.key}`, `${tracker.name}: ${field.label}`, 'flag', 'max', null, bucket, first, 2)
      else this.add(tracker, `f:${field.key}`, `${tracker.name}: ${field.label}`, 'measure', 'mean', field.unit ?? null, bucket, first, 2)
    }
  }

  /** A tag is "present" on a day when any entry carries it or one of its descendants. */
  private buildTags(): void {
    const tags = this.raw.prepare('SELECT id, name, color FROM tags ORDER BY name').all() as Array<{ id: number; name: string; color: string | null }>
    if (tags.length === 0) return
    const relationships = this.raw.prepare('SELECT parent_tag_id AS parentTagId, child_tag_id AS childTagId FROM tag_relationships').all() as Array<{
      parentTagId: number
      childTagId: number
    }>
    const usage = this.raw
      .prepare('SELECT et.tag_id AS tagId, e.date_str AS date FROM entries_to_tags et JOIN entries e ON e.id = et.entry_id')
      .all() as Array<{ tagId: number; date: string }>
    const buckets = new Map<number, Bucket>()
    const inherited = new Map<number, number[]>()
    for (const row of usage) {
      let resolved = inherited.get(row.tagId)
      if (!resolved) {
        resolved = resolveInheritedTagIds([row.tagId], relationships)
        inherited.set(row.tagId, resolved)
      }
      for (const tagId of resolved) {
        const bucket = buckets.get(tagId) ?? new Map()
        push(bucket, row.date, 1)
        buckets.set(tagId, bucket)
      }
    }
    for (const tag of tags) {
      const bucket = buckets.get(tag.id)
      if (!bucket) continue
      const first = [...bucket.keys()].sort()[0]
      const id = `tag:${tag.id}`
      if (bucket.size < 2) continue
      this.metrics.set(id, {
        descriptor: { id, trackerId: null, label: `Tagged ${tag.name}`, group: 'Tags', unit: null, kind: 'flag', color: tag.color, aggregate: 'any' },
        recorded: reduce(bucket, 'any'),
        observedFrom: first,
      })
      this.order.push(id)
    }
  }

  private selectIn(sqlPrefix: string, ids: number[]): unknown[] {
    const out: unknown[] = []
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500)
      out.push(...this.raw.prepare(`${sqlPrefix} (${chunk.map(() => '?').join(',')})`).all(...chunk))
    }
    return out
  }
}

type Prefs = Pick<AppPreferences, 'weightUnit' | 'measureUnit'>

export function listMetrics(raw: Raw, prefs: Prefs): MetricDescriptor[] {
  return new MetricCatalog(raw, prefs).list()
}

export function getSeries(raw: Raw, prefs: Prefs, range: AnalyticsRange, metricIds: string[]): SeriesResponse {
  const catalog = new MetricCatalog(raw, prefs)
  const series = metricIds.map((id) => catalog.series(id, range)).filter((s): s is DailySeries => s != null)
  return { series, summaries: series.map(summarizeSeries) }
}

export function analyze(raw: Raw, prefs: Prefs, request: PairRequest): PairAnalysis | null {
  const catalog = new MetricCatalog(raw, prefs)
  const a = catalog.series(request.a, request)
  const b = catalog.series(request.b, request)
  if (!a || !b) return null
  return analyzePair(a, b, clampLag(request.lagDays))
}

function clampLag(lag: number | undefined): number {
  return Math.max(0, Math.min(7, Math.round(lag ?? 0)))
}

const SCAN_MIN_PAIRS = 10
const SCAN_MAX_P = 0.05
const SCAN_MIN_RHO = 0.3
const SCAN_MAX_METRICS = 80
const SCAN_MAX_FINDINGS = 24

/**
 * Test every cross-tracker metric pair and keep relationships that are at least
 * moderate and unlikely under "no relationship". Many pairs are tested, so some
 * findings will be coincidences — the UI says so.
 */
export function scan(raw: Raw, prefs: Prefs, request: ScanRequest): ScanResult {
  const catalog = new MetricCatalog(raw, prefs)
  const lags = (request.lags ?? [0, 1]).map(clampLag)
  const candidates = catalog
    .list()
    .map((metric) => catalog.series(metric.id, request) as DailySeries)
    .filter((series) => series.points.length >= SCAN_MIN_PAIRS && new Set(series.points.map((p) => p.value)).size > 1)
    .sort((a, b) => b.recordedDays - a.recordedDays || a.metric.id.localeCompare(b.metric.id))
    .slice(0, SCAN_MAX_METRICS)

  const best = new Map<string, ScanFinding>()
  let pairsTested = 0
  for (const a of candidates) {
    for (const b of candidates) {
      if (a.metric.id === b.metric.id || a.metric.group === b.metric.group) continue
      for (const lag of lags) {
        // Same-day relationships are symmetric: test each unordered pair once.
        if (lag === 0 && a.metric.id > b.metric.id) continue
        pairsTested++
        const result = analyzePair(a, b, lag)
        if (result.status !== 'ok' || !result.spearman || result.n < SCAN_MIN_PAIRS) continue
        const { value: rho, p } = result.spearman
        if (Math.abs(rho) < SCAN_MIN_RHO || p == null || p > SCAN_MAX_P) continue
        const key = [a.metric.id, b.metric.id].sort().join('|')
        const existing = best.get(key)
        if (existing && Math.abs(existing.rho) >= Math.abs(rho)) continue
        best.set(key, { a: a.metric, b: b.metric, lagDays: lag, n: result.n, rho, p, strength: result.strength, reliability: result.reliability })
      }
    }
  }
  const findings = [...best.values()]
    .sort((x, y) => Math.abs(y.rho) - Math.abs(x.rho) || y.n - x.n || x.a.id.localeCompare(y.a.id))
    .slice(0, SCAN_MAX_FINDINGS)
  return { from: request.from, to: request.to, metricsConsidered: candidates.length, pairsTested, findings }
}

export function overview(raw: Raw, range: AnalyticsRange, today = localDateStr(Date.now())): OverviewResponse {
  const rows = raw
    .prepare(
      `SELECT e.date_str AS date, e.tracker_id AS trackerId, COUNT(*) AS count
       FROM entries e JOIN trackers t ON t.id = e.tracker_id
       WHERE e.date_str BETWEEN ? AND ? AND (t.archived = 0 OR t.archived IS NULL)
       GROUP BY e.date_str, e.tracker_id ORDER BY e.date_str`,
    )
    .all(range.from, range.to) as Array<{ date: string; trackerId: number; count: number }>
  const byDate = new Map<string, ActivityDay>()
  for (const row of rows) {
    const day = byDate.get(row.date) ?? { date: row.date, byTracker: {}, total: 0 }
    day.byTracker[row.trackerId] = row.count
    day.total += row.count
    byDate.set(row.date, day)
  }
  const allDates = (raw.prepare('SELECT DISTINCT date_str AS date FROM entries ORDER BY date_str').all() as Array<{ date: string }>).map((r) => r.date)
  const days = [...byDate.values()]
  return {
    from: range.from,
    to: range.to,
    days,
    totalEntries: days.reduce((total, day) => total + day.total, 0),
    activeDays: days.length,
    currentStreak: computeCurrentStreak(allDates, today),
    bestStreak: computeBestStreak(allDates),
    firstEntryDate: allDates[0] ?? null,
  }
}
