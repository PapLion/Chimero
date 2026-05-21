# Mood Contract

## 1. Purpose

Mood tracks subjective mood values over time using the generic entry model plus typed shared read models. The canonical Mood score scale is 1-10 going forward.

This milestone keeps Mood intentionally narrow:

- storage remains generic `entries`, not `entry_mood`
- `entries.value` is the source of truth for `moodScore`
- `entries.note` stores note/context
- `entries.timestamp` stores the exact event time
- `entries.dateStr` stores day grouping
- explicit `tagIds` persist through the existing tag flow
- `assetId` uses the existing generic entry asset support

Energy, stress, before/after work as a first-class field, advanced correlations, cause rollups, and Health/Food/Vitamins expansion are deferred.

## 2. Current Implementation Status

- Status: `GENERIC_ENTRY_IMPLEMENTED_WITH_1_10_MOOD_READ_MODELS`.
- Quick Entry uses 1-10 for Mood and submits through `BaseEntryRequest`.
- Edit Entry uses 1-10 for Mood entries and preserves generic edit support for note/context, timestamp, explicit tags, and asset.
- Electron default Mood seed is aligned to `config.max: 10`.
- Web default Mood seed already uses `config.max: 10`.
- Entries tab has a Mood-specific 1-10 rendering path and shows each Mood entry separately.
- Calendar selected-day summary shows each Mood entry separately and labels Mood values as `/10`.
- Bento/Home remains compact and uses selected-day/latest Mood plus existing daily aggregate trend support.
- Statistics/Graphs interpret generic `entries.value` as a 1-10 Mood score for average/high/low/latest and chart data.
- No DB migration, historical backfill, or `entry_mood` table was added.

## 3. Surface Contract

### Quick Entry

- Captures Mood score on a 1-10 scale.
- Captures optional note/context in `entries.note`.
- Persists exact `timestamp` and backend-derived `dateStr`.
- Persists explicit `tagIds` through existing tag mutation support.
- Persists optional `assetId` through generic entry asset support.
- Does not capture energy, stress, before/after work, or cause-specific structural fields.

### Edit Entry

- Exposes Mood score controls from 1-10.
- Does not downgrade/clamp Mood to 1-5.
- Updates score through generic `update-entry` with `entries.value`.
- Updates note/context, date/time, explicit `tagIds`, and `assetId` where supported by the existing generic edit path.
- Non-Mood generic rating behavior remains 1-5.

### Entries Tab

- Shows every Mood entry separately, including multiple entries on the same day.
- Shows `moodScore` as `1-10`, derived visual state/color/label, note/context, timestamp, tag chips where available, and asset preview/indicator where available.
- Preserves edit/delete affordances per entry.

### Calendar Selected-Day Summary

- Shows each selected-day Mood entry separately.
- Does not collapse multiple Mood entries into one misleading day value.
- Shows score as `/10`, derived label/color, note/context, time, and tag chips where available.
- Calendar month read remains generic `entries` plus `tagIds`.

### BentoGrid / Home

- Remains compact.
- Shows selected-day/latest Mood value where appropriate.
- Uses existing `get-mood-daily-aggregates` for recent daily aggregate trend data.
- Does not show every same-day Mood entry in Bento.

### Statistics / Graphs

- Uses generic `entries.value` interpreted as a 1-10 Mood score.
- Statistics expose count, average, high, low, and latest Mood where available.
- Graph data uses generic Mood numeric values and daily grouping where already supported.
- Advanced mood analytics and correlations are deferred.

## 4. Deep Contract / Backend-Service

### Entry Points

- Create: generic `add-entry`.
- Update: generic `update-entry`.
- Delete: generic `delete-entry`.
- Read entries: generic `get-entries`.
- Daily aggregate read: `get-mood-daily-aggregates`.

### Persistence

- `entries.value`: canonical Mood score source of truth.
- `entries.note`: note/context.
- `entries.metadata`: generic payload only; no first-class Mood fields are introduced in this milestone.
- `entries.timestamp`: exact event time.
- `entries.dateStr`: normalized day key.
- `entries.assetId`: optional single asset reference.
- `entries_to_tags`: explicit tag relationships.

No `entry_mood` table, DB migration, or historical backfill is part of this contract.

### Shared Domain / Read Models

Implemented shared helpers and read models:

- `clampMoodScore(value): 1-10`
- `normalizeMoodScore(value): number`
- `moodScoreToVisualState(value)`
- `moodScoreToColor(value)`
- `moodScoreToLabel(value)`
- `computeMoodDailyAggregate(entries)`
- `computeMoodStats(entries)`
- `MoodEntryReadModel`
- `MoodDailyAggregate`
- `MoodBentoReadModel`
- `MoodEntriesReadModel`
- `MoodStatisticsReadModel`
- `MoodCalendarDayReadModel`

These read models are derived from generic `Entry` rows; they do not imply a dedicated Mood persistence table.

## 5. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Bento | Entries | Calendar | Stats/Graphs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moodScore 1-10 | Yes | Yes | `entries.value` | Yes | Yes | Yes | Yes |
| note/context | Yes | Yes | `entries.note` | No | Yes | Yes | No |
| exact time | Yes | Yes | `entries.timestamp` | Selected/latest | Yes | Yes | Chart grouping |
| day grouping | Backend | Backend | `entries.dateStr` | Yes | Yes | Yes | Yes |
| explicit tags | Yes | Yes | `entries_to_tags` | No | Yes | Yes | Future tag stats |
| assetId | Yes | Yes | `entries.assetId` | No | Yes | Indicator/support | No |
| energy | Deferred | Deferred | No | No | No | No | No |
| stress | Deferred | Deferred | No | No | No | No | No |
| before/after work structural field | Deferred | Deferred | No | No | No | No | No |
| advanced correlations | Deferred | Deferred | No | No | No | No | Deferred |

## 6. Remaining Gaps

- Backend generic entry validation is still thin compared with specialized Weight validation.
- Existing historical Mood rows are not backfilled or rewritten; they are displayed through the 1-10 read path as stored values.
- Tag labels/chips depend on existing tag availability per surface.
- Calendar does not render inline asset previews for Mood; it preserves asset references through the generic calendar/read path.
- Advanced correlations, cause rollups, energy, stress, and before/after work are not implemented.

## 7. Contract Decision

Mood is now a 1-10 generic-entry tracker with typed shared read models. The previous 1-5 Electron default/Edit Entry blocker is resolved for this milestone without a migration or new table.
