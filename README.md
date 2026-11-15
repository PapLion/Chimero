# Chimero

A local-first Electron desktop application for personal tracking, historical review and exploratory statistics.

- [Portfolio case study and authentic screenshots](portfolio/README.md)
- [Run the synthetic desktop demo](portfolio/DEMO.md)
- [Completion scope](Documentation/Release/COMPLETION_PLAN.md)

## Development

Use Node 22 (`chimero-habit-flow/.nvmrc`) and pnpm 10.28.2.

```sh
cd chimero-habit-flow
pnpm install --frozen-lockfile
pnpm dev
```

```sh
pnpm check-types
pnpm lint
pnpm test
python scripts/verify-migrations.py
pnpm build
pnpm test:e2e
```

Unit tests run through Electron's Node runtime to match the native SQLite ABI installed by electron-rebuild. The E2E suite requires a graphical session. Use `pnpm build:web` to build the secondary web runtime; desktop remains the primary product.

The demo uses a separate profile and synthetic data. Never delete a personal database to resolve a migration error. Startup now repairs known missing columns additively and refuses unknown incomplete schemas without deleting the database.

Historical documents describe evolving requirements and may contradict current implementation. See the completion scope and verification report before making release or compatibility claims.
