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
    shared/
      src/
        contracts/
        domain/
          calendar.ts
          streak.ts
          tags.ts
          weight.ts
        features/
    ui/
  test/
  tests/
```

## Notes

- The current source tree does not include a login/auth flow.
- Local artifacts such as `.codex/`, `.data/`, screenshots, build output, and dependency folders are not part of the useful repo tree.
