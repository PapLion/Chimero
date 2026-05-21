# Social Contract

## 1. Purpose

Social is both a personal CRM-adjacent tracker and an interaction tracker. It must distinguish contact profile data from social interaction entry data: contacts live in the Contacts domain, while Social tracker entries use the generic entries table plus optional contact-interaction writes.

## 2. Current Implementation Status

- Status: PARTIAL_GENERIC_TRACKER_PLUS_CONTACT_INTERACTIONS.
- Quick Entry can select contacts through `ContactBubblesGrid`.
- Quick Entry saves a generic Social entry, then attempts contact interaction writes.
- Current contact interactions are created with `entryId: null`, so they are not structurally joined back to the generic entry.
- BentoGrid has a Social widget that summarizes selected-day satisfaction/value and extracts people names from notes.
- Contact profile CRUD and interaction history exist outside the tracker contract.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry requires at least one selected contact for Social trackers in the current UI.
- Quick Entry captures selected contact IDs and per-contact mood (`positive|negative|neutral`) for contact interaction writes.
- Quick Entry captures generic value as satisfaction/hours depending tracker config.
- Quick Entry captures optional note/context.
- Quick Entry captures optional tags/assets through the generic entry path.
- Edit Entry can update only the generic Social entry fields today. It does not currently edit associated contact interactions.
- Delete removes the generic entry; contact interactions with `entryId: null` are not automatically removed through tracker delete behavior.

### 3.2 BentoGrid / Home Widget Read Model

- Shows selected-day satisfaction/value when present.
- Shows people/context extracted from notes.
- May summarize selected-day interaction count generically.
- Must not imply contact-linked relational integrity until `entryId` linkage is implemented.

### 3.3 Tracker Detail / Entries Tab Read Model

- Shows generic Social entries with value, note/context, timestamp, tags, asset indicator, edit, and delete.
- Contact profile details may be linked by future read models but are not guaranteed in current tracker entries.

### 3.4 Tracker Detail / Statistics Tab Read Model

- May show total entries, current streak, average value, days since last social entry, entries this week/year, and generic stats.
- Contact frequency summaries are PRODUCT_REQUESTED_NOT_FULLY_IMPLEMENTED unless based on Contacts interaction history outside this tracker detail.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Relevant.
- Graphs generic Social value/count over time.
- Per-contact frequency graphs are Future until entry/contact linkage is first-class.

### 3.6 Calendar Selected-Day Summary Read Model

- Shows selected-day Social entries with value, note/context, timestamp, tags, and asset reference.
- Contact names can appear from note/context; linked contact summaries are Future because current interaction rows are not structurally joined to entries.

### 3.7 Insights / Correlations Read Model

- Generic correlations can use Social values by tracker ID.
- Relationship-quality or per-contact correlations are Future and need client-approved semantics.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Status: PARTIAL.
- Implemented generic Social entry methods: `add-entry`, `update-entry`, `delete-entry`, `get-entries`, `get-calendar-month`.
- Implemented contact-domain methods: `get-contacts`, `get-contact`, `create-contact`, `update-contact`, `delete-contact`, `create-contact-interaction`, `get-contact-interactions`.
- Social tracker entry + contact interaction linkage is PARTIAL because current Quick Entry writes a generic entry and then writes contact interactions separately, with interaction `entryId` nullable.
- Contact CRUD is implemented, but not a specialized Social tracker detail service.

### 2. Request Validation

- Generic Social entry fields: `trackerId`, optional numeric `value`, optional `note`, `timestamp`, optional `assetId`, optional `tagIds`.
- Contact interaction fields: `contactId`, mood enum `positive|negative|neutral`, optional notes, optional `entryId`.
- Current backend validates non-empty contact name on create and basic `contactId`/`mood` presence for interaction.
- Current backend does not strongly validate selected contact existence before all Social entry writes, multi-contact atomicity, mood effect semantics, avatar asset existence, birthday/date formats beyond storage, or relation between entry and interaction.
- Missing/invalid writes return `null` or `{ success: false }`.

### 3. Normalization

- Generic entry path computes `dateStr` from entry `timestamp`.
- `create-contact-interaction` currently sets its own `timestamp = Date.now()` and updates contact `dateLastTalked` to today's `YYYY-MM-DD`.
- Contact `traits` are JSON-stringified on update when provided.
- `note`, `assetId`, birthday/date fields, and optional contact fields normalize to `null`.
- Sorting: contacts by name ascending; interactions by timestamp descending; entries newest-first.

### 4. Persistence Plan

Write flow:

1. Insert/update base Social entry in `entries`.
2. Insert/update specialized tracker table if needed: none exists for Social entries.
3. Insert/update junction rows in `entries_to_tags` when `tagIds` is provided.
4. Update related entity state if needed: create `contact_interactions` and update `contacts.date_last_talked`.
5. Return mapped generic `Entry` and/or mapped `ContactInteraction`/`Contact` contract.

- Generic entry/tag writes are transactional.
- Contact interaction + `dateLastTalked` update are not currently wrapped in a transaction in the contact handler.
- Quick Entry entry write + one or more contact interaction writes are not one atomic backend transaction.
- Delete Social entry removes `entries` and tag joins; existing `contact_interactions` with `entryId: null` or set-null FK are not removed by tracker delete.
- Current status includes `IMPLEMENTATION_GAP_TRANSACTION_SAFETY` for create interaction + update contact and for multi-contact Social entry writes.

### 5. Read / Query Plan

- BentoGrid: reads generic Social entries by tracker/selected date; extracts people/context from note and selected-day values.
- Entries tab: reads generic Social entries newest-first with note, value, timestamp, tags, and assets.
- Statistics tab: generic stats can compute total entries, averages, active days, entries this week/year, and days since last Social entry.
- Graphs: plots generic Social value/count; per-contact graphs are FUTURE.
- Calendar selected-day: returns each Social entry from month query with value, note, asset, tag IDs.
- Contact profile: reads `contacts` and `contact_interactions` through contact-domain endpoints, not tracker detail.
- Edit Entry prefill: generic entry fields only; associated contact interactions are not currently edited through entry edit.
- Correlation/Insight: generic correlation can use Social values; per-contact relationship correlation is FUTURE.
- Empty state: no entries/interactions returns empty arrays or null values.

### 6. Computed Metrics

- Implemented/generic: selected-day value/count, entry count, generic averages, active days, generic correlation caveats.
- Implemented contact state update: `dateLastTalked` set when an interaction is created.
- Future/partial: contact frequency in tracker detail, mood effect summaries, multi-contact interaction aggregation, birthday age calculations in tracker surfaces, per-contact graphs.
- Metrics are computed on read or in surfaces; no Social tracker metric cache exists.

### 7. Response Mapping

- Entry flow: `entries` DB rows -> `mapEntry` -> shared `Entry` -> Social surface read model.
- Contact flow: `contacts` / `contact_interactions` DB rows -> `mapContact` / `mapContactInteraction` -> shared contact contracts.
- Raw DB rows never return to renderer surfaces.
- Missing entry-contact linkage is represented as `entryId: null`, not guessed from note text.

### 8. Error Handling

- Invalid generic entry/DB failure returns `null` or `false`.
- Invalid contact create/interaction returns `null`; delete contact returns `{ success: false }` on failure.
- Missing contact/entry returns `null` or empty arrays.
- Delete conflicts are currently handled by FK cascade/set-null behavior; Social entry delete does not clean unlinked interactions.
- Unsupported per-contact tracker stats should be marked Future/Partial.

### 9. Transaction Rules

- Generic Social entry writes are transactional for `entries` and tag joins.
- Contact interaction + contact `dateLastTalked` update is not transactionally guaranteed today.
- Social entry + multiple interaction creation is not atomic today.
- Current status: IMPLEMENTATION_GAP_TRANSACTION_SAFETY.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting.
Backend owns: validation, normalization, derived metrics, relation resolution, persistence orchestration, response mapping.
Database owns: durable storage, relational integrity, queryable structure.
Shared contracts own: request/response shapes, app-facing types, pure domain helpers when reusable.

### 11. Deep Contract Status

- Status: PARTIAL.
- Implemented: contacts CRUD, interactions, `dateLastTalked` update, generic Social entries, generic calendar/stats/correlation compatibility.
- Gaps: first-class entry/contact join, atomic multi-contact Social writes, contact frequency tracker detail, edit/delete behavior for related interactions, age/birthday surface model, avatar asset read model consistency.

## 5. Persistence and Schema / Database

- `contacts`: profile data including name, avatar, birthday/date fields, traits, and notes.
- `contact_interactions`: `contact_id`, nullable `entry_id`, mood, timestamp, notes.
- `entries.value`: generic satisfaction/hours/count value.
- `entries.note`: social context/people text.
- `entries.timestamp` and `entries.date_str`: social event time/day.
- `entries.asset_id`: optional attachment.
- `entries_to_tags`: explicit tags.

## 6. Input / Output Contracts

```ts
type ContactProfileResponse = Contact

type CreateSocialEntryRequest = BaseEntryRequest & {
  trackerId: number
  value?: number | null
  note?: string | null
  timestamp: number
  assetId?: number | null
  tagIds?: number[]
  contactInteractions?: Array<{
    contactId: number
    mood: "positive" | "negative" | "neutral"
    notes?: string | null
  }>
}

type UpdateSocialEntryRequest = Partial<Omit<CreateSocialEntryRequest, "trackerId" | "contactInteractions">>

type SocialEntryResponse = BaseEntryResponse

type SocialDetailResponse = {
  entries: BaseEntryResponse["entry"][]
  contacts?: ContactProfileResponse[]
}

type SocialBentoWidgetResponse = {
  trackerId: number
  selectedDateValue: number | null
  people: string[]
  interactionCount: number
}

type SocialEntriesTabResponse = {
  entries: Array<BaseEntryResponse["entry"] & { tags?: TagSummary[]; assets?: AssetSummary[] }>
}

type SocialStatisticsResponse = {
  totalEntries: number
  currentStreak?: number
  averageValue?: number | null
  daysSinceLastEntry?: number | null
  contactFrequency?: Future<Array<{ contactId: number; count: number; lastTalked?: string | null }>>
}

type SocialCalendarDayResponse = TimelineEvent & {
  entryId: number
  trackerId: number
  value?: number | null
  note?: string | null
  people?: string[]
  tagIds?: number[]
  assets?: AssetSummary[]
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| contact profile | Yes | No | Yes | Optional | Optional | Future | Optional | Future | Future | Future |
| selected contactIds | Yes | Future | Optional | No | Optional | Future | Future | Future | Future | Future |
| contact mood | Yes | Future | Yes | Optional | No | Future | Future | Future | Future | Future |
| social value/satisfaction | Yes | Yes | Yes | Optional | Yes | Yes | Yes | Yes | Yes | Yes |
| note/context | Optional | Optional | Yes | No | Optional | Yes | Optional | No | Optional | Optional |
| contact frequency | No | No | Yes | Computed | Optional | No | Future | Future | Future | Future |
| tagIds | Optional | Optional | Yes | Optional | No | Yes | Future | Future | Optional | Future |
| assets | Optional | Optional | Optional | Optional | No | Optional | No | No | Optional | Future |
| entry-contact join | No | No | Optional | No | No | No | Future | Future | No | Future |

## 8. Completeness Checklist

- [x] Quick Entry / Edit Entry input is documented.
- [x] Backend request path is documented.
- [x] Database persistence shape is documented.
- [x] Backend computed response is documented.
- [x] BentoGrid read model is documented.
- [x] Entries tab read model is documented.
- [x] Statistics tab read model is documented.
- [x] Graphs tab relevance is documented.
- [x] Calendar selected-day summary is documented.
- [x] Edit/Delete behavior is documented.
- [x] Future Insights/Correlations are limited to explicit/generic scope.

## 9. Deep Contract Checklist

- [x] Does backend have a clear entry point?
- [ ] Does backend validate all request fields? Contact existence/linkage and Social semantics are partial.
- [x] Does backend normalize timestamp/dateStr/defaults?
- [x] Does backend know which tables to write?
- [ ] Does backend write related rows transactionally? IMPLEMENTATION_GAP_TRANSACTION_SAFETY for interactions/dateLastTalked and multi-contact writes.
- [x] Does backend know which tables to read for each surface?
- [ ] Does backend compute metrics instead of frontend? Contact frequency/mood effect are not tracker backend metrics today.
- [x] Does backend map DB rows into shared contracts?
- [x] Does backend handle empty/insufficient data?
- [ ] Does backend return clear errors/warnings? Current path uses generic fallbacks.
- [ ] Does delete/update affect related rows safely? Unlinked contact interactions are not cleaned by Social entry delete.
- [x] Is current implementation status honest?
