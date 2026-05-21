# Chimero Habit Flow — Product Specification V5 Final

**Document status:** Final consolidated extraction for implementation.  
**Purpose:** Installable development context/specification for the Chimero Habit Flow app.  
**Source:** Full Discord chat export + visual mockups supplied afterward.  
**Sanitization:** Payment, crypto, wallet, personal scheduling noise, apologies, greetings, repeated admin chatter, and non-product conversation were removed. Product-relevant constraints, preferences, bugs, tracker concepts, UI/UX feedback, technical decisions, and future feature ideas were preserved.

---

## 0. Original Product Seed / First Client Vision

Chimero began as a rough dark dashboard prototype, and this is the root of the whole product. The first Home screen had daily cards for Exercise, Diet, TV, Books, Media, Weight, Tasks, and Gaming. The sidebar had Home, Calendar, and Assets, with a date selector plus previous/next day navigation for moving through days.

The client said only Media and Weight were really working at that stage, including manual/quick entry on the main page. They also wanted more extensive tracking tabs on the side for each mini category so they could see lots of data later. Later systems are expansions of this root, not a replacement for it.

Preserve this principle exactly: “Home = quick daily logging. Sidebar/tracker pages = deeper data later.”

---

## 0.1 Initial Collaboration / Scope Context

This section preserves the product-relevant scope context from the original agreement while excluding payment, crypto, wallet, personal scheduling, greetings, and irrelevant conversation.

The project started from the assumption that the old code/prototype was rough and could be replaced or rebuilt from scratch. The first practical milestone was intentionally small: build a bare-minimum frontend/MVP to confirm communication, direction, and the client’s goals before committing to the full long-term product.

The client preferred step-by-step work with partial progress validation rather than committing everything upfront. The expected workflow was frequent progress updates, screenshots/devlogs, and constant client feedback to avoid long-term misunderstandings.

Initial implementation target:

- Electron desktop app first;
- mobile only later if the Electron version felt good to the client;
- Electron desktop, JavaScript/TypeScript, Tailwind, and SQL/local database as the preferred stack;
- local-first operation on the user’s computer as much as possible;
- local data storage with no cloud/VPS dependency unless a future technical need appears.

This context matters because Chimero should be treated as an evolving long-term personal app, not a fixed one-shot deliverable. The stack details are described later in # 3. Tech Stack and Architecture Direction.

This section exists only to preserve scope and workflow context. The authoritative product requirements remain the tracker, data, UX, architecture, and privacy sections below.

---

## 0.2 MVP Prototype Expectations

This preserves the product-relevant context from the early MVP conversation and screenshots.

The first MVP direction was intentionally simple and practical. The client wanted dark mode from the beginning and quick, easy data entry directly on the Home dashboard.

The first rough prototype used Home, Calendar, and Assets as the main sidebar sections. The Calendar view used category filters such as TV, Exercise, Diet, Media, and Tasks. The Assets page existed so the user could upload pictures/icons for things they would enter later, and the client was mostly uploading assets through clipboard paste.

Asset categories in the rough prototype included TV, Book, Diet, Media, Task, Game, and All. The old prototype had resolution/sizing issues, so responsive layout and avoiding overflow mattered from the beginning. The client explicitly said the developer could come up with a better idea than the old asset implementation.

Media and Weight were the most functional parts of the original rough prototype. This MVP context is the foundation before the later deeper tracker system.

The MVP seed was: dark local dashboard, fast Home entry, basic Calendar review, and Assets for visual item identity.

---

## 0.3 First Frontend MVP Validation

This summarizes the first frontend MVP/mockup validation phase without payment or crypto details.

The first frontend version was a mock/visual structure validation, not final functionality. The client liked it and called it a huge improvement. They clarified the preferred palette as light black/dark grey, not very white, and wanted to pause and think through the foundation because they had many ideas.

The initial validated layout had Home, Calendar, Assets, and Tracking. The sidebar could collapse or expand with a button.

Home had cards for Exercise, Diet, Weight, Tasks, Media, TV, Books, and Gaming. Calendar had category filters. Assets supported upload, drag-drop, click-to-upload, clipboard paste, categories, search, and grid/list controls.

Tracking expanded into Weight, Exercise, Diet, Tasks, Books, TV Shows, Gaming, and Media. The Weight page pattern was summary cards, weight history graph, and weigh-in history. The Exercise page pattern was summary cards, weekly activity chart, and recent workouts. The Diet page pattern was macro cards, macro distribution chart, and meals list.

This established the early reusable pattern: Home overview, Calendar review, Assets identity, and Tracking deep analytics.

The first validated frontend pattern was: Home for daily overview, Calendar for category-based review, Assets for visual item identity, and Tracking pages for deeper per-category analytics.

---

## 0.4 First Expansion Beyond the MVP

This preserves the first moment when Chimero expanded beyond the initial dashboard MVP into a long-term extensible personal tracking system.

After the first frontend MVP, the client explained that they had many more ideas accumulated over years. The first major expansion request was a global Stats page for quantified historical information across trackers, such as last time the user drank alcohol, how many times they drank, how many times they ate a specific food, days worked out, and other similar “everything I can think of” metrics.

The client also wanted a way to create custom trackers from a blank format. Example use case: tracking how many times they cleaned their room. The proposed direction was a system where new widgets/cards or tracker components could be created or integrated without rebuilding the app each time, reducing future development time and allowing the app to grow over months or years.

The user should be able to choose card/widget types, move them freely, and potentially configure size, layout, and details. Example future use case: if the client starts fishing, they could create a tracker for how many fish they catch, where they went fishing, and related details. Custom cards/widgets may include configurable fields such as image, description, title, counter, time, and other structured data.

The client liked this direction but raised an important concern: some main trackers may still need to remain separate and specialized because they are too complex to be fully covered by generic custom trackers. This reinforces the product principle that generic custom trackers are required, but complex default trackers still need specialized pages and logic.

### Mood Tracker Seed

- Mood should be a default/specialized tracker.
- It may use a 1–10 rating system.
- The user should be able to enter mood multiple times per day.
- The tracker should calculate average mood for each day.
- The tracker should track low and high mood for each day.
- It should include statistics views.

### Social Tracker Seed

- Social should track who the user talked to each day.
- It should track how the interaction happened, such as call or text.
- This later evolves into the deeper Social CRM/contact-memory system already documented elsewhere.

### Correlations Page Seed

- The client requested a correlations page.
- It should show relationships such as low mood days after drinking, happy mood after lots of social contact, and similar cross-tracker patterns.
- This is the earliest explicit seed of the correlation engine.

This is the point where Chimero evolved from a fixed dashboard into an extensible personal analytics platform: global Stats, Custom Trackers, specialized Mood/Social trackers, and cross-tracker Correlations all begin here.

---

## 0.5 First Real Functional Milestone: Assets, Local Storage, and Layout

This preserves the first point where the project moved from visual MVP/mockup into a real functional milestone.

At this stage, the desktop application already existed as a working shell. Styling was still temporary and plain because the focus was functional structure first, not final visual polish.

The Assets system was the first major real feature described as fully functional. Assets were stored locally, reinforcing the requirement that the app should work from the user’s own device and avoid external services as much as possible. The Assets page supported common image formats such as JPG, PNG, SVG, and similar local visual assets.

Asset input methods included Ctrl+V/clipboard paste, drag and drop, and selecting files from folders. Uploaded or pasted assets were transformed so they could be stored locally. A staging/autosave-oriented UX existed so the app would not run or commit processes without the user’s permission.

This matters because Assets are not just decorative; they support visual identity for tracked items such as media, games, books, TV, food, contacts, and custom tracker entities. The app already had tracking views intended to show graphs or data for each tracker, and the Home screen already existed as a quick-glance daily overview.

This milestone reinforces the product pattern: local-first assets, quick-glance Home, and deeper tracking views.

The first real functional milestone validated that Chimero’s foundation should be local-first: assets, tracker data, and daily dashboard behavior should work primarily on the user’s device without unnecessary external services.

### Early Correlations Foundation Reminder

The client again reminded that the Correlations page did not need to be done immediately, but it might require foundational work early. The examples remained low mood days after drinking and happy mood after lots of social contact.

This means the database and tracker design should preserve correlation-ready structured data from the beginning, even before the Correlations UI is built.

---

## 0.6 First Mood/Social + Custom Layout Phase

This phase captured the first Mood/Social tracker work alongside the custom layout and custom tracker direction.

### Current Technical Debt From This Phase

The current Custom Tracker system should not be treated as production-ready. It exists as an early experimental foundation attempt, but its design is currently weak and needs serious redesign/refactor.

Many trackers currently behave like generic `entry.tracker` records that only store a simple value, often just a number or shallow input. This is not sufficient for the product vision because important trackers need specialized schemas, structured fields, analytics, relationships, tags, assets, and correlation-ready data.

The current Custom Tracker system does not fully solve the intended goal of letting the user create meaningful future trackers. The boundary between generic custom trackers and specialized default trackers needs to be redesigned.

Generic custom trackers should support configurable schemas, field types, widgets, layouts, tags, assets, and analytics hooks. Specialized trackers such as Mood, Social, Food/Diet, Health, Vitamins/Medications, Exercise, Weight, Books, Gaming, Media/TV, and Tasks should not be reduced to shallow generic entries.

The current custom tracker implementation is a major technical and product debt area and should be reviewed before building too many new features on top of it.

The Custom Tracker system must be redesigned as a real schema/widget/analytics system, not just a generic entry wrapper. Otherwise, it will block the long-term product vision.

Technical debt notes:

- Custom Tracker system is currently poorly designed and not production-ready.
- Current tracker entries are too generic/shallow.
- Tracker-specific schemas are needed.
- Custom trackers need a real schema builder or configurable field system.
- Generic trackers and specialized trackers need clear separation.
- Future analytics/correlations depend on fixing this foundation.

---

## 0.7 Advanced Statistics, Quick Entry, and Privacy-First Correlations

This phase clarified that the app needs deeper functional analytics beyond the custom tracker system, and that quick entry, glanceability, and privacy are core product requirements.

The client explicitly still wanted a Stats Page / Advanced Statistics system. They were unsure whether everything they wanted could fit inside Custom Trackers, and suggested the Stats Page may need to be different from or above Custom Trackers.

The Stats system should keep track of arbitrary life metrics and allow the user to see numbers and historical facts across trackers. Examples requested include total eggs eaten, eggs eaten weekly, eggs eaten yearly, total weights lifted in kg/lbs, last time the user ate fast food, last time the user ate tacos, days since a specific food/activity/event, and similar retroactive historical queries.

The client’s main concern was foundation: they wanted to know whether this kind of information could be found or calculated easily with SQL later, or whether the app needed to specify and store more structured data from the beginning. This reinforces that the database must support retroactive queries and should not rely on shallow generic entries.

### Quick Entry Usability Concern

The client liked the look but needed it to be more functional. A simple `+` button felt potentially tedious if it opened an empty form every time. The desired direction was a popover or screen where the user can quickly select past entries, most-used entries, or common items.

Quick entry should prioritize fast daily logging and avoid repetitive manual input.

### Visual Glanceability Requirements

Social interactions should use small bubbles. Contacts with no image should use letters or initials. Contacts with images should show the image. TV and Gaming should use small squares, icons, or assets so the user can tell what they did at a glance.

This was described as the end goal even if assets were not available yet.

### Sidebar Priority

Assets and Custom Trackers should be moved toward the bottom of the sidebar because they are less used day-to-day. They should sit near or above the streak counter or lower navigation area.

This reinforces that daily-use pages should be prioritized higher in navigation.

### Privacy-First Correlation Direction

AI-based pattern detection was discussed as a possible future idea, but the client preferred privacy-oriented behavior. The client did not want private life data fed into external AI by default.

The client asked whether simple or statistical correlations could solve the problem instead of AI. The system should prefer local deterministic/statistical correlation logic over cloud AI or hallucination-prone model output. A self-hosted or local AI could be considered only as an optional future idea, not the baseline architecture.

Advanced statistics and correlations must be designed into the data foundation early. The app should store structured, queryable data so the user can ask historical questions later without relying on external AI.

---

## 0.8 First Custom Layout Implementation and Early Technical Debt

This phase marked the point where the frontend was no longer only a static mockup; several systems were visually and partially functionally present.

The app had a working dark layout with sidebar navigation, collapsible sidebar behavior, Home, Calendar, Assets, Custom Trackers, and Tracking sections. The Tracking section included built-in tracker pages such as Weight, Exercise, Diet, Tasks, Mood, Social, Books, TV Shows, Gaming, and Media.

The Reading/Books tracker had an individual page with summary cards such as Books Completed, Current Progress, Currently Reading, Recently Finished, and Reading Time. The Tasks tracker had an individual page with cards such as Completed, In Progress, All Tasks, Today’s Tasks, and High Priority.

The Assets page had a more complete workflow: large upload area, asset preview, asset name field, category dropdown, Add Asset, Cancel, category filters, search, and grid/list controls. Asset categories included Games, Books, TV & Movies, Apps & Media, and Other.

The Custom Layout system was described as finished at a basic level, while the Custom Tracker/Custom Widgets system was still only partially working and needed tweaks. Some views still had placeholder errors or placeholder content. The developer planned to implement the custom tracker and custom widgets system across other views and then polish individual tracker pages.

The frontend and some systems such as Assets and Bento/Grid were working enough to demonstrate direction, but not enough to be considered production-polished.

The early Custom Layout/Bento Grid implementation validated the customizable dashboard direction, but it must be hardened before being used as a core production foundation.

### Local Statistical Correlations Decision

Around this phase, the decision was clarified that instead of using an external AI model, the app should prefer advanced statistical algorithms for pattern detection. This decision was driven by the client’s privacy concerns.

The app should keep correlation logic local-first and deterministic where possible. AI may remain a future optional or self-hosted idea, but it should not be the baseline.

### Tasks Backburner Feature

The client suggested a task feature: add a button to move a task to tomorrow’s tasks. The task should still remain visible on the previous day.

The previous-day task should be highlighted with a different color or state to indicate it was postponed rather than completed. This was explicitly considered non-urgent and backburner, but should not be lost.

### Technical Debt Introduced Here

The Custom Layout/Bento Grid worked as an early implementation, but should not be treated as final. The current Bento/Grid UX needs a serious production polish pass.

Problems to review include:

- drag/drop behavior;
- card positioning;
- collision handling;
- resizing;
- responsive behavior;
- persistence;
- awkward empty grid slots;
- placeholder cards;
- interaction clarity;
- visual polish;
- whether the system feels good for real daily use.

The Custom Tracker/Custom Widget system was still immature and not fully reliable. The fact that the UI works does not mean the layout system is production-ready.

This phase should be treated as the first major point where the project gained real frontend functionality but also accumulated important UX and architecture debt.

---

## 0.9 Phase 2 Plan: Logic, Persistence, and Reality Check

> This section documents the intended Phase 2 implementation plan. It should not be treated as proof that the current codebase already satisfies these requirements. Each item must be audited against the current implementation and marked as Done, Partial, Missing, or Broken.

Phase 2 was the intended shift from frontend/demo shell toward real persistence, structured data, and correlation-ready logic.

### Local Database Implementation

- Local database implementation was considered high priority.
- The database must support retroactive queries such as:
  - “last time I ate tacos”;
  - “how many eggs did I eat in 2024”;
  - “how many times did I eat a specific food”;
  - “days worked out”;
  - similar long-term historical queries.
- Simple flat JSON or shallow generic value storage is not enough.
- The database should store granular structured data.
- Example structure:
  - item: Taco
  - tags: Fast Food, Mexican
  - quantity
  - timestamp/date
- Goal: ensure tracker data can support historical search, statistics, and future correlations.

### Connect UI With Real Logic / CRUD

- Trackers such as Weight, Mood, and Social were still using mock or shallow data at this phase.
- Planned work was to connect tracker UI to real local persistence.
- Clicking Save in a tracker should write to the local DB.
- Charts should read from real persisted data instead of fixed arrays/mock data.
- Entries should support CRUD behavior: create, read, update, delete.

### Smart Quick Entry

- The `+` button was considered too tedious if it only opened an empty form.
- Planned behavior: open a popover/menu/screen with:
  - recent entries;
  - frequent entries;
  - favorites/history;
  - one-click logging.
- This should reduce repetitive manual input.

### Visual and Navigation Adjustments

- Assets and Custom Trackers should move to the bottom of the sidebar because they are less used day-to-day.
- Social contacts without images should display initials in circular bubbles.
- Gaming and TV should use small colored squares, icons, or assets for glanceability on dashboard cards.

### Advanced Statistics / Correlations

- A first version of the Advanced Statistics / Correlations page was planned.
- It should use local statistical logic rather than external AI.
- Examples:
  - low mood after alcohol;
  - happy mood after lots of social contact;
  - frequency, averages, streaks, and simple correlation patterns.

### Tasks Backburner Item

- A task can be moved/postponed to tomorrow.
- It should still remain visible on the previous day.
- It should be highlighted differently to indicate postponed instead of completed.
- This was explicitly lower priority/backburner, but should not be lost.

### Week 1 Baseline Mentioned At This Point

The baseline described at this point was:

- application skeleton;
- Custom Tracker system able to define new trackers, but not necessarily production-ready;
- default trackers such as Weight, Mood, Social using mock/simple data;
- Assets View;
- General Dashboard/Home;
- Custom Layout Engine / drag-and-drop grid system;
- dark-mode/purple-accent direction.

This baseline should be treated carefully: these systems were described as the starting point for Phase 2, not as complete or production-ready.

Phase 2 is the point where the project should stop being only a frontend/demo shell and begin proving real persistence, CRUD, structured data, smart quick entry, and correlation-ready architecture.

### Required Code Audit For This Phase

Each item should be checked in the current codebase and marked as:

- Done
- Partial
- Missing
- Broken

Checklist:

- Local DB exists and is actually used.
- Entries persist across app reloads.
- Tracker entries are structured, not only generic shallow values.
- Weight tracker reads/writes real DB data.
- Mood tracker reads/writes real DB data.
- Social tracker reads/writes real DB data.
- Charts use real persisted data.
- Entry CRUD exists.
- Quick Entry shows recent/frequent/history items.
- Quick Entry supports one-click logging.
- Sidebar priority/order matches the client request.
- Social initials bubbles exist for contacts without images.
- Gaming/TV visual icons or squares exist.
- Stats page exists.
- Correlations page or logic exists.
- Correlation logic is local/statistical, not external AI.
- Task postpone-to-tomorrow exists.
- Custom Tracker system is production-usable.
- Bento/Grid layout is production-usable.
- Assets system persists local assets and supports clipboard/drag/drop/file select.

---

## 0.10 Testable MVP, Technical Consolidation, and Current Reality Risk

> This section documents a stabilization/consolidation phase. It must not be interpreted as proof that all listed systems are complete. Some items were described as fixed or architecturally improved at the time, but the current codebase must be audited to verify whether they are Done, Partial, Missing, or Broken.

This phase marks the shift from visual/frontend demo toward a testable application, while also increasing uncertainty about what was truly complete versus only visually present.

### Testable MVP / Repository Handoff Stage

- Around this phase, the goal shifted from showing screenshots/videos to giving the client a version they could actually run and test.
- The app was shared through a GitHub repository / downloadable code flow.
- The client could run a web/dev version and eventually an Electron desktop version.
- The code was acknowledged as still prone to bugs and expected to improve through commits.
- This stage should be treated as a testable MVP, not a polished final delivery.

### Bug-Fixing and Backend/Data Management Phase

- Several updates focused on fixing backend/data-management bugs.
- Internal data manipulation and management had been weak and needed improvement.
- Pending issues at that stage included:
  - individual visualization of each tracker;
  - frontend/backend management of custom trackers;
  - data management;
  - incomplete calendar functionality;
  - overall UX polish;
  - data consistency across views.
- This confirms the app had meaningful foundations, but many systems still required validation and polish.

### Client Testing Feedback

The client tested and reported:

- unable to run the Electron app at one point;
- web version could load;
- overflow issues made trackers hard to see;
- compile/render time around 500ms felt delayed;
- tracker switching felt sluggish;
- the focus should be getting the current version working and polished before adding many new features.

### Performance Concern

- 500ms interaction/compile/render delay was explicitly considered not normal.
- Performance and responsiveness should be treated as real product requirements.
- Tracker switching, dashboard interactions, quick entry, and layout changes should feel fast.

### Technical Consolidation Phase

- A Technical Consolidation Phase was proposed because the prototype had accumulated technical debt.
- The reason was that the MVP had been built quickly, and continuing on the same structure would limit scalability and performance.
- The intended benefits were:
  - better performance;
  - fewer errors;
  - clearer code logic;
  - easier maintenance;
  - faster future feature development;
  - stronger foundation.
- The consolidation was intended as a controlled refactor, not a full restart.
- The goal was to preserve what worked while strengthening unstable frontend/backend foundations.

### Architecture Migration Claim

- Around this stage, the project was described as having moved from Next.js + Electron to Vite + Electron.
- The architecture was described as cleaner and more optimized.
- The codebase was described as having fewer or no mock files.
- However, this claim must be audited against the current codebase before being trusted.
- Even if the architecture improved, the app could still have shallow tracker models or incomplete product systems.

### Linux / Arch / Wayland Compatibility

- The client tested on Arch Linux and mentioned primarily using Wayland.
- A startup error occurred:

  `Error: Path must be absolute`

- The issue was identified as a routing/path problem on the developer side.
- Windows tolerated relative paths, while Linux/Mac required absolute paths.
- This created a real platform requirement:
  - use absolute paths where required;
  - test Electron on Linux;
  - consider Arch/Wayland behavior;
  - ensure custom window/titlebar behavior works cross-platform.

### Post-Consolidation Client Issues

The client later reported:

- the app looked pretty good;
- the title bar/window could not be grabbed or moved;
- creating a custom tracker overflowed vertically so top/bottom controls were not visible;
- assets did not ask clearly what type/category they belonged to;
- adding an asset did not populate correctly for a social person;
- Social was missing as an asset category;
- Wayland may be relevant to window behavior.

These should be kept as product and technical requirements, not treated as minor comments.

### Custom Tracker Modal Reality

- The Custom Tracker UI existed visually with fields such as:
  - tracker name;
  - icon selection;
  - color selection;
  - tracker type;
  - Counter;
  - Rating;
  - List;
  - unit;
  - daily goal.
- However, the existence of this modal does not prove the Custom Tracker system is production-ready.
- The current Custom Tracker system should be audited carefully because it may be shallow, unreliable, or poorly designed internally.
- The design should support real configurable schemas and not just simple numeric entries.

### Current Reality Risk

The project has a recurring risk: the UI can look feature-rich while the underlying systems remain shallow, mock-like, or only partially connected. Future work must distinguish between:

- screen exists;
- component renders;
- form accepts input;
- data persists;
- data has a structured schema;
- data supports edit/delete;
- data supports analytics;
- data supports correlations;
- UX is production-ready.

“A visually present tracker is not automatically a completed tracker. Every tracker must be evaluated by persistence, schema quality, CRUD, analytics readiness, correlation readiness, and production UX.”

### Required Audit After This Stage

Each item should be checked in the current codebase and marked as:

- Done
- Partial
- Missing
- Broken

Checklist:

- Electron app runs on Linux/Arch.
- Electron app works properly under Wayland.
- Window/titlebar can be moved.
- Path handling is cross-platform safe.
- Vite + Electron architecture is actually active.
- Old Next.js/Electron assumptions are removed.
- Tracker switching is performant.
- 500ms lag is gone.
- Calendar is functional and not just visual.
- Individual tracker pages are functional.
- Custom Tracker modal does not overflow.
- Custom Tracker system creates usable trackers.
- Custom Tracker system supports more than shallow numeric values.
- Custom Tracker data persists.
- Custom Tracker schemas are configurable.
- Assets ask for category/type clearly.
- Assets can be assigned to Social contacts.
- Social exists as an asset category.
- Assets persist locally.
- Data consistency exists across views.
- Mock data has been removed or clearly isolated.
- Bento/Grid is production-usable.
- Tracker entries are structured enough for future stats/correlations.

---

## 0.11 Quick Entry Shortcut and Modal Layout Refinement

This section captures the first concrete UX refinements requested for Quick Entry after the app became testable.

The client requested changing the Quick Entry shortcut to `Alt + Q`, confirming it as the intended keyboard shortcut for opening Quick Entry. The trigger should be visible and understandable in the UI, and Quick Entry should remain keyboard-friendly and optimized for fast daily logging.

### Quick Entry Modal Layout

The client disliked the tracker picker being a long vertical list because it required too much scrolling and wasted space. The preferred layout is side-by-side / horizontal grouping so more tracker options are visible at once.

Recent trackers and items should be displayed in a compact layout. The modal should avoid unnecessary vertical scrolling when the same content can be shown side-by-side. Tracker options should remain easy to scan visually through icons, labels, and type subtitles such as Counter or Range.

This applies especially to the “Log Activity” tab where the user chooses a tracker or activity to log.

### Related UX Fixes Mentioned In This Phase

Window management and titlebar behavior needed more flexible handling. Responsive details needed improvement. Asset and resource UX needed improvement because automatic file type detection alone was not enough, and the Assets window had missed details that required proper review.

Wayland behavior should be considered because the client uses Arch/Wayland. The developer planned to compare the app’s current state against the conversation requirements and identify remaining tasks.

“Quick Entry must minimize friction: `Alt + Q` should open a compact, keyboard-friendly modal where common trackers and recent/frequent options are visible without unnecessary scrolling.”

---

## 0.12 Deep Tracker Views, Social CRM Expansion, Exercise DB, and Timeline

> This section documents product requirements and mockup intent. It does not confirm current implementation status. Do not treat visual presence as completion.

### Deep Tracker Detailed Views

- The client wanted deeper analytics and graphs under the `Tracking` dropdown / individual tracker detail pages.
- Tracker detail pages should help the user easily visualize month, 3-month, year, and other useful time ranges.
- The priority is “gleaning information from a glance.”
- Tracker pages should not be shallow input screens; they should contain meaningful statistics, charts, tables, entries, and history.
- The client likes line charts, tables, numeric statistics, summary counters, and “days since” metrics.
- Examples:
  - books read this year: 34;
  - books read this week: 1;
  - days since reading a book: 3.
- Important trackers such as Books, Gaming, Media, and Diet must exist and should not be accidentally removed or hidden.

### Tracker Entries CRUD / Fast Editing

- Tracker entries were described as cumbersome.
- Entries should support remove/edit options.
- Suggested UX: holding Shift could reveal trash/edit buttons, similar to Discord message actions.
- `Enter` should add/submit an entry.
- This reinforces that tracker data needs real CRUD, not only create-only logging.

### Context-Aware Quick Entry Inside Tracker Pages

- If the user is inside a specific tracker page, pressing `+` or `Alt + Q` should default to that tracker.
- Example:
  - If the user is in the Weight page, `+` or `Alt + Q` should open Add Weight directly.
- The user should not need to reselect the tracker they are already viewing.

### Social Tracker / CRM Expansion

- Social should use profile-picture bubbles similar to Discord.
- If a person has a photo, show the photo.
- If no photo exists, show initials/letter bubbles as placeholders.
- The user should be able to select people from bubbles.
- If the desired person is not visible, the user should be able to search.
- Multi-selecting bubbles should be supported for faster daily social entries.
- The client wanted three possible mood-impact states per selected person: Positive, Negative, Neutral.
- Earlier wording included “improved,” “lowered,” or “neutral” effect on mood.
- Possible fast interaction idea:
  - Shift + left click = positive;
  - Shift + right click = negative;
  - Shift + middle mouse button = neutral.
- This is a proposed interaction concept, not necessarily final UX.

### Social Contact Profile Page

- Clicking a person’s bubble should open a page/detail view for that contact.
- The contact page should allow the user to fill out and see birthday, age, date met, date last talked to, traits, labels such as honest/rude or similar custom traits, and other important personal information.
- The client suggested a customizable grid where they can enter headers and info into boxes, then drag them around like the Home page.
- This reinforces that Social is not just a counter; it is a personal CRM / memory system.

### Social Quick Entry Sketch

- The client provided a rough sketch showing a Social quick-entry style selector.
- The mockup implies a compact modal or panel, contact bubbles arranged in a grid, multi-selection, visual feedback for selected people, and a confirmation checkmark/button.
- The developer may improve the design, but the core intent is speed and low-friction social logging.

### Exercise Tracker / Exercise Database

- The client suggested using `yuhonas/free-exercise-db`.
- Purpose: implement a searchable public exercise dataset and provide a fancy UI for selecting workouts performed.
- Exercise tracker should support selecting workouts and exercises from a rich database-style UI.
- This should eventually feed exercise statistics, workout history, and correlations.

### Calendar Timeline Page

- The client requested a new page under Calendar called `Timeline`.
- The Timeline should allow selecting and deselecting categories, similar to Calendar filters.
- Main purpose: see what months the user was watching a show, see what months the user was playing a game, and visualize periods or eras of activities over time.
- Timeline is not just a calendar; it is a life-period visualization tool.

### Timeline Mockup Intent

- The provided timeline reference shows a horizontal time axis, year/month scale, event blocks above and below the line, category colors, arrows connecting events to dates, and a legend/category code.
- In Chimero, this should translate to category-colored life events, tracker-derived periods, filterable categories, activity/media/game/show periods, and long-term review.

### Tracker Tabs / Detailed View Mockups

- The client provided rough mockups for how trackers should be formatted with multiple tabs.
- Tabs should likely include Statistics, Graphs, Entries, and possibly Insights or future tabs.
- Statistics and Graphs are separate concepts:
  - Statistics = numbers, averages, comparisons, summaries.
  - Graphs = visual charts, lines, heatmaps, distributions, timelines.
- The Mood mockups specifically show a Statistics tab, a Graphs tab, an Entries tab, and possible placeholder or future tabs.
- Mood Statistics examples include average mood this month, average mood this year, mood change from last month, mood change from last year, average mood entries per day, averages for today/week/month/year, and period-to-period percentage changes.
- Mood Graphs examples include line charts, stacked line charts, daily/weekly/monthly/yearly filters, and a heatmap/calendar-style mood tracker.

“Tracker detail pages should become mini-apps: each major tracker needs Statistics, Graphs, Entries, fast CRUD, and tracker-specific interaction patterns instead of being reduced to generic value logs.”

---

## 0.13 Tracker Design Discovery / Notion Planning Phase

> This section documents a discovery/planning source, not a final technical contract. The Notion tracker discovery page and client answers should be treated as raw product discovery material. They must be reinterpreted into proper tracker contracts, data schemas, request/response flows, read models, and implementation plans before coding.

### Why This Phase Happened

- After Social CRM and Exercise became more advanced, the rest of the trackers felt too basic in comparison.
- The developer realized the main gap was not just UI polish, but data flow.
- Chimero is fundamentally a data-control system, and unclear data flow creates bottlenecks across the whole app.
- Several trackers were only half-finished, only planned, or implemented as shallow/simple inputs.
- Book, Gaming, Diet, and similar trackers were behaving too much like single-input logs.
- The history/entries view risked becoming more like a diary than structured tracker data.
- The correlation system cannot work properly if trackers only store shallow values or generic entries.
- Continuing to code without clarifying tracker data would mean stacking features on top of a weak foundation.

### Notion / Tracker Design Discovery Purpose

- A Notion page was created to help the client organize many tracker ideas.
- The goal was to ask, tracker by tracker:
  - what should be tracked;
  - what should be displayed;
  - what should be analyzed;
  - what should be correlated;
  - how deep or simple each tracker should be.
- The client was told they did not need to follow a perfect format and could answer naturally.
- The Notion contained reference lists, examples, and questions for each tracker.

### Important Limitation

The Notion page should not be treated as a clean final architecture document. It was partially AI-generated and did not properly follow the project’s later architecture discipline, such as request/response flows, contracts, read models, tracker-specific schemas, or implementation boundaries.

The client’s answers inside the Notion are valuable, but the surrounding structure may be noisy, overbuilt, unclear, or not directly usable.

Therefore:

- preserve the client’s answers;
- preserve crossed-out/rejected items;
- preserve comments and preferences;
- but do not blindly implement the Notion structure as-is;
- convert it into proper tracker contracts before implementation.

### Client’s Explicit Tracker Preferences From Notion

#### Weight

- Pounds/lbs should be default.
- Weight should be switchable to kg or lb/kg.
- Weight is primary.
- Basic waist measurement is useful.
- Target weights should be supported.
- Logging is expected daily, once every morning.
- Green/red visual feedback is motivational:
  - green when losing weight toward goal;
  - red when not progressing.
- Streak-like feedback for loss/neutral streaks is useful.
- Food tags such as cheat day or very bad food should be usable in weight correlations.

#### Mood

- Mood may be better represented with red/orange/yellow/green colors rather than only numbers.
- User may log mood 3–10 times per day.
- Before-work vs after-work split is important.
- Causes/tags are useful for major moods, but most entries may have no cause.
- Useful detail page: line graph going up/down and peak/low of day/week/month.
- Mood should be interconnected with everything.

#### Sleep

- Track hours slept.
- Track bedtime and wake time.
- Track subjective sleep quality.
- Track dreams/nightmares, number of wakes, bathroom wakes, etc.
- Useful view: hours slept over past week and quality.
- Sleep should remain relatively simple but correlation-capable.

#### Exercise / Gym

- User likes exercise search but wants personal workout presets/routines.
- Main training type is lifting.
- Presets should be configurable, such as “Full Body 1.”
- A preset should auto-select several workouts and expected sets/reps.
- While logging, the user should be able to adjust reps/sets from the preset.
- Saved routines/presets are important.
- Desired UX: select a saved routine and see workout cards side-by-side with reps/sets and +/- controls.
- Popout/modal flow may not be ideal for this tracker; an integrated page may be better.
- Walking/daily steps may be tracked later.

#### Book

- User wants to log when they started a book, days they read some of it, and the date finished.
- Tracking pages read per session is too much friction and likely will not be used.
- Books should support rating 1–5 stars, including decimal tenths such as 3.1, 3.2, 3.3.
- Useful outputs: reading streaks, books read per week/month, separate shelves.
- Separate shelves are preferred: Reading, Finished, Want to Read.

#### Gaming

- User wants games played each day, estimated hours played, and correlations with mood and other trackers.
- User plays several games but often only 1–2 types per month.
- Certain games should support wins/losses because wins/losses may correlate with mood.
- Desired insights: X game makes mood lower; Y game with losses makes mood lower; Z game improves mood.

#### Diet / Meals

- Main goal is logging foods eaten, not necessarily full calorie/macro tracking.
- Food tags and ingredients are important.
- Certain ingredients should correlate with Health tracker symptoms such as allergy or inflammation.
- Diet is connected to health symptoms, fitness goals, and general awareness.
- The client already logs everything eaten daily, including specific foods/ingredients like potato chips, beef, spices, etc.
- Diet should be tag/ingredient/correlation-first.

#### Water

- Water is not currently important.
- Put Water on backburner for now.

#### Meditation

- User wants meditation to remain relatively basic.
- Track meditation days, streaks, length, and small tags about how it made them feel during/after.
- No app is used.
- Meditation is not a top priority.

#### Social / Personal CRM

- User will track most people they talk to weekly and all important people such as family or important work contacts.
- Per interaction, mood + notes are useful.
- Also track how the person made the user feel during that interaction.
- Main goals: remember key details, remember who to befriend or avoid, and remember friends/family birthdays and key events.
- Reminders for not talking to someone may be useful, but should be optional and disabled globally or per contact.
- Traits are very important for remembering kind or bad people.
- Aggregate social charts are useful.
- Relationship types such as friends/work/family may matter, but the client was unsure.

#### Health / Grouping

- The client wants a Health section that includes mental health and physical symptoms experienced daily, such as sickness, injury, depression, and similar.
- A Mind section can combine mood/meditation/stress-style data.
- User wants notes/timeline to show general mood over months, including depression dips and motivation changes.
- Big line graph/timeline views are useful for long emotional periods.
- Keep Weight + body measurements together.
- Health should be its own section for physical/mental symptoms as described.
- Water is backburner.
- Health should go deep and correlate with diet/exercise and other trackers.

#### Depth vs Simplicity Preferences

- Weight: simple
- Mood: simple
- Sleep: simple
- Exercise: deep
- Book: simple
- Gaming: deep
- Diet: deep
- Water: simple/backburner
- Meditation: simple
- Social / CRM: deep
- Health: deep

### Tag System Discovery

- After the Notion, the client described the overarching structure as some type of tag system.
- Food diary should support tags like “bad food,” “healthy food,” “ice cream,” etc.
- Tags should be referenceable by Mood and Weight as reasons for changes.
- User should be able to create tags as needed.
- Parent tree structure is important.
- Example:
  - Beef as a parent tag;
  - Tacos, Burger, Spaghetti count as themselves and also count under Beef.
- A small Tags page/tab should allow creating tags and relationships between tags.
- This gives the most long-term data.
- Health can use custom symptom tags like cold, flu, light coughing, allergic rash.
- System could later identify patterns such as days after eating Wheat being more likely to have cold symptoms.
- This should be treated as a core data model requirement, not a minor feature.

### Vitamins / Medications

- The client also requested a Vitamins/Medications tracker.
- They consistently track vitamins and rarely track medications.
- This tracker should support parent structure because Vitamin D may come from different companies and may contain additional ingredients.
- Vitamins/Medications are important for correlations with Health symptoms and Mood.

### Social Additional Discovery

- Contacts page should sort ascending/descending by who the user talks to most.
- Selecting a contact should open a contact page.
- Contact page should let the user enter/edit birthday, likes, dislikes, misc notes, kids/no kids, and similar details.
- Purpose: remember birthdays and personal details to show care.

### Required Next Step After Notion

“The Notion discovery is valuable as user research, but it must be converted into clean tracker-specific product contracts before implementation. Do not code directly from the Notion structure.”

For each tracker, create:

- tracker purpose;
- expected user input;
- required fields;
- optional fields;
- quick-entry behavior;
- bento widget behavior;
- detail page tabs;
- statistics;
- graphs;
- entries/history behavior;
- edit/delete behavior;
- tags;
- assets;
- correlations;
- persistence/schema requirements;
- request/response or IPC contract if applicable;
- read models for UI surfaces;
- what should remain simple vs deep.

---

## 0.14 Tag System, Social CRM Detail Tabs, and Vitamins/Medications Expansion

> This section documents product requirements and planning context, not confirmed implementation status. Do not assume these systems are complete until the codebase is audited later.

### Global Tag System As Core Structure

- The client described the overarching structure as some type of tag system.
- Tags should not be treated as minor labels; they are central to long-term data and correlations.
- In the food diary, the user wants to log tags such as bad food, healthy food, ice cream, ingredient tags, and custom tags added as needed.
- Tags should be referenceable by other trackers such as Mood and Weight as possible reasons for changes.
- The user should be able to create tags as needed over time.
- Parent/child tag relationships are important.
- Example:
  - Beef is a parent tag.
  - Tacos, Burger, and Spaghetti can count as themselves while also counting under Beef.
- The same idea applies to Wheat/trigo and foods containing wheat.
- A dedicated small tab/page should allow the user to add tags, edit tags, define relationships between tags, assign parent/child relations, and visualize or understand tag relationships.
- This tag system is especially important for long-term data quality and correlations.
- The tag relationship graph should be treated as one of the core data architecture systems.

### Food → Health Correlation Through Tags

- The tag system mainly assists the Health tracker.
- Health should support custom symptom tags such as cold, flu, light coughing, allergic rash, inflammation, allergy symptoms, and other symptoms the user creates later.
- Food tags should be usable in Health correlations.
- Example desired insight: “Days after eating Wheat are more likely to have cold symptoms.”
- The system should be careful not to overstate causation. Use cautious correlation language.
- This reinforces that tracker entries must be timestamped, structured, taggable, and queryable.

### Social CRM: Contacts Page + Contact Detail Page

- Social CRM should have a Contacts page/tab that shows all contacts.
- The Contacts page should support sorting ascending/descending by who the user talks to most.
- Contacts should be selectable from bubbles/cards/list.
- Selecting a contact should open that contact’s individual page/detail tab.
- The individual contact page should allow viewing and editing birthday, likes, dislikes, misc notes, whether they have kids, important personal details, traits, and contact history/interaction context if available.
- Purpose: remember birthdays, remember personal details, show care, remember who to befriend or avoid, and preserve relationship memory.
- This reinforces that Social is not just a counter; it is a personal CRM/memory system.

### Social Tab Structure

- Social should likely have separate tabs or views for all contacts, selected contact detail, statistics, graphs, entries, and insights/future correlations.
- The mockups imply a distinction between “Contactos” / all contacts and “contacto seleccionado” / selected contact profile.
- The all-contacts view should prioritize quick scanning and selection.
- The selected-contact view should prioritize memory/detail editing.

### Vitamins / Medications Tracker

- Add a Vitamins/Medications tracker as an important future/default tracker.
- The client consistently tracks vitamins.
- Medications are tracked less often but still need to be supported.
- The tracker should support parent/variant structure.
- Example:
  - Vitamin D as a parent item;
  - Vitamin D from Company A;
  - Vitamin D from Company B with extra ingredients;
  - Vitamin D + K2 or other ingredient combinations.
- Parent structure is important because multiple products may count under the same parent vitamin/medication.
- Vitamins/Medications should correlate with Health symptoms, Mood, side effects, and possibly Energy/Sleep if those trackers exist.
- This tracker should support item name, parent item, brand/company, dosage, unit, time taken, extra ingredients, notes, tags, and optional reason taken.

The tag system is a foundational architecture requirement. Food, Health, Vitamins/Medications, Mood, Weight, and Social all depend on structured tags and relationships if the app is going to produce useful long-term correlations.

### Implementation Caution From This Phase

- This phase followed another period where implementation became unstable and unclear.
- The client’s new requirements should not be layered onto weak tracker/custom-tracker foundations without proper contracts.
- Before implementing Tag System, Social CRM detail pages, or Vitamins/Medications, the app needs clean tracker contracts, schemas, request/response flows, and read models.
- Do not blindly wire these features into the existing shallow `entry.tracker` style model.
- These features should be designed as structured systems.

---

# Codex - Chat Interpretations

---

## How to install/use this spec in the repo

Recommended path inside the project:

```txt
chimero-habit-flow/
  docs/
    product/
      CHIMERO_PRODUCT_SPEC_V5_FINAL.md
      assets/
        01_social_contacts_grid.png
        02_social_selected_contact_profile.png
        03_food_tag_relationship_graph.png
        04_mood_graphs_view.png
        05_mood_statistics_view.png
        06_timeline_reference.png
        07_social_multiselect_bubbles.png
        08_quick_entry_layout_reference.png
```

Suggested command from the repo root:

```bash
mkdir -p docs/product
cp -r CHIMERO_PRODUCT_SPEC_V5_FINAL.md assets docs/product/
```

When using AI coding tools, paste this instruction:

```txt
Use docs/product/CHIMERO_PRODUCT_SPEC_V5_FINAL.md as the authoritative product requirements document for Chimero Habit Flow. Do not treat the app as a basic habit tracker. Treat it as a local-first personal analytics, memory, tracker, correlation, and life-dashboard system. Preserve quick-entry UX, deep tracker pages, tag relationships, social CRM behavior, food/health correlation logic, timeline views, and privacy-first local storage.
```

---

# 1. Product Identity

Chimero Habit Flow is not just a habit tracker.

It should be understood as a **local-first personal life operating system** for tracking daily behavior, organizing life data, analyzing patterns, and preserving personal memory over long time periods.

The client repeatedly described wanting to track many categories of life, but the deeper theme is not merely “logging.” The true product direction is:

- fast daily capture;
- long-term searchable memory;
- behavioral analytics;
- personal correlation discovery;
- relationship memory;
- mood/emotion trend analysis;
- health/symptom tracking;
- food/ingredient relationship tracking;
- customizable dashboards;
- timeline/life-era visualization;
- local-first privacy.

The application should eventually feel like a combination of:

- habit tracker;
- quantified-self dashboard;
- personal CRM;
- food/symptom relationship graph;
- analytics cockpit;
- long-term life archive;
- customizable widget system;
- personal memory augmentation tool.

The original client wanted something for personal use and expected it to expand over months or years with many random future additions. The architecture must assume long-term growth.

---

# 2. Non-Negotiable Product Principles

## 2.1 Local-first and privacy-oriented

The client explicitly cares about privacy. Avoid feeding private life data into external AI or cloud systems unless the client later asks for it.

The app should:

- store data locally;
- avoid unnecessary external services;
- work offline where possible;
- keep images/assets locally;
- use local database storage;
- avoid cloud AI processing by default;
- prefer deterministic/statistical correlation logic over hallucination-prone AI.

A local/self-hosted AI could be considered only as a future optional enhancement, but the baseline should be local statistical algorithms.

## 2.2 Fast entry before visual complexity

The client repeatedly emphasized that entry must not feel cumbersome.
From the beginning, Home was the quick daily logging surface.

The app should make daily logging feel:

- quick;
- frictionless;
- low-click;
- keyboard-friendly;
- recent/frequent-item driven;
- contextual;
- visually compact.

Avoid workflows where every entry starts from a blank form.

## 2.3 Glanceability

The client wants to understand what happened in a day, week, month, or year at a glance.

This affects:

- dashboard cards;
- tracker pages;
- statistics blocks;
- icon/bubble systems;
- chart selection;
- heatmaps;
- timeline view;
- small squares/icons for media/gaming/TV;
- profile bubbles in social.

## 2.4 Deep tracker pages

Trackers should not remain shallow one-input pages.
These are the deeper sidebar/tracker pages that expand the quick Home surface over time.

Each important tracker should eventually feel like its own mini-application with:

- statistics;
- graphs;
- entries;
- edit/delete;
- custom fields;
- quick entry;
- insights/correlations;
- historical views;
- timeline integration;
- tags;
- assets where relevant.

## 2.5 Retroactive query support

The database must support questions like:

- “Last time I ate tacos.”
- “How many eggs did I eat this year?”
- “How many days since I read a book?”
- “How many days did I work out this month?”
- “How many times did I talk to this person?”
- “Which months was I playing this game?”
- “Do low mood days happen after alcohol?”
- “Are cold symptoms more common after wheat?”

This requires granular structured data, not flat text-only records.

---

# 3. Tech Stack and Architecture Direction

## 3.1 Preferred stack from client/dev conversation

The client preferred:

- Electron desktop app;
- JavaScript/TypeScript;
- Tailwind;
- SQL/local DB;
- desktop first;
- mobile later if the desktop version works well.

The project eventually moved to:

- Vite + Electron instead of Next.js + Electron;
- local-first architecture;
- cleaner architecture after a technical consolidation phase;
- fewer mock files;
- stronger backend/data handling.

## 3.2 Platform support

The client tested on:

- Arch Linux;
- Wayland.

Known platform concerns:

- Linux/Mac need absolute paths where Windows may tolerate relative paths;
- Wayland may require careful Electron window handling;
- custom titlebar/window drag must work;
- app window must be movable;
- dialogs/modals must not overflow off-screen;
- responsive layout must avoid hiding top/bottom controls.

## 3.3 Architecture expectation

The architecture must support:

- custom trackers;
- predefined specialized trackers;
- custom widgets;
- dashboard layout customization;
- local image/assets storage;
- quick entry;
- correlations;
- tags and parent/child tag trees;
- deep analytics;
- timeline/calendar views;
- future mobile version;
- multiple data categories without rewriting core systems.

## 3.4 Technical debt principle

The client accepted delaying development to strengthen the foundation. Strengthening the foundation is preferred over stacking features on unstable structure.

The refactor/consolidation goal:

- better performance;
- fewer bugs;
- cleaner code logic;
- easier maintenance;
- faster future feature additions;
- stable data handling;
- stronger UI structure.

---

# 4. Data Model Philosophy

## 4.1 Granular data, not generic summaries

Do not store entries as generic blobs when the data has semantic meaning.

Bad example:

```json
{
  "calories": 500,
  "date": "2026-03-20"
}
```

Better example:

```json
{
  "tracker": "food",
  "item": "Taco",
  "quantity": 3,
  "unit": "pieces",
  "tags": ["Fast Food", "Mexican", "Beef", "Wheat"],
  "timestamp": "2026-03-20T18:30:00",
  "notes": "Dinner"
}
```

Why:

- tags can feed correlations;
- ingredient categories can be counted;
- history can answer specific questions;
- timeline can reconstruct periods;
- analytics can compare time windows.

This structure also keeps Stats queries and correlation logic retroactive and queryable later.
That also makes parent/child tag inheritance a core architecture concern rather than a cosmetic label feature.

## 4.2 Tag system is central

The client eventually described the overarching structure as some type of tag system.

Tags should support:

- user-created tags;
- parent/child relationships;
- tracker-specific tags;
- global tags;
- reusable tags;
- correlation queries;
- health/food/mood connections;
- category filtering.

Examples:

- `Bad Food`
- `Healthy Food`
- `Ice Cream`
- `Wheat`
- `Beef`
- `Cold`
- `Flu`
- `Light Coughing`
- `Allergic Rash`
- `Vitamin D`
- `Medication`

## 4.3 Parent/child tag inheritance

The client explicitly imagined parent tree structures.

Example:

```txt
Beef
  ├── Taco
  ├── Burger
  └── Spaghetti

Wheat
  ├── Biscuits
  ├── Burger Bun
  ├── Taco Shell
  └── Spaghetti
```

When the user logs `Taco`, the system should be able to count:

- Taco;
- Beef;
- Wheat;
- Mexican;
- Fast Food;
- any other inherited tags.

This enables long-term analytics such as:

- days after eating wheat are more likely to have cold symptoms;
- mood after beef-heavy foods;
- health symptoms after certain ingredients;
- bad food vs healthy food effects on mood/weight.

## 4.4 Tags relationship page

The client asked whether a small tab/page could allow adding tags and their relation to others.

This should likely become a dedicated page:

- Tags / Relationship Graph;
- create tag;
- edit tag;
- assign parent tags;
- assign child tags;
- visualize graph;
- show where each tag is used;
- merge duplicate tags;
- allow tracker-specific tags;
- allow global tags.

Mockup reference:

![Food tag relationship graph](assets/03_food_tag_relationship_graph.png)

---

# 5. Quick Entry System

Quick Entry is one of the most important UX systems.

## 5.1 Shortcut

The requested shortcut is:

```txt
Alt + Q
```

Consistency note: `Alt + Q` is the confirmed shortcut, and the picker should stay compact and visually scannable when space allows.

## 5.2 Context-aware behavior

If the user is currently inside a tracker page, pressing `+` or `Alt + Q` should open entry flow for that tracker directly.

Example:

- user is in Weight tracker;
- user presses `+` or `Alt + Q`;
- app opens Add Weight immediately.

It should not force the user to reselect Weight.

## 5.3 Recent/frequent entries

The user does not want empty forms every time.

Quick Entry should show:

- recent items;
- frequent items;
- past entries;
- favorites;
- tracker-specific suggestions;
- search.

Purpose:

- one-click logging;
- reduce typing;
- reduce mental friction.

## 5.4 Layout preference

A later mockup shows the client disliked a long vertical list and preferred a more compact side-by-side/horizontal layout.

Bad direction:

- everything vertically stacked;
- excessive scrolling.

Better direction:

- recent trackers/items side by side;
- visible options without scrolling;
- compact layout.

Mockup reference:

![Quick entry layout reference](assets/08_quick_entry_layout_reference.png)

## 5.5 Enter key submit

The client requested:

- pressing `Enter` should add/save the entry.

This matters for speed.

## 5.6 Multi-select support

Quick Entry should support multi-select especially for:

- Social contacts;
- Food items;
- Activities;
- Tags;
- possibly media/gaming/books.

---

# 6. Dashboard/Home Philosophy

The home page should be a quick daily overview.

The client wants:

- direct summary of the day;
- fast manual/quick entry on home;
- ability to see what they did at a glance;
- compact dashboard cards;
- no tedious input;
- visual identifiers for repeated things.

Potential dashboard cards:

- Mood summary;
- Social interactions;
- Weight;
- Exercise;
- Gaming;
- Media/TV;
- Books;
- Food/Diet;
- Tasks;
- Streaks;
- Reminders;
- Recent entries;
- Daily timeline.

Dashboard widgets should support:

- drag/drop positioning;
- resizing;
- custom layout;
- user-selected cards;
- high-density visual summaries.

---

# 7. Visual Style Requirements

## 7.1 Theme

The client prefers:

- dark mode;
- light black;
- dark grey;
- not very white;
- not blue-heavy.

The client specifically said they were not a fan of blue and disliked very white interfaces.

## 7.2 Accent style

Purple accent became acceptable/used in mockups.

Should be:

- modern;
- minimal;
- dark;
- readable;
- not overbright;
- not too visually noisy.

## 7.3 Information density

The UI should show a lot of data without feeling cramped.

The client tolerates density if it improves glanceability.

## 7.4 Avoid excessive scrolling

The client specifically asked to change layouts side-by-side so they can see all without scrolling.

Important for:

- custom tracker creation;
- quick entry;
- modals;
- tracker dashboards;
- social contact panels.

---

# 8. Tracker System — Global Requirements

## 8.1 Trackers are not equal

Some trackers can be generic/custom, but several main trackers are too complex and need specialized pages.

The client questioned whether everything could be covered by custom trackers because some main ones may be too complex.

Specialized trackers needed:

- Mood;
- Social;
- Food/Diet;
- Health;
- Vitamins/Medications;
- Exercise;
- Books;
- Gaming;
- Media/TV/Series;
- Weight;
- Tasks;
- Calendar/Timeline;
- Stats/Correlations.

## 8.2 Generic custom trackers still required

The user wants to add arbitrary trackers later.

Examples:

- cleaning room;
- fishing;
- random future hobbies;
- counters;
- custom daily logs.

Custom trackers should support configurable schemas such as:

- number/counter;
- range rating;
- boolean;
- list;
- time duration;
- media/item tracker;
- social-style entity picker;
- tag-based tracker;
- notes/diary;
- quantity + unit;
- custom fields.

## 8.3 Tracker deep-page tabs

The client’s mockups show tracker pages with multiple tabs.

Core tabs:

- Statistics;
- Graphs;
- Entries;
- Insights;

Potential additional tabs:

- Timeline;
- Correlations;
- People/Items;
- Settings;
- Relationships;
- Calendar;
- Tags.

Mockup references:

![Mood graphs view](assets/04_mood_graphs_view.png)

![Mood statistics view](assets/05_mood_statistics_view.png)

## 8.4 Tracker analytics time windows

The client asked for deeper graphs to visualize:

- month;
- 3 months;
- year;
- daily;
- weekly;
- monthly;
- yearly.

Analytics should prioritize “gleaning information from a glance.”

## 8.5 Entry edit/delete

Each tracker should support:

- edit entries;
- delete/remove entries.

Possible UX idea:

- hold Shift and reveal trash/edit buttons, similar to Discord message controls.

---

# 9. Mood Tracker

Mood is one of the central trackers.

## 9.1 Entry model

The client requested:

- mood scale, likely 1–10;
- multiple entries per day;
- average mood per day;
- low/high per day;
- statistics view.

Suggested fields:

- mood score;
- timestamp;
- notes;
- tags/reasons;
- energy;
- stress;
- optional associated events;
- optional associated contacts;
- optional associated food/health tags.

## 9.2 Statistics

The mockup includes:

- average mood this month;
- average mood this year;
- average mood today;
- average mood this week;
- average mood this month;
- average mood this year;
- mood change from yesterday;
- mood change from last week;
- mood change from last month;
- mood change from last year;
- average mood entries per day;
- average mood entries per week;
- average mood entries per month;
- average mood entries per year.

The client likes percentage comparisons such as:

- `-5%`;
- `+10%`;
- `+3%`.

## 9.3 Graphs

Mood graphs should include:

- line charts;
- stacked line charts;
- daily/weekly/monthly/yearly filters;
- possibly heatmap/calendar visualization;
- trend comparisons.

## 9.4 Mood heatmap/calendar

The mockup shows a mood tracker heatmap-like calendar.

Purpose:

- visually identify emotional periods;
- show mood intensity across month/year;
- detect streaks/cycles;
- identify emotional “eras.”

## 9.5 Correlations

Mood must correlate with:

- social contact;
- alcohol;
- food/diet;
- exercise;
- sleep if added later;
- health symptoms;
- vitamins/medications;
- gaming/media/books;
- tasks/productivity;
- tags.

Examples explicitly mentioned:

- low mood days after drinking;
- happy mood after lots of social contact;
- mood changes after food;
- mood/health after vitamins/medications.

---

# 10. Social Tracker / Social CRM

Social started as a tracker but became a full relationship-memory system.

## 10.1 Core concept

Track:

- who the user talked to each day;
- how they interacted;
- call or text;
- social frequency;
- mood impact;
- personal details;
- contact history.

## 10.2 Contact bubbles

The client repeatedly wanted profile picture bubbles like Discord.

Requirements:

- profile picture bubble if image exists;
- initials bubble if no image exists;
- compact grid;
- multi-select;
- search if contact is not visible;
- fast selection for daily entry.

Mockup references:

![Social contacts grid](assets/01_social_contacts_grid.png)

![Social multi-select bubbles](assets/07_social_multiselect_bubbles.png)

## 10.3 Social quick entry workflow

The user wants to select people quickly.

Possible flow:

1. Open Social quick entry.
2. See contact bubbles.
3. Select one or multiple contacts.
4. Mark interaction type.
5. Mark mood effect.
6. Press Enter or confirm.

The mockup with a green check implies a confirmation button after bubble selection.

## 10.4 Mood effect per person

The client suggested three values:

- Positive;
- Negative;
- Neutral.

Earlier wording:

- improved;
- lowered;
- neutral.

Potential keybindings:

- Shift + left click = positive;
- Shift + right click = negative;
- Shift + middle mouse button = neutral.

This is not final but should be considered as a fast interaction concept.

## 10.5 Interaction method

Social entries should store how the user interacted:

- call;
- text;
- possibly in person;
- group interaction;
- other custom methods.

## 10.6 Contact profile page

The client explicitly requested clicking a bubble to open a page about that person.

Fields requested:

- birthday;
- age;
- date met;
- date last talked to;
- traits;
- honest/rude labels;
- likes;
- dislikes;
- misc notes;
- whether they have kids;
- important personal information.

Image mockup added:

- Name: Jack Robert;
- Birthday;
- Age: 32;
- Kids: 0;
- Likes: Sports, Gambling;
- Dislikes: Fish;
- Notes to remember;
- Traits: mean, shy, funny.

Mockup reference:

![Social selected contact profile](assets/02_social_selected_contact_profile.png)

## 10.7 Contact profile layout

The client suggested a customizable grid where they can enter headers/info into boxes and drag them like the Home page.

This implies:

- customizable contact profile layout;
- draggable info cards;
- freeform fields;
- structured fields;
- personal notes;
- custom labels.

## 10.8 Sorting contacts

The client requested a contacts page sortable by:

- ascending who they talk to most;
- descending who they talk to most.

Likely additional sort/filter options:

- last talked;
- birthday soon;
- mood impact;
- interaction count;
- tags/traits;
- favorite/pinned.

## 10.9 Purpose of social CRM

The client wants to remember people’s personal details to show care, such as birthdays and personal details.

This social flow should always include both the all-contacts selector and the selected-contact detail page.

This is not just analytics. It is memory augmentation.

The Social tracker should feel like:

- Discord-style people selector;
- personal CRM;
- memory vault;
- social frequency tracker;
- mood correlation input.

---

# 11. Food / Diet Tracker

Food/Diet is one of the most important data systems because it connects to health, mood, weight, and tags.

## 11.1 Original tracker intent

The client originally wanted to track diet and later expanded into:

- specific food items;
- parent tags;
- ingredients;
- health correlations;
- mood correlations;
- frequency statistics;
- last-time queries.

## 11.2 Examples explicitly mentioned

- eggs eaten total/weekly/yearly;
- last time ate fast food;
- last time ate tacos;
- tacos;
- burger;
- spaghetti;
- biscuits;
- wheat/trigo;
- beef/carne de res;
- ice cream;
- bad food;
- healthy food.

## 11.3 Tag tree / food relationship graph

The client wants foods to count as themselves and also inherited parent tags.

Example from mockup:

- Wheat / trigo;
- Beef / carne de res;
- Biscuits / galletas;
- Hamburger / hamburguesa;
- Taco;
- Spaghetti / espagueti.

The app should eventually allow defining these relationships visually or structurally.
These food tags should stay reusable as structured reasons for Mood, Weight, and Health correlations.

Mockup reference:

![Food tag relationship graph](assets/03_food_tag_relationship_graph.png)

## 11.4 Food tracker fields

Potential fields:

- item name;
- quantity;
- unit;
- meal type;
- timestamp;
- tags;
- ingredients;
- parent tags;
- image/asset;
- notes;
- health/mood reaction later;
- calories optional but not sufficient alone.

## 11.5 Food analytics

Food statistics should answer:

- total times eaten;
- weekly/monthly/yearly counts;
- days since item;
- frequency by tag;
- healthy vs bad food counts;
- food categories over time;
- correlation with mood;
- correlation with symptoms;
- correlation with weight;
- correlation with exercise/energy.

---

# 12. Health Tracker

Health is connected to tags and food/medication correlations.

## 12.1 Health symptoms

Client examples:

- cold;
- flu;
- light coughing;
- allergic rash.

Health tracker should allow custom symptoms/tags as needed.
Those symptom tags should remain user-created, timestamped, and structured so they can feed future correlations cleanly.

## 12.2 Health correlations

Client example:

- days after eating Wheat are 90% likely to have cold symptoms.

This may not be statistically valid early, but the app should support exploratory correlation suggestions.

Health should correlate with:

- food tags;
- ingredient tags;
- vitamins;
- medication;
- mood;
- exercise;
- sleep if added;
- social activity;
- alcohol;
- stress/productivity tags.

## 12.3 Health entry fields

Potential fields:

- symptom tag;
- severity;
- start/end time;
- notes;
- body location if relevant;
- medication/vitamin taken;
- associated food tags;
- mood score;
- duration.

---

# 13. Vitamins / Medications Tracker

The client explicitly requested a Vitamins/Medications tracker.

## 13.1 Purpose

The client consistently tracks vitamins and rarely tracks medications.

The tracker should handle both:

- vitamins/supplements;
- medications.

## 13.2 Parent structure requirement

The client mentioned taking Vitamin D from different companies, sometimes with additional ingredients.

This implies:

- one parent item: Vitamin D;
- multiple product variants/brands;
- each variant may include extra ingredients;
- all variants still count under Vitamin D for correlations.
The same parent/variant rule applies broadly here and should not collapse into a shallow single-entry model.

Example:

```txt
Vitamin D
  ├── Brand A Vitamin D
  ├── Brand B Vitamin D + K2
  └── Brand C Vitamin D + Magnesium
```

## 13.3 Correlations

Vitamins/medications should correlate with:

- health symptoms;
- mood;
- energy;
- side effects;
- food;
- sleep if added;
- weight/exercise if relevant.

## 13.4 Fields

Potential fields:

- item name;
- parent item;
- brand/company;
- dosage;
- unit;
- time taken;
- frequency;
- ingredients;
- tags;
- notes;
- reason taken;
- symptom/mood association.

---

# 14. Exercise Tracker

## 14.1 Exercise database

The client referenced:

```txt
https://github.com/yuhonas/free-exercise-db
```

They asked whether this could be implemented and used to make a fancy UI for selecting workouts.

Requirements:

- use or import exercise database;
- searchable exercise list;
- exercise selection UI;
- attractive/fancy picker;
- workout logging;
- exercise metadata.

## 14.2 Exercise analytics

The client mentioned:

- days worked out;
- total weights lifted in kg/lbs;
- possibly by week/year.

Fields:

- exercise;
- sets;
- reps;
- weight;
- unit kg/lb;
- duration;
- body part;
- equipment;
- notes;
- date/time.

Analytics:

- total weight lifted;
- workouts per week/month/year;
- days since workout;
- volume trends;
- exercise frequency;
- mood correlation;
- health correlation;
- weight correlation.

---

# 15. Weight Tracker

The original app had weight working.

Requirements:

- log weight manually/quickly;
- graph weight changes;
- support kg/lbs;
- dashboard card;
- deeper analytics;
- quick entry should default to weight when inside Weight page.

Analytics:

- current weight;
- weight change from last entry;
- weekly/monthly/yearly trends;
- correlation with diet;
- correlation with exercise;
- correlation with mood;
- total change over time.

---

# 16. Books Tracker

The client said Books was removed and should be added back.

Examples:

- books read this year: 34;
- books read this week: 1;
- days since reading book: 3.

Requirements:

- book entries;
- reading sessions;
- completion tracking;
- progress tracking;
- statistics;
- line/table/numeric summaries.

Potential fields:

- title;
- author;
- status;
- pages read;
- total pages;
- date started;
- date finished;
- session duration;
- rating;
- notes;
- tags/genres;
- asset/cover.

Analytics:

- books read this year;
- books read this month/week;
- pages read;
- days since reading;
- reading streaks;
- genres over time.

---

# 17. Gaming Tracker

The client repeatedly mentioned gaming.

Needs:

- gaming activity logging;
- small squares/icons/assets for games;
- quick glance dashboard;
- timeline support showing months when playing a game;
- deeper tracker page.

Potential fields:

- game title;
- platform;
- session duration;
- date/time;
- mood after/before;
- multiplayer/social relation;
- notes;
- tags;
- icon/cover.

Analytics:

- hours played;
- games played this week/month/year;
- days since playing;
- timeline periods;
- correlation with mood/social/productivity.

---

# 18. Media / TV / Series Tracker

The client mentioned TV/books/series/media from the beginning.

Needs:

- track shows/series/media;
- small icons/squares for glanceability;
- timeline view showing months watching each show;
- dashboard summaries;
- history.

Potential fields:

- title;
- media type;
- episode/season;
- status;
- session date;
- duration;
- rating;
- notes;
- tags;
- asset/cover.

Analytics:

- media watched per week/month/year;
- active shows;
- days since watching;
- timeline of show periods;
- mood correlations.

---

# 19. Tasks Tracker

## 19.1 Task system

The app has tasks and the client requested one specific feature:

- button to move task to tomorrow’s tasks;
- keep it visible on the previous day;
- highlight it with a color to show it was postponed instead of checkmarked.

This was marked as backburner/not urgent but should not be lost.

## 19.2 Task fields

Potential fields:

- title;
- description;
- due date;
- completion state;
- postponed state;
- postponed to date;
- priority;
- tags;
- notes.

---

# 20. Calendar and Timeline

## 20.1 Calendar

The client originally imagined a calendar view to see how things went on previous days, months, or years and prepare for upcoming days.

Calendar should integrate tracker data.

## 20.2 Timeline page

The client specifically requested a new page under Calendar called:

```txt
Timeline
```

Main goal:

- see what months they were watching a show;
- see what months they were playing a game;
- select/deselect categories like calendar.

## 20.3 Timeline visualization

The provided reference image shows:

- horizontal timeline;
- years/months along a line;
- category-colored event blocks;
- labels/descriptions;
- arrows pointing to dates;
- legend/categories.

Mockup reference:

![Timeline reference](assets/06_timeline_reference.png)

## 20.4 Timeline categories

Could include:

- Gaming;
- TV/Series;
- Books;
- Social;
- Health;
- Mood;
- Work/Productivity;
- Exercise;
- Food/Diet;
- Custom categories.

## 20.5 Timeline purpose

Timeline should become a life-era visualization system.

Examples:

- “I was watching X show during these months.”
- “I played Y game from March to June.”
- “Mood was low during this period.”
- “I was sick during this week.”
- “I had heavy social contact during this month.”

---

# 21. Stats Page / Advanced Statistics

The client strongly wants a separate Stats page.

## 21.1 Purpose

Stats page should be able to show random quantified information from all trackers.

Examples:

- last time drank alcohol;
- times drank;
- times eaten a certain food;
- days worked out;
- eggs eaten total/weekly/yearly;
- total weights lifted;
- last time ate fast food;
- last time ate tacos.

## 21.2 Requirement

This may be separate from custom trackers. The client was unsure whether custom trackers could cover everything and expressed concern that Stats needs its own foundation rather than being only another custom tracker type.

## 21.3 Statistics format

The client likes:

- line charts;
- tables;
- numbers;
- statistics cards;
- count summaries;
- “days since” counters;
- weekly/monthly/yearly comparisons.

---

# 22. Correlations Page / Correlation Engine

## 22.1 Explicit examples

Client requested correlations such as:

- low mood days after drinking;
- happy mood after lots of social contact;
- food data correlated with health;
- wheat associated with cold symptoms;
- vitamins/medications with health/mood.

## 22.2 AI vs statistics

The client does not want private data fed into AI by default.
The default path should stay local and statistical rather than external AI.

Preferred approach:

- deterministic math;
- statistical algorithms;
- local analysis;
- transparent correlations;
- no hallucinated claims.

## 22.3 Correlation output style

Potential output:

```txt
Low mood appears 28% more often within 24h after logging Alcohol.
Cold symptoms appear frequently 1–2 days after Wheat-tagged foods.
Mood average is +0.8 higher on days with 3+ social interactions.
```

Important:

- use cautious language;
- avoid overclaiming causation;
- distinguish correlation from cause.

## 22.4 Data needs

The correlation engine depends heavily on:

- tag system;
- timestamps;
- parent/child relationships;
- structured entries;
- tracker-specific fields;
- enough historical data.
This is why the tag system and tracker schemas are foundational prerequisites for meaningful correlation output.

---

# 23. Assets System

## 23.1 Original purpose

The client created assets to upload pictures for things they would enter.

They were uploading mostly via clipboard.

## 23.2 Required asset input methods

Assets should support:

- Ctrl+V paste;
- drag and drop;
- select from folders;
- JPG;
- PNG;
- SVG;
- local transformation/storage.

## 23.3 Staging and safety

Existing idea:

- staging system for auto-save and UX;
- no process should run without user permission.

## 23.4 Asset categories

The client complained Social was missing as a category in assets.

Asset categories should include:

- Social contacts;
- Food;
- Books;
- Gaming;
- TV/Media;
- Exercise;
- Custom tracker items;
- Icons/covers/avatars.

## 23.5 Automatic type detection + UX

Automatic file type detection is useful but not enough.

The UX should still ask/allow:

- what entity this asset belongs to;
- category;
- item/contact association;
- preview;
- edit metadata.

---

# 24. Navigation / Sidebar

The client requested:

- move Assets and Custom Trackers to bottom because they are less used day-to-day;
- put them above streak counter.

This implies sidebar priority should reflect daily usage.
It also preserves the original split: Home is for quick daily logging, while sidebar/tracker pages hold deeper data later.
Social, TV, and Gaming should keep strong visual identity assets so glanceability still works even when they sit deeper in the app.

High frequency:

- Home;
- Quick Entry;
- Trackers;
- Calendar;
- Stats/Correlations.

Lower frequency:

- Assets;
- Custom Trackers;
- Settings.

---

# 25. Known Bugs / UX Issues Reported

## 25.1 Startup error

On Linux, app threw:

```txt
Error: Path must be absolute
```

Cause identified:

- routing/path issue on developer side;
- Windows allowed relative paths;
- Linux/Mac required absolute paths.

## 25.2 Electron/Linux warnings

Some logs may appear below “scheme ok” and may not affect production. But errors should still be minimized.

## 25.3 Wayland/window issue

Client uses Wayland on Arch.

Reported issue:

- unable to grab title bar;
- app window stuck and cannot be moved.

Need:

- robust custom titlebar drag region;
- Wayland-aware Electron behavior.

## 25.4 Overflow issue

Reported issue:

- custom tracker creation overflows too far vertically;
- top/bottom not visible;
- web version had overflow where trackers could not be seen well.

Need:

- responsive modals;
- max-height;
- internal scroll when necessary;
- side-by-side layout when appropriate;
- avoid hiding controls.

## 25.5 Performance delay

Client noticed compile/render time up to ~500ms and delayed clicking between trackers.

Developer confirmed 500ms is not normal and can be fixed.

Need:

- optimize tracker switching;
- reduce unnecessary re-rendering;
- lazy load heavy views;
- cache data;
- avoid slow UI frameworks/components;
- profile render paths.

## 25.6 Assets social image population bug

Reported:

- added asset;
- app did not ask what type it was;
- image did not populate in social person;
- social category not present in assets.

Need:

- asset category Social;
- attach asset to contact;
- profile bubble should update.

## 25.7 UI crash/responsiveness bug

Later update indicated UI crashed while fixing responsiveness.

This reinforces:

- responsive layout needs careful testing;
- board/grid data handling caused UI bugs;
- frontend architecture and UI handling needed cleanup.

---

# 26. Current Development State from Conversation

The project went through these broad phases:

1. Initial frontend prototype.
2. Darker redesign direction.
3. Asset system and local image storage.
4. Mood and Social tracker prototypes.
5. Custom layout and custom tracker system.
6. Backend/local database planning.
7. Technical consolidation/refactor.
8. Migration to Vite + Electron.
9. Linux path fixes.
10. UI/UX fixes around window, assets, sidebar, quick entry.
11. Social CRM and Exercise milestone.
12. Recognition that other trackers are still too basic.
13. Notion tracker discovery/template created.
14. Tag system and parent tag tree identified as central.
15. Health and Vitamins/Medications added as important.
16. Later frontend/board UI improvements and responsiveness fixes.

Important current conclusion:

The base became stable enough that the next main bottleneck is concept/data design for each tracker, especially because generic one-input trackers are not enough for correlations.

---

# 27. Tracker Design Discovery / Planning Need

A Notion tracker design discovery document was created because the client has many tracker ideas but not all are organized.

The goal of that planning phase:

- define what each tracker tracks;
- define what each tracker displays;
- define what each tracker analyzes;
- define what each tracker correlates with;
- avoid bottlenecks later;
- prevent building a tower on weak conceptual blocks.

This remains important.

---

# 28. Tracker Requirements Summary Table

| Tracker | Must Exist | Depth Needed | Special Notes |
|---|---:|---:|---|
| Mood | Yes | High | 1–10, multiple/day, average/high/low, graphs, correlations |
| Social | Yes | Very High | Discord-like bubbles, CRM profiles, traits, birthday, mood impact |
| Food/Diet | Yes | Very High | Tag tree, ingredients, health/mood/weight correlations |
| Health | Yes | High | Symptoms, severity, custom tags, food/vitamin correlations |
| Vitamins/Meds | Yes | High | Parent/variant structure, dosage, brand, correlations |
| Exercise | Yes | High | free-exercise-db, workout picker, volume stats |
| Weight | Yes | Medium/High | kg/lb, trends, food/exercise correlations |
| Books | Yes | Medium/High | read counts, days since, progress, year/week stats |
| Gaming | Yes | Medium/High | session logging, icons, timeline months |
| Media/TV/Series | Yes | Medium/High | shows watched, icons, timeline months |
| Tasks | Yes | Medium | postpone-to-tomorrow with previous-day highlight |
| Calendar | Yes | Medium/High | day/month/year review, category filtering |
| Timeline | Yes | High | months/eras visualization across categories |
| Custom Trackers | Yes | High | user-created trackers with schemas/widgets |
| Stats/Correlations | Yes | Very High | global analytics and cross-tracker pattern detection |
| Assets | Yes | Medium/High | local images, categories, contact/item linking |

---

# 29. Implementation Priorities Suggested by Requirements

## Priority 1 — Foundation systems

- local DB schema;
- generic entry system;
- tracker registry;
- tag system;
- parent/child tag relationships;
- asset linking system;
- quick entry engine;
- entry CRUD;
- time window analytics helpers.

## Priority 2 — Critical UX

- Alt + Q quick entry;
- Enter-to-submit;
- context-aware tracker entry;
- recent/frequent entries;
- responsive modals;
- no hidden top/bottom controls;
- side-by-side layouts where useful;
- window drag/Wayland compatibility.

## Priority 3 — Core trackers

- Mood;
- Social CRM;
- Food/Diet;
- Health;
- Vitamins/Medications;
- Exercise;
- Weight.

## Priority 4 — Media/life trackers

- Books;
- Gaming;
- TV/Series;
- Media;
- Tasks.

## Priority 5 — Analytics views

- Stats page;
- Correlations page;
- tracker-specific graphs;
- tracker-specific statistics;
- timeline page;
- calendar category overlays.

## Priority 6 — Polish

- animations;
- empty states;
- dashboard styling;
- visual consistency;
- iconography;
- profile bubbles;
- heatmaps;
- chart polish;
- compact cards.

---

# 30. Suggested Data Entities

This is not final schema, but it captures the product need.

## Core entities

```txt
Tracker
TrackerSchema
Entry
EntryField
Tag
TagRelationship
Asset
EntityProfile
QuickEntryPreset
DashboardWidget
TimelineEvent
CorrelationResult
```

## Specialized entities

```txt
MoodEntry
SocialContact
SocialInteraction
FoodItem
FoodEntry
HealthSymptom
HealthEntry
VitaminMedicationItem
VitaminMedicationEntry
ExerciseItem
ExerciseEntry
WeightEntry
BookItem
BookEntry
GameItem
GameSession
MediaItem
MediaSession
TaskItem
TaskEvent
```

## Important relationships

```txt
Entry -> Tracker
Entry -> Tags
Tag -> ParentTag
Asset -> Entity/Profile/Item
SocialInteraction -> SocialContact(s)
FoodEntry -> FoodItem -> Ingredient Tags
HealthEntry -> Symptom Tags
VitaminEntry -> Parent Vitamin/Medication
TimelineEvent -> Source Entry/Tracker
CorrelationResult -> Source Tags/Trackers
```

---

# 31. Important UX Microdetails Not To Lose

- `Alt + Q` opens quick entry.
- `Enter` submits entries.
- `+` inside a tracker defaults to that tracker.
- Social contacts use Discord-like bubbles.
- Contacts without images use initials.
- Contact images come from Assets.
- Social contacts can be multi-selected.
- Social entries may mark Positive/Negative/Neutral mood effect.
- Possible social keybindings: Shift + left/right/middle click.
- Social contact profiles include birthday, age, date met, last talked, traits, likes, dislikes, kids, notes.
- Contact profiles may use draggable/custom grid cards.
- Contacts page should sort by most/least talked to.
- Food items inherit parent tags like Beef/Wheat.
- Tags relationship page should exist.
- Health symptoms can be custom tags.
- Vitamins/medications need parent/variant structure.
- Stats page must answer “last time” and “how many” questions.
- Timeline page belongs under Calendar.
- Timeline supports category toggles.
- Mood supports daily/weekly/monthly/yearly views.
- Mood statistics show period averages and changes.
- Entries need edit/delete.
- Shift-to-reveal edit/delete is a possible UX.
- Assets and Custom Trackers should sit at bottom of sidebar.
- App must support dark gray/black style.
- Avoid blue-heavy design.
- Avoid bright white design.
- Avoid excessive scrolling.
- Make layouts side-by-side when possible.
- Wayland/Linux support matters.
- Performance between trackers should feel instant, not ~500ms lag.

---

# 32. Visual Mockup Appendix

## 32.1 Social contacts grid

Shows the Social tracker page with tabs and contact bubbles. The handwritten annotation emphasizes “Contacts.” This confirms contact bubbles are a core visual primitive.

![Social contacts grid](assets/01_social_contacts_grid.png)

## 32.2 Social selected contact profile

Shows the intended selected-contact detail page, including fields like name, birthday, age, kids, notes, likes, dislikes, and traits.

![Social selected contact profile](assets/02_social_selected_contact_profile.png)

## 32.3 Food tag relationship graph

Shows the parent/child ingredient relationship model: Wheat and Beef connect to foods like biscuits, hamburger, taco, spaghetti.

![Food tag relationship graph](assets/03_food_tag_relationship_graph.png)

## 32.4 Mood graphs view

Shows a multi-tab Mood tracker with graph-oriented content and time filters.

![Mood graphs view](assets/04_mood_graphs_view.png)

## 32.5 Mood statistics view

Shows statistics text blocks with average mood and period-to-period comparisons.

![Mood statistics view](assets/05_mood_statistics_view.png)

## 32.6 Timeline reference

Shows a horizontal categorized event timeline, useful for Calendar → Timeline.

![Timeline reference](assets/06_timeline_reference.png)

## 32.7 Social multi-select bubbles

Shows a rough social selector with bubbles and a confirmation checkmark.

![Social multi-select bubbles](assets/07_social_multiselect_bubbles.png)

## 32.8 Quick entry layout reference

Shows the preference for a side-by-side/horizontal quick entry layout instead of a long vertical list.

![Quick entry layout reference](assets/08_quick_entry_layout_reference.png)

---

# 33. Product Interpretation — Final

The strongest interpretation of the client’s vision:

Chimero should become a **private, local-first, customizable self-analytics system** where the user can quickly log life events and later extract patterns across mood, social contact, food, health, vitamins, medication, exercise, weight, media, books, games, tasks, and custom categories.

The most important product risks are:

1. Making entry too slow.
2. Treating trackers as shallow single-input forms.
3. Ignoring the tag/relationship graph.
4. Building correlations without structured data.
5. Losing the social CRM/memory direction.
6. Making the UI too white/blue or visually generic.
7. Not supporting Linux/Wayland usability.
8. Focusing on polish before the data architecture is expressive enough.
9. Adding features without preserving analytics/correlation compatibility.
10. Forgetting that the client wants long-term personal expansion.

The most important product wins are:

1. Fast quick entry.
2. Strong local database schema.
3. Tag inheritance graph.
4. Deep Social CRM.
5. Deep Mood analytics.
6. Food/Health/Vitamins correlation foundation.
7. Timeline/life-era visualization.
8. Tracker pages with Statistics/Graphs/Entries/Insights.
9. Custom trackers with reusable schemas.
10. Clean dark UI with dense glanceable information.

---

# 34. Final Confidence Notes

This V5 includes:

- the full original chat export;
- all product-relevant written requirements found in the conversation;
- visual requirements extracted from the provided mockups;
- client preferences;
- bugs;
- technical constraints;
- UI/UX details;
- tracker-specific details;
- hidden product philosophy inferred from repeated patterns;
- sanitized/removal of payment and irrelevant conversation.

Estimated completeness:

- Very high for written product requirements.
- Very high for the mockups provided in this conversation.
- Still not perfect for old images in the Discord export that only appear as the word `Image` without actual visual content.
- Notion content is only partially represented through the conversation messages because the actual Notion export was not included in this source package.

Use this V5 as the authoritative working product spec until a newer Notion/export file is provided.
