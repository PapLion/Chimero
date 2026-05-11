# Chimero Tracker Contracts

Canonical flow for every tracker contract:

```txt
Usuario
  -> Frontend Input/UI
  -> Contrato Request
  -> Backend / Service Logic
  -> Database
  -> Backend / Service Logic
  -> Contrato Response
  -> Frontend Rendering/UI
  -> Usuario
```

This document maps tracker contracts across the real frontend surfaces that exist in the app:

- Quick Entry
- BentoGrid / Home widget
- Tracker Detail / Entries tab
- Tracker Detail / Statistics tab
- Calendar selected-day summary

It distinguishes four contract layers:

- Request contracts: what the frontend is allowed to send.
- Persistence contracts: what the database stores structurally.
- Service / computed contracts: what backend services validate, join, calculate, or normalize.
- Surface read contracts: the exact shape each UI surface needs to render without guessing.

Do not treat this file as permission to invent new tracker behavior. If a field is not implemented, it must be marked planned, optional, or future.

---

## 1. Base Tracker Contract

### Base Entry Request

```ts
type BaseEntryRequest = {
  trackerId: number
  value?: number | null
  note?: string | null
  metadata?: Record<string, unknown>
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
}
```

### Base Persistence Contract

```txt
entries
  id
  tracker_id
  value
  note
  metadata
  asset_id
  timestamp
  date_str

entries_to_tags
  entry_id
  tag_id

assets
  id
  filename
  path
  type
  thumbnail_path
```

### Base Response Contract

```ts
type BaseEntryResponse = {
  entry: Entry
  tags: Tag[]
}

type EntryMutationResponse = {
  success: boolean
  entry: Entry | null
  tags?: Tag[]
  error?: string
}
```

### Surface Expectations

| Surface | Base read responsibility |
| --- | --- |
| Quick Entry | Capture the tracker-specific input plus note, optional asset, and eventually tags where supported. |
| BentoGrid / Home | Show a compact current-day or recent summary using `Entry.value`, `note`, `assetId`, and tracker config. |
| Tracker Detail / Entries | Show exact logged data, edit action, delete action, note, timestamp, and attachment. |
| Tracker Detail / Statistics | Aggregate count, streak, average, charts, and tracker-specific computed values where available. |
| Calendar selected day | Show entries grouped by selected `dateStr`, tracker name/color, value/unit, and note. |

---

## 2. Weight Contract, Detailed

Weight is the reference contract because it already has a specialized request type, backend service, database table, computed detail response, Quick Entry handling, dashboard widget, detail tabs, edit/delete flows, and calendar display.

Important requirement boundaries:

- Quick Entry captures value, unit, optional waist, optional waistUnit, optional note/context, optional tags, optional assets.
- DB stores the base entry in `entries` and specialized data in `entry_weight`.
- Entries tab must show waist if entered.
- Statistics may show waist stats only if enough waist data exists.
- BentoGrid compact current weight/delta/sparkline/trend with optional secondary waist.
- Calendar selected-day summary must carry enough data for weight and optional waist/note/tags.
- Do not add body fat as a product requirement unless already requested elsewhere; if referenced, mark it optional/future. The current DB/service code has a `bodyFatPercentage` column/field, but this contract does not require any body-fat UI.

### A. Input Contract

```ts
type CreateWeightEntryRequest = {
  trackerId: number
  weight: number
  weightUnit: "kg" | "lb"
  waist?: number | null
  waistUnit?: "cm" | "in" | null
  note?: string | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]

  // Optional/future only unless separately requested:
  bodyFatPercentage?: number | null
}
```

Quick Entry currently captures:

- `weight` from the main numeric value field.
- `weightUnit` from tracker config (`kg` default, `lb` when configured).
- `waist` from the Weight-only optional waist field.
- `waistUnit` derived from weight unit (`cm` for kg, `in` for lb).
- `note` from the optional note/context field.
- `assetId` from the image attachment picker.

Quick Entry planned/required gaps:

- `tagIds` must be capturable when the tag picker is exposed in Quick Entry.
- `waistUnit` should remain explicit in the request, even if the UI auto-selects it.

### B. Backend Write Contract

Backend write logic must:

- Validate `weight` is a finite number.
- Validate `waist` when provided.
- Validate optional/future `bodyFatPercentage` only if sent.
- Compute `dateStr` from `timestamp`.
- Insert the base row into `entries`.
- Insert the specialized row into `entry_weight`.
- Replace tag relationships in `entries_to_tags` when `tagIds` is provided.
- Return the inserted `WeightEntry` and resolved tags.

```ts
type WeightEntryResponse = {
  entry: WeightEntry
  tags: Tag[]
}
```

### C. Database Persistence Contract

Weight persists in two layers:

```txt
entries
  id
  tracker_id
  value              // same numeric value as weight
  note
  metadata           // includes trackerKind, weightUnit, waist, waistUnit
  asset_id
  timestamp
  date_str

entry_weight
  entry_id
  weight_value
  weight_unit
  waist_value
  waist_unit
  body_fat_percentage // optional/future; not required by current product contract

entries_to_tags
  entry_id
  tag_id
```

Persistence rules:

- `entries.value` supports generic graphs, calendar, dashboard, and search.
- `entry_weight.weight_value` is the source of truth for the specialized Weight detail contract.
- `entry_weight.waist_value` and `entry_weight.waist_unit` are nullable but structural.
- Delete must remove `entries_to_tags`, `entry_weight`, then `entries`, or rely on equivalent cascade semantics.

### D. Backend Computed Contract

The specialized Weight detail service returns:

```ts
type WeightDetailResponse = {
  current: WeightEntry | null
  history: WeightEntry[]
  chartData: Array<{
    date: string
    weight: number
    waist: number | null
  }>
  deltaPrevious: number | null
  deltaWeek: number | null
  weeklyAvg: number | null
  activeGoal: TrackerGoal | null
  distanceToGoal: number | null
  goalAchieved: boolean | null
  streakDays: number
}
```

Service/computed rules:

- `current` is the most recent weight entry.
- `deltaPrevious` compares current weight to the previous weight entry.
- `deltaWeek` compares current weight to a baseline at or before seven days earlier.
- `weeklyAvg` averages weight entries from the last seven days relative to current.
- `chartData` includes both `weight` and nullable `waist`.
- Waist statistics are allowed only if enough entries contain waist data. Until the app defines a threshold, documentation should say "enough waist data exists" rather than inventing a number.

### E. BentoGrid / Home Read Model

Target read model:

```ts
type WeightHomeWidgetReadModel = {
  trackerId: number
  title: string
  currentWeight: number | null
  weightUnit: "kg" | "lb"
  deltaPrevious?: number | null
  sparkline: Array<{ date: string; value: number }>
  trend: "up" | "down" | "neutral"
  secondaryWaist?: {
    value: number
    unit: "cm" | "in"
  } | null
}
```

Current implementation:

- `WidgetCard` has a specialized `WeightWidget`.
- It prefers `WeightDetailResponse` / `WeightHomeWidgetReadModel` for current weight, delta, sparkline, trend, and optional secondary waist.
- It falls back to generic `Entry[]` only when specialized Weight detail is not available.
- It can show a selected-day asset as a background image.

Remaining refinement:

- Continue keeping the widget compact; do not force waist when the read model has no waist value.

### F. Entries Tab Read Model

Target read model:

```ts
type WeightEntriesTabReadModel = {
  entries: Array<{
    entryId: number
    trackerId: number
    weight: number
    weightUnit: "kg" | "lb"
    waist: number | null
    waistUnit: "cm" | "in" | null
    note: string | null
    timestamp: number
    dateStr: string
    assetId?: number | null
    tagIds?: number[]
  }>
}
```

Requirement:

- Entries tab must show waist if entered.
- Entries tab must show the exact logged weight, unit, note/context, tags, asset, and timestamp.

Current implementation:

- `TrackerDetailView` uses `WeightDetailResponse.history` through `WeightEntriesTabReadModel` for Weight entries.
- Weight entries display exact weight, unit, optional waist, waist unit, note, timestamp, and asset.
- Tag IDs are carried when available, but tag labels/chips remain pending until the tag UI/read-label surface is complete.

### G. Statistics Tab Read Model

Target read model:

```ts
type WeightStatisticsReadModel = {
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
    unit: "cm" | "in"
    deltaPrevious?: number | null
    trend?: "up" | "down" | "neutral"
  }
}
```

Requirement:

- Statistics may show waist stats only if enough waist data exists.

Current implementation:

- `TrackerDetailView` uses `useWeightDetail` and `WeightStatisticsReadModel` for Weight statistics.
- Weight graphs use specialized `WeightDetailResponse.chartData`.
- Waist is included in chart data and plotted only when waist values exist.

Remaining refinement:

- Waist aggregation must remain conditional.

### H. Calendar Day Read Model

Target read model:

```ts
type WeightCalendarDayEntry = {
  entryId: number
  trackerId: number
  trackerName: string
  value: number
  unit: "kg" | "lb"
  waist?: number | null
  waistUnit?: "cm" | "in" | null
  note?: string | null
  tagIds?: number[]
  timestamp: number
  dateStr: string
}
```

Requirement:

- Calendar selected-day summary must have enough data for weight and optional waist, note/context, and tags.

Current implementation:

- `getCalendarMonth` enriches entries with `entry_weight` data when present.
- Calendar selected-day cards prefer enriched Weight unit and show waist/waistUnit when available.
- Calendar responses include `tagIds` and `assetId` when available, but tag labels and inline asset rendering remain pending UI work.

### I. Field Visibility Matrix

| Field | Quick Entry | Request | Backend Write | DB | Service/Computed | BentoGrid/Home | Entries Tab | Statistics Tab | Calendar Day | Edit Entry | Delete Entry |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `weight` / `value` | Implemented | Implemented | Implemented | Implemented in `entries.value` and `entry_weight.weight_value` | Implemented | Implemented from specialized Weight detail with generic fallback | Implemented from specialized Weight history | Implemented in weekly average and charts | Implemented as enriched selected-day value | Implemented | Implemented |
| `weightUnit` / `unit` | Implemented from tracker config | Implemented | Implemented | Implemented in `entry_weight.weight_unit` | Returned in `WeightEntry` | Implemented from specialized read model/config fallback | Implemented from specialized Weight history | Implemented where Weight statistics render values | Implemented in enriched selected-day summary | Implemented from tracker config | N/A |
| `waist` | Implemented input | Implemented | Implemented | Implemented in `entry_weight.waist_value` | Implemented in `history` and `chartData` | Implemented as optional secondary waist | Implemented when entered | Implemented conditionally when waist data exists; threshold still undefined | Implemented in enriched selected-day summary | Implemented through `update-weight-entry` | Removed through `entry_weight` delete |
| `waistUnit` | Implemented derived unit | Implemented | Implemented | Implemented in `entry_weight.waist_unit` | Returned in `WeightEntry` | Implemented with optional secondary waist | Implemented when waist is shown | Implemented with conditional waist stats | Implemented in enriched selected-day summary | Implemented through `update-weight-entry` | Removed through `entry_weight` delete |
| `note/context` | Implemented | Implemented | Implemented | Implemented in `entries.note` | Returned in `WeightEntry` | Not primary, okay optional | Implemented | Not required | Implemented | Implemented | Removed with entry |
| `tags` | Planned/gap | Implemented as `tagIds` | Implemented via `replaceEntryTags` | Implemented in `entries_to_tags` | Returned as `tagIds` / `tags` | Planned optional chips if design wants them | Planned/gap | Aggregation future | Gap in calendar response | Gap in edit UI unless generic tag editing is added | Removed via delete |
| `assets` | Implemented single `assetId` | Implemented single `assetId` | Implemented | Implemented in `entries.asset_id`; `asset_links` exists separately | Returned in `WeightEntry` as `assetId` | Implemented as widget background when selected-day asset exists | Implemented inline image | Not required | Not currently shown in selected-day summary | Implemented single image attachment | Entry removal leaves asset record intact |
| `bodyFatPercentage` | Not required | Optional/future only | Current service accepts it if sent | Existing optional/future column | Current mapper/service can return it | Not required | Not required | Not required | Not required | Not required | Removed with `entry_weight` row |

---

## 3. Tracker Surface Matrix

This matrix maps implemented and planned tracker contracts across the real surfaces. "Generic implemented" means the surface can handle the tracker through `entries.value`, `note`, `metadata`, `assetId`, and tracker config, but does not yet have a specialized contract.

| Tracker | Status | Quick Entry Request | Persistence | Service / Computed | BentoGrid / Home | Entries Tab | Statistics Tab | Calendar Day |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Weight | Specialized implemented with honest gaps | Specialized weight request with weight, unit, optional waist, note, asset, tags planned | `entries` + `entry_weight` + tags | `WeightDetailResponse` | Specialized widget uses Weight detail for current weight, delta, trend, sparkline, and optional waist | Entries tab uses specialized Weight history and shows waist when entered; tag labels/chips pending | Specialized stats use Weight detail; waist stats remain conditional and threshold undefined | Enriched day entry includes weight, unit, optional waist, assetId, and tagIds; tag labels and inline asset rendering pending |
| Mood | Generic implemented, deeper planned | Numeric/rating value plus optional note/asset; energy/stress planned only if requested | `entries.value`, `metadata`, tags/assets | Mood daily aggregates exist for widget; deeper stats planned | Specialized mood widget with daily aggregates | Generic exact entry display | Generic stats plus mood-specific aggregates planned | Generic summary |
| Exercise / Workout | Generic implemented with exercise search | Quick Entry can capture selected exercises into metadata | `entries.metadata.exercises`, value count, note, asset | Exercise service/search exists; volume PRs planned | Specialized exercise widget shows selected-day total/activity names | Generic/fitness display with assets | Generic stats; total volume planned | Generic summary |
| Social / Contacts | Partially implemented | Quick Entry can create generic social entry and contact interactions | `entries`, `contact_interactions`, `contacts` | Contact interaction handlers/services | Specialized social widget extracts people from notes | Generic social entries | Generic stats; relationship stats planned | Generic summary |
| Food / Diet | Planned/generic | Generic numeric/text entry today; food item contract planned | `entries` now; food entities/tags planned | Tag inheritance/correlation planned | Progress widget for diet/water/calorie-like trackers | Generic diet display with asset | Generic stats; food frequency/tag stats planned | Generic summary |
| Health / Symptoms | Planned/generic | Generic entry now; symptom tags/severity planned | `entries`, tags; specialized table not implemented | Correlation/stats planned | Generic counter/progress depending tracker config | Generic exact entry display | Generic stats; symptom trends planned | Generic summary |
| Vitamins / Medications | Planned | Item, variant, dosage, reason planned | Planned entities/entries/tags | Frequency/correlation planned | Planned compact taken-today/frequency widget | Planned exact dose history | Planned frequency stats | Planned selected-day medication summary |
| Books | Generic implemented/planned richer | Text/list note plus optional value/asset | `entries.note`, value/rating, asset | Book entities/progress planned | Media widget shows recent notes/assets | Media-style entries | Generic stats; reading stats planned | Generic summary |
| Gaming | Generic implemented/planned richer | Text/list note plus optional value/asset | `entries.note`, value/rating, asset | Game/session/timeline planned | Media widget shows recent notes/assets | Media-style entries | Generic stats; hours/mood planned | Generic summary |
| Media / TV / Series | Generic implemented/planned richer | Text/list note plus optional value/asset | `entries.note`, value/rating, asset | Media entities/status planned | Media widget shows recent notes/assets | Media-style entries | Generic stats; watched counts planned | Generic summary |
| Tasks | Generic implemented, postponed planned | Text/list or binary entry | `entries.value`, `note`, `dateStr`; postponed fields planned | Toggle/update implemented generically; postpone planned | Task widget shows selected-day tasks and toggle | Task-style entries | Generic counts/streaks | Generic summary plus reminders |
| Finance / Savings | Generic implemented | Numeric value, note, asset | `entries.value`, note, asset | Generic stats | Counter widget with currency formatting | Finance-style entries | Generic stats | Generic summary |
| Custom Trackers | Implemented basic, schemas planned | Generic value/note/metadata by tracker type | `trackers.config`, `entries.metadata` | Generic service/stats | Generic counter/progress/task/media depending name/type | Generic exact entry display | Generic stats | Generic summary |

---

## 4. Surface Read Contracts

### Quick Entry Surface Contract

Quick Entry must know:

- Which tracker is selected or implied by context.
- Which input fields are required for that tracker.
- Which optional base fields are enabled: note/context, tags, assets.
- Which specialized request endpoint or generic entry endpoint to call.

For Weight:

```txt
Quick Entry
  -> value
  -> unit
  -> optional waist
  -> optional waistUnit
  -> optional note/context
  -> optional tags
  -> optional assets
  -> CreateWeightEntryRequest
```

For non-specialized trackers:

```txt
Quick Entry
  -> value and/or note and/or metadata
  -> optional asset
  -> optional tags when UI supports them
  -> BaseEntryRequest
```

### BentoGrid / Home Surface Contract

BentoGrid is a summary surface, not an edit surface.

It may read:

- Generic `Entry[]` for broad tracker widgets.
- Specialized detail responses when generic entries cannot represent required fields.

Weight should use a specialized read model when showing more than current weight:

- Current weight.
- Delta.
- Sparkline.
- Trend.
- Optional secondary waist.

### Tracker Detail / Entries Tab Contract

Entries tab is the exact logged-data surface.

It must not lose fields that the user entered. For Weight, this means waist must be shown if entered. For tags/assets, it must show attached chips/images once those are part of the read model.

### Tracker Detail / Statistics Tab Contract

Statistics tab is an aggregate/computed surface.

It may use generic statistics for simple trackers, but specialized trackers should use specialized service responses. Weight already has a specialized computed response; waist-specific stats stay conditional until enough waist data exists.

### Calendar Selected-Day Contract

Calendar selected-day summary is a compact review surface.

It must show enough selected-day data for the user to recognize the entry:

- Tracker name/color.
- Primary value and unit.
- Optional note/context.
- Optional tags where available.
- Specialized summary fields where required by tracker contract.

For Weight, Calendar must include optional waist data because waist is a first-class optional input.

---

## 5. Mutation Contracts

### Edit Entry

Generic edit currently supports:

- Value.
- Note.
- Date/time.
- Asset.

Weight edit currently supports:

- Weight.
- Weight unit from tracker config.
- Waist.
- Waist unit.
- Note.
- Date/time.
- Asset.

Remaining Weight edit gap:

- Tags are persisted and replaceable in the backend, but the current edit UI does not expose tag editing.

### Delete Entry

Delete must remove the entry safely from all structural locations:

- Base `entries` row.
- Specialized row such as `entry_weight`.
- Join rows such as `entries_to_tags`.
- Any derived UI caches must invalidate dashboard, entries, stats, weight detail, and calendar reads.

For assets, deleting an entry should remove the attachment relationship/reference, not necessarily delete the underlying asset file unless a separate asset-delete flow is requested.

---

## 6. Key Vague Contracts Remaining

- Minimum sample threshold for "enough waist data exists" is not defined.
- Calendar day response includes specialized Weight fields and tag IDs, but not resolved tag labels.
- Entries tab uses specialized Weight history for Weight and carries tag IDs, but not resolved tag labels.
- BentoGrid Weight widget uses specialized Weight detail where available and generic entries as a fallback.
- Quick Entry has suggested tags in context, but no visible tag picker in the current Weight submit path.
- Edit Entry can update Weight waist, but tag editing is still not exposed.
- Body fat exists in the current persistence/service code but is not a product requirement in this contract; keep it optional/future unless explicitly requested.
- Planned trackers need per-tracker thresholds, units, entity schemas, and statistics definitions before implementation.

---

## Contract Completeness Checklist

1. Can Quick Entry capture it?
2. Can backend validate/process it?
3. Can DB store it structurally?
4. Can service read/compute it?
5. Can BentoGrid summarize it?
6. Can Entries show the exact logged data?
7. Can Statistics aggregate it?
8. Can Calendar summarize it?
9. Can Edit Entry modify it?
10. Can Delete Entry remove it safely?
