# Comandos para Chimero (PowerShell)

Ejecuta estos comandos desde la raíz del monorepo `chimero-habit-flow` o según se indique.

## Instalación de dependencias

```powershell
cd chimero-habit-flow
pnpm install
```

## Base de datos (Drizzle)

```powershell
# Generar migraciones SQL (tras modificar schema.ts)
pnpm --filter db db:generate

# Abrir Drizzle Studio (opcional, puede fallar por ABI mismatch)
pnpm --filter db db:studio
```

> **db:push está deprecado.** Las migraciones se ejecutan automáticamente al iniciar la app Electron (Runtime Migration Strategy).

## Desarrollar la app   

```powershell
cd chimero-habit-flow
pnpm dev
```

## Build de producción

```powershell
cd chimero-habit-flow
pnpm build
```

## Reconstruir better-sqlite3 (si hay errores nativos)

```powershell
cd chimero-habit-flow/apps/electron
pnpm exec electron-rebuild -f -w better-sqlite3
```

## Backend – Development Log & Commands

### Successes
- **Migración 0003:** Añadida manualmente `0003_backend_mvp_reminders_assets.sql` (reminders con time/days/enabled; assets con original_name, type). Entrada añadida en `drizzle/meta/_journal.json`.
- **Migración 0004:** `0004_reminders_date.sql` – columna `date` (text, nullable) en `reminders` para recordatorios puntuales (YYYY-MM-DD). Entrada en `_journal.json`.
- **Migración 0005:** `0005_reminders_completed_at.sql` – columna `completed_at` (integer, nullable) en `reminders` para persistir “completado” en UI. Entrada en `_journal.json`.
- **Migraciones en runtime:** Al arrancar la app (`pnpm dev` o ejecutable), las migraciones 0000–0005 se aplican automáticamente desde `packages/db/drizzle/`. No es necesario ejecutar `db:push` ni `db:migrate` manualmente.
- **Columnas `date` y `completed_at` en reminders:** Si la DB existía antes de las migraciones 0004/0005, al arrancar la app se ejecuta `ensureRemindersColumns()` (en `apps/electron/src/main/database.ts`), que añade las columnas si faltan. Si ves `SqliteError: no such column: date`, reinicia `pnpm dev` una vez; el fallback las creará. Opcional: borrar `userData/chimero.db` (carpeta Chimero en `%LOCALAPPDATA%` o `%APPDATA%`) y volver a arrancar para empezar con DB limpia.
- **Schema:** Cambios en `packages/db/src/schema.ts` (reminders, assets) y generación de migración manual (Drizzle interactivo no usado).
- **Build:** `pnpm build` (turbo + electron-vite) compila correctamente main, preload y renderer.
- **Backend integration:** Nuevo IPC `update-asset(id, { originalName })`; protocolo `chimero-asset` con sanitización de path; queryKeys.reminders añadido en queries.ts.
 - **Build config Electron:** `electron` movido a `devDependencies` en el `package.json` raíz y en el paquete de Electron. `pnpm package` compila correctamente (turbo + electron-vite) y electron-builder llega a la fase de empaquetado sobre `dist/win-unpacked` antes de fallar por configuración de entrada (`index.js` en app.asar).

### Failures / Manual Actions Required
- **db:generate:** Si se ejecuta `pnpm --filter db db:generate` tras cambiar el schema, Drizzle puede preguntar si una columna es nueva o renombrada (interactivo). Para evitar prompts, crear/editar la migración SQL a mano y actualizar `_journal.json`.
- **electron-builder (actual):** `pnpm package` llega a empaquetar pero falla con *Application entry file "index.js" ... is corrupted / not found in app.asar*. Pendiente ajustar configuración de `electron-builder` (entrypoint) para que apunte a `out/main/index.js` en lugar de `index.js` en la raíz del paquete.
- **SQLite/Electron:** Si hay errores nativos con better-sqlite3, ejecutar `pnpm exec electron-rebuild -f -w better-sqlite3` desde `apps/electron`.

## Notas

- **Migraciones en runtime:** Al iniciar Electron, las migraciones de `packages/db/drizzle/` se aplican automáticamente.
- La DB vive en `app.getPath('userData')/chimero.db` (en dev: carpeta `Chimero` en LOCALAPPDATA/APPDATA).
