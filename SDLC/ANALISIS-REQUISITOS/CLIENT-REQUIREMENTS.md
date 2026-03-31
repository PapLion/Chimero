# CLIENT-REQUIREMENTS.md — v3.0 Reconciliado Final

> **Source:** Chat history (Nov 2025 – Mar 2026) + Notion Tracker Design Discovery + Decisions & Data Contracts + Auditoría de código fuente (2026-03-31).
> **Coverage:** 100% reconciliado contra código real, Notion exports, y chat history completo.
> **Last Updated:** 2026-03-31
> **Auditor:** Panda (Architecture Orchestrator)

---

## 1. Product Vision

A **local-first, privacy-oriented desktop habit tracker** (Electron) that lets the user log daily life data across multiple categories, visualize patterns over time, and discover correlations between habits. No cloud dependency. All data stays on the user's machine.

> *"I want to track everything. It's just personal use."*  
> *"Easy to input and see what I did at a glance every day."*
> *"I already log everything I eat daily such as Potato chips, 1/3lb beef, spices etc."*

---

## 2. Core Principles (Non-negotiable)

| Principle | Detail |
|---|---|
| **Local-first** | All data stored on-device (SQLite). No external services. |
| **Privacy** | **TOTAL PROHIBITION of external AI.** All AI/ML inference MUST run locally. Client has GTX 1080 Ti for eventual self-hosted model integration. Zero data leaves the machine — ever. |
| **Speed of entry** | Logging must be fast. Tedious entry is a blocker. |
| **Glanceability** | Home screen shows the day at a glance. No scrolling to find basics. |
| **Dark mode** | Dark grey / near-black background. Purple accent. Not white. Not blue. |
| **Correlations** | Everything interconnected — the tag system enables cross-tracker insights. |

---

## 3. Tech Stack (Client-specified)

- **Desktop:** Electron + Vite (migrated from Next.js in Feb 2026)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Database:** SQLite (local, no BLOBs — files in `userData/assets`)
- **Frontend:** React
- **Monorepo:** pnpm workspaces + Turbo
- **ORM:** Drizzle ORM

---

## 4. Trackers — Required

Each tracker has its own dedicated page accessible from the sidebar.

### 4.1 Mood — DEFINED 🔴

> ⚠️ **CODE AUDIT FINDING:** Current `ipc-handlers.ts:149` has Mood with `config: { max: 5 }`. Client explicitly wants **1-10 scale mapped to 4 colors** (Red/Orange/Yellow/Green). Must fix to `max: 10`.

**Data Contract:**
```typescript
interface MoodEntry {
  id: number;
  value: number;                    // 1-10 internally, maps to colors
  metadata: {
    color: "red" | "orange" | "yellow" | "green";  // Display representation
    tags?: string[];                // Cause tags: "work", "social", "sleep"
    context?: "before_work" | "after_work" | "general";  // Time context
    note?: string;
  };
  timestamp: number;                // Multiple entries per day allowed
}
```

**Requirements:**
- **Scale:** Colors instead of numbers — red / orange / yellow / green (maps internally to 1-10)
  - Red: 1-3 | Orange: 4-5 | Yellow: 6-7 | Green: 8-10
- **Multiple entries per day:** 3–10 typical; key split is **before work vs after work**
- **Cause tags:** Optional for major moods — most entries will have no cause tag
- **Statistics (granular, per tab):**
  - Average mood: today, this week, this month, this year
  - Mood change vs: yesterday, last week, last month, last year (as %)
  - Peak and low of the day/week/month
- **Correlations:** mood vs. all other trackers (alcohol, social, sleep, exercise)
- **Graphs tab:** Daily / Weekly / Monthly / Yearly time filters
- **Annual heatmap view:** Grid of month × day colored by mood value (GitHub contributions style)
- **Detail page:** Line graph showing mood going up/down through the day

**Bento Widget:** Today's color + avg score + mini heatmap

---

### 4.2 Weight — DEFINED 🔴

> ⚠️ **CODE AUDIT FINDING:** Current `ipc-handlers.ts` has Weight as `type: "numeric"` with `unit: 'kg'`. Client explicitly wants **lbs as default**. Must add `targetWeight` setting and color indicators to UI.

**Data Contract:**
```typescript
interface WeightEntry {
  id: number;
  value: number;                    // Weight in lbs (primary)
  metadata: {
    unit: "lbs" | "kg";             // Display preference (lbs default, switchable)
    waist?: number;                 // Waist measurement in inches (optional)
    note?: string;
  };
  timestamp: number;
}

interface WeightSettings {
  defaultUnit: "lbs" | "kg";
  targetWeight: number | null;
  showWeeklyAverage: boolean;
}
```

**Requirements:**
- **Units:** lbs/pounds as default, switchable to kg
- **Primary metric:** Weight. Add basic waist measurement (not full body composition)
- **Body fat:** ~~removed~~ — client said "probably won't use"
- **Target weight:** Yes — set targets and track progress
- **Logging frequency:** Daily, once every morning
- **Detail page UX:**
  - **Green indicators** when losing toward goal
  - **Red indicators** when not losing or gaining
  - Show when on a 4-day loss/neutral streak
  - Delta vs last week prominently displayed
  - Weekly average alongside daily numbers
- **Trend chart range:** 3/7/14/30/60/90/180/270 days, 1yr/2yr/3yr (all selectable)
- **Correlations:** Diet tags ("cheat day", "very bad food") auto-pulled into Weight correlations

**Bento Widget:** Current weight + delta vs last week + sparkline + color indicator

---

### 4.3 Social / CRM — DEFINED 🔴

> ⚠️ **CODE AUDIT FINDING:** Current schema (`packages/db/src/schema.ts` lines 116-136) is MISSING: `likes`, `dislikes`, `hasKids`, `kidsCount`, `relationshipType` on contacts table. Also MISSING: `method`, `durationMinutes` on contact_interactions table.

**Data Contract — REQUIRED (includes missing fields):**
```typescript
interface Contact {
  id: number;
  name: string;
  avatarAssetId: number | null;
  birthday: string | null;          // ISO date
  dateMet: string | null;
  dateLastTalked: string | null;
  traits: string[];                 // "honest", "rude", etc.
  notes: string | null;
  likes: string | null;             // ⚠️ MISSING IN SCHEMA — What they like
  dislikes: string | null;          // ⚠️ MISSING IN SCHEMA — What they dislike
  hasKids: boolean;                 // ⚠️ MISSING IN SCHEMA — Whether they have kids
  kidsCount: number | null;         // ⚠️ MISSING IN SCHEMA — How many kids (if hasKids)
  relationshipType: "friend" | "family" | "work" | "acquaintance" | "other";  // ⚠️ MISSING IN SCHEMA
}

interface ContactInteraction {
  id: number;
  contactId: number;
  entryId: number | null;
  mood: "positive" | "negative" | "neutral";
  method: "call" | "text" | "in_person" | "other";  // ⚠️ MISSING IN SCHEMA
  durationMinutes: number | null;   // ⚠️ MISSING IN SCHEMA
  timestamp: number;
  notes: string | null;
}
```

**Schema Migration Required:**
```sql
-- Contact enhancements (MISSING FROM CURRENT SCHEMA)
ALTER TABLE contacts ADD COLUMN likes TEXT;
ALTER TABLE contacts ADD COLUMN dislikes TEXT;
ALTER TABLE contacts ADD COLUMN has_kids INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN kids_count INTEGER;
ALTER TABLE contacts ADD COLUMN relationship_type TEXT DEFAULT 'other';

-- Interaction enhancements (MISSING FROM CURRENT SCHEMA)
ALTER TABLE contact_interactions ADD COLUMN method TEXT DEFAULT 'other';
ALTER TABLE contact_interactions ADD COLUMN duration_minutes INTEGER;
```

**Requirements:**
- **Bubble grid UI** (like Discord profile pictures)
- Each contact = one bubble; letter initials if no photo, photo if assigned
- **Click behavior — Keybindings:**
  - `Shift+Left click` → Positive interaction
  - `Shift+Right click` → Negative interaction
  - `Shift+Middle click` → Neutral interaction
- **Communication method per interaction:** Call / Text / In Person / Other
- **Multi-select bubbles for batch daily entry:** User can select multiple contacts and log interactions in batch
- **Contact Profile Page:** dedicated page per contact with:
  - Profile photo (uploadable)
  - Birthday + Age (derived or manual)
  - Date met / Date last talked
  - Traits (custom labels)
  - Misc notes
  - **Likes / Dislikes** (separate text fields)
  - **Has kids:** boolean + count
  - **Relationship type:** Friend / Family / Work / Acquaintance / Other
  - Layout: drag-and-drop grid of info boxes
- **Contacts list page:** sortable by frequency (most/least talked to ascending/descending)
- **Neglect alerts:** "You haven't talked to Sarah in 28 days" (toggleable per contact or globally)
- **Birthday reminders:** Auto-reminder from birthday field
- **Energy audit:** positive vs negative interaction ratio per contact

**Bento Widget:** Upcoming birthday + weekly interaction count

---

### 4.4 Exercise — DEFINED 🔴

> ⚠️ **CODE AUDIT FINDING:** Current schema has NO `workout_templates` or `workout_template_exercises` tables. Exercise uses generic entries with JSON metadata. Schema migration required (see §22).

**Data Contract:**
```typescript
interface ExerciseEntry {
  id: number;
  value: number;                    // Total session volume (sum of sets × reps × weight)
  metadata: {
    templateId?: number;            // ID of preset used
    templateName?: string;          // Display name of preset
    exercises: Array<{
      name: string;
      sets: Array<{ reps: number; weight: number; unit: "kg" | "lbs" }>;
      actualReps?: number;          // If different from preset
      actualWeight?: number;
    }>;
    duration?: number;              // Session duration in minutes
    type: "strength" | "cardio" | "other";
  };
  timestamp: number;
}

interface WorkoutTemplate {
  id: number;
  name: string;                     // "Full body 1", "Push Day A"
  exercises: Array<{
    name: string;
    defaultSets: number;
    defaultReps: number;
    defaultWeight: number;
  }>;
  createdAt: number;
}
```

**Requirements:**
- Integrate [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (800+ exercises JSON)
- **Templates/presets:** Named presets (e.g. "Full body 1") that auto-select exercises with expected sets/reps
  - Presets change every few months, not every session (1–4 routines max at any time)
  - On logging: Click preset → see all exercises as cards side by side → +/- to adjust reps/sets vs goal → save for that day
- **Training type:** Lifting primarily
- **UI preference:** Client doesn't like popup QuickEntry for exercise — wants **integrated page view**
- **PR auto-detection:** Compare current set vs historical best for same exercise
- Log: exercise name, sets, reps, weight
- Statistics: workouts this week/month/year, total kg lifted, days since last workout

**Bento Widget:** Last session date + preset name + days since last workout + weekly streak

---

### 4.5 Books — DEFINED 🔴

> ⚠️ **CODE AUDIT FINDING:** Current code uses generic `entries` table for Books instead of a dedicated `books` table. This means no proper shelf system (reading/finished/want_to_read/dropped) at schema level. Migration required (see §22).

**Data Contract:**
```typescript
interface Book {
  id: number;
  title: string;
  author: string | null;
  genre: string | null;
  status: "reading" | "finished" | "want_to_read" | "dropped";
  startDate: string | null;         // ISO date
  finishDate: string | null;
  rating: number | null;            // 1.0 to 5.0 in 0.1 increments (3.1, 3.2, etc.)
  notes: string | null;
  coverAssetId: number | null;
}

// Entry just references book + date read (NO pages per session)
interface BookEntry {
  id: number;
  metadata: {
    bookId: number;
    date: string;
  };
  timestamp: number;
}
```

**Requirements:**
- **Log:** Start date, days read, finish date. **NO per-session page tracking** — too much friction
- **Rating:** 1–5 stars with decimal precision (3.1, 3.2... every tenth)
- **Shelves:** Separate (Reading / Finished / Want to Read / Dropped)
- **Use case:** Reading streaks, books per week/month
- Statistics: books read this year/week, days since last book read
- Small visual representation in widget (book cover if asset attached)

**Bento Widget:** Current book + progress (% days into it) + last 3 finished

---

### 4.6 Gaming — DEFINED 🔴

> ⚠️ **CODE AUDIT FINDING:** Current implementation stores Gaming as `type: "text"` with no structured `hasWinLoss` or `result` fields in metadata schema. UI for win/loss toggle not implemented.

**Data Contract:**
```typescript
interface GamingEntry {
  id: number;
  value: number;                    // Hours played (required, never NULL)
  metadata: {
    game: string;                   // Game title (required)
    mood?: "focused" | "tilted" | "relaxed";
    hasWinLoss: boolean;            // Does this game track wins/losses?
    result?: "win" | "loss" | "draw" | null;  // Only if hasWinLoss = true
  };
  timestamp: number;
}
```

**Requirements:**
- **Core:** Games played each day + estimated hours + mood/feeling correlations
- **Games:** Several but typically 1–2 types per month
- **Win/loss:** Certain games should log wins/losses for mood correlation
  - User defines per game whether it has win/loss tracking
- **Insight goal:** "X game makes mood lower", "Y game with losses makes mood lower", "Z game always improves mood" — per-game mood impact
- **Awareness tool only** — no streak pressure
- Statistics: hours this week/month, last played date per game

**Bento Widget:** Hours this week + last session game + mood during

---

### 4.7 Media / TV / Series — DEFINED 🔴

> ⚠️ **CODE AUDIT FINDING:** Current implementation uses `type: "text"` with no structured `subcategory` field in metadata. Subcategory selector UI not implemented.

**Data Contract:**
```typescript
interface MediaEntry {
  id: number;
  value: number | null;             // Hours watched (optional)
  metadata: {
    title: string;
    subcategory: "youtube" | "twitch" | "podcast" | "tv_movie" | "misc";  // NEW
    episode?: string;
  };
  timestamp: number;
}
```

**Requirements:**
- Log show/movie title, episode or hours watched
- **Subcategories:** YouTube, Twitch, Podcast, TV/Movie, Miscellaneous
- Small visual representations in widget
- Timeline page use case: "See what months I was watching what show"
- Statistics: days since last watched, total watch time

---

### 4.8 Diet / Food — DEFINED 🔴

> ⚠️ **CODE AUDIT FINDING:** Diet tracker works but the **Tag System** it depends on lacks DAG support (see §5). This limits the "log Taco → auto-counts as Beef + Corn" feature. Tag System migration required first.

**Data Contract:**
```typescript
interface DietEntry {
  id: number;
  value: number | null;             // Calories (optional — tags are primary)
  metadata: {
    mealName: string;               // "1/3lb beef", "potato chips"
    mealTime: "breakfast" | "lunch" | "dinner" | "snack";
    tags: string[];                 // Ingredient tags linked to tag tree
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    isAlcohol?: boolean;            // NEW: Flag for alcohol consumption
  };
  timestamp: number;
}
```

**Requirements:**
- **TAG SYSTEM IS THE CORE** — not calories
- **Includes alcohol logging** — client explicitly wants to track: "last time I drank alcohol", "times I drank", frequency
- Log food items with ingredient-level tags (e.g. "1/3lb beef", "potato chips", "spices")
- **Tag hierarchy:** Parent tags (e.g. "Beef" → children: Tacos, Burger, Spaghetti)
- Custom tags creatable on the fly
- **Primary link:** Diet tags → Health tracker (allergy, inflammation, symptoms)
- Macros: Calories/protein at minimum — correlate with Weight and Exercise
- Statistics: Last time I ate X, total count of X, frequency per week/month

**Bento Widget:** Foods logged today + tags active today

---

### 4.9 Vitamins / Medications — DEFINED 🔴 (NEW TRACKER)

> 🚨 **CODE AUDIT FINDING:** This tracker DOES NOT EXIST in current codebase. NOT in defaultTrackers. Requires new `supplements` and `supplement_relationships` tables (see §22). Must be added to Phase 4 build.

**Data Contract:**
```typescript
interface Supplement {
  id: number;
  name: string;                     // "Vitamin D3 (Brand X)"
  brand: string | null;
  parentSupplementIds: number[];    // For tree structure (multi-parent)
}

interface VitaminsEntry {
  id: number;
  metadata: {
    items: Array<{
      supplementId: number;
      dose: number;
      unit: string;
      time: string;                 // "morning", "evening", etc.
    }>;
  };
  timestamp: number;
}
```

**Requirements:**
- Track vitamins and medications separately
- **Parent/child structure:** "Vitamin D3 (Brand X)" is child of "Vitamin D" which is child of "Fat-soluble vitamins"
- Logging Brand X automatically tags the entry with all parent supplements
- Correlatable with Health tracker (symptoms, mood)
- Statistics: streak of taking vitamins, missed days

---

### 4.10 Health / Symptoms — DEFINED 🔴 (NEW TRACKER)

> 🚨 **CODE AUDIT FINDING:** This tracker DOES NOT EXIST in current codebase. NOT in defaultTrackers. Client explicitly marked this as HIGH PRIORITY ("Go Deep"). Must be added to Phase 3 build.

**Data Contract:**
```typescript
interface HealthEntry {
  id: number;
  value: number | null;             // Severity score 1–10 (optional)
  metadata: {
    symptomTags: string[];          // Tags from tag tree: "cold", "light coughing", "allergic rash"
    type: "physical" | "mental";
    note?: string;
  };
  timestamp: number;
}
```

**Requirements:**
- Client explicitly requested this as a **separate, deep tracker** distinct from Mood
- **Tracks:** Depression episodes, physical pains, injuries, sickness, allergies, inflammation
- Daily logging of physical/mental symptoms with custom tags
- **Long-term baseline view:** Months of depression/low motivation visible as dips in a timeline
- **Correlations (this tracker is the correlation hub):**
  - Diet tags → health symptoms (e.g. "Days after eating Wheat, cold symptoms appear 90%")
  - Exercise → physical recovery / injury prevention
  - Mood → mental health dips
  - Vitamins → symptom reduction?
- Goes deep — one of the most important trackers for the client
- Sits in the **Health section** (not under Mind or Physical Body)

**Bento Widget:** Active symptoms today + health streak (days without symptoms)

---

### 4.11 Sleep — DEFINED 🔴 (NEW TRACKER)

> 🚨 **CODE AUDIT FINDING:** This tracker DOES NOT EXIST in current codebase. NOT in defaultTrackers. Required for Mood/Exercise correlations. Must be added to Phase 7 build.

**Data Contract:**
```typescript
interface SleepEntry {
  id: number;
  value: number;                    // Hours slept (auto-calculated from bedtime/waketime)
  metadata: {
    bedtime: string;                // "HH:MM" (required)
    wakeTime: string;               // "HH:MM" (required)
    quality: number;                // 1–10 user-selected score (required)
    dreams: "none" | "dreams" | "nightmares";  // Optional selector
    wakeCount: number;              // How many times woke up (optional)
    bathroom: boolean;              // Woke up for bathroom (optional)
  };
  timestamp: number;
}
```

**Requirements:**
- **Log:** Hours + bedtime + wake time (app calculates hours automatically)
- **Quality:** Let client select personally how they felt about quality (1–10)
- **Additional fields:**
  - Remember dreams / nightmares (yes/no or selector)
  - Number of wake-ups
  - Bathroom trips
- **Detail page:** Hours slept past week + quality
- **Correlations:** Mood, Exercise, Gaming (late-night sessions)

**Bento Widget:** Last night hours + quality + 7-night mini chart

---

### 4.12 Meditation — DEFINED 🟡 (NEW TRACKER - Simple)

> 🚨 **CODE AUDIT FINDING:** This tracker DOES NOT EXIST in current codebase. NOT in defaultTrackers. Low priority (Phase 12). Simple implementation.

**Data Contract:**
```typescript
interface MeditationEntry {
  id: number;
  value: number;                    // Minutes (required)
  metadata: {
    feelingDuring?: string;         // Tag: "calm", "restless", etc.
    feelingAfter?: string;          // Tag: "refreshed", "energized", etc.
  };
  timestamp: number;
}
```

**Requirements:**
- **Simplicity:** Basic — meditation days, streaks, session length
- **Mood tags:** Small tags about how it made them feel during and after
- **No app used:** Standalone tracker
- **Not a priority tracker** — minimal friction

**Bento Widget:** Streak + sessions this week

---

### 4.13 Tasks / To-Do

**Requirements:**
- Daily task list with checkbox
- **"Move to tomorrow" button:** Task stays on current day **highlighted in a DIFFERENT COLOR** (NOT a checkmark) and also appears on the next day
- Enter key = add entry

---

### 4.14 Steps / Walking (NEW TRACKER)

> 🚨 **CODE AUDIT FINDING:** This tracker DOES NOT EXIST in current codebase. NOT in defaultTrackers. Low priority (Phase 12). Simple numeric implementation.

**Requirements:**
- Client already uses an **external tracker** for step counting
- Wants **manual input only** for daily step count (no auto-sync, no integrations)
- Log: date + steps (number)
- Statistics: steps this week/month, average per day, days logged
- Simple tracker — no GPS, distance calculations, or calorie burn

---

### 4.15 Custom Trackers

**Requirements:**
- User can create arbitrary trackers (e.g. "Times I cleaned my room", "Fish caught")
- Select tracker type: counter, rating (1–10), text list, binary
- Custom icon and color per tracker
- Appears in sidebar under Tracking section

---

## 5. Tag System (Cross-cutting) — 🔴 CRITICAL ARCHITECTURE

**This is the most important architectural decision. The tag system is the connective tissue of the entire app.**

> ⚠️ **CODE AUDIT FINDING:** Current schema (`packages/db/src/schema.ts` line 101-105) has NO `parentId` or `category` field. The `tag_relationships` table does NOT exist. **This must be implemented before correlations can work.**

**Data Contract — REQUIRED:**
```typescript
interface Tag {
  id: number;
  name: string;
  color: string | null;
  category: string | null;          // Optional grouping (e.g., "food", "symptom", "supplement")
}

interface TagRelationship {
  tagId: number;
  parentTagId: number;              // Enables DAG structure (MULTI-PARENT!)
}

// Join table for entries (EXISTS in current schema)
interface EntryToTag {
  entryId: number;
  tagId: number;
}
```

**Schema Migration Required:**
```sql
-- Tag system DAG support (MISSING FROM CURRENT SCHEMA)
ALTER TABLE tags ADD COLUMN category TEXT;

CREATE TABLE tag_relationships (
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  parent_tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (tag_id, parent_tag_id),
  CHECK (tag_id != parent_tag_id)  -- Prevent self-referential loops
);

CREATE INDEX idx_tag_relationships_parent ON tag_relationships(parent_tag_id);
CREATE INDEX idx_tag_relationships_child ON tag_relationships(tag_id);
```

**Requirements:**
- Global tag system usable across ANY tracker entry
- **Tags form a DIRECTED ACYCLIC GRAPH (DAG), NOT a simple tree**
  - **Multi-parent support:** A child tag can have MULTIPLE parents
  - Example: "Hamburger" → parents: ["Wheat", "Beef"]
  - Example: "Tacos" → parents: ["Beef", "Corn"]
  - Example: "Vitamin D3 (Brand X)" → parents: ["Vitamin D", "Fat-soluble vitamins"]
- When a user logs "Taco" in Diet, the system automatically counts it as Beef AND Corn AND Taco
- **Dedicated tag management page:** Create, edit, define parent relationships
- Tags are user-defined — created as needed
- Tags are global — same tag applies across Diet, Health, Vitamins, etc.
- **Visual DAG editor** — multi-parent relationships should be visible in UI
- **Cycle detection:** System must prevent circular references (A → B → A)

**Why it matters for correlations:**
- Diet tags → Health symptoms: "90% of days after eating Wheat, cold symptoms appear"
- Diet tags → Weight: "On days tagged cheat day, weight is X lbs higher 2 days later"
- Diet tags → Mood: "Beef days correlate with energy 1.2 pts higher"
- Health tags → Exercise: "On injury days, gym volume drops 40%"
- Supplement tags → Health tags: "Days with Vitamin D, cold symptoms 60% less frequent"

---

## 6. Home Dashboard

- Bento-grid layout (drag-and-drop widgets, user-configurable positions and sizes)
- Each tracker = one widget on the dashboard
- Shows today's data at a glance; no scrolling required
- Quick visual indicators per widget (colored squares for games, book covers for books, etc.)
- Default when opening app: today's overview

---

## 7. Quick Entry (Command Bar)

- Keyboard shortcut: **Alt + Q**
- Also accessible via floating **+** button
- When inside a tracker page, Quick Entry should default to that tracker
- Shows recent/frequent entries for 1-click logging
- **Recent trackers displayed HORIZONTALLY in a row** (not a vertical list) — client mockup explicitly marked vertical list as wrong (❌) and horizontal row as correct (✅)
- Enter key confirms entry

---

## 8. Tracker Detail Pages (Per Tracker)

- Accessible from sidebar "Tracking" dropdown
- Tabs inside each tracker page (multiple views)
- Graphs for: today, week, month, 3 months, year
- Prioritize glanceability — line charts, key statistics at the top
- Edit / delete entries (Shift+hover shows trash/edit buttons, like Discord messages)
- Statistics block per tracker type
- **Each tracker needs its own specialized detail render** — not generic fallback

---

## 9. Calendar Page

- Monthly calendar view
- Shows entries per day across all trackers
- Navigate to other days to see historical data
- **Day detail panel must render tracker-specific data** — not just "Value: 1"

---

## 10. Timeline Page

*(Under Calendar section in navigation)*

- Grid: trackers (rows) × months (columns) for a selected year
- Toggle visibility of individual trackers
- Year navigation (prev/next)
- Hover cells to see entry count
- Primary use case: "See what months I was watching what show, playing what game, etc."

---

## 11. Correlations / Insight Lab Page

- **NO EXTERNAL AI.** Pure local statistical algorithm (averages, frequency, cohort analysis)
- **Privacy note:** All correlation inference runs locally. No data sent to external servers. Future AI integration will use self-hosted model (GTX 1080 Ti).
- User selects: Source tracker → Target tracker → Offset (same day / next day)
- Output: impact percentage, confidence, triggered days vs baseline days
- Example insights:
  - "Low mood days after drinking"
  - "Happy mood after lots of social contact"
  - "Days after eating wheat → cold symptoms more likely"
- Data quality indicator (high / medium / low based on sample size)

**Required correlation modes:**
1. **Tag-based cohort:** "Days where entries have tag X" (for Diet→Health)
2. **Categorical cohort:** "Days where gaming entry has metadata.won = false"
3. **Threshold cohort:** "Days where Sleep metadata.hours >= 7"

---

## 12. Assets Page

- Upload images/videos locally (Ctrl+V, drag-and-drop, file picker)
- Images stored in `userData/assets` — no BLOBs in DB
- Thumbnails auto-generated for performance
- Attachable to any tracker entry
- Used for: contact profile photos, book covers, game art, etc.
- Assets should be **categorizable by tracker type** (e.g. Social, Media, Exercise)

---

## 13. Navigation / Sidebar

- Main nav: Home, Calendar, Insight Lab
- **Tracking section (grouped by category):**
  - Physical / Body: Weight, Exercise
  - Mind: Mood, Meditation
  - Health: Health/Symptoms, Vitamins/Medications
  - Life: Social, Books, Gaming, Media, Diet
- Bottom section (less used): Assets, Custom Trackers
- Streak counter at the very bottom of sidebar

---

## 14. Statistics / Advanced Stats — REQUIRED DATA LOGIC

> ⚠️ **CODE AUDIT FINDING:** Current `stats-service.ts` has basic `calculateImpact()` but needs verification that it supports all cohort modes defined below.

### 14.1 Global Statistics (Cross-Tracker Queries)

The system MUST support the following query types:

| Query Type | Example | Required Data |
|---|---|---|
| **Last occurrence** | "When did I last eat tacos?" | Entries with tag "Tacos" + timestamp |
| **Count in period** | "How many eggs in 2024?" | Entries with tag "Eggs" + value aggregation |
| **Sum in period** | "Total kg lifted this month" | Exercise entries + weight metadata |
| **Frequency** | "Times I drank alcohol this week" | Entries with tag "Alcohol" or parent tag |

### 14.2 Frequency Tracking — EXPLICIT CLIENT REQUEST

**Alcohol tracking** (from chat history — client explicitly wants this):
- "Last time I drank alcohol"
- "Times I drank this week/month/year"
- **Implementation:** Alcohol as a tag category (parent) with children: Beer, Wine, Liquor, Cocktail, etc.
- Query sums ALL children when asking about parent "Alcohol"

**Diet frequency patterns:**
- "How often do I eat [tag]?"
- "Days since I last ate [tag]"
- "Average [tag] per week"

### 14.3 Cohort Analysis — Three Modes

The Correlations Lab (§13) requires THREE cohort selection modes:

1. **Tag-based cohort:**
   - "Days where I logged tag X"
   - Example: "On days I ate gluten, my average mood was..."
   
2. **Categorical cohort:**
   - "Days where tracker.metadata.field = value"
   - Example: "On days I lost a gaming session, my average mood was..."
   - Requires: `entries.metadata` JSON to store `{ won: boolean }` etc.

3. **Threshold cohort:**
   - "Days where tracker.value >= N"
   - Example: "On days I slept >= 7 hours, my average exercise duration was..."
   - Requires: Numeric comparison on `entries.value`

### 14.4 Granular Storage Requirements

For statistics to work correctly, entries MUST store:

```typescript
interface EntryMetadata {
  // Diet-specific
  items?: Array<{ tagId: number; quantity: number; unit: string }>;
  calories?: number;
  
  // Gaming-specific
  gameName?: string;
  won?: boolean;
  hoursPlayed?: number;
  
  // Exercise-specific  
  exercises?: Array<{ name: string; sets: number; reps: number; weight: number }>;
  
  // Sleep-specific
  hours?: number;
  quality?: 1 | 2 | 3 | 4 | 5;
  
  // Generic
  notes?: string;
}
```

### 14.5 Statistics Per Tracker Type

| Tracker | Required Stats |
|---|---|
| **Weight** | Current, BMI (if height set), trend line, goal progress |
| **Mood** | Average this week/month, streak of good days (≥7), depression detection |
| **Exercise** | Workouts this week/month/year, total kg lifted, days since last workout |
| **Social** | Interactions this week, positive/negative ratio, most talked to contact |
| **Books** | Books read this year, days since last book, pages/month |
| **Gaming** | Hours this week/month, win rate (if tracked), last played |
| **Diet** | Calories average, tag frequency, last time ate X |
| **Health** | Symptom frequency, correlation with other trackers |
| **Sleep** | Average hours, quality trend, optimal bedtime |

---

## 15. Reminders / Notifications

- Schedule reminders per tracker or general
- Recurring: time (HH:MM) + days of week
- One-off: specific date
- Native system notification when app is minimized
- In-app toast/modal when app is open
- Enable/disable per reminder
- **Auto-generated neglect alerts** for Social contacts
- **Auto-generated birthday reminders** from contact birthday field

---

## 16. UX Details & Keybindings (Explicit Client Requests)

> ⚠️ **CODE AUDIT FINDING:** Most keybindings below have NOT been implemented yet. The current codebase lacks global keyboard shortcut handlers beyond basic form submission.

### 16.1 Global Keyboard Shortcuts — MUST IMPLEMENT

| Shortcut | Action | Priority |
|---|---|---|
| `Alt + Q` | Open QuickEntry modal | HIGH — primary entry point |
| `Enter` | Submit current form/entry | HIGH — already works partially |
| `Escape` | Close current modal/popup | HIGH |
| `Ctrl + S` | Save current work (if applicable) | MEDIUM |

### 16.2 Social/CRM Keybindings — MUST IMPLEMENT

| Shortcut | Action | Context |
|---|---|---|
| `Shift + Left Click` | Log **positive** interaction with contact | Contact bubble grid |
| `Shift + Right Click` | Log **negative** interaction with contact | Contact bubble grid |
| `Shift + Middle Click` | Log **neutral** interaction with contact | Contact bubble grid |
| `Click (no modifier)` | Select contact (for batch operation) | Contact bubble grid |

### 16.3 Window Controls — MUST HAVE REAL IPC

| Control | Requirement |
|---|---|
| **Title bar drag** | Must be draggable to move window (`-webkit-app-region: drag`) |
| **Minimize button** | Real IPC: `window.minimize()` |
| **Maximize button** | Real IPC: `window.maximize()` / `window.unmaximize()` |
| **Close button** | Real IPC: `window.close()` |

### 16.4 UI Layout Requirements

| Item | Request | Status |
|---|---|---|
| **QuickEntry recent trackers** | Displayed **HORIZONTALLY** (not vertical list) | ❌ Client rejected vertical design |
| **Custom tracker modal** | Must not overflow vertically — scrollable or properly sized | Verify |
| **Social bubbles** | Letter initials for contacts without photos | ✅ Implemented |
| **Side-by-side layout** | Widgets/items visible without scrolling where possible | Verify |
| **Quick entry default** | When inside a tracker, Quick Entry opens that tracker's form | Verify |
| **Asset type detection** | Prompt user for file type on upload; auto-detect preferred | Pending |

### 16.5 Batch Operations — Multi-Select

| Feature | Requirement |
|---|---|
| **Social batch logging** | User can select multiple contacts and log interactions in batch for all selected |
| **Tag batch assign** | User can select multiple entries and assign tags to all selected |

---

## 17. Backlog / Future (Not MVP)

### 17.1 Confirmed Backlog
- **Mobile version** (after desktop is stable and client is satisfied)
- **AI integration** (only if self-hosted; client has GTX 1080 Ti — privacy constraint)

### 17.2 Archived Ideas
- **Water tracker** — Client does not track water currently. BACKBURNER. No spec required. May revisit later if client activates it.

---

## 18. Client Decisions — Depth vs Simplicity

*(Source: Tracker Design Discovery — filled by chamero)*

| Tracker | Preference |
|---|---|
| Weight | Keep it simple |
| Mood | Keep it simple |
| Sleep | Keep it simple |
| Exercise | **Go deep** |
| Books | Keep it simple |
| Gaming | **Go deep** |
| Diet | **Go deep** |
| Water | Backburner — won't use |
| Meditation | Keep it simple |
| Social / CRM | **Go deep** |
| Health | **Go deep** — correlates with Diet, Exercise, etc. |

---

## 19. Sections / Navigation Structure — Confirmed

Based on client grouping decisions:

```
Sidebar sections:
├── Physical / Body
│   ├── Weight (+ waist measurement)
│   └── Exercise
├── Mind
│   ├── Mood
│   └── Meditation
├── Health
│   ├── Health / Symptoms (depression, pain, sickness, injuries)
│   └── Vitamins / Medications
├── Life
│   ├── Social / CRM
│   ├── Books
│   ├── Gaming
│   ├── Media / TV / Series
│   └── Diet / Food
├── Activity
│   └── Steps / Walking (manual input only)
└── Management
    ├── Assets
    ├── Tags
    └── Custom Trackers
```

**Note from client on Mind/Mood:** Wants a big line graph / timeline showing mood over months — visible depression dips (low motivation for months) vs high motivation periods. Long-term emotional baseline view, not just daily tracking.

---

## 20. ⚠️ CODE AUDIT — Discrepancies Found

The following discrepancies were found between client requirements and actual code:

### 20.1 Feature NEVER REQUESTED — Must Remove

| Feature | Code Location | Action |
|---|---|---|
| **Savings Tracker** | `ipc-handlers.ts:152`, `TrackerDetailView.tsx:315`, `WidgetCard.tsx:1057` | **DELETE** — client never asked for this |

### 20.2 Trackers MISSING from Code — Must Add

| Tracker | Requested In | Status |
|---|---|---|
| **Health/Symptoms** | Notion Discovery, Chat (multiple times) | ❌ NOT IN defaultTrackers |
| **Vitamins/Medications** | Notion Discovery, Chat (Mar 2026) | ❌ NOT IN defaultTrackers |
| **Sleep** | Notion Discovery | ❌ NOT IN defaultTrackers |
| **Meditation** | Notion Discovery | ❌ NOT IN defaultTrackers |
| **Steps/Walking** | Chat (mentioned walking tracker) | ❌ NOT IN defaultTrackers |

### 20.3 Schema Fields MISSING

| Table | Missing Fields | Defined In |
|---|---|---|
| `tags` | `category`, needs `tag_relationships` table | §5 Tag System |
| `contacts` | `likes`, `dislikes`, `has_kids`, `kids_count`, `relationship_type` | §4.3 Social |
| `contact_interactions` | `method`, `duration_minutes` | §4.3 Social |
| `books` | **ENTIRE TABLE MISSING** | §4.5 Books |
| `workout_templates` | **ENTIRE TABLE MISSING** | §4.4 Exercise |

### 20.4 Default Trackers Config WRONG

| Tracker | Current Config | Required Config |
|---|---|---|
| **Mood** | `config: { max: 5 }` | `config: { max: 10 }` (maps to 4 colors) |
| **Weight** | `config: { unit: 'kg' }` | `config: { unit: 'lbs', defaultUnit: 'lbs' }` (client wants lbs default) |

---

## 21. ❌ PROHIBITED — Things the System Must NEVER Do

1. **Send data to external AI services** — All AI must be local/self-hosted
2. **Use cloud storage** — All data stays on user's machine
3. **Track water** — Client explicitly backburned this (may revisit later)
4. **Create generic fallback renders** — Each tracker must have specific UI
5. **Use vertical list for recent trackers in QuickEntry** — Must be horizontal row
6. **Include Savings tracker** — Never requested by client

---

## 22. 🏗️ Schema Additions Required (Complete Migration)

Based on full gap analysis, ALL of the following schema changes are required:

```sql
-- ============================================
-- 1. TAG SYSTEM (DAG Support) — PRIORITY 1
-- ============================================
ALTER TABLE tags ADD COLUMN category TEXT;

CREATE TABLE IF NOT EXISTS tag_relationships (
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  parent_tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (tag_id, parent_tag_id),
  CHECK (tag_id != parent_tag_id)
);
CREATE INDEX idx_tag_rel_parent ON tag_relationships(parent_tag_id);
CREATE INDEX idx_tag_rel_child ON tag_relationships(tag_id);

-- ============================================
-- 2. CONTACT ENHANCEMENTS — PRIORITY 9
-- ============================================
ALTER TABLE contacts ADD COLUMN likes TEXT;
ALTER TABLE contacts ADD COLUMN dislikes TEXT;
ALTER TABLE contacts ADD COLUMN has_kids INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN kids_count INTEGER;
ALTER TABLE contacts ADD COLUMN relationship_type TEXT DEFAULT 'other';

ALTER TABLE contact_interactions ADD COLUMN method TEXT DEFAULT 'other';
ALTER TABLE contact_interactions ADD COLUMN duration_minutes INTEGER;

-- ============================================
-- 3. BOOKS TABLE — PRIORITY 11
-- ============================================
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT,
  genre TEXT,
  status TEXT DEFAULT 'want_to_read' CHECK(status IN ('reading','finished','want_to_read','dropped')),
  start_date TEXT,
  finish_date TEXT,
  rating REAL CHECK(rating IS NULL OR (rating >= 1.0 AND rating <= 5.0)),
  notes TEXT,
  cover_asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- ============================================
-- 4. EXERCISE TEMPLATES — PRIORITY 8
-- ============================================
CREATE TABLE IF NOT EXISTS workout_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE TABLE IF NOT EXISTS workout_template_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  default_sets INTEGER DEFAULT 3,
  default_reps INTEGER DEFAULT 10,
  default_weight REAL,
  default_unit TEXT DEFAULT 'kg'
);
CREATE INDEX idx_wte_template ON workout_template_exercises(template_id);

-- ============================================
-- 5. SUPPLEMENTS TABLE (Vitamins/Meds) — PRIORITY 4
-- ============================================
CREATE TABLE IF NOT EXISTS supplements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,  -- 'vitamin', 'mineral', 'medication', 'other'
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE TABLE IF NOT EXISTS supplement_relationships (
  supplement_id INTEGER NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
  parent_supplement_id INTEGER NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
  PRIMARY KEY (supplement_id, parent_supplement_id),
  CHECK (supplement_id != parent_supplement_id)
);
```

---

## 23. Open Questions — Not Yet Answered (11 Items)

1. **Tag tree UI:** How should DAG visualization work in the tag management page? (multi-parent relationships are non-trivial to display)
2. **Health logging flow:** Should symptoms be logged as checkboxes per day, or as free-form tags with timestamps?
3. **Mood color ranges:** Confirmed as Red: 1-3 | Orange: 4-5 | Yellow: 6-7 | Green: 8-10 — needs UI implementation
4. **Gaming win/loss:** How does the app know which games have wins/losses? Per-game definition when adding, or toggle per session?
5. **Exercise presets:** When user edits reps/weight during a session, does that update the preset for next time or just for that session?
6. **Vitamins logging:** Daily checklist ("did I take Vitamin D today?") or log entry each time?
7. **Social contact type grouping:** Friends / Work / Family — client said "I don't know"
8. **Diet macros depth:** Calories confirmed, full macros (protein/carbs/fat) implied but not explicitly confirmed
9. **Steps/Walking UI:** How should manual step input integrate vs other trackers?
10. **Asset categorization:** Hard-linked to tracker types, or flexible tagging system?
11. **Alcohol subcategory:** Subcategory of Diet/Food, or separate filter/view?

---

## 24. Build Priority — Phase Order (1–13)

| Priority | Feature / Tracker | Rationale |
|---|---|---|
| **1** | **Tag System (DAG + IPC + UI)** | Everything else depends on this — correlations, Diet→Health |
| **2** | **Diet Tracker (tag integration)** | Core data input for all correlations |
| **3** | **Health Tracker (new)** | High correlation value, client's #1 request |
| **4** | **Vitamins/Medications (new)** | Feeds Health correlations |
| **5** | **Mood (fix scale → colors)** | Client's main daily tracker |
| **6** | **Weight (lbs/kg + goal + streaks)** | Simple but high-value, defined |
| **7** | **Sleep (new)** | Simple, enables Mood/Exercise correlations |
| **8** | **Exercise (presets system)** | "Go deep" priority, needs template builder |
| **9** | **Social/CRM (batch + fields)** | "Go deep" priority, complex UI |
| **10** | **Gaming (wins/losses + render)** | "Go deep" priority, needs specific UI |
| **11** | **Books (rating + shelves)** | Simple updates to existing |
| **12** | **Meditation + Steps + Tasks** | Simple trackers, lower priority |
| **13** | **Correlations Lab + Timeline** | Require foundational trackers to exist |

---

## 25. Code Cleanup Required

Based on CODE AUDIT FINDINGS throughout this document:

| Issue | File(s) | Action |
|---|---|---|
| Remove Savings tracker | `ipc-handlers.ts`, `TrackerDetailView.tsx`, `WidgetCard.tsx` | Delete all Savings references |
| Fix Mood scale | `ipc-handlers.ts:149` | Change `max: 5` to `max: 10` |
| Add missing tracker types | `ipc-handlers.ts` defaultTrackers | Add Health, Vitamins, Sleep, Meditation, Steps |
| Fix Weight default unit | `ipc-handlers.ts` | Set `defaultUnit: 'lbs'` (client prefers lbs) |
| Add tv icon to maps | `WidgetCard.tsx`, `QuickEntry.tsx` | Add `tv: Tv` to iconMaps |
| Fix TitleBar IPC | `TitleBar.tsx`, `main/index.ts` | Add real minimize/maximize/close handlers |
| Add Tag System DAG | `packages/db/src/schema.ts` | Add `tag_relationships` table (see §22) |
| Add Contact fields | `packages/db/src/schema.ts` | Add likes/dislikes/hasKids/relationshipType |
| Centralize tracker types | All UI files | Create `getTrackerArchetype()` function |

---

## 26. Executive Summary — Gap Count

| Category | Total Gaps | Critical |
|---|---|---|
| **Missing Trackers** | 5 | ⚠️ Health, Vitamins, Sleep, Meditation, Steps |
| **Unrequested Features** | 1 | ❌ Savings tracker (REMOVE) |
| **Schema Missing Tables** | 4 | tag_relationships, books, workout_templates, supplements |
| **Schema Missing Fields** | 9 | Tags(2), Contacts(5), Interactions(2) |
| **Config Errors** | 2 | Mood max:5→10, Weight unit |
| **Keybindings Not Implemented** | 6+ | Social Shift+Click, Alt+Q, etc. |

**Total work items identified:** ~27 discrete changes required.

---

**End of CLIENT-REQUIREMENTS.md v3.0**  
*Coverage: 100% — All gaps annotated with CODE AUDIT FINDING tags.*  
*Verified against: `packages/db/src/schema.ts`, `apps/electron/src/main/ipc-handlers.ts`, chat-history.md, Notion exports.*  
*Reconciliation completed: 2026-03-31*
