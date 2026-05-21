# Tracker Discovery Extracted Requirements

## Source

This document extracts product requirements from the raw Notion export:

- `C:\Users\Dani\Desktop\Chimero — Tracker Design Discovery 45591a98b33d82f795e901037a4f61f1.md`

It executes the cleanup direction from:

- `C:\Users\Dani\Code\Chimero_new\Documentation\Product\TRACKER_DISCOVERY_CLEANUP_PLAN.md`

## How To Read This Document

This is cleaned product discovery, not a final tracker contract, architecture document, schema, IPC spec, or implementation plan. The Notion export is treated as raw discovery. The strongest evidence is chamero's direct answers, explicit comments, crossed-out items, `X`/rejection markers, and concrete examples that chamero accepted or modified.

AI-generated reference lists from the Notion page are included only when chamero clearly accepted, modified, or reacted to them. Anything not confirmed is labeled as rejected, low confidence, or an open question. Contract and schema notes below are implications for later contract work only; they must be mapped to current contracts, Product audit evidence, and code reality before implementation.

## Weight

### Confirmed Client Intent

- Weight should default to pounds/lbs, with unit switching available.
- Weight is the primary metric.
- Basic waist measurement should be included with Weight/body measurements.
- Target weights are desired; the app should let chamero set targets and show progress toward them.
- Logging cadence is daily, once every morning.
- The detail experience should use color as motivation: green when losing weight toward the goal, red when not progressing, and colors that show loss or neutral streaks.
- Daily numbers matter to chamero; averages are still useful but should not replace daily visibility.
- Correlation with Diet is explicitly accepted, especially calories aligned with lose/maintain/gain goals.
- Food/Diet tags such as "cheat day" or "very bad food" are expected to help explain weight changes.
- Edit/delete for incorrect entries is accepted by context and not contradicted.

### Rejected / Low Confidence

- Body fat percentage was crossed out with a note that it probably will not be used.
- Broad body measurements beyond waist, such as hips/chest/arms, were listed by AI but not confirmed by chamero.
- Sleep-to-next-day-weight insight was only an AI example; chamero did not explicitly confirm it.
- Streaks are useful as color/motivation signals, but a generic habit-streak feature was not separately confirmed.

### Friction Notes

- Weight should be a fast daily morning log.
- The tracker can be deeper than a single number only where the added field is clearly useful, such as waist and target weight.
- Do not make body-fat or multi-measurement entry mandatory.

### Quick Entry Implications

- Quick Entry should prioritize weight in lbs by default.
- Waist should be optional and secondary.
- Target setup should not block daily logging.
- Notes/tags should stay optional; Diet tags may supply context without forcing manual notes on every Weight entry.
- Unit switching should not add friction to the daily flow.

### Bento / Dashboard Implications

- The strongest Bento signal is current weight plus change/progress.
- Delta versus recent prior data, especially last week, is useful if backed by real data.
- A tiny sparkline is plausible because chamero accepted trend visibility, but it should be real data, not decorative.
- Color state should reflect target progress or recent loss/neutral streaks.

### Detail Page Implications

- Detail page should emphasize target progress, daily entries, recent deltas, and trends.
- Daily numbers and rolling averages can coexist.
- History must support correction by edit/delete.
- A useful view should answer whether chamero is moving toward the goal.

### Stats / Graphs

- Trend ranges in the AI list are plausible but not individually confirmed; later contracts should decide which ranges are worth supporting.
- Confirmed graph needs include trend over time, goal distance/progress, daily numbers, and averages.
- Color-coded progress/loss/neutral streaks are stronger than generic analytics language.

### Tags / Assets / Correlations

- Diet/Food correlation is confirmed.
- Food tags should be available as explanatory signals for weight differences.
- Exercise correlation is plausible from the AI list, but less directly confirmed than Diet.
- Assets/photos were not mentioned for Weight.

### Contract / Schema Implications

- A later contract should separate required `weight` from optional `waist`, optional notes/tags, unit display preference, and target-weight state.
- Body fat should not be included as a required or default field unless chamero later re-confirms it.
- Weight is a candidate for specialized tracker contracts because target progress, unit handling, waist, averages, and correlations need structured semantics.
- This extraction does not prove current schema or implementation support.

### Open Questions

- Should target weights support multiple goals over time or only one active goal?
- Should waist be logged daily, occasionally, or only when chamero chooses?
- Which graph ranges matter most in the first clean contract?
- Should Diet tags automatically appear in Weight insights, or only in a correlation/detail tab?

## Mood

### Confirmed Client Intent

- Chamero may prefer color language over a numeric 1-10 scale: red, orange, yellow, green.
- Mood can have many entries per day, usually 3-10.
- Before-work versus after-work is a key split and should be preserved.
- Cause tags are useful for major moods, but most entries may have no cause.
- Detail page should show a line graph of mood moving up and down.
- Peaks and lows over day, week, month, and similar ranges are important.
- Chamero wants mood interconnected with other trackers.

### Rejected / Low Confidence

- A pure 1-10 mood model is not confirmed; chamero explicitly suggested colors instead.
- Mandatory cause tags would add too much friction and contradict the answer that most moods may have no cause.
- Heatmaps, best/worst automatic day detection, and weekly summaries are AI suggestions unless later confirmed.
- Emoji mood was only an AI option, not chamero's preference.

### Friction Notes

- Mood must tolerate fast repeated entry throughout a day.
- Cause tagging should be optional and probably prompted only for major moods.
- The before/after work split is more important than forcing rich notes on every entry.

### Quick Entry Implications

- Quick Entry should support very fast color-based mood logging.
- It should support multiple same-day entries without making the user overwrite the day.
- It should allow an optional cause/tag/note path for major moods.
- It should capture or infer context around before work versus after work, but exact UX needs a later contract decision.

### Bento / Dashboard Implications

- Dashboard should show today's mood state or trend without collapsing multiple entries into a misleading single score.
- A compact line/sparkline or peak/low summary is stronger than a single emoji.
- If an average is shown, it should not hide the before-work/after-work split.

### Detail Page Implications

- Detail page should foreground a time-series line graph.
- Day/week/month peak and low summaries are confirmed.
- It should support drilling into multiple daily entries.
- It should show causes/tags where present, while preserving entries with no cause.

### Stats / Graphs

- Confirmed graph: mood line over time.
- Confirmed statistics: peaks and lows by day/week/month.
- Correlation views are important because chamero wants everything interconnected.
- Numeric normalization remains unresolved if the input model is color-based.

### Tags / Assets / Correlations

- Cause tags should exist for major moods.
- Mood should correlate with Sleep, Exercise, Diet, Gaming, Social, Meditation, and Health where those trackers exist and have compatible data.
- Assets/photos were not mentioned for Mood.

### Contract / Schema Implications

- Later contracts need to decide whether color maps to an internal numeric value, ordered enum, or both.
- Multiple entries per day are required.
- Context fields for before/after work may be needed.
- Optional cause tags and optional notes should not be required fields.
- Current implementation status is not asserted here.

### Open Questions

- What exact color set should map to mood states?
- Does chamero want labels in addition to colors?
- How should before-work/after-work be detected or selected?
- Should "major mood" be user-selected, threshold-derived, or inferred from extremes?

## Sleep

### Confirmed Client Intent

- Sleep should capture hours slept plus bedtime and wake time.
- Quality should be a personal rating based on how chamero felt the sleep was.
- Dream/nightmare memory should be selectable.
- Number of wakeups should be tracked.
- Bathroom wakeups are specifically mentioned.
- Useful detail should show hours slept over the past week or so and quality.

### Rejected / Low Confidence

- Phone use before bed was only an AI question; chamero did not confirm it.
- Sleep debt, weekly sleep goal, and bedtime consistency were AI suggestions and not directly confirmed.
- Correlations with Exercise/Gaming are plausible but not explicitly confirmed in Sleep's answer.
- Streak pressure for sleep goals was not confirmed.

### Friction Notes

- Sleep is marked simple in the depth table, so logging should remain lightweight despite multiple fields.
- Morning entry should probably be a single compact form.
- Dream/nightmare and wakeup details should be quick selections, not a long journal workflow.

### Quick Entry Implications

- Quick Entry should support bedtime, wake time, calculated hours, manual hours if needed, quality, wakeup count, bathroom wakeup, and dream/nightmare memory.
- The fastest path should allow saving core sleep info without optional details.
- Quality should be subjective, not treated as a clinical sleep score.

### Bento / Dashboard Implications

- Strong Bento signal: last night's hours plus quality.
- A short recent-hours chart or 7-night bar chart is plausible but should be real data.
- Dream/nightmare and wakeups are probably detail/history signals rather than primary dashboard values.

### Detail Page Implications

- Detail should show recent hours slept and quality over the last week or similar short range.
- History should show date, hours, bedtime, wake time, quality, and interruptions where present.
- It should help chamero understand recent sleep, not build a heavy sleep science interface by default.

### Stats / Graphs

- Confirmed: recent hours slept and sleep quality.
- AI-suggested charts for 30 days, consistency, and sleep debt need later confirmation.
- Correlations with mood are likely useful by cross-tracker intent, but not separately confirmed in the Sleep answer.

### Tags / Assets / Correlations

- Dream/nightmare memory and bathroom wakeups are structured attributes, not generic tags unless the later contract chooses tags.
- Mood correlation is likely high value due to cross-tracker interconnection.
- Gaming and Exercise correlations are plausible but lower-confidence.
- Assets/photos were not mentioned.

### Contract / Schema Implications

- Later contracts need fields for bedtime, wake time, calculated or entered hours, subjective quality, dream/nightmare memory, wake count, and bathroom wakeups.
- Sleep is a candidate/future tracker in the cleanup plan's implementation status, so this extraction should not imply current tracker implementation.
- If kept simple, schema should avoid overbuilding sleep debt/goals until confirmed.

### Open Questions

- Should hours be manually editable if bedtime/wake time are entered?
- What quality scale should be used?
- Should dream and nightmare be separate values, one enum, or simple boolean options?
- Should wakeups capture exact times or only counts?

## Exercise / Gym

### Confirmed Client Intent

- Chamero likes exercise search.
- Main training type is lifting.
- Chamero wants to create personal presets/routines because he usually sticks to 1-4 recurring routines.
- A preset can include multiple workouts/exercises plus expected sets and reps.
- During entry, the preset should load expected work and allow adjusting reps/sets if the actual workout differs.
- Saved workout routines/presets are confirmed.
- Detail/opening value: click a saved preset/routine, see workouts in small cards side by side, adjust plus/minus if more or less was done, then save for that day.
- Current popout-style interaction is disliked for this tracker and maybe other trackers.
- Walking/daily steps are a future thing chamero wants to see later; cardio is not the main current focus.

### Rejected / Low Confidence

- Full cardio detail is not confirmed; "for now just distance" was mentioned only in response to cardio.
- Auto PR detection, total volume, per-exercise progress charts, and weekly volume charts were AI suggestions, not directly confirmed.
- 800+ exercise database is acceptable only insofar as chamero likes search; it is not enough by itself.
- Popout-based entry is explicitly low confidence or undesirable.

### Friction Notes

- The core friction problem is avoiding repeated manual setup for recurring routines.
- Presets should reduce entry to selecting a routine and adjusting differences.
- Exercise can be deep, but the depth should be structured around chamero's own routines, not generic bodybuilding analytics first.

### Quick Entry Implications

- Quick Entry should probably be routine-first: pick preset, review cards, adjust reps/sets, save.
- Search should support building or editing presets, and maybe ad hoc exercises.
- Plus/minus controls for deviations are important.
- Entry should be page-integrated or otherwise less disruptive than a popout.

### Bento / Dashboard Implications

- Bento could show last session, selected routine, and days since workout if real.
- Weekly streak or frequency is plausible but not directly confirmed.
- The dashboard should not require showing advanced volume/PR metrics before the routine logging flow is solved.

### Detail Page Implications

- Detail should expose saved routines/presets and session history.
- It should show individual workout cards with expected versus actual sets/reps.
- Later detail tabs may include progress, exercises, and routine history.
- Popout alternatives need design exploration before implementation.

### Stats / Graphs

- Deep preference is confirmed for Exercise/Gym.
- Stronger confirmed stats: routine adherence, actual versus expected reps/sets, sessions over time.
- Lower-confidence stats: PRs, total volume, weekly volume, per-exercise progress.
- Walking/steps should be tracked later, not pulled into the current gym contract blindly.

### Tags / Assets / Correlations

- Correlations with Sleep and Mood are plausible from the AI list and broader interconnection preference, but not as strong as the preset workflow.
- Exercise may correlate with Weight and Health in the bigger system.
- Assets/photos were not mentioned.

### Contract / Schema Implications

- Later contracts likely need workout routine/preset entities, exercise selections, expected sets/reps, actual sets/reps, and per-session entries.
- Search database and user-defined presets are different concepts and should not be conflated.
- The contract should preserve lifting as the primary current use case and keep cardio/steps as future or separate design unless clarified.
- Current implementation status is not asserted here.

### Open Questions

- Should presets include target weight/load, or only exercises, sets, and reps?
- Should actual entry support weight lifted on each set?
- Are routines versioned when chamero changes them every few months?
- Should walking/steps be a separate tracker, a sub-tracker, or future Exercise mode?

## Books

### Confirmed Client Intent

- Chamero wants to log when he started a book.
- He wants to log days he read some of it.
- He wants to log the date he finished.
- Tracking pages read per session is too much friction and will not be used.
- Book rating should be 1-5 stars, with tenth-step precision such as 3.1, 3.2, 3.3.
- Useful outcomes include reading streaks and books read per week/month.
- Separate shelves are desired.

### Rejected / Low Confidence

- Pages read per session is explicitly rejected.
- Current page/total page progress is low confidence because page tracking conflicts with the friction note.
- 1-10 rating is superseded by 1-5 stars with tenth precision.
- Mini-reviews, genre, author, and detailed reading pace were AI suggestions unless later confirmed.

### Friction Notes

- Books should stay simple.
- The tracker should support habit/pattern visibility without turning every reading session into a detailed log.
- Start/read-day/finish is the core flow.

### Quick Entry Implications

- Quick Entry should support marking that chamero read today for a selected book.
- Starting and finishing a book should be distinct lightweight actions.
- Rating should appear at finish time or later edit, not necessarily during every read-day log.
- It should not ask for pages by default.

### Bento / Dashboard Implications

- Useful dashboard signals include current reading shelf, reading streak, and books finished recently or per week/month.
- A page progress bar should not be default unless a later decision reintroduces optional pages.
- Separate shelves should be visible somewhere, but Bento should remain compact.

### Detail Page Implications

- Detail page should show shelves: Reading, Finished, Want to Read, or equivalent separate categories.
- It should show start date, read days, finish date, rating, and history.
- It should support editing status/shelf and correcting dates.

### Stats / Graphs

- Confirmed: reading streaks and books read per week/month.
- Ratings over time may be useful but are not explicitly confirmed as analytics.
- Reading pace by pages/minutes is low confidence.

### Tags / Assets / Correlations

- Correlation with Mood is an AI suggestion; chamero did not directly confirm for Books, though global interconnection may eventually include it.
- Book covers/assets were not mentioned.
- Tags/genres were not confirmed.

### Contract / Schema Implications

- Later contracts need book identity, shelf/status, start date, read-day markers, finish date, and decimal star rating.
- Page-session schema should not be required.
- Books can be lightweight but still structured; generic text-only entries would lose shelf and finish semantics.
- Current implementation status is not asserted here.

### Open Questions

- What fields are required to create a book: title only, or author too?
- Should Want to Read items support rating or notes before start?
- Can one book be re-read, and if so is that a new reading period?
- Should decimal star ratings allow any tenth between 1.0 and 5.0?

## Gaming

### Confirmed Client Intent

- Chamero wants to log games played each day.
- Estimated hours played should be captured.
- Correlations with mood and related signals are desired.
- Chamero plays several games, but often only 1-2 game types per month.
- Certain games should track wins/losses so mood impact can be understood.
- Desired insights include: X game lowers mood, Y game with losses lowers mood, Z game improves mood.

### Rejected / Low Confidence

- No-streak pressure was an AI suggestion and not directly confirmed.
- Game mode, session mood labels like focused/tilted/relaxed, and time-of-day heatmaps are not directly confirmed.
- Full per-game analytics beyond mood and win/loss correlation should be treated as lower confidence.

### Friction Notes

- Gaming is marked deep in the depth table, but daily logging should still be quick: game plus estimated hours, with win/loss only where relevant.
- The system should not require detailed competitive data for every game.
- Game-specific optional fields are important.

### Quick Entry Implications

- Quick Entry should support selecting one or more games for a day and entering estimated hours.
- For configured games, optional wins/losses should appear.
- It should be easy to log multiple games but optimized for the common 1-2 games/month pattern.

### Bento / Dashboard Implications

- Dashboard could show today's/this week's gaming hours and most recent games if backed by data.
- Mood-impact summaries are more valuable than generic time totals once enough data exists.
- Bento should not imply a habit streak unless later confirmed.

### Detail Page Implications

- Detail should show sessions/daily logs by game, hours, and game-specific win/loss data where present.
- It should support per-game breakdowns and mood correlation summaries.
- History edit/delete is implied by the general Notion pattern but not directly answered by chamero.

### Stats / Graphs

- Confirmed: games played per day, estimated hours, mood correlations, and win/loss mood impact for certain games.
- Weekly/monthly time totals are plausible but came from AI prompts.
- Time-of-day heatmaps are unconfirmed.

### Tags / Assets / Correlations

- Game title is a core linked entity.
- Wins/losses are game-specific structured data, not generic tags.
- Mood correlation is central.
- Sleep correlation is plausible but not explicitly confirmed.
- Game cover/assets were not mentioned.

### Contract / Schema Implications

- Later contracts need game identity, date, estimated hours, and optional per-game fields such as wins/losses.
- Game-specific configuration may be needed so only relevant games ask for wins/losses.
- Correlation contracts must be able to compare game identity plus outcome against Mood.
- Current implementation status is not asserted here.

### Open Questions

- Which game types need wins/losses?
- Should hours be per session or aggregated per day?
- Should same-day multiple sessions of the same game be separate or merged?
- Does chamero want to log mood during gaming, or only correlate with external Mood entries?

## Diet / Meals

### Confirmed Client Intent

- Chamero mainly wants to log foods eaten.
- Tags for certain foods or ingredients are important.
- Food/ingredient tags should correlate with Health tracker symptoms such as allergy or inflammation.
- Diet is also for fitness goals and general awareness.
- Diet should connect to other trackers.
- Chamero already logs everything he eats daily, with examples like potato chips, beef amount, and spices.

### Rejected / Low Confidence

- Full macros are not directly confirmed.
- Calorie estimates are not explicitly rejected, but chamero redirected the focus toward food/ingredient tags and health symptoms.
- Meal categories, macro rings, protein goals, and donut charts are AI suggestions unless later confirmed.
- A fitness-only calorie tracker would underfit the client intent.

### Friction Notes

- Chamero already tolerates daily food logging, including granular items.
- The important design challenge is structured enough tags/ingredients for correlations without making logging slower than the existing habit.
- Tags should help explain Weight and Health changes.

### Quick Entry Implications

- Quick Entry should make food item entry fast and tag-aware.
- Ingredients/tags should be reusable.
- It should support rough food logs without requiring full nutrition details.
- Calorie/macros should be optional unless later confirmed as required.

### Bento / Dashboard Implications

- Dashboard could show today's logged foods, tag highlights, or fitness summary, but confirmed priority is less clear than with Weight/Mood.
- If calorie/protein bars are shown, they need explicit later confirmation.
- Health-symptom correlations may belong more in detail/correlation surfaces than a small Bento.

### Detail Page Implications

- Detail should show daily food history with tags/ingredients.
- It should support editing foods and tags because tags drive correlations.
- It should show relationships to Health symptoms, Weight, fitness goals, and general awareness when backed by data.

### Stats / Graphs

- Confirmed: correlation-oriented analysis around food/ingredients and Health symptoms.
- Weight and fitness-goal analysis are confirmed at the intent level.
- Macro/calorie trend charts are lower confidence.

### Tags / Assets / Correlations

- Tags/ingredients are central.
- Health symptoms such as allergy and inflammation are explicit correlation targets.
- Weight and fitness goals are confirmed correlation contexts.
- Mood/energy correlations came from AI examples and are lower confidence unless later confirmed.
- Photos/assets were not mentioned.

### Contract / Schema Implications

- Later contracts likely need food items, ingredient/tag associations, dates/times, and links to Health symptom data.
- A generic calorie value is insufficient for the confirmed Health-tag correlation intent.
- Diet/Food may need a specialized schema or structured metadata before implementation claims are made.
- Current implementation status is not asserted here.

### Open Questions

- Should foods be free text plus tags, structured ingredients, or both?
- Are calories still desired, and if yes are they required or optional?
- Should macros/protein goals exist in the first contract?
- How should Health symptoms be represented so food correlations are meaningful?

## Water

### Confirmed Client Intent

- Chamero does not currently track water.
- Water might be something he gets into later.
- Water should be put on the backburner for now.
- The tracker is explicitly marked with rejection/backburner intent.

### Rejected / Low Confidence

- All AI-generated Water features are not approved for implementation now: one-tap +1, daily goal, progress ring, reminders, streaks, custom amounts, units, history, and averages.
- Even though Water is marked simple in the depth table, the later direct answer says backburner, which is stronger.

### Friction Notes

- Current friction tolerance for Water is effectively zero because chamero does not plan to use it now.
- Do not spend design or implementation effort here before higher-priority trackers.

### Quick Entry Implications

- No Quick Entry requirement should be implemented from this discovery alone.
- If Water returns later, it should likely stay simple and one-tap, but that remains future.

### Bento / Dashboard Implications

- Water should not occupy prominent dashboard space unless chamero reactivates it.
- Any existing Water visual should be treated as backburner/candidate rather than product priority.

### Detail Page Implications

- No detail page requirements are confirmed for current work.

### Stats / Graphs

- No current stats or graph requirements are confirmed.

### Tags / Assets / Correlations

- No current tag, asset, or correlation requirements are confirmed.

### Contract / Schema Implications

- Mark as backburner or `CONTRACT_ONLY/FUTURE` until chamero re-confirms.
- Do not create new schema, endpoints, widgets, reminders, or tracker seeds from the AI Water list.

### Open Questions

- What would make Water worth reactivating later?
- If reactivated, should it be one-tap glasses, ml, or both?
- Should reminders exist, or would they feel annoying?

## Meditation

### Confirmed Client Intent

- Chamero wants Meditation to be relatively basic.
- It is not a priority.
- Desired fields/features include meditation days, streaks, length, and small tags about how it made him feel during and after.
- No meditation app is used.

### Rejected / Low Confidence

- App or method tracking is low confidence; chamero answered "no app."
- Detailed meditation types such as guided/unguided/breathing/body scan were AI suggestions and not confirmed.
- Focus score, weekly goals, type breakdown, and app-based history are AI suggestions.
- Some answers were blank or "idk", so uncertainty must remain visible.

### Friction Notes

- Meditation should stay lightweight.
- Low priority means avoid heavy specialized analytics until the habit becomes more important.
- Tags about before/after feeling may be useful if they stay small.

### Quick Entry Implications

- Quick Entry should allow marking a meditation day, duration/length, and optional feeling tags.
- It should not require app, method, or focus score.
- Streak visibility may be motivating but should be simple.

### Bento / Dashboard Implications

- Bento could show streak, recent meditation, or sessions this week if later prioritized.
- Dashboard prominence should be low unless chamero changes priority.

### Detail Page Implications

- Detail can show days meditated, streak, length history, and feeling tags.
- It should avoid complex breakdowns by method/app.

### Stats / Graphs

- Confirmed: meditation days, streaks, length.
- Lower confidence: minutes-per-day bar charts and monthly summaries.
- Mood/Sleep correlations are plausible but not directly confirmed.

### Tags / Assets / Correlations

- Small feeling tags during/after are confirmed.
- No app/method asset is needed.
- Mood correlation could become useful but should not be assumed.

### Contract / Schema Implications

- Later contracts should keep required fields minimal: date and maybe duration.
- Feeling tags should be optional.
- Meditation is candidate/future/low priority in the cleanup plan context, so this extraction does not imply implementation.

### Open Questions

- Should streaks be visible if chamero misses days, or could that become demotivating?
- What exact feeling tags should be supported?
- Is duration required or optional?
- Should Meditation correlate with Mood at launch or later?

## Social / Personal CRM

### Confirmed Client Intent

- Chamero will track most people he talks to weekly.
- He also wants all important people, such as family and important work people.
- Per interaction, mood plus notes are important.
- He may also want to capture how the person made him feel during the interaction.
- Main goals include remembering key details, deciding who to befriend or avoid, and remembering birthdays/key events for friends and family.
- Reminders are probably beneficial even if awkward.
- Reminders must be disableable for certain people or globally.
- Traits are very important for remembering kind or bad people.
- Aggregate social charts are accepted.
- Relationship-type handling is uncertain; chamero said he does not know.

### Rejected / Low Confidence

- Tracking all contacts is too broad; the confirmed scope is weekly contacts plus important people.
- Duration, who initiated, and structured topics were AI prompts and not directly confirmed.
- Relationship filters by friends/work/family are plausible but uncertain.
- Photo, date met, and full profile richness are AI suggestions unless later confirmed.

### Friction Notes

- Social can be deep, but it must focus on memory, emotional impact, reminders, and traits.
- Per-person reminder controls are important because reminders can feel awkward.
- The tracker should not force too many fields per interaction.

### Quick Entry Implications

- Quick Entry should log an interaction with person/contact, mood, notes, and optionally how the interaction made chamero feel.
- Contact creation should capture key details, birthday/events, and traits, but not require all profile fields up front.
- Reminder settings should be available per person and globally.

### Bento / Dashboard Implications

- Useful Bento signals include upcoming birthdays/key events and weekly interaction summary.
- Neglect reminders may be useful but need opt-out controls.
- Aggregate social mood/interaction counts are confirmed enough for later design.

### Detail Page Implications

- Contact detail should show key facts, traits, birthday/events, reminder settings, and interaction history.
- Social tracker detail should show aggregate charts and recent interactions.
- Interaction history should preserve mood, notes, and emotional effect.

### Stats / Graphs

- Confirmed: aggregate charts for social life.
- Strong stats include interactions over time, mood/feeling distribution, and contact-level positive/negative/neutral patterns if supported.
- Relationship-type breakdown is uncertain.

### Tags / Assets / Correlations

- Contact/person is a core linked entity.
- Traits are important.
- Birthdays/key events are important.
- Correlation with Mood is plausible and aligned with social emotional tracking.
- Photos were AI-suggested but not confirmed.

### Contract / Schema Implications

- Later contracts likely need Contacts, contact traits, important dates/events, interactions, interaction mood/notes, emotional effect, reminder preferences, and aggregate read models.
- Reminder disablement must exist at both per-contact and global levels if reminders are implemented.
- Social/CRM is a deep specialized design candidate and should not be reduced to generic entries.
- Current implementation status is not asserted here.

### Open Questions

- What relationship categories, if any, does chamero want?
- Should "kind or bad people" be explicit traits, private notes, sentiment scores, or labels?
- What reminder cadence should be configurable?
- Should interaction duration be captured at all?

## Grouping / Sections

### Confirmed Client Intent

- Chamero wants a Health section that includes mental health and physical symptoms experienced every day, such as sickness, injury, and depression.
- A Mind grouping is acceptable.
- Mind could include notes/timeline showing general mood over months, including depression dips and motivation waves.
- A big line graph/timeline for mood over months is desired in this grouping context.
- Weight plus body measurements should stay together.
- Health should be its own area for the symptoms described above.

### Rejected / Low Confidence

- A generic "Physical Health" grouping that folds Weight, Water, and Sleep together was only an AI suggestion; chamero gave a more specific answer.
- Water should not be promoted into Health just because it appeared in an AI grouping example.
- Exact grouping names are not final contracts.

### Friction Notes

- Grouping should help navigation and meaning, not add extra logging steps.
- Health and Mind are product organization concepts; they do not automatically define schema.

### Quick Entry Implications

- Quick Entry may need grouped sections for discovery/navigation, but individual tracker entry should stay fast.
- Health symptom logging, if implemented later, should be separate from Weight.

### Bento / Dashboard Implications

- Dashboard may need grouped sections such as Mind and Health.
- Weight/body measurements should be visually or navigationally adjacent.
- Long-term mood/depression/motivation timeline belongs in a detail or group-level view, not necessarily in every Mood card.

### Detail Page Implications

- Mind detail could aggregate Mood, Meditation, and long-term notes/timeline if later contracted.
- Health detail should support physical symptoms such as sickness, injury, depression, allergy, inflammation, and related Diet correlations.
- Weight detail should remain with body measurements rather than being swallowed by generic Health.

### Stats / Graphs

- Confirmed: long-range mood/motivation/depression timeline.
- Health correlations with Diet/Exercise are confirmed elsewhere in depth table and Diet answers.
- Exact cross-section graph design remains open.

### Tags / Assets / Correlations

- Health symptoms are key correlation targets, especially with Diet/Food and possibly Exercise.
- Mind grouping should relate Mood and Meditation but not force them into the same schema.
- Assets were not mentioned.

### Contract / Schema Implications

- Later contracts should distinguish UI grouping from tracker data ownership.
- Health appears as a deep future/specialized area, not just a category label.
- Weight/body measurements should remain paired.
- This extraction does not prove any current grouping implementation.

### Open Questions

- What trackers belong under Mind exactly?
- Is depression tracked as Mood, Health, or both?
- Should Health symptoms be their own tracker or a section containing multiple trackers?
- What should group-level timelines aggregate?

## Custom Trackers

### Confirmed Client Intent

- The Notion custom tracker answer block is blank.
- No specific custom tracker requirements were confirmed in this source.

### Rejected / Low Confidence

- AI suggestions such as custom input types, units, daily goals, correlation inclusion, Bento visibility, and tracker deletion are not confirmed by chamero in this file.
- The existence of a custom tracker system should not be treated as proof that specialized default trackers can stay generic.

### Friction Notes

- No friction tolerance was provided for Custom Trackers.
- This area needs clarification before product requirements can be extracted.

### Quick Entry Implications

- No confirmed Quick Entry implications from the Notion answer.

### Bento / Dashboard Implications

- No confirmed dashboard implications from the Notion answer.

### Detail Page Implications

- No confirmed detail page implications from the Notion answer.

### Stats / Graphs

- No confirmed stats or graph requirements from the Notion answer.

### Tags / Assets / Correlations

- Correlation support for custom trackers was AI-suggested but not confirmed in the answer block.

### Contract / Schema Implications

- Later contracts should not use the blank custom tracker section to justify broad generic schemas.
- Custom Trackers need separate client confirmation.

### Open Questions

- Does chamero want custom trackers beyond the defaults?
- Which custom trackers are concrete enough to support?
- Should custom trackers be simple only, or can they be composite?
- Should custom trackers participate in correlations by default?

# Cross-Tracker Themes

- Simple vs deep preference: Weight, Mood, Sleep, Books, Water, and Meditation are marked simple. Exercise/Gym, Gaming, Diet, Social/CRM, and Health are marked deep. "Simple" does not mean unstructured; Books still needs shelves/dates/ratings, Mood still needs multiple daily entries, and Sleep still needs bedtime/wake/quality.
- Friction tolerance: Chamero repeatedly rejects or softens high-friction logging. Books rejects page-session tracking. Water is backburner. Mood cause tags should be optional. Exercise wants presets to avoid repeated setup. Diet has high tolerance because chamero already logs foods daily, but the system must support that habit instead of adding nutrition overhead by default.
- Tag system implications: Tags are most important for Diet/Food, Health symptoms, Mood causes, Meditation feeling tags, Social traits, and Weight explanations from Food tags. Tags should not be a decorative generic add-on; they are correlation inputs.
- Correlation engine implications: Strong confirmed correlation needs include Weight with Diet/Food, Mood with many trackers, Gaming with Mood and wins/losses, Diet/Food with Health symptoms, and Health with Diet/Exercise. AI-generated correlations should be filtered through confirmed client intent before implementation.
- Trackers that should stay simple: Weight daily entry, Mood quick color entries, Sleep lightweight morning log, Books start/read-day/finish, Meditation basic sessions, and Water if ever revived.
- Trackers that need deep specialized design: Exercise/Gym presets and sessions, Diet/Food with ingredient/tag correlations, Social/Personal CRM, Gaming with game-specific fields, and Health symptoms/grouping.
- Backburner items: Water is explicit backburner. Meditation is low priority/basic. Walking/steps are later. Health is important but needs its own clean specialized design before implementation. Custom Trackers need clarification because the answer was blank.

# Tracker Priority From Discovery

## Deep / Specialized

- Exercise / Gym: strong confirmed need for saved routines/presets, adjustable workout cards, and lifting-focused entry.
- Diet / Meals: strong confirmed need for food/ingredient tags, daily food logging, Health symptom correlations, fitness goals, and awareness.
- Social / Personal CRM: strong confirmed need for contacts, traits, birthdays/events, interactions, mood/notes, reminders, and aggregate charts.
- Gaming: confirmed need for game/day/hour logging plus mood and win/loss correlations for certain games.
- Health: not one of the tracker sections above, but strongly implied by Grouping, Diet, and the depth table as a deep specialized area for symptoms, depression, sickness, injury, allergy, inflammation, and correlations.

## Simple / Lightweight

- Weight: simple daily log, but with structured target, waist, units, trends, colors, and Diet tag correlations.
- Mood: fast repeated color-based entries, optional causes, before/after work split, and line graph/peaks/lows.
- Sleep: lightweight bedtime/wake/hours/quality plus dream/wakeup details.
- Books: start date, read days, finish date, decimal star rating, shelves, streaks, books per week/month.
- Meditation: days, streaks, length, and small feeling tags; low priority.

## Backburner

- Water: explicitly not used now and should be backburnered.
- Walking/steps: mentioned as something chamero wants later, not current Gym scope.
- Complex meditation method/app analytics: low priority and not confirmed.

## Needs Clarification

- Custom Trackers: blank answer block; no confirmed requirements.
- Health tracker structure: strong intent exists, but it needs its own tracker contract and symptom model.
- Mood color scale: confirmed preference direction, but exact scale/mapping is undecided.
- Exercise actual set fields: presets and sets/reps are confirmed, but weight/load, PRs, volume, and versioning need decisions.
- Diet nutrition depth: food/tags are confirmed; calories/macros/protein goals need confirmation.
- Social relationship categories: important people are confirmed; exact categories are uncertain.

# Items Not To Implement Blindly

- Body fat percentage for Weight, because it was crossed out as probably unused.
- Full body measurements beyond waist for Weight, unless later confirmed.
- Sleep debt, sleep goals, bedtime consistency analytics, and sleep streaks.
- Exercise PR detection, total volume analytics, weekly volume charts, and per-exercise progress dashboards.
- Cardio/steps as part of the first Exercise/Gym contract.
- Pages read per Book session, current-page progress bars, and page/minute pace tracking.
- 1-10 Book ratings; chamero asked for 1-5 stars with tenth-step precision.
- Gaming heatmaps, generic session mood labels, game modes, and no-streak behavior.
- Diet macro rings, full macro tracking, protein goals, calorie-only dashboards, and meal-category assumptions.
- Any Water feature from the AI reference list, including one-tap logging, goals, reminders, and progress rings.
- Meditation app/method tracking, focus scores, weekly goals, and detailed type breakdowns.
- Social profile photos, date-met fields, interaction duration, who-initiated fields, and fixed relationship filters.
- Generic Custom Tracker behavior from the AI list, because chamero left the answer blank.
- Any schema, endpoint, IPC method, database table, read model, widget, route, chart, or seed data derived only from the Notion AI examples.
