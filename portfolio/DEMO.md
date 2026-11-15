# Run and reproduce the desktop demonstration

Use Node.js 22 and pnpm 10.28.2. From `chimero-habit-flow/`:

```sh
pnpm install --frozen-lockfile
pnpm build
node scripts/demo.cjs --open
```

The script starts the actual Electron application with an isolated `.demo-profile/` directory, writes synthetic records through the preload IPC API, and leaves the window open. It never selects the normal personal profile. A completion marker is written only after seeding succeeds. Completed demo profiles are retained. Nonempty profiles without that marker are refused without changing their records; this prevents a partial seed or personal profile from being mistaken for a valid demo. To retry an interrupted seed, choose a new directory. To create another profile, set `CHIMERO_USER_DATA_DIR` to a new directory. Do not point this script at a personal profile.

## Five-minute walkthrough

1. Home: inspect today's weight, mood, outdoor time, workout, social interaction and tasks.
2. Press **Alt+Q**, select Weight and inspect the specialized form. Save a fictional measurement if desired, then open Weight and its Graphs tab.
3. Open Calendar and select an earlier day to see persisted history.
4. Open Insight Lab, select Outdoor time → Mood, choose Same day and run analysis. Recorded zero days provide the comparison cohort; absent records remain unknown.
5. Open Contacts → Alex Rivera for a fictional profile, then Custom Trackers → Add New Tracker to inspect configuration.
6. Close the app and run the launch command again. The completed profile and any edits remain local.

 The synthetic relationship is illustrative, not a real finding.

To recreate the eight portfolio captures:

```sh
node scripts/demo.cjs --capture
```

Captures are written to `portfolio/screenshots/`. The script uses a 1440 × 1000 renderer viewport (1920 × 1080 for the distinct hero) and disables animations during screenshot capture for stable output. This is an actual Electron renderer, not a mockup or alternate website.

Run persistence verification:

```sh
pnpm build
pnpm test:e2e
```

The E2E test creates and removes its own temporary profile. It verifies data across a full application restart. A graphical Linux session is required (or a separately configured virtual display). Native SQLite dependencies must match Electron; `pnpm --filter chimero-electron exec electron-rebuild -f -w better-sqlite3` repairs an ABI mismatch after running native Node-based checks.

Build an unpacked Linux desktop directory:

```sh
pnpm exec electron-builder --linux dir --publish never
```

This command does not publish a release. The unpacked Linux executable was launched and passed the CRUD/restart test on the test host. See [verification evidence](../Documentation/Release/VERIFICATION.md) for scope and limitations. No Windows installation claim is implied.
