Aquí tienes el plan técnico detallado para el Backend del MVP. Está diseñado para ser leído tanto por ti (para entender la arquitectura) como por un agente de IA (Cursor) para ejecutarlo paso a paso.

---

# 📘 Plan Técnico Backend Chimero (MVP)

Este documento define la hoja de ruta para completar la capa de persistencia y lógica de negocio de Chimero. El objetivo es transformar los mocks actuales en un sistema robusto, local-first y performante.

## 1. Resumen de Estado Actual

* **Arquitectura:** Electron (Main/Renderer) + React + SQLite (Better-SQLite3) + Drizzle ORM.
* **Datos:** Schema base definido (`trackers`, `entries`, `settings`). Migraciones automáticas al inicio.
* **UI:** Frontend avanzado (Bento Grid, QuickEntry) pero desconectado parcialmente de la lógica real.
* **Deuda Técnica:** Mocks en cálculo de rachas (streaks), assets no persistidos, recordatorios inexistentes en backend.

## 2. Objetivos de Backend para el MVP

1. **Persistencia Total:** Eliminar cualquier dependencia de `localStorage` o mocks para datos core.
2. **Atomicidad:** Las operaciones de escritura (crear tracker, añadir entry) deben ser transaccionales.
3. **Performance:** Cálculos pesados (streaks, stats) en el Main Process (Node.js) o DB, entregando datos listos a la UI.
4. **Optimistic UI:** La interfaz asume éxito inmediato; el backend valida en segundo plano.

---

## 3. Diseño de Notificaciones / Recordatorios (Reminders)

### Estrategia

El Main Process de Electron actuará como un "Cron Job" local. Un intervalo (`setInterval`) comprobará cada minuto si hay recordatorios pendientes en la DB.

### Schema Drizzle (`reminders` table)

Necesitamos una tabla dedicada para permitir múltiples recordatorios por tracker o recordatorios generales.

```typescript
// packages/db/src/schema.ts (Conceptual)
export const reminders = sqliteTable('reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  trackerId: integer('tracker_id').references(() => trackers.id), // Opcional (puede ser general)
  title: text('title').notNull(),
  time: text('time').notNull(), // Formato "HH:MM" (24h)
  days: text('days', { mode: 'json' }).$type<number[]>(), // Array [0,1,2,3,4,5,6] (Domingo-Sábado)
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  lastTriggered: integer('last_triggered', { mode: 'timestamp' }), // Para evitar doble disparo
});

```

### Lógica Main Process

1. **Check Loop:** Cada 60s, consultar `reminders` donde `enabled = true` y `time` coincida con la hora actual.
2. **Dispatch:**
* Si la app está abierta: Enviar evento IPC `on-reminder` al Renderer (para mostrar Toast/Modal).
* Si la app está minimizada/cerrada (tray): Usar API nativa `Notification`.



### IPC Handlers

* `get-reminders()`: Devuelve lista para gestionar en UI.
* `upsert-reminder(data)`: Crea o actualiza.
* `delete-reminder(id)`: Borra.
* `toggle-reminder(id, boolean)`: Activa/desactiva rápidamente.

---

## 4. Diseño de Assets Backend

### Estrategia

No guardar BLOBs (imágenes) en SQLite. Guardar archivos en el sistema de archivos (`userData/assets`) y referencias en la DB.

### Schema Drizzle (`assets` table)

Refinar la tabla existente:

```typescript
export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filename: text('filename').notNull(), // Nombre físico en disco (UUID.jpg)
  originalName: text('original_name'), // Nombre original subido
  path: text('path').notNull(), // Ruta relativa desde userData/assets
  type: text('type').notNull(), // 'image', 'video'
  size: integer('size'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});
// Nota: La relación con entries se hace en una tabla pivote o foreign key en entries si es 1:1.
// Recomendación MVP: Tabla pivote `entries_assets` para futuro soporte múltiple, o columna `asset_id` en entries si es simple.

```

### Lógica Main Process

* **Gestión de Archivos:**
* Al recibir un archivo (upload): Copiarlo a `app.getPath('userData') + /assets/` con un nombre único (UUID).
* Al borrar un asset: Eliminar el archivo físico y luego el registro en DB.



### IPC Handlers

* `upload-asset(filePath)`: Copia archivo, crea registro DB, devuelve objeto Asset.
* `get-assets({ limit, offset })`: Paginación para la galería.
* `delete-asset(id)`: Borrado físico + lógico.

---

## 5. Diseño de Custom Trackers

### Estrategia

Usar un patrón "Entity-Attribute-Value" simplificado vía JSON. El schema relacional se mantiene limpio, y la flexibilidad vive en una columna `config`.

### Schema Update (`trackers` table)

Asegurar que estos campos existan:

```typescript
// En tabla trackers existente
config: text('config', { mode: 'json' }).$type<{
  min?: number;
  max?: number;
  units?: string; // "kg", "km", "páginas"
  options?: string[]; // Para tipo lista: ["Bien", "Regular", "Mal"]
  icon?: string; // Nombre del icono Lucide
  color?: string; // Hex o nombre Tailwind
}>(),
type: text('type').notNull(), // 'counter', 'boolean', 'range', 'list', 'timer'
isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false),

```

### Integración Entries

La tabla `entries` debe tener una columna `value` flexible.

* En SQLite, `value` puede ser `real` (número) o `text`.
* *Recomendación:* Usar una columna `value` numérica para rangos/contadores y una columna `note` o `text_value` para listas/textos. O simplemente guardar el valor principal en una columna `value` (numérica) y mapear índices de listas a números (0=Mal, 1=Bien).

### IPC Handlers

* `reorder-trackers(ids[])`: Recibe array de IDs en nuevo orden, actualiza campo `order` en transacción.

---

## 6. Streaks & Stats (Calendar + Header)

### Estrategia

Evitar cálculos complejos en el Renderer (React). El Main Process debe entregar el dato "masticado".

### Queries SQL / Lógica (Drizzle)

1. **Día Activo:** Un día donde `count(entries) > 0`.
2. **Current Streak (Racha actual):**
* *Opción SQL pura:* Compleja en SQLite (requiere Recursive CTEs).
* *Opción Híbrida (Recomendada MVP):*
1. Query: `SELECT date FROM entries GROUP BY date ORDER BY date DESC LIMIT 365`.
2. JS (Main): Iterar fechas hacia atrás. Si hay un hueco mayor a 1 día (hoy o ayer), romper loop. Contar días consecutivos.
3. Es O(N) pero N es máx 365. Muy rápido.




3. **Header Stats:**
* `Activities`: `SELECT count(*) FROM trackers WHERE archived = 0`.
* `Tracked Hours`: Suma de entries tipo 'timer' (o cálculo aproximado).



### IPC Handlers

* `get-dashboard-stats()`: Devuelve `{ currentStreak, bestStreak, totalActivities, totalEntriesMonth }`.
* Este handler ejecuta las queries y la lógica JS interna y devuelve un JSON limpio.


* `get-calendar-month(year, month)`: Devuelve entradas + metadata para pintar el calendario.

---

## 7. Integración con TanStack Query

Estandarizar las "Keys" es vital para la invalidación de caché automática.

| Feature | Query Key | IPC Channel | Invalidate on Mutation |
| --- | --- | --- | --- |
| **Trackers** | `['trackers']` | `get-trackers` | `create-tracker`, `update-tracker`, `delete-tracker`, `reorder-trackers` |
| **Assets** | `['assets']` | `get-assets` | `upload-asset`, `delete-asset` |
| **Entries** | `['entries', { trackerId, month }]` | `get-entries` | `add-entry`, `delete-entry`, `update-entry` |
| **Stats** | `['stats']` | `get-dashboard-stats` | `add-entry`, `delete-entry` |
| **Reminders** | `['reminders']` | `get-reminders` | `upsert-reminder`, `delete-reminder` |

### Estrategia Optimistic

En `QuickEntry`, al dar click a "+":

1. `useMutation` actualiza inmediatamente la cache de `['stats']` (incrementando el contador visualmente).
2. Envía IPC `add-entry`.
3. Si falla, hace rollback.

---

## 8. MVP vs Post-MVP

| Feature | MVP (Ahora) | Post-MVP (Futuro) |
| --- | --- | --- |
| **Reminders** | Tabla simple, check cada minuto, notificación nativa. | Recordatorios complejos (geolocalización, snoozing inteligente). |
| **Assets** | Guardado local, referencia en DB. | Generación de Thumbnails (sharp), compresión, soporte video. |
| **Trackers** | Configuración JSON manual (form simple). | Editor visual drag-and-drop de configuración. |
| **Stats** | Cálculo JS en Main de rachas simples. | Correlaciones SQL (Pearson), Heatmaps anuales complejos. |
| **Backup** | Manual (copiar archivo .db). | Automático a carpeta elegida / Cloud. |
| **Update** | Manual. | Auto-updater (electron-builder). |

---

## ✅ Visual Schema (Para tu comprensión)

```mermaid
graph TD
    subgraph "Frontend (Renderer)"
        UI[React UI] -->|TanStack Query| QueryLayer
        QueryLayer -->|invoke| IPC_Bridge[preload.ts]
    end

    subgraph "Backend (Main Process)"
        IPC_Bridge -->|handle| Handlers[IPC Handlers]
        
        Handlers -->|CRUD| AssetsManager[Assets Logic (FS)]
        Handlers -->|CRUD| ReminderService[Cron Job / Notifs]
        Handlers -->|CRUD & Aggregation| DB_Service[Drizzle Service]
        
        AssetsManager -->|Write/Read| FileSystem[(User Data / Assets)]
        DB_Service -->|SQL| SQLite[(chimero.db)]
    end

```

---

## 📋 Lista de Tareas para Cursor (Roadmap Backend)

Aquí tienes los bloques de trabajo listos para asignar.

### Bloque A: Cimientos de Datos y Assets (Semana 3.1)

* [ ] Actualizar Schema: Crear tabla `reminders` y actualizar `trackers` (campo config) y `assets`.
* [ ] Generar migraciones Drizzle y verificar `db:generate`.
* [ ] Implementar `AssetsManager` en Main: funciones `saveFile` y `deleteFile`.
* [ ] IPC Assets: `upload-asset`, `get-assets`, `delete-asset`.
* [ ] Conectar `AssetsPage` frontend con `useQuery(['assets'])`.

### Bloque B: Reminders y Notificaciones (Semana 3.2)

* [ ] Implementar `ReminderService` en Main: `setInterval` que chequea DB.
* [ ] IPC Reminders: `get-reminders`, `upsert-reminder`, `delete-reminder`.
* [ ] Conectar Frontend: Modal de notificaciones leyendo de `['reminders']`.
* [ ] Integrar notificación nativa de Electron.

### Bloque C: Custom Trackers & Stats (Semana 3.3)

* [ ] Refinar `create-tracker` para aceptar objeto `config` JSON completo.
* [ ] Implementar lógica de `get-dashboard-stats`: cálculo de rachas en backend.
* [ ] Conectar Header UI a `['stats']`.
* [ ] Conectar Calendar UI a datos reales de entries y reminders.

### Bloque D: Pulido y Conexión Final (Semana 4)

* [ ] Revisar todas las mutaciones de TanStack Query para asegurar invalidación correcta.
* [ ] Verificar atomicidad: ¿Qué pasa si falla el guardado de un archivo pero se crea la entrada en DB? (Implementar transacción o rollback manual).
* [ ] Limpieza de código: Borrar cualquier mock residual en `lib/store.ts` o componentes.