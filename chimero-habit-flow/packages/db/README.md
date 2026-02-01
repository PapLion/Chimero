# packages/db — Chimero Database

Paquete compartido de base de datos Drizzle + SQLite (better-sqlite3) para Chimero Habit Flow.

## ⚠️ Estrategia de migraciones en tiempo de ejecución

**`db:push` está deprecado** para este proyecto debido al conflicto ABI entre Electron y Node.js:

- **Electron v40** usa `NODE_MODULE_VERSION 143`
- **Node.js v22** usa `NODE_MODULE_VERSION 127`
- El módulo nativo `better-sqlite3` compilado para Electron no puede cargarse en Node.js (CLI)

**Solución:** Las migraciones se ejecutan en el arranque de la app Electron, dentro del Main process, donde `better-sqlite3` siempre carga el binario correcto.

## Scripts disponibles

| Script | Uso |
|--------|-----|
| `pnpm db:generate` | **Recomendado.** Genera archivos SQL de migración en `./drizzle` a partir del schema. Ejecutar tras modificar `schema.ts`. |
| `pnpm db:push` | **Deprecado.** Falla por ABI mismatch. No usar. |
| `pnpm db:studio` | Abre Drizzle Studio (requiere Node.js compatible; puede fallar por better-sqlite3). |
| `pnpm db:reset` | **Dev.** Borra el archivo `chimero.db` en userData (Windows: `%LOCALAPPDATA%/Chimero/chimero.db`). Útil para forzar recreación con todas las migraciones si hay schema drift. |

## Flujo de trabajo

1. **Modificar schema:** Edita `src/schema.ts`
2. **Generar migración:** `pnpm --filter db db:generate`
3. **Ejecutar app:** Las migraciones se aplican automáticamente al iniciar Electron

## Ubicación de la base de datos

La DB se crea en `app.getPath('userData')/chimero.db`:

- **Windows:** `%LOCALAPPDATA%/Chimero/chimero.db` (la app fija `userData` en `Chimero`)
- **macOS:** `~/Library/Application Support/Chimero/chimero.db`
- **Linux:** `~/.config/Chimero/chimero.db`

Si tras añadir columnas al schema ves `SqliteError: no such column`, ejecuta `pnpm --filter db db:reset` y vuelve a iniciar la app para recrear la DB con todas las migraciones.
