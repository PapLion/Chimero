# Social Contract

## 1. Purpose

Social is both a tracker for logged interactions and a small personal CRM surface. New structured Social entries must preserve a durable link between the generic entry row and one or more contact interaction rows. Contact profile data belongs to the Contacts domain; Social tracker entries own the interaction event.

## 2. Current Implementation Status

- Status: LINKED_SOCIAL_CRM_FOUNDATION_PARTIAL.
- New Quick Entry Social submissions write the base `entries` row and linked `contact_interactions` rows transactionally through `add-entry`.
- New structured interactions are created with `entryId` set to the new Social entry ID. New Quick Entry Social writes must not create `entryId: null` interactions.
- Existing `contact_interactions.entryId = null` rows remain readable legacy/unstructured interaction history. They are not backfilled, guessed, or deleted.
- Contact profile fields now include birthday, date met, last talked, likes, dislikes, traits, notes, has kids, kids notes, and avatar asset ID.
- Contact reminder/attention settings are persisted as a lightweight foundation: birthday awareness days before, and check-in attention after N days.
- Contact profile blocks are persisted with title, body, type, and order. The renderer supports create/edit/delete and move up/down reorder. There is no draggable or masonry layout guarantee.
- Contact sorting supports name, most talked to, and least talked to using linked structured interactions. Legacy null-entry interactions do not count toward structured frequency metrics.
- Web parity is limited to existing web API mapper compatibility for contacts/interactions. No new web-only architecture is introduced.
- No Mood correlation UI, AI suggestions, OS-level notifications, complex scheduling, contact import/sync, enterprise CRM, or unsafe legacy backfill is implemented.

## 3. Surface Contract / Frontend

### 3.1 Quick Entry / Edit Entry Input

- Quick Entry requires at least one selected contact for Social trackers.
- Quick Entry captures selected contact IDs and per-contact mood impact (`positive | negative | neutral`).
- Quick Entry currently saves interaction method as `other` for the generic Social flow and stores note/context on each linked interaction.
- Quick Entry captures generic value, note/context, tags, and assets through the existing entry path.
- Edit Entry still primarily edits generic entry fields. Full structured Social interaction editing is not guaranteed in this foundation.
- Delete Entry removes linked structured contact interactions for that entry and refreshes affected contacts' last-talked state. Legacy `entryId: null` interactions remain legacy and are not removed by entry delete.

### 3.2 BentoGrid / Home Widget Read Model

- The existing Social widget remains generic/compact.
- It can summarize selected-day generic Social values/counts.
- It must not imply Mood correlations, reminders delivered by the OS, or full relationship intelligence.
- Legacy generic Social entries may still appear as unstructured activity.

### 3.3 Tracker Detail / Entries Tab Read Model

- Generic Social entries remain readable with value, note/context, timestamp, tags, asset indicator, edit, and delete.
- Structured linked interaction data is persisted in `contact_interactions` and available through contact history endpoints.
- Legacy rows are explicitly unstructured when no linked interaction data exists.

### 3.4 Tracker Detail / Statistics Tab Read Model

- Shared Social/contact helpers support structured frequency metrics:
  - contact frequency
  - method frequency
  - mood impact distribution
  - days with Social contact
  - days since last talked
  - birthday awareness
- Structured frequency helpers count linked interactions only. Legacy `entryId: null` interactions are readable history but excluded from structured Social entry metrics.
- No Mood correlation UI or AI relationship suggestions are implemented.

### 3.5 Tracker Detail / Graphs Tab Read Model

- Generic Social value/count graphs may continue to use generic entries.
- Per-contact or per-method graphs are not guaranteed by this foundation.
- No masonry/draggable analytics surface is implemented.

### 3.6 Calendar Selected-Day Summary Read Model

- Calendar continues to show selected-day generic Social entries through the existing entry/calendar path.
- New linked interactions share the Social entry timestamp, so future selected-day enrichment can join by `entryId` without note parsing.
- Legacy/null-entry interaction rows are not inferred from notes.

### 3.7 Contact Page / CRM

- Contact list supports frequency sorting using linked structured interactions, with alphabetical fallback.
- Selecting a contact opens profile mode instead of create mode.
- Contact profile supports editing approved CRM fields.
- Contact history shows interaction date, mood impact, method, and notes.
- Avatar asset fallback uses contact photo when available, otherwise initials/avatar placeholder.

### 3.8 Contact Reminders / Attention

- Reminder settings are persisted, not scheduled.
- Birthday awareness computes days until birthday inside the app surface.
- Check-in attention computes days since last talked against the persisted threshold.
- There are no OS notifications, background schedulers, or complex calendar reminders.

### 3.9 Profile Grid / Blocks

- Profile blocks are persisted per contact with stable order indexes.
- Renderer supports create, inline edit on blur, delete, and move up/down reorder.
- This is the safe foundation for a profile grid. It is not a draggable/masonry engine.

### 3.10 Insights / Correlations

- Generic correlations can still use Social tracker values by tracker ID.
- Mood correlation UI and per-contact relationship correlations are not implemented.
- No notes are parsed to infer contacts, methods, or moods.

## 4. Deep Contract / Backend-Service

### 1. Backend Entry Point

- Implemented generic Social entry methods: `add-entry`, `update-entry`, `delete-entry`, `get-entries`, `get-calendar-month`.
- Implemented contact-domain methods: `get-contacts`, `get-contact`, `create-contact`, `update-contact`, `delete-contact`, `create-contact-interaction`, `get-contact-interactions`.
- Implemented CRM foundation methods: `get-contact-reminder-settings`, `upsert-contact-reminder-settings`, `get-contact-profile-blocks`, `create-contact-profile-block`, `update-contact-profile-block`, `delete-contact-profile-block`, `reorder-contact-profile-blocks`.

### 2. Request Validation

- Social methods are limited to `in-person`, `call`, `text`, `video`, and `other`.
- Social mood impact is limited to `positive`, `negative`, and `neutral`.
- New structured Social interactions require valid positive contact IDs and are persisted with `entryId`.
- The contact-domain `create-contact-interaction` endpoint rejects new interaction writes without `entryId`; existing null-entry rows remain legacy.
- The implementation does not infer contacts, method, or mood from notes.

### 3. Normalization

- Entry flow computes `dateStr` from entry `timestamp`.
- New linked interactions use the Social entry timestamp.
- `lastTalkedAt` and `dateLastTalked` are refreshed from the newest remaining interaction for a contact.
- Likes, dislikes, and traits are stored as JSON string arrays.
- Unknown legacy method values map to `null` at the API boundary instead of widening the shared contract.

### 4. Persistence Plan

Write flow for structured Social entry:

1. Insert/update the base Social entry in `entries`.
2. Replace entry tags when `tagIds` is provided.
3. Insert/reconcile linked rows in `contact_interactions` with the created/updated `entryId`.
4. Persist `method`, `moodImpact`, timestamp, and notes on each interaction.
5. Refresh affected contacts' `lastTalkedAt` and `dateLastTalked`.
6. Return mapped shared contracts.

- Entry plus linked interaction create/update/delete is handled transactionally in the Electron entry handler.
- Delete removes linked interactions for the deleted entry.
- Legacy `entryId: null` interactions are not backfilled or deleted.
- Contact reminder settings and profile blocks have dedicated additive tables.

### 5. Read / Query Plan

- Contacts list reads contacts and can sort by structured linked interaction frequency.
- Contact profile reads contact fields, reminder settings, profile blocks, and interaction history.
- Social tracker entries remain readable through generic entry queries.
- Calendar and Home continue to use existing generic entry read models; linked interactions are persisted for future enrichment.
- Web API contact interaction mapping returns `method`, `moodImpact`, and legacy-compatible `mood`.

### 6. Computed Metrics

- Implemented shared helpers:
  - `getInitials` / `getContactInitials`
  - `validateSocialMethod`
  - `validateSocialMoodImpact`
  - `computeContactFrequency`
  - `sortContactsByTalkFrequency`
  - `computeMethodFrequency`
  - `computeMoodImpactDistribution`
  - `computeDaysWithSocialContact`
  - `computeDaysSinceLastTalked`
  - `computeBirthdayAwareness`
  - `sortProfileBlocksByOrder`
  - `reorderProfileBlocks`
  - legacy/structured Social entry separation
- Structured metrics intentionally exclude legacy/null-entry interactions.

### 7. Response Mapping

- Entry flow: `entries` DB rows -> `mapEntry` -> shared `Entry`.
- Contact flow: `contacts` / `contact_interactions` DB rows -> shared `Contact` / `ContactInteraction`.
- Reminder flow: `contact_reminder_settings` DB rows -> shared `ContactReminderSettings`.
- Profile block flow: `contact_profile_blocks` DB rows -> shared `ContactProfileBlock`.
- Raw DB rows do not return to renderer surfaces.

### 8. Error Handling

- Invalid generic entry/contact operations return existing null/false fallbacks.
- Invalid block title is rejected.
- Unknown Social method values map to `null` for legacy compatibility.
- Missing contacts/interactions return null or empty arrays.

### 9. Transaction Rules

- New structured Social entry create/update/delete runs in the entry transaction with linked interactions and tag replacement.
- Contact profile/reminder/block CRUD is independent.
- Legacy null-entry interactions remain readable and are not altered by structured entry transactions.

### 10. Data Ownership Rules

Frontend owns: capture, display, UI state, visual formatting, move up/down profile block actions.
Backend owns: validation, normalization, linked interaction persistence, last-talked refresh, response mapping.
Database owns: durable additive CRM fields, linked interaction rows, reminder settings, profile blocks.
Shared contracts own: request/response shapes and reusable Social/contact domain helpers.

### 11. Deep Contract Status

- Status: PARTIAL_FOUNDATION_IMPLEMENTED.
- Implemented: linked Social interaction foundation, expanded contact CRM fields, persisted reminder/attention settings, persisted profile blocks, structured frequency helper foundation, legacy/null-entry preservation.
- Remaining gaps: full Edit Entry structured interaction editor, dedicated Social tracker read models for every surface, richer Calendar/Home enrichment, renderer tests for all Social surfaces, browser smoke, OS notifications, Mood correlations, import/sync, and advanced draggable/masonry layout.

## 5. Persistence and Schema / Database

- `contacts`: adds `last_talked_at`, `likes`, `dislikes`, `has_kids`, and `kids_notes` to existing profile data.
- `contact_interactions`: adds `method` and `mood_impact`; `entry_id` remains nullable only for legacy rows.
- `contact_reminder_settings`: stores birthday awareness and check-in attention settings per contact.
- `contact_profile_blocks`: stores contact profile blocks with stable order indexes.
- `entries`: continues to store the base Social entry.
- `entries_to_tags`: continues to store explicit tags.

## 6. Input / Output Contracts

```ts
type SocialMethod = "in-person" | "call" | "text" | "video" | "other"
type SocialMoodImpact = "positive" | "negative" | "neutral"

type CreateSocialEntryRequest = BaseEntryRequest & {
  socialInteractions: Array<{
    contactId: number
    method?: SocialMethod | null
    moodImpact?: SocialMoodImpact | null
    notes?: string | null
  }>
}

type UpdateSocialEntryRequest = EntryUpdateRequest & {
  socialInteractions?: CreateSocialEntryRequest["socialInteractions"]
}

type ContactReminderSettings = {
  contactId: number
  birthdayReminderEnabled: boolean
  birthdayReminderDaysBefore: number
  checkInReminderEnabled: boolean
  checkInAfterDays: number
}

type ContactProfileBlock = {
  id: number
  contactId: number
  title: string
  body: string
  orderIndex: number
  blockType: "text" | "list" | "note"
}
```

## 7. Field Visibility Matrix

| Field | Quick Entry | Edit Entry | DB | Backend Computed | BentoGrid | Entries Tab | Statistics Tab | Graphs Tab | Calendar | Insights/Correlations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| contact profile | Yes | Contact page | Yes | Optional | Optional | Future | Optional | Future | Future | Future |
| selected contactIds | Yes | Partial | Yes | No | Optional | Future | Yes | Future | Future | Future |
| method | Default `other` | Partial | Yes | Validated | Optional | Future | Yes | Future | Future | No |
| mood impact | Yes | Partial | Yes | Validated | Optional | Future | Yes | Future | Future | No |
| note/context | Optional | Optional | Yes | No | Optional | Yes | Optional | No | Optional | Optional |
| tags/assets | Optional | Optional | Yes | Optional | Optional | Yes | Future | Future | Optional | Future |
| contact frequency | No | No | Yes | Yes | Optional | Future | Yes | Future | Future | No |
| reminders/attention | Contact page | Contact page | Yes | Yes | No | No | No | No | No | No |
| profile blocks | Contact page | Contact page | Yes | Order only | No | No | No | No | No | No |
| Mood correlations | No | No | No | No | No | No | No | No | No | No |

## 8. Completeness Checklist

- [x] Quick Entry linked interaction foundation is documented.
- [x] Contact CRM fields are documented.
- [x] Reminder/attention foundation is documented.
- [x] Profile blocks are documented.
- [x] Legacy/null-entry interactions are documented as legacy.
- [x] Frequency sorting and structured-only metrics are documented.
- [x] Excluded Mood correlations, OS notifications, unsafe backfill, and draggable/masonry guarantees are documented.
- [ ] Full Social read models for every renderer surface are implemented.
- [ ] Full structured Social Edit Entry is implemented.
- [ ] Browser smoke is verified.

## 9. Deep Contract Checklist

- [x] Does backend have clear entry points?
- [x] Does backend validate Social method/mood impact?
- [x] Does backend normalize timestamp/dateStr/defaults?
- [x] Does backend know which tables to write?
- [x] Does backend write structured Social entries and interactions transactionally?
- [x] Does backend preserve legacy null-entry interactions?
- [x] Does backend map DB rows into shared contracts?
- [x] Does backend handle empty/insufficient data?
- [ ] Does every surface use a dedicated Social read model? Partial.
- [ ] Does Edit Entry fully edit structured Social interactions? Partial.
- [ ] Are OS reminders/notifications implemented? No, intentionally excluded.
