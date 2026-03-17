# Notas pendientes & deuda técnica — Chimero Life OS

---

## Épica 2 — Lógica diferenciada por arquetipo

### Estado
Gap de **spec del cliente**, no de código. El código actual está completo.

### Qué dijo el cliente
> "It also looks like some of the important trackers such as Books, Gaming, Media, Diet were removed. I have ideas for all those as well."

Las ideas específicas nunca llegaron en los mensajes visibles.

### Decisión actual
Se dejó como **texto libre** intencionalmente.

### Qué hacer cuando el cliente especifique
- `apps/electron/src/renderer/src/lib/entry-config.ts` → `getEntryConfig()` líneas 19-183
  - Books → líneas 24-33 / Gaming → 48-57 / Media → 60-69 / Diet → 105-114

### Prioridad
🟡 Baja — retomar cuando el cliente lo especifique.

---

## Épica 4 Capa 1 — Deuda técnica

### DT-1: Campo `description` faltante en `upsertReminder`
**Archivo:** `apps/electron/src/main/ipc-handlers.ts` → línea ~42
**Prioridad:** 🟡 Baja — revisar antes del commit de Épica 4 completa.

### DT-2: Errores TS6133 preexistentes sin resolver
- `TrackerDetailView.tsx` línea 86 — `handleDeleteEntry` declared but never read
- `TrackerDetailView.tsx` línea 555 — `entry` declared but never read
- `modals/ConfirmDeleteDialog.tsx` línea 1 — `React` imported but never read

**Prioridad:** 🔴 Resolver antes del commit del 18/03/2026 — son 3 líneas cada uno.

### DT-3: Migración resuelta — `CREATE TABLE` sin `IF NOT EXISTS`
**Estado:** ✅ Resuelto por agente de Warp. Usar siempre `CREATE TABLE IF NOT EXISTS` en futuras migraciones.

---

## Épica 4 Capa 2 — Deuda técnica

### DT-4: Avatar foto no carga aunque exista `avatarAssetId` en burbujas
**Archivo:** `ContactBubblesGrid.tsx` → líneas 160-162
**Prioridad:** 🟠 Media — las burbujas siempre muestran iniciales aunque haya foto asignada.

### DT-5: Campo de nota no visible en estado vacío de Social tracker
**Prioridad:** 🟡 Baja — verificar cuando haya contactos.

### DT-6: JSX condicional complejo en QuickEntry — legibilidad
**Archivo:** `QuickEntry.tsx` → bloque `isSocialTracker`
**Prioridad:** 🟡 Baja — extraer a `<GenericEntryInputs />` en polish.

---

## Épica 4 Capa 3 — Deuda técnica

### DT-7: QuickEntry no se cierra al navegar a "Add contact"
**Archivo:** `ContactBubblesGrid.tsx` → `handleAddContact`
**Acción:** Llamar a `setQuickEntryOpen(false)` antes de navegar.
**Prioridad:** 🟠 Media — verificado visualmente, incómodo para el usuario.

### DT-8: Burbujas sin método para asignar foto desde assets existentes
**Prioridad:** 🟡 Baja — aclarar con cliente si quiere seleccionar de assets existentes o solo upload nuevo.

### DT-9: Foto de perfil no se guarda ni se muestra en ContactProfilePage
**Archivos:** `ContactProfilePage.tsx` + IPC handler `update-contact`
**Qué es:** El file picker abre y el usuario selecciona una foto, pero la imagen no se actualiza visualmente ni queda guardada.
**Acción:** Investigar cómo `EditEntryDialog` almacena y recupera imágenes de assets para replicar ese flujo en `ContactProfilePage`.
**Prioridad:** 🔴 Alta — feature prometida al cliente que visualmente no funciona.

### DT-10: Vista de gestión de contactos no existe en Social tracker
**Qué es:** No hay forma de ver/gestionar contactos fuera de QuickEntry.
**Acción:** Evaluar sección "Manage contacts" en TrackerDetailView de Social o página separada.
**Prioridad:** 🟠 Media.

### DT-11: Assets no disponibles en QuickEntry ("No assets available")
**Qué es:** En QuickEntry aparece "No assets available" aunque desde AssetsPage sí se ven.
**Prioridad:** 🔴 Alta — bug preexistente que bloquea el flujo de assets en quick entry.

---

## Épica 4 — Gaps de spec / decisiones pendientes con el cliente

### GP-1: Social tracker — valor numérico sin rango definido
**Opciones:** A) número libre, B) rango 1-10, C) solo mood sin número
**Problema de consistencia:** el mood de QuickEntry no se refleja en la vista de Entries.
**Prioridad:** 🟡 Requiere decisión del cliente.

### GP-2: Social tracker — QuickEntry vs Edit no son consistentes
**Opciones:** A) aceptar flujos distintos, B) unificar campos en Edit modal.
**Prioridad:** 🟡 Requiere decisión antes de implementar.

---

## Épica 4 Capa 3 — Nota de build
`pnpm build` ejecutado manualmente. Resultado: ✅ sin errores nuevos.
Los errores existentes (`TS6133` en TrackerDetailView y ConfirmDeleteDialog) son preexistentes de Épica 1.

---

## Épica 5 Feature A — Exercise DB

### DT-12: URL incorrecta del JSON de free-exercise-db
**Estado:** ✅ Resuelto. La URL correcta es `.../dist/exercises.json`, no `.../exercises.json` en la raíz.

### DT-13: Vista de entries de Exercise no refleja los datos guardados
**Archivo:** `TrackerDetailView.tsx` → sección de renderizado de entries para tracker Exercise
**Qué es:** Cuando el usuario registra un workout desde QuickEntry (con ejercicios, sets, reps, weight guardados en `entry.metadata`), la vista de Entries del tracker Exercise muestra datos genéricos (value numérico + nota) en lugar del contenido real del workout. El usuario ve "1" como valor en lugar de "Bench Press 3×8 80kg".
**Mismo patrón que:** DT Social (GP-1/GP-2) — QuickEntry guarda datos ricos en metadata pero la vista de Entries no los lee.
**Acción:** En `TrackerDetailView.tsx`, detectar si el tracker es Exercise (mismo patrón que `isExerciseTracker` en QuickEntry) y renderizar las entries leyendo `entry.metadata.exercises[]`. Cada ejercicio del array debe mostrarse como "Nombre · Xsets × Yreps · Zkg". Si metadata está vacío o no existe, fallback al value genérico.
**Prioridad:** 🟠 Media — los datos están correctamente en DB, solo falta la vista de lectura.