# Chimero — Decisions & Data Contracts

# What is this page?

This is the output of the discovery session. chamero's answers have been translated into concrete decisions. This is what Panda builds from — not the discovery page.

> 🔴 **Red = decision made, build this exactly**
> 

> 🟡 **Yellow = decision made but needs a design pass before coding**
> 

> ⚪ **Gray = backburner / not now**
> 

---

# 🗂️ Tracker Decisions

---

## ⚖️ Weight — DEFINED 🔴

**What gets saved per entry:**

- `value` = weight in lbs (primary, required)
- `metadata.unit` = "lbs" | "kg" (switchable)
- `metadata.waist` = waist measurement in inches (optional)
- `metadata.note` = free text note (optional)

**What the user wants to see:**

- Daily logging, every morning
- Time range selector: 3/7/14/30/60/90/180/270 days, 1yr, 2yr, 3yr
- Color feedback: green = losing toward goal, red = not losing or gaining
- Loss/gain streak counter ("4-day loss streak")
- Delta vs last week prominently displayed
- Weekly average alongside daily numbers (both, not either/or)
- Target weight with progress bar

**Correlations:**

- Exercise: losing weight while gaining strength?
- Diet: calories aligned with goal (lose/maintain/gain)?
- Diet tags: "cheat day" / "bad food" tags pulled from Diet and overlaid on Weight chart

**Bento widget:** current weight + delta vs last week + sparkline + color indicator

**Detail page:** line chart with selectable time range, goal progress bar, color-coded streak

---

## 😊 Mood — DEFINED 🔴

**What gets saved per entry:**

- `value` = mood score 1–10 (required)
- `metadata.color` = "red" | "orange" | "yellow" | "green" (maps to score range)
- `metadata.tags` = string[] — cause tags (work, social, sleep, exercise) — optional
- `metadata.note` = free text — optional
- `timestamp` = exact time (multiple entries per day, split before/after work)

**What the user wants to see:**

- 3–10 entries per day — before work and after work are a key split
- Color system instead of 1–10 display: red / orange / yellow / green
- Line graph showing mood going up and down through the day
- Peak and low of the day / week / month
- Calendar heatmap
- Everything interconnected with other trackers

**Correlations:** sleep, exercise, social interactions, diet tags, gaming sessions

**Bento widget:** today's color + avg score + mini heatmap

**Detail page:** line chart with intraday resolution, peak/low markers, tag breakdown

---

## 😴 Sleep — DEFINED 🔴

**What gets saved per entry:**

- `value` = hours slept (auto-calculated from bedtime/waketime, required)
- `metadata.bedtime` = "HH:MM" (required)
- `metadata.wakeTime` = "HH:MM" (required)
- `metadata.quality` = 1–10 user-selected score (required)
- `metadata.dreams` = "none" | "dreams" | "nightmares" (optional selector)
- `metadata.wakeCount` = integer — how many times woke up (optional)
- `metadata.bathroom` = boolean — woke up for bathroom (optional)

**What the user wants to see:**

- Hours slept past week chart
- Quality score separately from hours
- Bedtime consistency view

**Correlations:** mood, exercise, gaming (late-night sessions)

**Bento widget:** last night hours + quality + 7-night mini chart

---

## 🏋️ Exercise — DEFINED 🔴

**What gets saved per entry:**

- `value` = total session volume (sum of sets × reps × weight, required)
- `metadata.templateId` = ID of the preset used (optional)
- `metadata.templateName` = display name of preset (optional)
- `metadata.exercises` = array of { name, sets: [ { reps, weight, unit } ], actualReps?, actualWeight? }
- `metadata.duration` = session duration in minutes (optional)
- `metadata.type` = "strength" | "cardio" | "other"

**Key UX decisions:**

- User creates **presets/routines** (e.g. "Full Body 1") with predefined exercises, sets, and expected reps
- Loading a preset pre-fills all exercises — user just adjusts + or - if they did more/less
- Presets change every few months, not every session
- 1–4 routines max at any time
- No popout — exercise input should be integrated into the page, not a modal (revisit UI later)
- Walking/steps tracking: user wants this eventually but NOT part of gym tracker — separate

**Correlations:** sleep (performance drops when under-rested), mood (mood next day after training), weight (losing weight while gaining strength)

**Bento widget:** last session date + preset name + days since last workout + weekly streak

---

## 📚 Book — DEFINED 🔴

**What gets saved per entry (session log):**

- `metadata.bookId` = reference to book record
- `metadata.date` = date read
- `metadata.minutesRead` = NOT tracked (too much friction — dropped)
- `metadata.pagesRead` = NOT tracked (too much friction — dropped)

**Book record (separate from entry):**

- Title, author, genre
- Status: Reading | Finished | Want to Read | Dropped
- Start date, finish date
- Rating: 1–5 stars in 0.1 increments (e.g. 3.1, 3.2... 5.0) — maps to `value`
- Notes / mini-review

**What the user wants to see:**

- Reading streaks
- Books read per week / month chart
- Separate shelves: Reading, Finished, Want to Read
- NO per-session page tracking — just start date, days read, finish date

**Correlations:** mood (days I read, mood is higher?)

**Bento widget:** current book + progress (% days into it) + last 3 finished

---

## 🎮 Gaming — DEFINED 🔴

**What gets saved per entry:**

- `value` = estimated hours played (required — always set, no NULLs)
- `metadata.game` = game title (required)
- `metadata.mood` = "focused" | "tilted" | "relaxed" (optional)
- `metadata.hasWinLoss` = boolean — does this game track wins/losses?
- `metadata.result` = "win" | "loss" | "draw" | null (only if hasWinLoss = true)

**Key decisions:**

- Track wins/losses only for games where it applies (e.g. CS2 yes, Minecraft no)
- Correlation goal: X game + losses = mood drops, Y game = mood improves regardless
- Awareness tool only — no streak pressure
- Several games tracked, typically 1–2 active per month

**Correlations:** mood (per game, per result), sleep (late sessions = worse sleep)

**Bento widget:** hours this week + last session game + mood during

---

## 🍔 Diet — DEFINED 🔴

**What gets saved per entry (meal log):**

- `value` = NULL (calories not primary — tag system is primary)
- `metadata.mealName` = food name (e.g. "1/3lb beef", "potato chips") (required)
- `metadata.mealTime` = "breakfast" | "lunch" | "dinner" | "snack"
- `metadata.tags` = string[] — ingredient/food tags linked to tag tree (e.g. ["beef", "wheat"])
- `metadata.calories` = optional estimate
- `metadata.protein` / `metadata.carbs` / `metadata.fat` = optional

**Key decision — TAG SYSTEM IS THE CORE:**

User already logs everything he eats daily. The value is NOT calories — it's the **tag tree** that connects food to health symptoms. See Tag System section below.

**Correlations:** weight (food tags on days weight changes), health symptoms (wheat days → cold symptoms), mood, exercise performance

**Bento widget:** foods logged today + tags active today

---

## 💧 Water — BACKBURNER ⚪

User does not currently track water. Put on hold. Build later if requested.

---

## 🧘 Meditation — DEFINED (simple) 🟡

**What gets saved per entry:**

- `value` = minutes (required)
- `metadata.tags` = how it made me feel during / after (user-defined tags)
- `metadata.streak` = calculated, not stored

**What the user wants:**

- Basic: meditation days, streaks, length
- Small tags about how it made him feel during and after
- No app used, no specific method — keep it simple
- Not a priority tracker — minimal friction

**Bento widget:** streak + sessions this week

---

## 👥 Social / CRM — DEFINED 🔴

**Contact record:**

- Name, photo, birthday + age calculated
- Likes / Dislikes (separate fields, not just traits)
- Has kids: boolean + count
- Notes to remember (free text)
- Traits: still important — remember kind or bad people
- Relationship type: close friend / work / family (filter by this)

**Interaction log per contact:**

- Date + duration (optional)
- Mood of interaction: positive / negative / neutral
- How they made me feel (separate from overall mood — this is contact-specific)
- Notes: what we talked about

**UI (chamero's wireframe):**

- Contacts tab: grid/list of all contacts, sortable by frequency talked to (ascending/descending)
- Search bar on contacts list
- Select a contact → goes to their dedicated page
- Contact page shows: name, birthday/age, kids, notes to remember, likes/dislikes, traits

**Features:**

- Neglect alerts: haven't talked to X in N days (toggleable per contact or globally)
- Birthday reminders
- Energy audit: positive vs negative interaction ratio per contact
- Aggregate social chart: interactions per week over time

**Correlations:** personal mood (positive social interactions → mood higher?)

**Bento widget:** upcoming birthday + weekly interaction count

---

## 🏥 Health — NEW TRACKER 🔴

**chamero's definition:** Track physical and mental health symptoms daily. Things like sickness, injury, depression episodes, allergic reactions, inflammation, and so on.

**What gets saved per entry:**

- `value` = severity score 1–10 (optional — how bad is the symptom?)
- `metadata.symptomTags` = string[] — tags from the tag tree (e.g. ["cold", "light coughing", "allergic rash"])
- `metadata.type` = "physical" | "mental"
- `metadata.note` = free text (optional)

**What the user wants to see:**

- Big mood/health timeline showing depression dips over months, then periods with more motivation — visible in a large line graph / timeline
- Symptoms over time: how often does each symptom appear?
- Correlation with diet tags: "Days after eating Wheat, cold symptoms appear 90% of the time"

**Correlations (this tracker is the correlation hub):**

- Diet tags → health symptoms (e.g. wheat → cold symptoms)
- Exercise → physical recovery / injury prevention
- Mood → mental health dips
- Vitamins → symptom reduction?

**Bento widget:** active symptoms today + health streak (days without symptoms)

---

## 💊 Vitamins / Medications — NEW TRACKER 🔴

**chamero's definition:** Daily vitamin tracking + occasional medication logging. Needs parent/child structure because a Vitamin D from Brand X might also contain Vitamin K2 and Magnesium.

**What gets saved per entry:**

- `metadata.items` = array of { supplementId, dose, unit, time }
- Supplement record: name, brand, parent supplement IDs (for the tree structure)

**Tag tree for supplements:**

- "Vitamin D3 (Brand X)" is a child of "Vitamin D" which is a child of "Fat-soluble vitamins"
- Logging Brand X automatically tags the entry with Vitamin D + Fat-soluble vitamins

**Correlations:** health symptoms (does Vitamin D intake correlate with fewer cold symptoms?), mood, energy

---

# 🏷️ Tag System — CROSS-TRACKER FEATURE 🔴

This is the most important architectural decision chamero made. **The tag system is the connective tissue of the entire app.**

## What it is

A hierarchical tag tree that can be applied to any tracker entry. Tags have parent-child relationships:

```
Beef (parent)
├── Hamburger
├── Taco  
├── Spaghetti
└── Steak

Wheat (parent)
├── Biscuits
├── Bread
├── Pasta
└── Pizza
```

When a user logs "Taco" in Diet, the system automatically counts it as Beef AND Taco.

## Why it matters

- Diet tags → Health symptoms: "90% of days after eating Wheat, cold symptoms appear"
- Diet tags → Weight: "On days tagged cheat day, weight is X lbs higher 2 days later"
- Diet tags → Mood: "Beef days correlate with energy 1.2 pts higher"
- Health tags → Exercise: "On injury days, gym volume drops 40%"
- Supplement tags → Health tags: "Days with Vitamin D, cold symptoms are 60% less frequent"

## What chamero wants

- A dedicated page/tab to create tags and define their parent relationships
- Tags are user-defined — he creates them as he needs them
- Tags are global — same tag applies across Diet, Health, Vitamins, etc.
- Parent tree is visual — he showed a diagram of Wheat → Biscuits, Beef → Hamburger/Taco/Spaghetti

## Data structure needed

```
tags table:
  id, name, parentId (self-referential), color, category

entries_to_tags table (already exists in schema):
  entryId, tagId
```

The existing schema already has `tags` and `entries_to_tags` tables. The missing piece is `parentId` on the tags table and a UI to build the tree.

---

# 🗺️ Tracker Grouping Decision

chamero's final grouping preference:

| Group | Trackers |
| --- | --- |
| 💪 Physical | Weight + Body measurements |
| 🧠 Mind | Mood + Meditation |
| 🏥 Health | Health symptoms + Vitamins/Medications |
| 🏋️ Activity | Exercise (standalone) |
| 🍔 Diet | Diet/Meals (standalone, feeds tag system) |
| 📚 Lifestyle | Book + Gaming |
| 👥 Social | Social / CRM |
| 💧 Water | Backburner |

---

# 📋 Build Priority Order

| Priority | Tracker / Feature | Reason |
| --- | --- | --- |
| 1 | 🏷️ Tag System (tree structure + UI) | Everything else depends on this |
| 2 | 🍔 Diet (tag integration) | Core data input for correlations |
| 3 | 🏥 Health tracker | New, high correlation value |
| 4 | 💊 Vitamins/Medications | New, feeds Health correlations |
| 5 | ⚖️ Weight (color system + goal + time ranges) | Defined, needs UI updates |
| 6 | 😊 Mood (color system + intraday timeline) | Defined, needs UI updates |
| 7 | 🏋️ Exercise (presets system) | Defined, needs preset builder |
| 8 | 👥 Social (wireframe implementation) | Defined, has UI spec |
| 9 | 😴 Sleep (bedtime/waketime form) | Defined, small form update |
| 10 | 🎮 Gaming (win/loss per game) | Defined, small schema update |
| 11 | 📚 Book (star rating 0.1 increments) | Defined, small UI update |
| 12 | 🧘 Meditation | Simple, low priority |
| 13 | 💧 Water | Backburner |

---

# ❓ Still Open — Needs Answer Before Building

1. **Tag system UI** — chamero wants a page where he can build the tag tree visually. What does that page look like exactly? A list with drag-to-parent? A visual tree editor?
2. **Health tracker** — What's the input flow? Does he log symptoms once a day or whenever they appear? Can multiple symptoms be active simultaneously?
3. **Vitamins** — Does he want a daily checklist ("did I take my Vitamin D today?") or a log entry each time he takes something?
4. **Gaming win/loss** — How does the app know which games have wins/losses? Does chamero define this per game when he adds it, or is it a toggle per session?
5. **Exercise presets** — When he edits reps/weight during a session, does that update the preset for next time or just for that session?
6. **Mood colors** — What are the exact score ranges for red/orange/yellow/green? (e.g. 1–3 red, 4–5 orange, 6–7 yellow, 8–10 green?)