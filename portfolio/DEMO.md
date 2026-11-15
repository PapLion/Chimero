# Run and reproduce the desktop demonstration

Use Node.js 22 and pnpm 10.28.2. From `chimero-habit-flow/`:

```sh
pnpm install --frozen-lockfile
pnpm build
node scripts/demo.cjs --open
```

The script starts the actual Electron application with an isolated `.demo-profile/` directory, writes synthetic records through the preload IPC API, and leaves the window open. It never selects the normal personal profile. Existing nonempty demo profiles are retained rather than overwritten. To create another profile, set `CHIMERO_USER_DATA_DIR` to a new directory. Do not point this script at a personal profile.

Explore Home, press Alt+Q, open Weight, browse Calendar, compare Outdoor time with Mood in Insight Lab, and visit Contacts and Custom Trackers. The synthetic relationship is illustrative, not a real finding.

To recreate the eight portfolio captures:

```sh
node scripts/demo.cjs --capture
```

Captures are written to `portfolio/screenshots/`. The script uses a 1440 × 1000 renderer viewport and disables animations during screenshot capture for stable output. This is an actual Electron renderer, not a mockup or alternate website.

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

This command does not publish a release. See the verification report for whether packaging and packaged startup succeeded on the test host. No Windows installation claim is implied.
