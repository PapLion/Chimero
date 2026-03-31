# Chimero — Tracker Design Discovery

# What is this page?

Before writing a single line of code, we need to know **exactly what you want each tracker to do**.

This isn't a technical doc — no code, no schemas. Just you answering honestly: *as a user, what would actually be useful to you?*

Panda will read your answers and turn them into the exact data structure for each tracker. This defines everything — what the app saves, what it shows, and what the correlation engine can analyze.

> 💡 **How to fill this out:** Each tracker has three parts: (1) a summary list of ideas to react to — cross out what you don't want, add what's missing; (2) a detailed example of how a real user might use it; (3) questions for anything still unclear. You don't have to answer every question — just react to the summary and add your own thoughts.
> 

---

# 🗂️ Tracker-by-Tracker Questions

---

## ⚖️ Weight

**In this tracker I want to: (reference list — cross out what you don't want, add what's missing)**

- Log my weight in lbs but switchable to kg or lb/kg together.
- Log body measurements (waist, hips, chest, arms)
- ~~Log body fat percentage(probably won’t use)~~
- See how much I've lost or gained since I started(and since ive started a goal)
- See a trend chart for the last 3/7/14/30/60/90//180/270 days and /1 year/2 year/3 year
- Set a target weight and see my progress toward it
- See weekly averages instead of noisy daily numbers(i likke my daily numbers 😆 but avgs are good too)
- Correlation with Exercise: am I losing weight while gaining strength?
- Correlation with Diet: are my calories aligned with my goal (lose, maintain, gain)? ✅
- Bento widget: current weight + delta vs last week + tiny sparkline
- Edit or delete incorrect entries
- Add optional notes ("day after cheat meal", "was dehydrated") - Custom tags in food tracker can function for this? Can pull “cheat day” “very bad food” and other tags from those days and correlate with my weight differences.

> 💡 **Example — imagine you're a user opening Weight every day:**
> 

> 1. **Log** — Enter 174.2 lbs after waking up
> 

> 2. **See** — "You're down 1.8 lbs from last week" on the detail page
> 

> 3. **Trend chart** — A smooth line chart of the last 30 days of weight
> 

> 4. **Goal progress** — "Target: 165 lbs — you're 9.2 lbs away" with a progress bar
> 

> 5. **Body fat** — 18.4% logged alongside weight
> 

> 6. **Waist measurement** — 34in, to track body recomposition even when the scale doesn't move
> 

> 7. **Weekly average** — A rolling 7-day average line to reduce noise
> 

> 8. **Insight** — "On days you sleep 7+ hours, your next-day weight is lower"
> 

> 9. **Bento widget** — Current weight, delta from last week, tiny sparkline
> 

> 10. **History** — Scrollable list: date, weight, body fat %, note — sortable by date
> 

> 11. **Edit/delete** — Tap any past entry to fix a typo or remove a duplicate
> 

> 12. **Streak** — "You've logged weight 5 days in a row" as a small motivator
> 

**Questions:**

1. Pounds or kilos? Or switchable?
2. Is weight the only physical metric you care about, or do you want body measurements and body fat too?
3. Do you want a target weight the app tracks toward?
4. How often would you realistically log this — daily, weekly, whenever?
5. What would make the detail page feel actually useful when you open it?

> ✏️ *chamero's answer:
1. LB’s/Pounds as default but switchable
2. Weight should be primary, have basic measurement for waist.
3. Yes, let me set targets.
4. Daily(once every morning)
5. Green stuff when im losing weight toward goal and red when i’m not. Colors are helpful motivators and also show when im on a 4 day loss/neutral streak.*
> 

---

## 😊 Mood

**In this tracker I want to: (reference list)**

- Log my mood 1–10 multiple times a day
- Add tags for the cause: work, social, sleep, exercise, food
- Write a short note explaining why I feel that way
- See a monthly heatmap colored by mood score
- See a mood trend chart over 30/90 days
- See my worst and best days identified automatically
- Correlation with Sleep: do I feel better after more sleep?
- Correlation with Exercise: does my mood improve on days I train?
- See which tags appear most on my low vs high mood days
- Bento widget: today's mood score + emoji + weekly average
- Edit or delete entries
- See a weekly summary: avg mood + change vs last week

> 💡 **Example — imagine you're a user logging mood a few times a day:**
> 

> 1. **Morning log** — Tap 6/10 with tag "groggy" right after waking up
> 

> 2. **Evening log** — Tap 8/10 after a good workout, tag "energized"
> 

> 3. **Today's average** — Detail page shows "Today: 7.0 avg" combining both entries
> 

> 4. **Calendar heatmap** — Monthly view where each day is color-coded red → green
> 

> 5. **Trend chart** — Line chart of the last 30/90 days showing emotional baseline
> 

> 6. **Tag breakdown** — "Your mood is 1.8 pts higher on days tagged 'exercise'"
> 

> 7. **Best/worst days** — "Your 3 best mood days were all Saturdays"
> 

> 8. **Correlation with sleep** — "When you sleep 7+ hrs, next-day mood averages 7.4 vs 5.9"
> 

> 9. **Bento widget** — Today's mood + emoji + tiny calendar heatmap thumbnail
> 

> 10. **Note journal** — "Stressful call with boss, affected the whole day"
> 

> 11. **Edit past entry** — You logged 3 but meant 7 — tap to fix
> 

> 12. **Weekly summary** — "This week: avg mood 6.8 (+0.4 vs last week)" on the widget
> 

**Questions:**

1. Is 1–10 how you naturally think about mood, or would you prefer emojis, word labels, or colors?
2. Do you ever have more than one mood in a day, or do you log once and done?
3. Would you want to tag what caused the mood, or is that too much friction?
4. What's the most useful thing to see on the mood detail page?
5. Is mood something you'd want to actively correlate with other trackers?

> ✏️ *chamero's answer:
1. mabye red orange yellow green colors instead.
2. usually 3-10 mood entries per day, several before work and several after which is a key split.
3. Yes causes are good for major moods,most of the time ill have no cause.
4. line graph of it going up and down, the peak and low of the day/week/month and so on
5. yes i want everything interconnected*
> 

---

## 😴 Sleep

**In this tracker I want to: (reference list)**

- Log bedtime and wake time — app calculates hours automatically
- Rate sleep quality 1–10 (separate from duration)
- Log how many times I woke up during the night
- See a chart of hours per night for the last 30 days
- See bedtime consistency: am I going to bed at the same time?
- See "sleep debt": how many hours short of my weekly goal am I?
- Correlation with Mood: do I feel better the day after good sleep?
- Correlation with Exercise: do I perform better when well-rested?
- Correlation with Gaming: do I sleep worse after late-night sessions?
- Bento widget: last night's hours + quality + 7-night bar chart
- Edit or delete incorrect entries

> 💡 **Example — imagine you're a user opening Sleep every morning:**
> 

> 1. **Log** — Bedtime 11:30pm, wake 7:00am — app calculates 7.5h automatically
> 

> 2. **Quality score** — Slide to 6/10 because you woke up twice even though hours were fine
> 

> 3. **Detail page** — Shows: 7.5h, quality 6/10, bedtime 11:30pm, wake 7:00am
> 

> 4. **Hours chart** — Line chart of hours per night for the last 30 days
> 

> 5. **Bedtime consistency** — Bar chart of what time you go to bed each night
> 

> 6. **Quality vs hours** — "Sleep tanks when you go to bed after 1am even with 8h"
> 

> 7. **Correlation with mood** — "After 7+ hrs sleep, your mood is 1.6 pts higher"
> 

> 8. **Sleep debt** — "You're 2.5 hrs short of your weekly goal (49h)"
> 

> 9. **Bento widget** — Last night: 7.5h, quality 6/10 — small 7-night bar chart
> 

> 10. **History** — Date, hours, quality, bedtime, wake time in one row per entry
> 

> 11. **Edit/delete** — Remove a duplicate if you logged twice by mistake
> 

> 12. **Streak** — "You've hit your sleep goal 4 nights in a row"
> 

**Questions:**

1. Is logging hours enough, or do you want to log bedtime + wake time separately?
2. Do you care about sleep quality as a score, separate from hours?
3. Anything else you'd want to track — interruptions, phone use before bed, dreams?
4. What would a useful Sleep detail page look like to you?

> ✏️ *chamero's answer:
1. Log hours, bedtime/waketime
2. Let me select personally how i felt it was in terms of quality
3. Let me select if i remember dreams/nightmares, number of wakes, bathroom ect, 
4. hours slept past week or so and quality*
> 

---

## 🏋️ Exercise / Gym

**In this tracker I want to: (reference list)**

- Search and select exercises from the 800+ exercise database
- Log sets, reps, and weight per exercise
- Save workout templates (Push Day A, Pull Day B, etc.)
- Load a template and only adjust weights for that day
- Auto-detect PRs (personal records on a specific exercise)
- See total session volume (sum of sets × reps × weight)
- See progress chart per exercise (how much has my Bench Press gone up?)
- See weekly volume chart (am I progressing month to month?)
- Correlation with Sleep: does my performance drop when I sleep less?
- Correlation with Mood: does my mood improve the day after training?
- Bento widget: last session, days since last workout, weekly streak
- History: date, template used, exercises, total volume per session

> 💡 **Example — imagine you're a user logging a gym session:**
> 

> 1. **Search + add** — Type "bench" → select Bench Press → 4 sets × 8 reps × 100kg → Add
> 

> 2. **Build session** — Add 5–6 exercises without leaving the screen
> 

> 3. **Save as template** — "Save this as Push Day A" for next time
> 

> 4. **Load template** — Tap "Push Day A" → all exercises pre-filled → just adjust weights
> 

> 5. **PR detected** — "100kg × 8 reps on Bench is your best set ever" highlighted
> 

> 6. **Session summary** — Total volume: 12,400kg, duration: 58 min, all sets listed
> 

> 7. **Volume chart** — Line chart of total session volume per week
> 

> 8. **Per-exercise progress** — Tap "Bench Press" → see every set you've ever done charted
> 

> 9. **Correlation** — "Your gym performance is 18% higher after 7+ hours of sleep"
> 

> 10. **Bento widget** — Last session: 3 days ago, Push Day A, 12,400kg. Streak: 3x/week
> 

> 11. **History** — Each entry is a session card: date, template, top lifts, total volume
> 

> 12. **Edit a set** — You logged 90kg but it was 95kg — tap the set to fix it
> 

**Questions:**

1. Do you actually use the exercise search + sets/reps/weight input, or is it too much friction?
2. What type of training do you mainly do — lifting, cardio, both, something else?
3. For cardio — what matters? Distance, time, heart rate, calories, or just "did I do it"?
4. Do you follow a program/routine? Would you want saved workout templates?
5. What would make you actually open this tracker after every session?
6. Is there anything about the current exercise input that frustrates you?

> ✏️ *chamero's answer:*
> 
1. I like the search, but id probably like to make my own presets because most likely i stick to 1-4 diff routines and want to just quickly log those presets i made often. and only change it every few months or so. So a preset could be called “Full body 1” which automatically selects 7 diff workouts and the expected sets and reps i defined in that preset. but let me edit it as i enter if i changed # of reps from the goal in the preset.
2. lifting 
3.for now just distance, i suppose. I have walking trackers that ill want to input my daily steps at some point, not really cardio but is something i wanna see later.
4.yes saved workout routines/presets that i can create 
5. I want to see a preset/routine ive saved click it and it will show me all the workouts in little cards side by side with reps/sets and i can +- if i did more or less and then have it save for that day.
6.dont really like the popout function for this one as much or mabye any of the trackers. mabye some different type of page integrated(can look into this later i suppose)

---

## 📚 Book

**In this tracker I want to: (reference list)**

- Add books with title, author, and genre
- Have 3 shelves: Reading, Finished, Want to Read
- Log reading sessions: how long I read and what page I'm on
- See reading progress: current page / total pages
- Rate finished books 1–10
- Write notes or a mini-review when I finish a book
- See books finished per month — bar chart
- See my reading pace: pages or minutes per day on average
- Correlation with Mood: do I feel better on days I read?
- Bento widget: current book with progress, last 3 finished books
- Want to Read list as a backlog to pick the next book from
- Edit book status (resume a dropped book, etc.)

> 💡 **Example — imagine you're a user who reads regularly:**
> 

> 1. **Start a book** — Add "The Almanack of Naval Ravikant", status = Currently Reading
> 

> 2. **Log a session** — "Read 45 minutes today, got to page 112"
> 

> 3. **Mark as finished** — Change status to Finished, rate it 9/10
> 

> 4. **Mini-review** — "Changed how I think about leverage and time"
> 

> 5. **Reading shelf** — Detail page: Reading (1), Finished (14), Want to Read (7)
> 

> 6. **Pace chart** — Bar chart showing reading sessions over time
> 

> 7. **Books per month** — How many books did you finish in March?
> 

> 8. **Average rating** — Are the books you're choosing getting better or worse?
> 

> 9. **Correlation** — "On days you read, your evening mood is 0.9 pts higher"
> 

> 10. **Bento widget** — "Naval" — 112/242 pages (46%). Last 3 finished books listed
> 

> 11. **History** — All sessions: date, book title, pages read, minutes
> 

> 12. **Want to Read** — Add a book without starting it yet as a backlog
> 

**Questions:**

1. How do you actually use this — logging current reads, finished books, both?
2. Would you want to rate books? This is what connects Book to the correlation engine.
3. Do you want to track individual reading sessions, or just start/finish dates?
4. What's your honest use case — remembering what you've read, building a habit, seeing patterns?
5. One unified list or separate shelves (Reading / Finished / Want to Read)?

> ✏️ *chamero's answer:
Just log when i started a book, days i read some of it, date i finished. tracking pages read per session is too much friction and i won’t use it.
2. rate books 1-5 stars with 3.1,3.2,3.3 stars allow by every tenth.
4. seeing reading streaks, books read per week/month ect, 
5. separate shelves*
> 

---

## 🎮 Gaming

**In this tracker I want to: (reference list)**

- Log a session: game, duration, how I felt (focused / tilted / relaxed)
- Track each game separately
- See total time gamed this week and this month
- See per-game breakdown: hours by title
- See what time of day I usually game (heatmap)
- Correlation with Sleep: do late-night sessions hurt my sleep?
- Correlation with Mood: do I game more when my mood is low?
- History: date, game, duration, mood during session
- Bento widget: hours this week + last session info
- No streak pressure — this is for awareness, not habit-building
- Edit or delete incorrect sessions

> 💡 **Example — imagine you're a user who games several times a week:**
> 

> 1. **Log a session** — "CS2, 2 hours, felt focused" — fast 3-tap entry
> 

> 2. **Session mood** — Felt tilted? Relaxed? Focused? Quick 3-option selector
> 

> 3. **Weekly total** — "You've gamed 8.5 hours this week"
> 

> 4. **Per-game breakdown** — "CS2: 6h, Minecraft: 2.5h" — pie or bar chart
> 

> 5. **Time of day pattern** — "You usually game between 9pm–1am" as a heatmap
> 

> 6. **Sleep correlation** — "Sessions after 11pm correlate with worse next-day sleep"
> 

> 7. **Mood correlation** — "You game 40% more on days your mood is below 5"
> 

> 8. **Monthly total** — How many hours did you game in March?
> 

> 9. **Bento widget** — This week: 8.5h. Last session: 2h ago. Mood: Focused
> 

> 10. **Session history** — List: date, game, duration, mood
> 

> 11. **No streak** — Awareness tool, not a habit tracker
> 

> 12. **Edit/delete** — Remove accidental entries or fix duration
> 

**Questions:**

1. What do you actually want to get out of tracking gaming — awareness, correlations, just a log?
2. Do you play multiple games or mainly one?
3. Is session duration the main thing, or do you also want mood, win/loss, game mode?
4. Would you want insights like "you game more when your mood is low" or is that too much?

> ✏️ *chamero's answer:
1. Just games played each day, a estimated hours played, and correlations with mood and stuff 2. several but often only 1-2 types per month
3. certain games should have wins/losses so it can corralate with mood

4. more like X game makes your mood lower and Y game with losses makes mood lower, Z game always improves mood.*
> 

---

## 🍔 Diet / Meals

**In this tracker I want to: (reference list)**

- Log meals by name and time of day (breakfast, lunch, dinner, snack)
- Add calorie estimates per meal
- Add optional macros: protein, carbs, fat
- See total calories for the day vs my goal
- See macro breakdown for the day as a donut chart
- Track whether I hit my daily protein goal (critical for muscle gain)
- Correlation with Weight: are my calories aligned with whether I'm gaining or losing?
- Correlation with Mood/Energy: do I feel better when I eat well?
- Correlation with Exercise: do I perform better with more pre-workout protein?
- Bento widget: today's calories + progress bar + protein for the day
- Scrollable meal history per day
- Edit or delete incorrect entries

> 💡 **Example — imagine you're a user trying to eat better:**
> 

> 1. **Quick log** — Tap + "Lunch" → "Chicken rice bowl" → rough estimate: 650 cal
> 

> 2. **Macros** — 40g protein, 70g carbs, 15g fat (optional detail)
> 

> 3. **Daily total** — "Today: 1,840 cal / 2,200 goal — 360 left"
> 

> 4. **Macro ring** — Donut chart showing protein/carbs/fat ratio for today
> 

> 5. **Calories chart** — Bar chart of daily intake for the last 2 weeks
> 

> 6. **Protein goal** — "You hit your protein goal (150g) 4 out of 7 days this week"
> 

> 7. **Correlation** — "On days you eat 130g+ protein, your evening mood is 1.2 pts higher"
> 

> 8. **Meal history** — Every logged meal: date, name, calories, macros
> 

> 9. **Bento widget** — Today: 1,840 / 2,200 cal. Protein: 118 / 150g. Progress bar
> 

> 10. **Edit a meal** — You entered 650 cal but it was 800 — tap to fix
> 

> 11. **Delete** — Remove a meal you logged twice by mistake
> 

> 12. **Weekly average** — "Last week you averaged 1,920 cal/day"
> 

**Questions:**

1. What level of detail are you actually willing to commit to — diary text, calorie estimates, or full macros?
2. Is this about fitness goals, general awareness, or something else?
3. Would you want to connect diet to other trackers like weight or mood?
4. Honestly — how long would you stick to logging meals before giving up? Design should match reality.

> ✏️ *chamero's answer:*
> 
1. mainly want to log foods eaten and have tags tracked such as certain ingredients will correlate with my Health tracker with symptoms such has allergy or inflammation etc.

2. Health symptoms, fitness goals, general awarenes.
3. Yes
4. I already log everything i eat daily such as Potato chips, 1/3lb beef, spices ect

---

## 💧 Water ❌

**In this tracker I want to: (reference list)**

- One-tap +1 on the widget with no dialog
- Set a daily goal (e.g. 8 glasses or 2,500ml)
- See today's progress as a progress ring: 5/8 glasses
- Undo a tap by accident with a quick -1
- Log custom amounts (500ml for a water bottle)
- See a streak: how many consecutive days did I hit my goal?
- Weekly bar chart: did I hit my goal each day?
- Reminder if I haven't logged water in X hours
- Bento widget: big progress ring + instant +1 tap
- Simple history: date + daily total
- Monthly average: how much water did I drink on average in March?
- Switch between glasses and milliliters

> 💡 **Example — imagine you're a user hitting a daily water goal:**
> 

> 1. **+1 tap** — Tap the widget once to log a glass — no dialog, instant
> 

> 2. **Goal** — "My goal is 8 glasses per day" — set once, tracked forever
> 

> 3. **Progress** — "5 / 8 glasses" with a progress ring on the widget
> 

> 4. **Undo** — Tapped by accident — quick -1 to reverse
> 

> 5. **Custom amount** — Log 500ml for a full water bottle
> 

> 6. **Weekly chart** — Bar chart of glasses per day for the last 7 days
> 

> 7. **Streak** — "You've hit your water goal 6 days in a row"
> 

> 8. **Reminder** — "You haven't logged water in 3 hours"
> 

> 9. **Bento widget** — Big progress ring: 5/8. One-tap to add. Minimal.
> 

> 10. **History** — Date + daily total. Nothing complicated.
> 

> 11. **Monthly average** — "You averaged 6.2 glasses/day in March"
> 

> 12. **Switch units** — Change from glasses to milliliters
> 

**Questions:**

1. Glasses or milliliters — or does it depend on the day?
2. Do you want reminders to drink water, or purely manual logging?
3. Is there anything you'd want to add, or is simple exactly right for water?

> ✏️ *chamero's answer:
I don’t really track water, mabye itll be something i get into later but put this on backburner for now.* ❌
> 

---

## 🧘 Meditation

**In this tracker I want to: (reference list)**

- Log session duration in minutes
- Log session type: guided, unguided, breathing, body scan
- Log the app or method used (Headspace, Calm, YouTube, none)
- Rate focus: how present was I during this session? (1–10)
- See my streak of consecutive days meditating
- See a bar chart of minutes meditated per day — last 30 days
- See breakdown by session type: what type do I practice most?
- Set a weekly goal: meditate X times this week — track progress
- Correlation with Mood: do I feel better on days I meditate?
- Correlation with Sleep: does meditating before bed improve sleep quality?
- Bento widget: streak + sessions this week + last session info
- History: date, duration, type, focus score, app used

> 💡 **Example — imagine you're a user who meditates a few times a week:**
> 

> 1. **Log a session** — "15 minutes, guided, Headspace" — 3-field quick entry
> 

> 2. **Focus score** — Slider 1–10: "How present were you?"
> 

> 3. **Streak** — "You've meditated 4 days in a row"
> 

> 4. **Duration chart** — Bar chart of minutes per day for the last 30 days
> 

> 5. **Type breakdown** — "This month: 60% guided, 30% breathing, 10% unguided"
> 

> 6. **Mood correlation** — "On days you meditate, evening mood is 1.1 pts higher"
> 

> 7. **Sleep correlation** — "After meditating, sleep quality is 0.8 pts higher"
> 

> 8. **Weekly goal** — "Meditate 5x this week" — progress: 3/5 done
> 

> 9. **Bento widget** — Streak: 4 days. This week: 3/5. Last: 15 min, Headspace
> 

> 10. **Notes** — "Felt scattered today but ended feeling clear" attached to session
> 

> 11. **History** — Date, duration, type, focus score, app used per entry
> 

> 12. **Monthly summary** — "In March you meditated 18 times for 4h 20min total"
> 

**Questions:**

1. Do you meditate regularly or sporadically? Streaks motivate some people, stress others out.
2. Does the type of meditation matter to you?
3. What app or method do you use, if any?
4. What would make this tracker feel worth opening after every session?

> ✏️ *chamero's answer:
1. I want to be regular but have it realtively basic as its not a prioity, so mabye mediation days,streaks,length, and small tags about how it made me feel during and after.*
> 
1. idk
3. no app, 
4. 

---

## 👥 Social / Personal CRM

**In this tracker I want to: (reference list)**

- Create a contact profile: name, photo, birthday, date we met, traits
- Log interactions: who I talked to, how long, mood of the conversation (positive/negative/neutral)
- Add notes to each interaction: what we talked about, how they seemed
- See each contact's full interaction history chronologically
- See an "energy audit": does this person leave me energized or drained?
- Neglect alert: "You haven't talked to Sarah in 28 days"
- Birthday reminder: "Alex's birthday is in 12 days"
- See my social activity in aggregate: how many interactions this week and with what mood
- Correlation with personal Mood: do positive social interactions make my mood better?
- Filter contacts by type: close friends, work, family
- Bento widget: upcoming birthday + weekly interaction summary
- Edit or delete incorrect interactions

> 💡 **Example — imagine you're actively using the Social CRM:**
> 

> 1. **Add contact** — "Alex" — birthday, where you met ("college, 2019"), photo, traits: "funny, reliable, direct"
> 

> 2. **Log interaction** — "Called Alex today, talked about his new job. Mood: positive. 45 min."
> 

> 3. **Contact profile** — Photo, birthday (in 12 days!), last talked (3 days ago), traits, full history
> 

> 4. **Interaction timeline** — Every time you've talked to Alex: mood + notes, chronological
> 

> 5. **Energy audit** — "Alex: 8 positive, 1 negative, 2 neutral — net positive in your life"
> 

> 6. **Neglect alert** — "You haven't talked to Sarah in 28 days" surfaced proactively
> 

> 7. **Birthday reminder** — "Alex's birthday is in 12 days" on dashboard or notification
> 

> 8. **Weekly social summary** — "This week: 6 interactions — 4 positive, 2 neutral"
> 

> 9. **Correlation** — "On days with positive social interactions, your mood is 1.4 pts higher"
> 

> 10. **Bento widget** — Upcoming: Alex's birthday in 12 days. Talked to 3 people this week.
> 

> 11. **Filter** — View only close friends vs work contacts vs family
> 

> 12. **Edit/delete** — Remove a duplicate or fix a note you mistyped
> 

**Questions:**

1. Do you see yourself tracking ALL contacts, or only specific people (close friends, key relationships)?
2. Is mood + notes enough per interaction, or do you want more — topics discussed, who initiated, how long?
3. What's the main goal: not neglecting people, understanding who energizes you, remembering details, tracking patterns?
4. Would you want reminders when you haven't talked to someone in a while, or does that feel too mechanical?
5. What would you do with the "traits" field per contact — is it useful or just nice-to-have?
6. Would you want to see your social life in aggregate (chart of interactions over time)?
7. Do you treat different relationship types differently — friends vs work vs family?

> ✏️ *chamero's answer:
1. Ill track most that i talk to on weekly basis and all important ones such as family or important work people.
2. mood + notes and mabye how they made me feel that interaction
3. rememebnr key details, remember who to befriend or avoid, remembner friends/family birthdays/key events
4. I think so, its awkward but probably beneficial. let me turn it off for certain people or all together with an option somewhere.
5.Traits is very important to rememebr kind or bad people.
6. Sure
7. I dont know.*
> 

---

# 🧩 Big Picture Questions

These are the most important ones. Take your time.

## Grouping

Right now every tracker is individual (Weight, Mood, Sleep, etc. are all separate).

**Would you prefer some trackers grouped into categories?** For example:

- A **"Physical Health"** section that includes Weight + Body measurements + Water + Sleep
- A **"Mind"** section that includes Mood + Meditation + Stress
- Or do you prefer each tracker to be its own standalone thing?

> ✏️ *chamero's answer:
I want health section that includes mental health and physical symptoms i experience everday such as sickkness,injury,depression and so on. 
2. Mind would be fine to combine those. I could also have notes/timeline to show how my general mood is over a few months when i go into depression dips for monhts wihtout motivation then months with more motivation out of nowhere could be visible in big line graph/timeline thing. 
3. Combine Mind section. Keep weight+body measurements together and have Health be its own with what i said above.*
> 

---

## Depth vs Simplicity

For each tracker you can go deep (lots of fields, rich analysis) or keep it light (one input, fast to log). The tradeoff is: **more data = more insights, but more friction = you stop logging.**

**Mark your honest preference for each:**

| Tracker | Keep it simple | Go deep |
| --- | --- | --- |
| ⚖️ Weight | Yes |  |
| 😊 Mood | yes |  |
| 😴 Sleep | yes |  |
| 🏋️ Exercise |  | yes |
| 📚 Book | yes |  |
| 🎮 Gaming |  | yes |
| 🍔 Diet |  | yes |
| 💧 Water | yes |  |
| 🧘 Meditation | yes |  |
| 👥 Social / CRM |  | yes |
| Health(depression,physical pains,injuries,sickness) |  | Yes(correlates with diet/exercise and stuff) |

---

## What trackers feel useless or redundant to you right now?

Is there anything in the current app you never open or don't see yourself using? Be honest — removing or merging things is a valid decision.

> ✏️ *chamero's answer:
Won’t use Water for now. put on backburner*
> 

---

# ➕ Custom Trackers

**Context:** The app lets you create your own trackers using the same types as the built-in ones (number, scale, yes/no, text, or complex/composite).

**In custom trackers I want to: (reference list)**

- Create a tracker for anything not covered by the defaults
- Pick what type of input it uses (number, yes/no, scale, text, complex)
- Define a unit for the value (e.g. "pushups", "pages", "$", "minutes")
- Set a daily goal for it if relevant
- Have it show up in the correlation engine like any other tracker
- See it on the bento grid like any built-in tracker
- Edit or delete the tracker itself (and all its entries)

**Questions:**

1. Is there anything in your life you want to track that the current trackers don't cover?
2. For each custom tracker you'd want — what's the single number that would make it useful?
3. List them out however they come to mind — we'll figure out the structure after:

> ✏️ *chamero's answer:*
> 

---

# 📌 How I will use your answers

Once you fill this out, Panda will:

1. Define the exact data structure for each tracker (what gets saved, what's required, what's optional)
2. Make sure every tracker connects to the correlation engine, detail pages, and history correctly
3. Build a final architecture doc so development is systematic instead of tracker-by-tracker guesswork

**There's no rush — take the time to think about each one. The more specific you are, the better the app gets.**