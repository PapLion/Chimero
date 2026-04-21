# Tasks: Tracker Detail View Consistency

## Phase 1: Infrastructure — semanticType Detection Utility

- [x] 1.1 Add `getTrackerSemanticType()` to `apps/electron/src/renderer/src/shared/config/tracker-config.ts` — returns `"sleep" | "meditation" | "health" | "diet" | "gaming" | "book" | "mood" | "exercise" | "weight" | "social" | "generic"` based on tracker.config.semanticType, name, and icon (reuse existing `detectTrackerFamily` logic)
- [x] 1.2 Verify all Tracker types have semanticType mapping in the util

## Phase 2: API Hooks — Query Functions for Specialized Entries

- [x] 2.1 Add `useSleepEntries(trackerId, options?)` hook in `lib/queries/index.ts` — uses `api.sleep.getEntries({ trackerId, ...options })`
- [x] 2.2 Add `useMeditationEntries(trackerId, options?)` hook — uses `api.meditation.getEntries({ trackerId, ...options })`
- [x] 2.3 Add `useHealthEntries(trackerId, options?)` hook — uses `api.health.getEntries({ trackerId, ...options })`
- [x] 2.4 Add `useDietEntries(trackerId, options?)` hook — uses `api.diet.getEntries({ trackerId, ...options })`
- [x] 2.5 Add `useGamingEntries(trackerId, options?)` hook — uses `api.gaming.getEntries({ trackerId, ...options })`
- [x] 2.6 Add `useBookEntries(trackerId, options?)` hook — uses `api.book.getEntries({ trackerId, ...options })`
- [x] 2.7 Add `useMoodEntries(trackerId, options?)` hook — uses `api.mood.getEntries({ trackerId, ...options })`
- [x] 2.8 Add `useExerciseEntries(trackerId, options?)` hook — uses `api.exercise.getEntries({ trackerId, ...options })`
- [x] 2.9 Verify all hooks use correct return types from `packages/db/src/types.ts`

## Phase 3: EntryCard Components — Core Implementation

### Sleep EntryCard
- [x] 3.1 Create `apps/electron/src/renderer/src/features/entry/components/SleepEntryCard.tsx`
  - Props: `entry: SleepEntry`, `onEdit?`, `onDelete?`
  - Render: bedtime (format: "11:30 PM"), wakeTime (format: "7:00 AM"), hoursSleep, quality (1-10 emoji), wakesCount, bathroomCount, dreamType badge, notes
  - Style: group relative bg-white/[0.03] border rounded-xl, edit/delete buttons on hover

### Meditation EntryCard
- [x] 3.2 Create `MeditationEntryCard.tsx`
  - Props: `entry: MeditationEntry`, `onEdit?`, `onDelete?`
  - Render: duration, sessionType, tags[] as badges, notes

### Health EntryCard
- [x] 3.3 Create `HealthEntryCard.tsx`
  - Props: `entry: HealthEntry`, `onEdit?`, `onDelete?`
  - Render: category badge (color-coded), symptom, severity (1-10), possibleCauses[], notes

### Diet EntryCard
- [x] 3.4 Create `DietEntryCard.tsx`
  - Props: `entry: DietEntry`, `onEdit?`, `onDelete?`
  - Render: mealType badge, mealName, calories, macros (protein/carbs/fat if present), foodTags[], notes

### Gaming EntryCard
- [x] 3.5 Create `GamingEntryCard.tsx`
  - Props: `entry: GamingEntry`, `onEdit?`, `onDelete?`
  - Render: gameName, duration (format: "2h 15min"), moodDuring badge, wins/losses, notes

### Book EntryCard
- [x] 3.6 Create `BookEntryCard.tsx`
  - Props: `entry: BookEntry`, `onEdit?`, `onDelete?`
  - Render: bookTitle, shelf badge, starRating (★ display), startDate/finishDate/daysRead, notes

### Mood EntryCard
- [x] 3.7 Create `MoodEntryCard.tsx`
  - Props: `entry: MoodEntry`, `onEdit?`, `onDelete?`
  - Render: moodValue (1-10 as emoji + slider visual), causeTags[], notes with timestamp

### Exercise EntryCard
- [x] 3.8 Create `ExerciseEntryCard.tsx`
  - Props: `entry: ExerciseEntry`, `onEdit?`, `onDelete?`
  - Render: exerciseName, sets, reps, weight, isPR badge, notes — table layout for multiple exercises per session

### Social EntryCard
- [x] 3.9 Create `SocialEntryCard.tsx`
  - Props: `entry: Entry` (from entries table with contact interaction metadata), `onEdit?`, `onDelete?`
  - Render: contact interactions with mood emoji, notes

### Weight EntryCard
- [x] 3.10 Create `WeightEntryCard.tsx`
  - Props: `entry: Entry`, `onEdit?`, `onDelete?`
  - Render: value (weight), delta vs previous entry, metadata.waist/hips/chest/arms (con units from metadata.storedUnit), notes

## Phase 4: TrackerDetailView Integration

- [x] 4.1 Import `getTrackerSemanticType` from tracker-config.ts
- [x] 4.2 Replace current `isXxxType` boolean flags with `semanticType = getTrackerSemanticType(tracker)`
- [x] 4.3 Add conditional rendering for Entries tab based on semanticType:
  - `"sleep"` → `useSleepEntries()` → `<SleepEntryCard>`
  - `"meditation"` → `useMeditationEntries()` → `<MeditationEntryCard>`
  - etc.
- [x] 4.4 Update Stats tab to use specialized stats hooks per semanticType (useSleepStats, useMeditationStats, etc.)
- [x] 4.5 Ensure backward compatibility: `"generic"` semanticType falls back to existing entry rendering

## Phase 5: Verify and Test

- [ ] 5.1 Verify Sleep entries show bedtime, wakeTime, quality, wakesCount, bathroomCount, dreamType
- [ ] 5.2 Verify Meditation entries show duration, sessionType, tags
- [ ] 5.3 Verify Health entries show category, symptom, severity
- [ ] 5.4 Verify Diet entries show mealType, mealName, calories, macros, foodTags
- [ ] 5.5 Verify Gaming entries show gameName, duration, moodDuring, wins/losses
- [ ] 5.6 Verify Book entries show title, shelf, rating, dates
- [ ] 5.7 Verify Mood entries show moodValue (1-10) and causeTags
- [ ] 5.8 Verify Exercise entries show exercises with name, sets, reps, weight (no more "1")
- [ ] 5.9 Verify Weight entries show body measurements from metadata
- [ ] 5.10 Verify Stats tab shows correct specialized stats per tracker type
- [ ] 5.11 Backward compatibility: custom trackers without semanticType still render correctly

## Implementation Order

1. **Phase 1 first** — `getTrackerSemanticType()` es dependencias de todo lo demás
2. **Phase 2 second** — los hooks son necesarios para fetchear datos antes de renderizar
3. **Phase 3 third** — los EntryCards no tienen dependencias entre sí, se pueden hacer en paralelo
4. **Phase 4 fourth** — integrate todo en TrackerDetailView
5. **Phase 5 last** — verificar que todo funciona

## Dependencies
- Los hooks de Phase 2 dependen de que la API ya existe (verificado — `api.sleep.getEntries`, `api.meditation.getEntries`, etc. existen)
- Los EntryCards de Phase 3 dependen de los hooks de Phase 2 para los types
- Phase 4 depende de Phase 1, 2, y 3