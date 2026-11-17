# Run the showcase

You need Node.js 22 and pnpm 10.28.2. Run everything from `chimero-habit-flow/`:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm showcase            # = node scripts/showcase.cjs --open
```

This starts the real Electron app on its own profile, `.showcase-profile/` (git-ignored), which never touches your own data. The first run writes 168 days of fictional records through `window.api`, the same calls the interface makes, and then leaves the window open.

The records include:

- weigh-ins, mood check-ins, sleep, water and workouts from Push/Pull/Legs routines
- meals tagged by ingredient, symptoms, supplements, books, games and shows, and tasks
- six fictional people with birthdays and interactions
- reminders and an arranged dashboard

The plan is deterministic: the same seed gives the same profile. A few relationships are planted, so Insights has something real to find:

- late gaming shortens sleep
- short sleep lowers mood and raises the chance of a headache
- training and good time with people lift mood
- dairy raises the chance of bloating the next day

They are fiction and mean nothing about real people.

## Safety rules the script follows

- It writes only to `.showcase-profile/`, or to `CHIMERO_SHOWCASE_DIR` if you set it.
- It refuses to seed a profile that already holds records.
- It writes a `showcase.json` marker before seeding starts. `--reset` deletes a profile only when that marker is present. A directory with a database and no marker is never removed.

## Five-minute tour

1. **Today:** press **Edit layout**, drag a widget by its body, drag a corner to resize it, then press **Done**. Restart and check that the layout is the same.
2. **Quick Entry:** press **Alt+Q**, type `mo`, press Enter, pick a score and press Enter. Try `ex` for a workout started from a routine.
3. **Weight:** look at the fitted trend, the goal line and the distance to the goal. Click a history row to edit it.
4. **Insights:** the strongest pattern is selected first. Try **Tagged dairy → Bloating** with **Next day**, then read the split behind the number and the note at the end.
5. **Trackers → New tracker:** start from the **Meditation** template, add a field, save, and log to the new tracker.
6. **People:** open someone, log time together, and look at the nudge settings.
7. **Settings:** export to JSON or CSV, or make a backup.

## Recreate the screenshots

```sh
pnpm build
node scripts/showcase.cjs --reset --capture
```

This writes the twelve PNGs to `portfolio/screenshots/`. Make the web versions with:

```sh
cd ../portfolio
for f in screenshots/*.png; do ffmpeg -loglevel error -y -i "$f" -c:v libwebp -quality 84 "web/$(basename "$f" .png).webp"; done
ffmpeg -y -i screenshots/01-today-dashboard.png -vf "scale=1200:-1,crop=1200:630:0:0" og-1200x630.png
```

## Tests and packages

```sh
pnpm check-types && pnpm lint && pnpm test
python3 scripts/verify-migrations.py
pnpm build && pnpm test:e2e            # needs a display (or xvfb-run)
pnpm package                           # dist/Chimero-<version>-x86_64.AppImage
CHIMERO_TEST_EXECUTABLE="$PWD/dist/linux-unpacked/chimero" pnpm test:e2e
```

`pnpm package:win` builds the Windows NSIS installer. On Linux that needs wine; otherwise use the CI workflow, which builds it on Windows.
