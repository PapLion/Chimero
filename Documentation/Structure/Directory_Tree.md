# Directory Tree

## Current Useful Tree

```text
chimero-habit-flow/
  apps/
    electron/
      src/
        main/
          database.ts
          index.ts
          features/
            assets/
            calendar/
            contacts/
            entry/
            exercises/
            reminders/
            tags/
            tracking/
            weight/
          shared/
            mappers.ts
        preload/
          index.ts
        renderer/
          src/
            App.tsx
            main.tsx
            features/
              assets/
              calendar/
              contacts/
              dashboard/
              entry/
              exercises/
              reminders/
              trackers/
              tracking/
              tags/
            shared/
              api.ts
              queries.ts
              store.ts
              utils.ts
              components/
    web/
      server/
        db.ts
        index.ts
        routes/
          api.ts
      src/
        main.tsx
        runtime/
          api-client.ts
  packages/
    db/
      src/
        database.ts
        index.ts
        schema.ts
        types.ts
      drizzle/
    shared/
      src/
        contracts/
        domain/
          calendar.ts
          streak.ts
          tags.ts
          weight.ts
        features/
          assets/
          calendar/
          contacts/
          dashboard/
          entry/
          exercises/
          reminders/
          tracking/
    ui/
  test/
  tests/
Documentation/
  Contracts/
    Backend_IPC_Contracts.md
    Database_Contracts.md
    Frontend_Contracts.md
    Shared_Contracts.md
    Trackers/
  Flow/
  Structure/
  Todo/
```

## Where To Add New Code

- New renderer surface: `apps/electron/src/renderer/src/features/<feature>`.
- Shared app-facing type: `packages/shared/src/contracts` or `packages/shared/src/features/<feature>`.
- Pure reusable calculation: `packages/shared/src/domain`.
- Electron IPC/backend behavior: `apps/electron/src/main/features/<feature>`.
- DB structure: `packages/db/src/schema.ts` plus a migration.
- Web runtime parity: `apps/web/server/routes/api.ts` only when web support is in scope.
- Tracker-specific documentation: `Documentation/Contracts/Trackers/<Tracker>.md`.

## Where Not To Add New Code

- Do not add renderer-to-SQLite shortcuts.
- Do not create an old-style `ipc-handlers.ts` monolith.
- Do not create `main/services/*` compatibility folders.
- Do not add product features from documentation gaps alone.
- Do not put local generated data, screenshots, `.codex/`, `.data/`, build output, or dependency folders into documentation trees.

## Notes

- The current source tree does not include a login/auth flow.
- Insight Lab is mounted as the `stats` page and should not be documented as obsolete.
- Exercise search is a support feature embedded in Quick Entry, not a top-level page.
- Weight is the current reference specialized tracker.
