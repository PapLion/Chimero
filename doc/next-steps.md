# Próximos Pasos - Chimero

## ✅ Completado (Week 1 & 2)

| Item | Estado |
|------|--------|
| Schema Drizzle: trackers, entries, tags, assets, settings | ✅ |
| Drizzle + better-sqlite3 inicializado en Main (database.ts) | ✅ |
| IPC handlers: getTrackers, createTracker, getEntries, addEntry | ✅ |
| Tipos compartidos (Tracker, Entry) en packages/db | ✅ |
| QuickEntry importa tipos desde @packages/db (vía store) | ✅ |
| Dashboard widgets compatibles con schema Drizzle | ✅ |
| Preload API con métodos tipados | ✅ |

## 📋 Pendiente para Week 3 (Dashboard & Visualización)

- [ ] Conectar TanStack Query a IPC (reemplazar mock en store por datos reales)
- [ ] Implementar dnd-kit para persistir layout de widgets en DB
- [ ] Tabla `widgets` o `settings` para layout (posiciones)
- [ ] Widgets: Mood Graph, Tasks virtualizado, Media lazy loading
- [ ] Sistema de Themes (Dark/Low-contrast) en settings

## 📋 Pendiente para Week 4 (Analytics & Deploy)

- [ ] Página de Estadísticas: correlaciones SQL, rachas
- [ ] electron-builder configurado para .exe / .dmg
- [ ] Backups automáticos locales
- [ ] Tests E2E con Playwright

## 🔧 Migración UI → DB (Prioridad Alta)

La UI sigue usando **mock data** en el store. Para conectar:

1. En `store.ts`: sustituir `mockTrackers` / `mockEntries` por llamadas a `window.api.getTrackers()` y `window.api.getEntries()` (o TanStack Query).
2. En `addEntry`: además del optimistic update local, llamar a `window.api.addEntry()` para persistir.
3. Seed inicial: script para poblar la DB con trackers por defecto la primera vez.

## Tipos de Datos

- **Tracker type mapping**: DB usa `numeric`/`range`/`text`; UI usa `counter`/`rating`/`list`. El mapper en `ipc-handlers.ts` traduce automáticamente.
- **Reminders**: No hay tabla en el schema actual. Crear tabla `reminders` o integrar en `entries` con tipo especial.
