# GAPS-ANALYSIS.md — Chimero
> **Cuatro pasadas exhaustivas** sobre los 4 elementos:
> código real completo · Notion cliente · chat history completo · CLIENT-REQUIREMENTS.md
>
> **Doble enfoque:**
> - 🎯 **80% Producto** — lo que el cliente pidió y no está o está mal
> - 🏗️ **20% Código** — deuda técnica, malas prácticas, arquitectura que explota

---

## Leyenda

| Símbolo | Significado |
|---|---|
| 🔴 Crítico | Rompe algo prometido o bloquea valor central del producto |
| 🟠 Alto | Feature incompleta o patrón que genera bugs continuos |
| 🟡 Medio | Detalle faltante o decisión cuestionable |
| 🟢 / ⏸ | Cosmético o backburner aceptado por el cliente |
| ✅ | Implementado y funcional |
| 🔄 | Parcialmente implementado |
| ❌ | No existe en ninguna forma |
| ☠️ | Implementado pero incorrecto / lógica muerta o contradictoria |
| P1/P2/P3/P4 | Pasada en que se encontró el gap |

---

# PARTE 1 — GAPS DE PRODUCTO (80%)

---

## BLOQUE A — MOOD TRACKER

### GAP-01 — Escala: triple inconsistencia interna + cliente quiere colores
**🔴 Crítico | ☠️ | P1+P4**

| Componente | Escala que muestra |
|---|---|
| `ipc-handlers.ts` defaultTrackers config | `{ max: 5 }` — escala hasta 5 |
| `QuickEntry.tsx` | 1-10 con emojis |
| `WidgetCard.tsx` MoodWidget | 1-10 con dots y emojis |
| `EditEntryDialog.tsx` líneas ~160-175 | `[1,2,3,4,5].map(rating => ...)` hardcodeado — escala 1-5 |
| Notion cliente | "Maybe red orange yellow green colors instead" |

Tres interfaces para el mismo tracker con tres escalas distintas, antes incluso de implementar el cambio a colores que pidió el cliente. `EditEntryDialog` no lee `tracker.config.max` — si se cambia la config, el dialog no lo refleja.

**Fix:** Unificar config a `{ max: 4 }` (4 colores), cambiar input a selector de color en los 3 formularios, conservar `value` numérico internamente (1=rojo, 2=naranja, 3=amarillo, 4=verde).

---

### GAP-02 — Split before/after work no soportado
**🟠 Alto | ❌ | P1**

- Backend soporta múltiples entries por día — OK
- UI no agrupa ni distingue entries pre/post trabajo
- Notion cliente: "3-10 mood entries per day, several before work and several after — key split"

Necesita campo `context` en entries (o en `metadata`). No está en schema, no en UI.

---

### GAP-03 — Tags: tablas en schema, funcionalidad 100% muerta
**🔴 Crítico | ☠️ | P1+P3**

- `schema.ts`: tablas `tags` y `entries_to_tags` existen
- `ipc-handlers.ts`: cero handlers para tags — `get-tags`, `create-tag`, `add-tag-to-entry` no existen
- `entriesToTags` se exporta desde `schema.ts` pero nunca se importa en `ipc-handlers.ts`
- Ningún componente del renderer usa tags en ninguna forma
- Notion + chat: tags son la columna vertebral de correlaciones Diet→síntomas, Food→mood

Las tablas existen en SQLite pero son completamente inaccesibles. 0% funcional.

---

### GAP-04 — Tag hierarchy: schema plano, cliente necesita DAG
**🔴 Crítico | ❌ | P1+P3**

- `schema.ts`: `tags: { id, name, color }` — sin relaciones
- Notion imagen cliente: Hamburger tiene 2 padres simultáneos (Wheat Y Beef)
- Necesita tabla `tag_relationships(tagId, parentTagId)`

Sin esto la correlación "ingrediente → síntoma a través de jerarquía" es arquitecturalmente imposible.

---

### GAP-05 — Heatmap anual de Mood no existe
**🟡 Medio | ❌ | P2**

- Código: solo sparkline básica en MoodWidget
- Imagen cliente (mockup): heatmap mes×día coloreado por valor (como GitHub contributions)
- `TrackerDetailView.tsx` tiene un heatmap genérico en la tab Graphs, pero Mood no tiene uno específico coloreado por estado de ánimo

---

### GAP-06 — Tags de causa en Mood entries
**🟠 Alto | ❌ | P1**

- Notion cliente: "Yes, causes are good for major moods, most of the time I'll have no cause"
- No hay campo de tags en el formulario de Mood ni en ningún otro tracker

---

---

## BLOQUE B — WEIGHT TRACKER

### GAP-07 — Unidades hardcodeadas en kg
**🟠 Alto | ❌ | P1+P3**

- `ipc-handlers.ts` defaultTrackers: `{ unit: 'kg', goal: 70 }`
- `TrackerDetailView.tsx` línea 722: `|| "kg"` hardcodeado como fallback
- `WeightWidget` en `WidgetCard.tsx`: `const unit = ... || "kg"` hardcodeado
- `entry-config.ts`: no tiene lógica de unidades para el placeholder
- Notion cliente: "Pounds as default but switchable"

Necesita selector lbs/kg + persistencia en settings + conversión en display.

---

### GAP-08 — Indicadores verde/rojo y streak hacia meta
**🟡 Medio | ❌ | P1**

- No existe lógica de target weight ni colores de progreso
- Notion cliente: "Green when losing toward goal, red when not. Show 4-day loss/neutral streak"

---

### GAP-09 — Medición de cintura
**🟡 Medio | ❌ | P1**

- Solo `value` numérico (el peso). `metadata` no se usa para measurements
- Notion cliente: "Weight primary, basic waist measurement"

---

### GAP-10 — Rangos de tiempo extendidos en gráficos
**🟡 Medio | 🔄 | P1**

- `TrackerDetailView.tsx`: solo `"1M" | "3M" | "1Y"`
- Notion cliente: 3/7/14/30/60/90/180/270 días, 1/2/3 años seleccionables

---

---

## BLOQUE C — EXERCISE TRACKER

### GAP-11 — Templates/presets de rutina — feature core ausente
**🔴 Crítico | ❌ | P1**

- `ExerciseSearch.tsx`: flujo de búsqueda individual ejercicio por ejercicio
- `schema.ts`: no existe `workout_templates` ni `workout_template_exercises`
- Notion cliente: "Presets called 'Full body 1' — click → all exercises as cards side by side → +/- adjust → save"

Son dos flujos completamente distintos. No existe ninguna tabla ni IPC para templates.

---

### GAP-12 — Detail view y Widget muestran "1" en lugar del workout real (DT-13)
**🔴 Crítico | ☠️ | P1+P3**

- `ipc-handlers.ts`: `value: selectedExercises.length`, `metadata: { exercises: [...] }`
- `TrackerDetailView.tsx`: Exercise cae en el default → muestra `entry.note || 'Value: 1'`
- `ExerciseWidget` en `WidgetCard.tsx`: lee `entry.value` (count) y `entry.note` — **nunca lee `metadata.exercises[]`**

El workout completo con sets/reps/weight está correctamente guardado en DB pero es inaccesible en **toda la UI** — ni en el widget ni en el detalle ni en el calendario.

---

### GAP-13 — UX popup — cliente dijo que no lo quería
**🟠 Alto | ☠️ | P1**

- Código: Exercise usa QuickEntry dialog popup
- Notion cliente: "Don't really like the popout function for this one. Maybe different type of page integrated"

---

### GAP-14 — PR auto-detection
**🟡 Medio | ❌ | P1**

- No hay comparación histórica de sets/reps/weight por ejercicio
- Requiere query que compare set actual vs historial del mismo ejercicio

---

### GAP-15 — Entrada de pasos/steps diarios
**🟡 Medio | ❌ | P1**

- Notion cliente: "Walking trackers that I'll want to input my daily steps at some point"

---

---

## BLOQUE D — BOOKS TRACKER

### GAP-16 — Modelo de datos incorrecto + entry-config contradice decisión del cliente
**🟠 Alto | ☠️ | P1+P3**

- `ipc-handlers.ts`: Books type `text`, config `{}` — nota libre sin estructura
- `entry-config.ts` líneas 19-28: `noteLabel: "Pages Read"` — solicita páginas por sesión
- Notion cliente: "Log when started, days I read, finish date. Tracking pages per session is too much friction and I won't use it"

`entry-config.ts` activamente solicita algo que el cliente decidió no querer. Necesita: `metadata: { status, startDate, endDate, readingDays[] }` + corregir el placeholder.

---

### GAP-17 — Rating decimal (3.1, 3.2 por décimas)
**🟡 Medio | ❌ | P1**

- No hay UI de rating para Books en ningún componente
- Notion cliente: "Rate books 1-5 stars with 3.1, 3.2 — every tenth"

---

### GAP-18 — Shelves (Reading / Finished / Want to Read)
**🟡 Medio | ❌ | P1**

- No existe estructura de status/shelf para Books
- Notion cliente: "Separate shelves: Reading / Finished / Want to Read"

---

---

## BLOQUE E — GAMING TRACKER

### GAP-19 — TrackerDetailView y WidgetCard tratan Gaming como Media
**🟠 Alto | ☠️ | P1+P3**

- `TrackerDetailView.tsx`: `isMediaType` incluye `tracker.icon === "gamepad-2"` → render de grid de thumbnails
- `WidgetCard.tsx`: misma condición → `MediaWidget` (grid de thumbnails)
- El cliente quiere: breakdown por juego, horas totales, time-of-day heatmap, correlaciones por juego

Gaming no tiene render específico en ningún componente de vista.

---

### GAP-20 — Wins/losses para correlaciones con mood
**🟡 Medio | ❌ | P1**

- Notion cliente: "Certain games should have wins/losses to correlate with mood. X game with losses makes mood lower"
- Necesita campo win/loss en `metadata`, juego como campo separado, lógica de correlación por juego

---

### GAP-21 — Media tracker subcategorías (YouTube/Twitch/Podcast/Misc) perdidas
**🟡 Medio | ❌ | P4**

- App original del cliente (imagen 1 del chat): Media tenía subcategorías YouTube/Twitch/Podcast/Misc
- Implementación actual: texto libre sin subcategorías
- No está en GAPS-ANALYSIS ni en CLIENT-REQUIREMENTS.md

---

---

## BLOQUE F — DIET TRACKER

### GAP-22 — Modelo de datos incorrecto — calorías vs ingredientes con tags
**🔴 Crítico | ☠️ | P1+P3**

- `ipc-handlers.ts`: Diet type `numeric`, unit `kcal`
- `TrackerDetailView.tsx` línea 817: `{Math.round(value)} kcal` hardcodeado
- `entry-config.ts`: `mainLabel: "Calories"`, `mainPlaceholder: "Calories (e.g., 450)"` — refuerza el modelo incorrecto
- Notion cliente: "Log foods eaten with ingredient-level tags (beef, potato chips, spices). Primary link: Diet tags → Health tracker"

El modelo de datos y los 3 componentes que lo presentan (`entry-config`, `TrackerDetailView`, `WidgetCard`) asumen calorías. Cambiar el modelo requiere actualizar los 4 archivos.

---

---

## BLOQUE G — SOCIAL / CRM TRACKER

### GAP-23 — Dos sistemas de datos desconectados para el mismo tracker
**🔴 Crítico | ☠️ | P4**

**Este gap no estaba documentado en pasadas anteriores.**

| Sistema | Qué guarda | Quién lo lee |
|---|---|---|
| `entries` + `entry.note` | "@mention" o texto libre | `SocialWidget` en `WidgetCard.tsx` (líneas 828-840: parsing de `@mentions`) |
| `contact_interactions` | contactId, mood, timestamp, notes | `ContactProfilePage.tsx` — nadie más |

`QuickEntry.tsx` para Social hace dos cosas: (1) crea una entry con `note = texto`, (2) crea contact_interactions. El `entryId` en la interacción es `null` (hardcodeado en línea 253: `entryId: null`). `SocialWidget` nunca lee de `contact_interactions` — solo parsea `@mentions` de `entry.note`.

**Resultado:** Los datos de "quién vi hoy con qué mood" están en `contact_interactions` pero el widget los ignora. El widget muestra nombres parseados de texto libre como "@Mom" pero no tiene acceso al sistema real de contactos.

---

### GAP-24 — Foto de contacto rota en burbujas (DT-9)
**🔴 Crítico | 🔄 | P1+P3**

- `ContactBubblesGrid.tsx` líneas 158-165: ambas ramas del condicional retornan iniciales
- IPC `update-contact` acepta `avatarAssetId` correctamente
- `ContactProfilePage.tsx` sí funciona correctamente (líneas 175-185 resuelven URL y renderizan `<img>`)

**Fix:** Replicar la lógica de `ContactProfilePage` en `ContactBubblesGrid`.

---

### GAP-25 — store.ts bug: edición de contactos siempre abre en modo CREATE
**🔴 Crítico | ☠️ | P3**

`store.ts` línea 63:
```typescript
setCurrentPage: (page) => set({ currentPage: page, selectedContactId: page === "contact" ? null : null })
```
El condicional `? null : null` siempre devuelve null. Ctrl+Click en burbuja → `setSelectedContactId(id)` → `setCurrentPage("contact")` resetea `selectedContactId` a null → `ContactProfilePage` entra en modo CREATE.

**Fix (1 línea):**
```typescript
setCurrentPage: (page) => set((state) => ({
  currentPage: page,
  selectedContactId: page !== "contact" ? null : state.selectedContactId
}))
```

---

### GAP-26 — Assets no disponibles en QuickEntry (DT-11) — causa raíz identificada
**🔴 Crítico | ☠️ | P1+P3**

5 call sites de `useAssets` con 4 queryKeys distintos en React Query:

| Componente | Parámetros | QueryKey | Tipo esperado |
|---|---|---|---|
| `AssetsPage` | ninguno | `['assets', undefined]` | `ApiAsset[]` |
| `EditEntryDialog` | ninguno | `['assets', undefined]` | `Map<number, Asset>` ❌ (es array) |
| `QuickEntry` | `{ limit: 50 }` | `['assets', { limit: 50 }]` | `array` |
| `BentoGrid` | `{ limit: 200 }` | `['assets', { limit: 200 }]` | `array` |
| `ContactProfilePage` | `{ limit: 200 }` | `['assets', { limit: 200 }]` | `array` |

`AssetsPage` y `EditEntryDialog` comparten el mismo queryKey `['assets', undefined]` pero esperan tipos distintos. `EditEntryDialog` llama `assets.values()` en un array — falla silenciosamente en runtime. `EditEntryDialog` también invalida con `queryKey: ["assets"]` (string) en lugar de `queryKeys.assetsRoot` — no invalida ninguno de los 4 caches.

---

### GAP-27 — Interaction duration faltante en schema
**🟡 Medio | ❌ | P1**

- `contact_interactions`: sin campo `duration_minutes`
- Notion cliente: "Maybe how long the interaction lasted"

---

### GAP-28 — Energy audit por contacto
**🟡 Medio | ❌ | P1**

- No hay agregación "8 positive, 1 negative, 2 neutral — net positive"
- `get-contact-interactions` devuelve lista raw sin cálculo de balance

---

### GAP-29 — Neglect alerts automáticos
**🟡 Medio | ❌ | P1**

- `reminder-service.ts` no tiene acceso a `contacts`
- Notion cliente: "You haven't talked to Sarah in 28 days"

---

### GAP-30 — Birthday reminders automáticos
**🟡 Medio | ❌ | P1**

- `contacts.birthday` existe en schema, reminder service nunca lo consulta
- Notion cliente: "Alex's birthday is in 12 days"

---

### GAP-31 — Contact type filter (friends/work/family) — campo faltante en schema
**🟡 Medio | ❌ | P1**

- `contacts` schema: sin campo `contact_type`
- Notion cliente: "Filter contacts by type: close friends, work, family"

---

### GAP-32 — Contacts sorting por frecuencia
**🟡 Medio | ❌ | P1**

- `ipc-handlers.ts` get-contacts: `orderBy(asc(contacts.name))` solo
- Notion imagen: sort arrows ↑↓ por frecuencia de contacto

---

### GAP-33 — QuickEntry no cierra al navegar a "Add contact" (DT-7)
**🟡 Medio | ☠️ | P1**

- `ContactBubblesGrid.tsx` `handleAddContact`: navega sin `setQuickEntryOpen(false)`
- Fix: 1 línea

---

### GAP-34 — No hay vista de gestión de contactos fuera de QuickEntry (DT-10)
**🟠 Alto | ❌ | P1**

- No existe página de listado/gestión independiente del QuickEntry flow

---

---

## BLOQUE H — TRACKERS COMPLETAMENTE AUSENTES

### GAP-35 — Sleep tracker
**🔴 Crítico | ❌ | P1**

- No en `defaultTrackers`, no en schema, sin IPC, sin UI
- Notion cliente: bedtime+waketime (app calcula horas), quality 1-10, interruptions, dreams/nightmares, bathroom trips
- Chat desde dic 2025: Sleep→Mood y Gaming→Sleep mencionados como correlaciones core

Sin Sleep el correlation engine no puede hacer los análisis más mencionados por el cliente.

---

### GAP-36 — Health/Symptoms tracker
**🔴 Crítico | ❌ | P1**

- No existe en ninguna forma
- Notion cliente: "Go deep — depression, physical pains, injuries, sickness, allergies, inflammation. Correlates with Diet/Exercise/Vitamins"
- Chat: "Days after eating Wheat → cold symptoms 90%"

Tracker más importante para las correlaciones principales del cliente. Completamente ausente.

---

### GAP-37 — Vitamins/Medications tracker
**🟠 Alto | ❌ | P1**

- `seedDefaultTrackers()` no lo incluye
- `defaultTrackers` en IPC no lo incluye
- No existe en renderer

---

### GAP-38 — Meditation tracker
**🟡 Medio | ❌ | P1**

- Notion cliente: "Keep it simple: meditation days, streaks, length, small tags"

---

### GAP-39 — Water tracker
**🟢 Backburner | ⏸ | P1**

- Notion cliente: "Put this on backburner for now"
- CLIENT-REQUIREMENTS.md §18.2 tiene spec completa como si fuera activo — confunde en planning

---

---

## BLOQUE I — CORRELATION ENGINE

### GAP-40 — Motor funciona, inputs no tienen valor semántico
**🔴 Crítico | 🔄 | P1+P3**

| Tracker | `value` guardado | Valor semántico necesario |
|---|---|---|
| Books | 1 (count) | Rating, días leídos |
| Gaming | 1 (count) | Horas, juego, won/lost |
| Exercise | N (count de ejercicios) | Volumen total kg, ejercicio específico |
| Diet | 500 (kcal) | Ingrediente + tag |
| Social | 1 (count) | Mood de interacción per-contact |

Correlacionar "1 libro vs 3 libros" no produce insights útiles. El motor es matemáticamente correcto pero sus inputs son semánticamente vacíos.

---

### GAP-41 — No puede procesar tags como fuente de cohort
**🔴 Crítico | ❌ | P1**

- `calculateImpact` usa `entry.value > 0` como condición binaria
- Notion cliente: "Days after eating Wheat tag → cold symptoms"
- Requiere nuevo método `calculateTagImpact(tagId, targetTrackerId)` con query distinto

---

### GAP-42 — `getMoodDailyAggregates` desaprovechado y mal nombrado
**🟡 Medio | ☠️ | P3**

- IPC handler acepta cualquier `trackerId` y calcula `avg(value)` por fecha para cualquier tracker
- Solo se usa en `MoodWidget`
- Al añadir Sleep o Health probablemente se crea un handler duplicado porque el nombre engaña

---

---

## BLOQUE J — UX Y NAVEGACIÓN

### GAP-43 — QuickEntry: trackers recientes en lista vertical, cliente quiere horizontal
**🟡 Medio | ☠️ | P2**

- Código: chips en lista vertical
- Imagen cliente: ❌ lista vertical marcada, ✅ fila horizontal marcada

---

### GAP-44 — Sidebar: estructura por secciones no implementada
**🟠 Alto | ❌ | P2**

- `Sidebar.tsx`: lista plana bajo "Tracking" collapsible
- Notion cliente: secciones Physical/Body, Mind, Health, Life
- CLIENT-REQUIREMENTS.md §22: estructura completa confirmada

---

### GAP-45 — TrackerDetailView: Exercise y Social sin renders específicos
**🟠 Alto | ☠️ | P2**

`TrackerDetailView.tsx` tiene cases para: `isMediaType`, `isWeightType`, `isTaskType`, `isDietType`, `isSavingsType`, `isNumericType`, y default.

- Exercise: cae en default → `entry.note || 'Value: 1'`
- Social: cae en default
- Gaming: icon "gamepad-2" → `isMediaType` → grid de thumbnails

`WidgetCard.tsx` sí tiene widgets específicos para Exercise, Social, Mood — pero `TrackerDetailView` no. Las dos vistas del mismo tracker usan lógica completamente distinta.

---

### GAP-46 — CalendarPage day detail genérico para todos los trackers
**🟠 Alto | ☠️ | P4**

`CalendarPage.tsx` líneas ~390-420: el panel de detalle del día seleccionado muestra `entry.value` y `entry.note` para todos los trackers igual. Exercise muestra "3" (count de ejercicios), Social muestra "1", Books muestra "1". No hay render específico por tipo de tracker.

---

### GAP-47 — Savings tracker no fue pedido por el cliente
**🟡 Medio | ☠️ | P2**

- `ipc-handlers.ts` defaultTrackers incluye "Savings" con wallet icon
- No mencionado en chat, Notion, ni CLIENT-REQUIREMENTS.md
- Tiene render especial `isSavingsType` en TrackerDetailView y `CounterWidget` en WidgetCard

---

### GAP-48 — TitleBar: botones de ventana decorativos sin funcionalidad
**🟡 Medio | ☠️ | P4**

`TitleBar.tsx`: los círculos rojo/amarillo/verde tienen hover pero no hay IPC calls para minimize/maximize/close. Son puramente decorativos.

---

---

# PARTE 2 — GAPS DE CÓDIGO Y ARQUITECTURA (20%)

---

### GAP-49 — Detección de tipo de tracker: string matching en CUATRO archivos distintos
**🟠 Alto | ☠️ | P2+P3**

| Archivo | Propósito | Lógica |
|---|---|---|
| `TrackerDetailView.tsx` líneas 307-316 | Decides qué render de entries mostrar | `isMediaType`, `isWeightType`, etc. |
| `WidgetCard.tsx` líneas 993-1060 | Decide qué widget mostrar | Mismas condiciones pero orden distinto |
| `QuickEntry.tsx` líneas 198-211 | Decide tipo de formulario | `isSocialTracker`, `isExerciseTracker` |
| `entry-config.ts` líneas 19-183 | Decide labels y placeholders | Mismas condiciones, otra implementación |

Cada archivo tiene su propia lógica con diferencias sutiles que generan resultados inconsistentes. Ejemplo: Gaming con icon "gamepad-2" → `isMediaType` en TrackerDetailView (thumbnails) pero `MediaWidget` en WidgetCard (también thumbnails) pero `entry-config` muestra "Game Name / Hours Played" (correcto). Tres comportamientos distintos para el mismo tracker.

**Solución:** Función centralizada `getTrackerArchetype(tracker): TrackerArchetype` con enum explícito. Todos los componentes la consumen. Alternativamente, campo `archetypeId` en `config` del tracker.

---

### GAP-50 — `tv` icon missing en WidgetCard y QuickEntry iconMaps
**🟠 Alto | ☠️ | P4**

- `ipc-handlers.ts` defaultTrackers: "Media/TV" con `icon: 'tv'`
- `Sidebar.tsx` y `CustomTrackersSection.tsx`: tienen `tv: Tv` en sus iconMaps ✅
- `WidgetCard.tsx` iconMap (líneas 20-38): NO tiene `tv` → fallback `CheckSquare`
- `QuickEntry.tsx` iconMap (líneas 24-42): NO tiene `tv` → fallback `undefined`

El tracker Media/TV muestra un CheckSquare en el widget y falla silenciosamente en QuickEntry.

---

### GAP-51 — Schema: tablas y campos sin usar
**🟠 Alto | ☠️ | P3**

Tablas en schema pero inaccesibles:
- `tags` — sin IPC handlers, `entriesToTags` no se importa en IPC
- `entries_to_tags` — sin IPC handlers

Campos en schema sin uso completo:
- `reminders.description` — IPC lo acepta, UI de QuickEntry Reminder no tiene campo para esto
- `entries.assetId` — funciona en WeightWidget, roto en QuickEntry (DT-11)

---

### GAP-52 — QuickEntry.tsx: 900 líneas, viola Single Responsibility
**🟠 Alto | ☠️ | P2**

Maneja: selección de tracker, modo Activity/Reminder, form genérico, Social form (ContactBubblesGrid embebido), Exercise form (ExerciseSearch embebido), asset picker, submit logic para 5+ tipos de tracker.

Añadir Sleep, Health o cualquier tracker nuevo = +150 líneas más aquí.

**Solución:** `<GenericEntryForm>`, `<SocialEntryForm>`, `<ExerciseEntryForm>`, `<SleepEntryForm>`. QuickEntry solo hace routing basado en `getTrackerArchetype()`.

---

### GAP-53 — TrackerDetailView.tsx: 1026 líneas, mezcla todo
**🟠 Alto | ☠️ | P2**

Mezcla: estadísticas (useMemo ~70 líneas), heatmap anual, chart con filtros, 7 renders de entries por tipo, tabs, modales de Edit/Delete. Añadir renders para Exercise, Social, Sleep, Health = +400 líneas.

**Solución:** Extraer `<ExerciseDetailEntries>`, `<SocialDetailEntries>`, etc. en `components/detail-views/`.

---

### GAP-54 — ipc-handlers.ts: 928 líneas, todos los dominios mezclados
**🟡 Medio | ☠️ | P2**

Maneja: Trackers, Entries, Assets, Reminders, Dashboard, Contacts, Interactions, Exercise DB, Stats en un solo archivo.

**Solución:** `handlers/trackers.ts`, `handlers/contacts.ts`, `handlers/assets.ts`, etc.

---

### GAP-55 — EditEntryDialog no puede editar metadata de Exercise
**🟠 Alto | ☠️ | P3**

`EditEntryDialog` solo edita `value`, `note`, `timestamp`, `assetId`. El contenido real de un workout (sets/reps/weight por ejercicio) está en `metadata.exercises[]` y es inaccesible desde este dialog.

---

### GAP-56 — Streak calculation duplicada con implementaciones distintas
**🟡 Medio | ☠️ | P2**

- `streak-utils.ts`: `computeCurrentStreak` — correcto, eficiente
- `TrackerDetailView.tsx` líneas 994-1025: función local `calculateStreak` — O(n²), lógica diferente

Pueden dar resultados distintos. **Fix:** Eliminar local, importar de `streak-utils.ts`.

---

### GAP-57 — `defaultTrackers` duplicados entre ipc-handlers.ts y database.ts
**🟡 Medio | ☠️ | P3**

- `ipc-handlers.ts`: Weight, Mood, Exercise, Social, Tasks, **Savings**, Books, Gaming, Media/TV, Diet
- `database.ts` `seedDefaultTrackers()`: solo Books, Gaming, Media, Diet

Listas distintas. Pueden generar duplicados o estados inconsistentes por orden de ejecución.

---

### GAP-58 — `PageType "tracking"` declarado sin case en App.tsx
**🟡 Medio | ☠️ | P3**

`store.ts`: `PageType` incluye `"tracking"`. `App.tsx` no tiene `case "tracking"` en `renderPage()`. Navegar a `"tracking"` muestra BentoGrid silenciosamente.

---

### GAP-59 — `CreateTrackerDialog` no ofrece tipos `binary` ni `composite`
**🟡 Medio | ☠️ | P4**

- Dialog ofrece: counter, rating, list
- Schema tiene: numeric, range, binary, text, composite
- `QuickEntry.tsx` tiene código para `binary` y `composite` (líneas 272, 786) pero no son creables desde la UI

---

### GAP-60 — DT-2: 3 errores TypeScript rompen CI
**🟠 Alto | ☠️ | P2**

- `TrackerDetailView.tsx` línea 86: `handleDeleteEntry` — declared never read (TS6133)
- `TrackerDetailView.tsx` línea 555: `entry` — declared never read (TS6133)  
- `ConfirmDeleteDialog.tsx` línea 1: `React` imported never read (TS6133)
- `tsconfig.json`: `"noUnusedLocals": true` → `pnpm check-types` falla en CI

---

### GAP-61 — Schema: tablas faltantes para features críticas
**🔴 Crítico | ❌ | P2+P3**

```sql
-- Para GAP-11 (Exercise templates)
workout_templates (id, name, created_at)
workout_template_exercises (id, template_id, exercise_name, default_sets, default_reps, default_weight)

-- Para GAP-03/04 (Tag system con jerarquía)
tag_relationships (tag_id, parent_tag_id)

-- Para GAP-31 (Contact type filter)
ALTER TABLE contacts ADD COLUMN contact_type TEXT DEFAULT 'other'

-- Para GAP-27 (Interaction duration)
ALTER TABLE contact_interactions ADD COLUMN duration_minutes INTEGER
```

---

### GAP-62 — Correlation engine: arquitectura insuficiente para casos de uso del cliente
**🔴 Crítico | ❌ | P2**

`calculateImpact` en `stats-service.ts` usa `entry.value > 0` como condición de cohort. Para el cliente se necesitan 3 modos adicionales:

1. **Tag-based cohort:** "días donde entries tienen tag X" → `SELECT dateStr FROM entries_to_tags WHERE tagId = X`
2. **Categorical cohort:** "días donde gaming entry tiene `metadata.won = false`"
3. **Threshold cohort:** "días donde Sleep `metadata.hours >= 7`"

---

---

# RESUMEN EJECUTIVO

## Conteo final (4 pasadas)

| Severidad | Producto | Código | Total |
|---|---|---|---|
| 🔴 Crítico | 14 | 4 | **18** |
| 🟠 Alto | 12 | 11 | **23** |
| 🟡 Medio | 14 | 7 | **21** |
| 🟢 / ⏸ | 1 | 0 | **1** |
| **Total** | **41** | **22** | **63** |

**Gaps nuevos encontrados en pasada 4 (no estaban en pasada 3):**
- GAP-23: Social — dos sistemas de datos completamente desconectados 🔴
- GAP-46: CalendarPage day detail genérico para todos los trackers 🟠
- GAP-48: TitleBar buttons decorativos sin funcionalidad 🟡
- GAP-50: `tv` icon missing en WidgetCard y QuickEntry 🟠
- GAP-21: Media subcategorías (YouTube/Twitch/Podcast) perdidas 🟡
- GAP-59: CreateTrackerDialog sin tipos binary/composite 🟡

---

## Top 10 — Por dónde empezar

### Semana 1: Bugs activos que bloquean features ya implementadas

| # | Gap | Fix | Esfuerzo |
|---|---|---|---|
| 1 | GAP-60 | DT-2: 3 errores TS6133 — 3 líneas | 5 min |
| 2 | GAP-25 | store.ts: `? null : null` → preservar selectedContactId | 5 min |
| 3 | GAP-26/52 | Unificar todos los `useAssets()` a un queryKey base | 30 min |
| 4 | GAP-24 | Foto de contacto en burbujas: replicar lógica de ContactProfilePage | 1h |
| 5 | GAP-12 | ExerciseWidget + TrackerDetailView: leer `metadata.exercises[]` | 2h |
| 6 | GAP-50 | Añadir `tv: Tv` a iconMaps de WidgetCard y QuickEntry | 5 min |
| 7 | GAP-33 | QuickEntry no cierra al navegar a "Add contact" | 1 min |

### Semana 2: Features confirmadas del cliente

| # | Gap | Acción |
|---|---|---|
| 8 | GAP-03/04/61 | Tags: `tag_relationships` schema + IPC CRUD básico |
| 9 | GAP-35 | Sleep tracker: schema + defaultTrackers + QuickEntry + DetailView |
| 10 | GAP-01 | Mood: unificar escala → cambiar a 4 colores |
| 11 | GAP-07 | Weight: selector lbs/kg + persistencia en settings |
| 12 | GAP-22/16 | Diet + Books: corregir `entry-config.ts` + modelo de datos |
| 13 | GAP-11/61 | Exercise templates: schema + IPC + UI básica |
| 14 | GAP-36 | Health/Symptoms tracker básico |

### Semana 3: Arquitectura escalable

| # | Gap | Acción |
|---|---|---|
| 15 | GAP-49 | Centralizar `getTrackerArchetype()` — eliminar los 4 string matchings |
| 16 | GAP-52/53 | Extraer forms de QuickEntry y renders de TrackerDetailView |
| 17 | GAP-54 | Separar ipc-handlers.ts por dominio |
| 18 | GAP-23 | Unificar Social: SocialWidget debe leer contact_interactions |
| 19 | GAP-62 | Extender calculateImpact para tag-based cohorts |
| 20 | GAP-57 | Unificar defaultTrackers, eliminar Savings |

---

## Causa raíz — Diagnóstico final (4 pasadas)

**Causa Raíz 1 — Modelo de datos genérico antes de tiempo:**
Los trackers fueron implementados con `value + note + metadata` antes de definir qué necesitaba cada uno. Ahora que el Notion define exactamente qué necesita cada tracker, hay un desajuste estructural. No hay que reescribir — hay que enriquecer el schema y actualizar la lógica por tracker.

**Causa Raíz 2 — Sin fuente única de verdad para el tipo de tracker:**
Cuatro archivos con string matching desincronizado generan renders inconsistentes para el mismo tracker en distintas vistas. Ya está causando bugs activos (GAP-12, GAP-19, GAP-45). Cada feature nueva empeora esto.

**Causa Raíz 3 — Dos sistemas paralelos para el mismo dominio (Social):**
`entries` + `contact_interactions` coexisten sin conexión real. GAP-23. El widget lee un sistema, QuickEntry escribe en el otro. Esto debe resolverse antes de añadir más features al tracker Social.

**La regla going forward:** Antes de tocar cualquier tracker, crear `getTrackerArchetype(tracker)` como función centralizada. Luego actualizar los 4 archivos para usarla. Solo después implementar la feature específica.

---

*Revisión final — 4 pasadas — Mar 2026*
*Archivos revisados: todos los .ts/.tsx del proyecto + Notion + chat history + CLIENT-REQUIREMENTS.md*
