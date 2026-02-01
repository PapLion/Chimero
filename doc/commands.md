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

## Notas

- **Migraciones en runtime:** Al iniciar Electron, las migraciones de `packages/db/drizzle/` se aplican automáticamente.
- La DB vive en `app.getPath('userData')/chimero.db` (ej: `%APPDATA%/chimero-electron/chimero.db`).
