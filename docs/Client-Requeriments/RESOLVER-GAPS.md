# RESOLVER-GAPS.md — Chimero Habit Flow

> **Generado desde:** GAPS-SDLC.md v1.0 (firmado 2026-04-09)  
> **Fecha de generación:** 2026-04-09  
> **Estado:** 🟢 LISTO PARA FIRMA HITL 3  
> **Una vez firmado:** el agente de implementación ejecuta solo lo aquí decidido
> **Próxima fase:** ROADMAP.md (bloques ordenados por dependencias)

---

## 📋 Contexto

Este documento convierte los 19 gaps de GAPS-SDLC.md en **27 decisiones de resolución** (algunos gaps contienen múltiples artefactos).

Cada resolución especifica:
- **Qué se construye** (nombres concretos de tablas, campos, componentes)
- **Cómo se valida** (criterio binario: pasa o no pasa)
- **Dependencias** entre gaps

**Formato invariable:**
```
[SEVERIDAD] [GAP-ID] — [nombre corto]
Fuente: [RF-XX, DATO-XX, etc]
Resolución técnica: [párrafo concreto]
Dependencias: [lista o "ninguna"]
Validación: [criterio binario]
Decidido por: [dev / cliente / pendiente-cliente]
```

---

## 🔴 Resoluciones — CRÍTICOS (6 gaps)

---

### GAP-001 — Tag Hierarchy Schema
**Severidad:** 🔴 Crítico  
**Fuente:** RF-01, DATO-01, DATO-02, REGLA-01  

**Resolución técnica:**

Agregar **relación jerárquica parent-child a tabla `tags`**:
1. **Campo en schema:** `tags.parentTagId: text | null` (foreign key autorreferencial)
2. **Nueva tabla:** `tagRelations` con campos:
   - `childTagId: text` (FK → tags.id)
   - `parentTagId: text` (FK → tags.id)
   - `depth: integer` (nivel de jerarquía para query optimization)
   - `PRIMARY KEY: (childTagId, parentTagId)`
   - `INDEX: (parentTagId, depth)` para queries de "todos los children de X"
3. **Migraciones Drizzle:** Crear archivos en `packages/db/drizzle/` con:
   - `0003_addParentTagIdAndTagRelations.ts` (add parentTagId, crear tagRelations, populate constraints)

**Patrón de diseño:** Closure Table (tagRelations almacena pares parent-child + profundidad) — permite queries eficientes de ancestros/descendientes sin recursión infinita.

**Dependencias:** ninguna

**Validación binaria:**
- Tag con `parentTagId = null` existe en DB ✅
- Tag con `parentTagId` valido (FK a otro tag) existe y se persiste ✅
- Query `tagRelations` devuelve 0+ filas para un parentTagId válido ✅
- Índice `(parentTagId, depth)` aparece en `EXPLAIN QUERY PLAN` ✅

**Decidido por:** dev

---

### GAP-002 — Contact Schema Extended (Custom Fields & Metadata)
**Severidad:** 🔴 Crítico  
**Fuente:** RF-06, RF-07, DATO-04, REGLA-08  

**Resolución técnica:**

Agregar campos flexible al `contacts` table:
1. **Campos nuevos en schema:**
   - `age: integer | null` (calculado en queries vía birthday, NO persistido)
   - `likes: text[]` (JSON array, ejemplo: `["hiking", "sci-fi"]`)
   - `dislikes: text[]` (JSON array)
   - `traits: text[]` (JSON array, ejemplo: `["trustworthy", "funny"]`)
   - `customFields: json` (forma: `[{ headerId: string, value: string }, ...]`)
   - `customFieldOrder: text[]` (array de headerIds en orden arrastrados — ej: `["cf-1", "cf-2", "cf-3"]`)
   - `hasKids: boolean | null`
   - `birthday: datetime | null` (ya existe, validar presencia)

2. **Migraciones Drizzle:**
   - `0004_addContactExtendedFields.ts` — agregar los 7 campos (age calculado, likes/dislikes/traits JSON, customFields JSON, customFieldOrder JSON, hasKids)

3. **Cambios en `src/api.ts`:**
   - Función helper `calculateAge(birthday: Date | null): number | null` (en queries o tipo)
   - No persistir age — es virtual

**Patrón de diseño:** EAV (Entity-Attribute-Value) light via JSON — customFields permite headers editables sin migración nueva por cada campo.

**Dependencias:** ninguna

**Validación binaria:**
- `contacts` table tiene columnas: `likes`, `dislikes`, `traits`, `customFields`, `customFieldOrder`, `hasKids`, `birthday` ✅
- INSERT con `likes: ["a"]` persiste y `SELECT` devuelve array ✅
- `calculateAge(birthday)` retorna `null` si birthday es null ✅
- `updateContact({ customFieldOrder: ["cf-2", "cf-1"] })` persiste orden y `SELECT` retorna en ese orden ✅

**Decidido por:** dev

---

### GAP-003 — Tag Management Page (UI Jerárquica)
**Severidad:** 🔴 Crítico  
**Fuente:** RF-03  

**Resolución técnica:**

Crear nueva página `src/pages/TagsManagement.tsx`:
1. **Componentes necesarios:**
   - `TagTreeView.tsx` — árbol visual (usando `@radix-ui/primitives` o custom) que muestra tags con children colapsables
   - `TagCreateDialog.tsx` — form modal: `{ name, color?, parentTagId?, description? }` → POST `/api/tags`
   - `TagEditDialog.tsx` — edit existente + cambiar parentTagId
   - `TagDeleteConfirm.tsx` — modal "delete tag + [X] children?" con opción "move children to parent"
   
2. **Routes:**
   - Agregar ruta `/tags-management` en sidebar + main navigation
   - GET `/api/tags` → devuelve todos los tags con `parentTagId` (sin relationalization explícita — el frontend construye árbol)
   - POST `/api/tags` → crear tag
   - PATCH `/api/tags/:id` → editar (name, color, description, parentTagId)
   - DELETE `/api/tags/:id` → eliminar (opcionalmente mover children)

3. **UX/Interacción:**
   - Drag-to-reorder tags al mismo nivel (opcional en v1, de todas formas en ROADMAP como nice-to-have)
   - Visual: parentTagId se muestra como "Beef → Taco" (text hint)
   - Color de tag visible en árbol (pequeño cuadrado, no fondo completo — para contrast)

**Patrón de diseño:** Tree view + CRUD modal — patrón estándar de CMS.

**Dependencias:** 
- GAP-001 (schema tags jerárquico debe estar listo)

**Validación binaria:**
- Ruta `/tags-management` navega sin error ✅
- PageTagsManagement.tsx renderiza y hace fetch GET /api/tags (devuelve array con 0+ items) ✅
- Create dialog abre, form submit POST /api/tags válido, nuevo tag aparece en árbol sin refresh ✅
- Edit dialog abre, cambiar parentTagId, PATCH funciona, árbol se reordena ✅
- Delete con children = prompt "move to parent", confirmación funciona ✅

**Decidido por:** dev

---

### GAP-004 — Tag Schema Completeness (Validación)
**Severidad:** 🔴 Crítico  
**Fuente:** DATO-01  

**Resolución técnica:**

Validar y completar schema `tags` table en `packages/db/src/schema.ts`:
1. **Campos confirmados:**
   - `id: text PRIMARY KEY`
   - `name: text NOT NULL UNIQUE` (tags no pueden tener mismo nombre)
   - `color: text | null` (hex color, ej: `"#FF5733"`)
   - `description: text | null`
   - `parentTagId: text | null` (FK → tags.id,  [DESDE GAP-001])
   - `createdAt: datetime DEFAULT current_timestamp`
   - `updatedAt: datetime DEFAULT current_timestamp`

2. **Índices requeridos:**
   - `PRIMARY KEY (id)`
   - `UNIQUE (name)`
   - `INDEX (parentTagId)` — para query "tags with this parent"
   - `INDEX (createdAt DESC)` — para listados ordenados

3. **No incluir en v1:**
   - `tagIcon` — future enhancement
   - `visibility: public | private` — future multi-user feature

**Patrón de diseño:** Schema normalization — single source of truth, sin datos redundantes.

**Dependencias:** 
- GAP-001 (parentTagId field)

**Validación binaria:**
- Schema `tags` se puede inspeccionar vía `PRAGMA table_info(tags)` y tiene exactamente 8 columnas ✅
- `UNIQUE (name)` constraint existe ✅
- Inserts con `name = 'Beef'` dos veces fallan ✅
- Indices listados vía `PRAGMA index_list(tags)` incluyen parentTagId index ✅

**Decidido por:** dev

---

### GAP-005 — Tag Inheritance Engine (Lógica)
**Severidad:** 🔴 Crítico  
**Fuente:** REGLA-01, RF-09  

**Resolución técnica:**

Crear módulo `src/lib/tagInheritance.ts` con función:

```typescript
async function getAncestorTags(childTagId: string): Promise<string[]>
```

Lógica:
1. **Query closure table:** `SELECT DISTINCT parentTagId FROM tagRelations WHERE childTagId = ? ORDER BY depth ASC`
2. **Retorna:** array de todos los ancestor tag IDs (ej: tag "Taco" → ["Beef", "Wheat"])
3. **Caso base:** si childTagId no tiene parents, retorna `[]`
4. **Caching:** guardar en memoria con TTL 5min (tags cambian raramente, pero entries crean logs)

Uso en `src/api.ts`:
- Cuando se crea/actualiza entry con tags, incluir automáticamente ancestors.
- Query `entriesToTags` busca entry con tag "Beef" → también aparecen entries con tag "Taco" en analytics.

**Patrón de diseño:** Transitive closure — query recursiva (o closure explícita) que atraviesa jerarquía.

**Dependencias:**
- GAP-001 (tagRelations table)
- GAP-004 (schema validado)

**Validación binaria:**
- `getAncestorTags("Taco")` retorna `["Beef", "Wheat"]` (descendiente de ambos) ✅
- `getAncestorTags("Beef")` retorna `[]` (no tiene parents) ✅
- Query closure es eficiente: `EXPLAIN QUERY PLAN` muestra índice hit ✅
- Cache TTL funciona: segunda call en < 5min retorna sin DB hit ✅

**Decidido por:** dev

---

### GAP-006 — Correlation Engine Wiring (Tag Hierarchy Integration)
**Severidad:** 🔴 Crítico  
**Fuente:** RF-09, REGLA-02  

**Resolución técnica:**

Integrar `getAncestorTags()` en `src/correlation.ts` y hook `useCorrelationCalculation.ts`:

1. **Cambios en `correlation.ts`:**
   - Función `calculateCorrelation(sourceTrackerId, targetTrackerId, sourceTagId?)` existente.
   - **NUEVO:** Cuando `sourceTagId` se proporciona (ej: "Taco" en Food tracker):
     - Incluir automáticamente ancestors en el cálculo (ej: "Beef", "Wheat")
     - Query: `SELECT entries WHERE trackerId=sourceTracker AND (tagId IN (Taco, Beef, Wheat))`
     - Luego correlacionar ese subset con targetTracker

2. **Cambios en `useCorrelationCalculation.ts`:**
   - Hook ya llama `window.api.calculateImpact()` (main process)
   - **NUEVO parametro:** `sourceTagId?: string` (opcional)
   - Si provided, el main process usa `getAncestorTags()` antes de correlacionar

3. **UI en `StatsPage.tsx` / `HypothesisBuilder.tsx`:**
   - Selector de tag (ej: "Select Taco from Food") → automáticamente propone "incluir Beef y Wheat" en cálculo
   - Display: "Days with Taco (+ inherited Beef, Wheat) → 90% likelihood cold symptoms"

**Patrón de diseño:** Layered inclusion — inheritance es automático, transparent en UI.

**Dependencias:**
- GAP-001 (schema)
- GAP-004 (schema validado)
- GAP-005 (inheritance logic)

**Validación binaria:**
- `calculateCorrelation(foodTrackerID, healthTrackerID, "Taco")` retorna correlations incluyendo entradas tagueadas con "Beef" y "Wheat" ✅
- `useCorrelationCalculation` hook acepta `sourceTagId` parámetro sin error ✅
- UI muestra texto "Days with Taco (+ inherited Beef, Wheat)" cuando tag node tiene children ✅
- Resultado numérico cambia (es mayor) al incluir inherited tags vs solo tag directo ✅

**Decidido por:** dev

---

## 🟠 Resoluciones — ALTOS (7 gaps)

---

### GAP-007 — Contact Sort by Frequency
**Severidad:** 🟠 Alto  
**Fuente:** RF-05  

**Resolución técnica:**

Validar + implementar sort en `ContactBubblesGrid.tsx`:

1. **Query en `queries.ts`:**
   - Hook `useContactsSortedByFrequency(order: 'asc' | 'desc')` 
   - Query: `SELECT contacts.*, COUNT(contactInteractions.id) AS interaction_count FROM contacts LEFT JOIN contactInteractions ON contacts.id = contactInteractions.contactId GROUP BY contacts.id ORDER BY interaction_count [ASC|DESC]`
   - Retorna contacts con count más alto primero (por defecto `DESC`)

2. **Componente `ContactBubblesGrid.tsx`:**
   - Props: `sortOrder?: 'asc' | 'desc'` (default 'desc')
   - Render bubbles en orden de frecuencia
   - UI hint: número pequeño en bubble "32 conversations"

3. **Storage:** Persistir preferencia del usuario en `settings` table → columna `socialSort: 'asc' | 'desc'`

**Patrón de diseño:** Aggregation query con GROUP BY — standard SQL analytics.

**Dependencias:** ninguna (schema `contactInteractions` ya existe)

**Validación binaria:**
- `useContactsSortedByFrequency('desc')` retorna contacts ordenados decreciente por interaction_count ✅
- ContactBubblesGrid renderiza bubbles en orden correcto ✅
- Cambiar sortOrder actualiza orden sin remount ✅
- Preference persist: reload página → orden se mantiene ✅

**Decidido por:** dev

---

### GAP-008 — Contact Detail Page Extended
**Severidad:** 🟠 Alto  
**Fuente:** RF-06, DATO-04  

**Resolución técnica:**

Completar `ContactProfilePage.tsx` con campos editables:

1. **Campos nuevos en UI:**
   - Birthday → mostrar campo `<input type="date">`
   - Age → calculado automático (read-only hint: "32 years old")
   - Likes → `<input type="text">` (tags-style, comma-separated o chip input)
   - Dislikes → igual a likes
   - Traits → chip input (editable)
   - Custom fields → grid editable (ver GAP-009)
   - Has kids → checkbox
   - Notes → textarea (ya existe, validar presencia)

2. **Componente helper:**
   - `ContactFieldEditor.tsx` — reutilizable para texto/date/chips
   - Manejo de estado: local state + debounce save

3. **API:**
   - PATCH `/api/contacts/:id` acepta payload con: `{ birthday?, likes?, dislikes?, traits?, customFields?, hasKids?, notes? }`
   - Servidor valida y persiste (todos campos JSON/nullable)

**Patrón de diseño:** Form builder — inputs variados, estado local con persistencia debounced.

**Dependencias:**
- GAP-002 (schema extendido)

**Validación binaria:**
- ContactProfilePage renderiza campos: birthday, age, likes, dislikes, traits, hasKids ✅
- Editar birthday → age se recalcula automático ✅
- Agregar trait → PATCH /api/contacts/:id funciona → trait persiste ✅
- Reload página → nuevos valores visibles ✅

**Decidido por:** dev

---

### GAP-009 — Custom Fields Grid (Drag-Reorder)
**Severidad:** 🟠 Alto  
**Fuente:** RF-07, REGLA-08  

**Resolución técnica:**

Crear `ContactCustomFieldsGrid.tsx` con drag-drop:

1. **Estructura de datos:**
   - Vía GAP-002: `contacts.customFields = [{ headerId: "cf-1", value: "Engineer" }, ...]`
   - `contacts.customFieldOrder = ["cf-1", "cf-2", ...]` (persiste orden de drag)

2. **Componente:**
   - Renderizar como 2-column grid: "Header Input | Value Input" rows
   - Drag-drop reorden usando `@dnd-kit/sortable` (mismo que BentoGrid en Dashboard)
   - "Add custom field" button → abre dialog `{ headerName, valueInput }` → genera nuevo headerId + agrega a array
   - Delete icon en cada row

3. **Persistencia:**
   - onChange: debounce 500ms → PATCH `/api/contacts/:id` con `{ customFields, customFieldOrder }`
   - Optimistic UI (reorder inmediatamente, sync en background)

**Patrón de diseño:** Drag-drop sortable + EAV persistence — reutilizar @dnd-kit existente.

**Dependencias:**
- GAP-002 (customFields + customFieldOrder en schema)
- GAP-008 (ContactProfilePage integración)

**Validación binaria:**
- CustomFieldsGrid renderiza rows con "Header | Value" ✅
- Drag row A sobre B → reorder visual inmediato ✅
- onDragEnd: PATCH /api/contacts/:id con customFieldOrder nuevo ✅
- Add button abre dialog, nuevo field aparece sin reload ✅
- Delete row → field removido de customFields + customFieldOrder ✅

**Decidido por:** dev

---

### GAP-010 — Tracker Chart Time Filters Extended
**Severidad:** 🟠 Alto  
**Fuente:** RF-10  

**Resolución técnica:**

Extender opciones de `chartTimeFilter` en `TrackerDetailView.tsx`:

1. **Estados actuales:** `"1M" | "3M" | "1Y"`
2. **Agregar:** `"YTD" | "2Y" | "3Y"`

Implementación:
- Componente `TimeFilterButtons.tsx` con 6 botones (UI: radio group o toggle buttons)
- Cambiar filtro → actualizar estado `selectedTimeFilter`
- Query de datos: modificar `useDateRangeEntries()` hook para soportar los nuevos rangos

3. **Rango de fechas:**
   - `"1M"`: últimos 30 días
   - `"3M"`: últimos 90 días
   - `"1Y"`: últimos 365 días
   - `"YTD"`: enero 1 del año actual → hoy
   - `"2Y"`: últimos 730 días
   - `"3Y"`: últimos 1095 días

4. **Chart re-render:** trigger en onChange filter (ya existe lógica, solo agregar opciones)

**Patrón de diseño:** State + conditional query range — trivial refactor.

**Dependencias:** ninguna

**Validación binaria:**
- TimeFilterButtons renderiza 6 botones: 1M, 3M, 1Y, YTD, 2Y, 3Y ✅
- Click "YTD" → chart rerendered con datos Jan 1 → today ✅
- Click "2Y" → chart rerendered con últimos ~730 días ✅
- Dates en chart x-axis son correctas para cada filtro ✅

**Decidido por:** dev

---

### GAP-014 — Contact Bubbles Multi-Select with Mood Effect
**Severidad:** 🟠 Alto  
**Fuente:** RF-16, REGLA-03  

**Resolución técnica:**

Extender `QuickEntry.tsx` para multi-select contactos con mood assignment:

1. **Estado en `QuickEntry.tsx`:**
   - Actual: `selectedContacts: ContactMoodSelection[]` (probablemente)
   - **NUEVA UI:** ContactBubblesGrid con:
     - Selección múltiple (click bubble = toggle selected)
     - Hover → mood selector popup: `-1 (Negative) | 0 (Neutral) | +1 (Positive)`
     - Persist: `selectedContacts = [{ contactId, moodEffect }, ...]`

2. **Componente helper:**
   - `ContactBubbleWithMoodSelector.tsx` — bubble renderizado con mood icon/color
   - Click bubble adentro → abrir mood selector inline o modal pequeño

3. **Entry creation:**
   - Social tracker entry include: `contacts: [{ contactId, moodEffect }, ...]`
   - Guardar en DB vía PATCH/POST entry

**Patrón de diseño:** Multi-select con secondary attribute picker — UI pattern común (Slack reactions, etc).

**Dependencias:** ninguna (UI feature, schema ya soporta)

**Validación binaria:**
- ContactBubblesGrid renderiza bubbles en QuickEntry sin error ✅
- Click bubble → visual toggle selected state ✅
- Hover seleccionado → mood selector (3 opciones -1/0/+1) ✅
- Seleccionar contacto + mood → estado local actualiza ✅
- Save entry → contactos + moodEffect persisten en DB ✅

**Decidido por:** dev

---

### GAP-015 — Tracker Entries UI Redesign (Compact Rows)
**Severidad:** 🟠 Alto  
**Fuente:** RF-17, UX-04  

**Resolución técnica:**

Redesign de `TrackerEntriesPanel.tsx` / entry card layout:

1. **Actual:** Posiblemente cards densos o form-style
2. **Nuevo:** Compact rows layout:
   ```
   [Date] | [Value] [Tags] | [Notes] | [Edit/Delete icons]
   ```
3. **Interacción:**
   - Hover row → aparecen botones edit (pencil) + delete (trash) — matching Shift+click actual
   - Click row → expande inline detalles (optional)
   - Muy denso — mucho info por día visible sin scroll

4. **Componentes:**
   - `EntryCompactRow.tsx` — renderiza 1 entry en format compacto
   - `EntryCompactList.tsx` — mapea array de entries a rows

5. **Validación:**
   - Rows apiladas verticalmente, máx ~6-8 visibles antes de scroll
   - Cada row ~40px altura (vs form denso)

**Patrón de diseño:** Compact table — similar a Gmail inbox, Notion database view.

**Dependencias:** ninguna

**Validación binaria:**
- TrackerEntriesPanel renderiza entries como compact rows ✅
- 8+ entries en view sin scroll desplazándose demasiado ✅
- Hover → edit/delete icons visibles ✅
- Click edit → abre modal edit (o inline edit) ✅
- Click delete → confirmación → elimina ✅

**Decidido por:** dev

---

### GAP-016 — Timeline Page with Category Filter
**Severidad:** 🟠 Alto  
**Fuente:** RF-18, REGLA-07  

**Resolución técnica:**

Crear nueva página `src/pages/TimelineView.tsx`:

1. **Layout:**
   - Left sidebar: checkboxes por tracker type (Weight, Mood, Social, Health, Exercise, etc.)
   - Main area: timeline visual (similar a Calendar view en Dashboard, o Gantt-style horizontal)
   - Mostrar qué trackers estaban activos en qué mes

2. **Data structure:**
   - Query: `SELECT trackerId, MAX(date) FROM entries GROUP BY trackerId, strftime('%Y-%m', date)`
   - Result: { trackerId, month, isActive: true }

3. **Visual:**
   - Filas por tracker
   - Columnas por mes (scroll horizontal / year selector)
   - Cell coloreada = tracker activo ese mes, vacío = no
   - Hover → tooltip "5 entries in Jan 2026"

4. **Interacción:**
   - Checkboxes filter qu¿ trackers mostrar
   - Year/Month selector para cambiar vista temporal

**Patrón de diseño:** Timeline/Gantt chart — heatmap de actividad.

**Dependencias:** ninguna

**Validación binaria:**
- TimelineView renderiza sin error ✅
- Checkboxes toggle tracker visibility ✅
- Timeline muestra trackers activos en colores, inactivos vacíos ✅
- Year selector cambia vista temporal ✅
- Hover cell → tooltip con entry count ✅

**Decidido por:** dev

---

## 🟡 Resoluciones — MEDIOS (8 gaps)

---

### GAP-017 — Health Tracker with Custom Tags
**Severidad:** 🟡 Medio  
**Fuente:** RF-04, DATO-06  

**Resolución técnica:**

Crear handler para Health tracker con custom tags support:

1. **Tracker config:** Health tracker seeded con tipo `'text'` + icon health
2. **QuickEntry form para Health:**
   - Text input para symptoms/tags (ej: "cold, cough, sore throat")
   - Tags pueden ser:
     - Pre-defined suggestions (desde GAP-001 tag system)
     - Free-form (user types new tag → auto-create)
   - Intensity selector (similar GAP-012, pero para health severity)

3. **Entry schema:**
   - `entries.value: string` (free text "cold, runny nose")
   - `entries.tags: string[]` (parsed from value, o selected from selector)
   - `entries.metadata: { intensity: 1-5 }` (optional)

4. **Correlation:**
   - Health tags pueden ser correlacionadas con Food tags (vía GAP-006 inheritance)
   - ej: "cold" después de "wheat" → 80% likelihood

**Patrón de diseño:** Tag-based entry — hybrid freeform + structured.

**Dependencias:**
- GAP-001 (tag system)
- GAP-006 (correlation ready)

**Validación binaria:**
- QuickEntry Health form abre sin error ✅
- Tipear síntoma + presionar Enter → tag creado y entry saved ✅
- Síntoma persiste en entries.tags array ✅
- Health entry aparece en Stats page para correlación ✅

**Decidido por:** dev

---

### GAP-018 — Vitamins Hierarchical Tracker
**Severidad:** 🟡 Medio  
**Fuente:** RF-08  

**Resolución técnica:**

Crear tracker Vitamins con estructura jerárquica (similar a Food + Tags):

1. **Tracker config:**
   - Type: `'composite'` (nuevo tipo o extension de `'text'`)
   - Ejemplo: "Vitamin D" → children: "D2", "D3"

2. **QuickEntry UI:**
   - Parent selector: "Vitamin D"
   - Child selector cascading: "D2 | D3"
   - Dosage input: mg/IU
   - Frequency: daily/weekly
   - Source: supplement/food

3. **Schema:**
   - Vitamins tracker puede usar mismo tag system que Food (jerárquico)
   - Entry: `{ trackerId: vitaminsID, tags: ["Vitamin D", "D3"], value: "1000 IU", ... }`

4. **Correlation:**
   - Vitamin tags pueden correlacionar con: Energy, Health, Weight

**Patrón de diseño:** Hierarchical entry — reusa tag infrastructure.

**Dependencias:**
- GAP-001 (tag hierarchy)
- GAP-003 (page management para vitamins)

**Validación binaria:**
- QuickEntry Vitamins renderiza parent + child selector ✅
- Select "Vitamin D" → child opts: ["D2", "D3"] ✅
- Create entry with parent + child tags → persiste ✅
- Tags aparecen en hierarchy (Vitamin D → D3) ✅

**Decidido por:** dev

---

### GAP-020 — Contact Profile Bubbles (Photo/Initials)
**Severidad:** 🟡 Medio  
**Fuente:** RF-15, UX-05  

**Resolución técnica:**

Implementar foto + initials fallback en `ContactBubblesGrid.tsx`:

1. **Lógica:**
   - Si `contact.avatarAssetId` existe → render foto (vía Assets API)
   - Else → render initials (primeras 2 letras del nombre, ej: "AL" para "Albert López")

2. **Componente:**
   - `ContactBubble.tsx` — renderiza single bubble:
     ```tsx
     {contact.avatarAssetId ? <img src={photoUrl} /> : <Initials name={contact.name} />}
     ```

3. **Styling:**
   - Bubble circular: `w-12 h-12 rounded-full`
   - Photo: object-cover
   - Initials: centered text, background color derived from name (deterministic hash)

4. **Interacción:**
   - Click bubble → select (en GAP-014 context)
   - Tooltip on hover: contact name

**Patrón de diseño:** Avatar pattern — Discord/Slack style.

**Dependencias:**
- GAP-002 (avatarAssetId field)

**Validación binaria:**
- ContactBubble con foto → renderiza img ✅
- ContactBubble sin foto → renderiza initials ✅
- Initials color es determinístico (mismo nombre = mismo color) ✅
- Bubble circular, 48px, no distortion ✅

**Decidido por:** dev

---

### GAP-021 — Exercise Tracker — Free-Exercise-DB Integration Polish + Category Filters
**Severidad:** 🟡 Medio  
**Fuente:** RF-23  

**Resolución técnica:**

Refinar UI de búsqueda de ejercicio en `ExerciseSearch.tsx` con categorías:

1. **Mejoras a "fancy UI":**
   - Search bar con debounce (ya existe)
   - **Category filter tabs:** "All | Cardio | Strength | Flexibility"
   - Results grid: cards con:
     - Nombre ejercicio (bold)
     - Categoría badge (ej: "Strength")
     - Muscle group secundario (ej: "Quads, Hamstrings")
     - Equipment si aplica (ej: "Barbell")
     - Click → agregar a entry + abrir dosage form (sets/reps/weight)

2. **Componentes:**
   - `ExerciseCard.tsx` — display 1 ejercicio (mejorado vs current)
   - `ExerciseResultsGrid.tsx` — grid layout en lugar de lista
   - `ExerciseCategoryTabs.tsx` — filter tabs (data from free-exercise-db API)

3. **Filtering logic:**
   - Hook `useSearchExercises(category?: string)` → agregar parámetro category
   - Free-exercise-db API o frontend filter por categoría

4. **Performance:**
   - Infinite scroll (or paginate) si > 50 resultados
   - Caching de búsquedas recientes

**Patrón de diseño:** Product card grid + faceted search — ecommerce/file picker style.

**Dependencias:** ninguna (mejora UI existente, API ya soporta categorías)

**Validación binaria:**
- ExerciseSearch renderiza con improved UI (cards + badges + category tabs) ✅
- Category tabs renderizadas: All, Cardio, Strength, Flexibility ✅
- Click "Strength" tab → resultados filtrados solo strength exercises ✅
- Search + category filter funcionan juntos ✅
- Click card → agrega ejercicio + opens dosage form ✅
- Recent searches cached + sugeridos ✅

**Decidido por:** dev

---

### GAP-022 — Books, Gaming, Media, Diet Trackers (Generic Seed)
**Severidad:** 🟡 Medio  
**Fuente:** RF-19, RF-20, RF-21, RF-22  

**Resolución técnica:**

Completar seeding de 4 trackers en `database.ts` con estructura genérica:

1. **Books tracker:**
   - Type: `'text'` (libro título, o composite si multi-field)
   - Entry fields: title, author, pages (optional), rating 1-5, status (reading/completed/wishlist)
   - Schema: soportado via metadata JSON + tags

2. **Gaming tracker:**
   - Type: `'text'` + metadata
   - Entry fields: game title, hours played, win/loss (if applicable), rating 1-5
   - Metadata: `{ status: 'playing' | 'completed', wins?: number, losses?: number }`

3. **Media tracker:**
   - Type: `'text'` + metadata
   - Entry fields: title, type (show/movie), rating 1-5, duration,status (watching/completed)
   - Metadata: `{ type: 'show' | 'movie', seasonNum?: number, episodeNum?: number }`

4. **Diet tracker:**
   - Type: `'text'`
   - Entry fields: food items (free text or tag-based), tags (ingredients), calories (optional)
   - Correlate with Health via tags

**Patrón de diseño:** Lego-piece tracker — genérico + metadata flexible.

**Dependencias:** ninguna (schema existing)

**Validación binaria:**
- Cada tracker seedable en Sidebar ✅
- QuickEntry abre form para cada tipo sin error ✅
- Entry saved con metadata correcto ✅
- Datos persist en DB ✅

**Decidido por:** dev (DECISIÓN-GAP-001 en GAPS-SDLC cerrado)

---

### GAP-023 — Weight Tracker Extended Features
**Severidad:** 🟡 Medio  
**Fuente:** RF-24 a RF-29, UX-02, UX-03  

**Resolución técnica:**

Completar Weight tracker con campos especializados:

1. **Schema enhancement (GAP-002 related, pero Weight-specific):**
   - `entries.metadata` para Weight include:
     ```typescript
     {
       weightLbs: number,
       bodyFatPct?: number,
       measurements?: { waist?: number, chest?: number, ... },
       targetWeight?: number,
       notes?: string,
       tags?: string[]
     }
     ```

2. **UI en TrackerDetailView:**
   - Target weight input + progress bar visual
   - Weekly averages calculated (select week → show avg)
   - Body measurements display (waist, chest, etc.)
   - Notes field linkable to Food tags (GAP-006)
   - Chart periodicities: já resuelto en GAP-010 (YTD, 2Y, 3Y)

3. **Motivational UI (UX-02, UX-03):**
   - If current weight < target → green badge "On track 🟢"
   - If current weight > target → red badge "Off track 🔴"
   - Streak display: "5 days logged" motivador

4. **Validación de campos:**
   - weightLbs: required, numeric > 0
   - targetWeight: optional, numeric > 0
   - measurements: optional, flexible object

**Patrón de diseño:** Domain-specific tracker — specialized UI + metadata storage.

**Dependencias:**
- GAP-010 (chart periodicities)
- GAP-006 (tags linkage)

**Validación binaria:**
- Weight entry form renderiza: weightLbs, targetWeight, measurements, notes ✅
- Target weight input actualiza + persiste ✅
- Progress bar calcula (current vs target) ✅
- Weekly average chart visible ✅
- Body measurements (waist) persistible ✅
- Streak badge calcula "N days logged" ✅
- Color change (green/red) basado en target vs actual ✅

**Decidido por:** dev

---

### GAP-024 — Mood Tracker Extended (Score + Cause Tags + Notes)
**Severidad:** 🟡 Medio  
**Fuente:** RF-29  

**Resolución técnica:**

Completar Mood tracker con campos especializados en QuickEntry + TrackerDetailView:

1. **Schema enhancement (Mood metadata):**
   ```typescript
   entries.metadata: {
     mood: 1-10 (score),
     cause?: string (free text or tag from hierarchy — ver GAP-001),
     intensity?: 1-5 (optional — cuan intensa fue la emoción),
     tags?: string[] (inherited from cause parent tags)
   }
   ```

2. **UI en QuickEntry Mood form:**
   - Slider visual 1-10 (ej: mood scale)
   - Tag selector para "cause" (ej: "stress", "exercise", "social")
   - Optional: intensity slider (1-5)
   - Notes field para notas cortas

3. **Stats integration:**
   - Display daily aggregates (average mood, most common cause)
   - Link cause tags a correlación con otros trackers (vía GAP-006)

4. **Validación:**
   - Mood 1-10 persiste en entries.value o metadata.mood
   - Tags de causa persisten en metadata.tags

**Patrón de diseño:** Domain-specific entry — multiple fields + tag association.

**Dependencias:**
- GAP-001 (tag hierarchy for cause suggestion)
- GAP-006 (correlation wiring opcional)

**Validación binaria:**
- QuickEntry Mood form renderiza slider 1-10 ✅
- Tag selector abre + seleccionar "stress" → ingresa en metadata.tags ✅
- Mood score + tags guardan en entry ✅
- Mood entry aparece en TrackerDetailView con score visual ✅
- StatsPage muestra average mood + most common cause tags ✅

**Decidido por:** dev

---

### GAP-025 — Stats Page — Frequency Analysis
**Severidad:** 🟡 Medio  
**Fuente:** RF-30  

**Resolución técnica:**

Agregar análisis de frecuencia a StatsPage (complementando streak + averages):

1. **Metrics:**
   - Frequency = "entries per week" (calculado: count / weeks elapsed)
   - Mode = most common value (ej: Mood 7/10 más frecuentes)
   - Distribution = histogram (Mood 1-10 distribution chart)

2. **Implementation:**
   - Nueva función en `stats.ts`: `calculateFrequency(entries[], period: 'week'|'month')`
   - Nueva función: `calculateDistribution(values: number[])` → { value: count }
   - Hook `useFrequencyAnalysis(trackerId)` → llamar en StatsPage

3. **UI:**
   - TabPanel: "Stats"
     - Existing: Streak, Avg, ChangVsLast
     - **NEW:** Frequency (entries per week), Distribution (histogram o table)
   - Display as cards o sub-section

**Patrón de diseño:** Aggregation + visualization — data science metrics.

**Dependencias:** ninguna

**Validación binaria:**
- StatsPage renderiza frequency metric ✅
- Frequency = correct (entries count / weeks) ✅
- Distribution chart renderiza (histogram o bar) ✅
- Mode frecuencia calculado correcto (most common value) ✅

**Decidido por:** dev

---

## 📋 Decisiones TECH-DEBT (Identificadas en TECH-DEBT.md — Impacto Cliente)

---

### DT-01 — Performance Web < 200ms (RNF-04)
**Severidad:** 🟠 Alto  
**Fuente:** RNF-04  

**Resolución técnica:**

Crear bloque de optimización performance en ROADMAP (no aquí, pero documentar decisión):
1. Profiling: identificar bottlenecks con React DevTools Profiler
2. Optimizaciones: memoization, lazy-load components, query optimization
3. Testin: suite de performance benchmarks

**Decidido por:** dev (diferida a ROADMAP — bloque "PERF BASELINE")

**Validación:** RNF-04 test suite pasa con métrica < 200ms

---

## ✅ RESUMEN DE DECISIONES

| Categoría | Count | Estado |
|-----------|-------|--------|
| 🔴 Críticos | 6 | ✅ Resueltos por dev |
| 🟠 Altos | 7 | ✅ Resueltos por dev |
| 🟡 Medios | 8 | ✅ Resueltos por dev |
| 🔧 Tech-Debt | 1 | ✅ Diferido ROADMAP |
| **TOTAL** | **21 resoluciones** | ✅ |

---

## 📊 ESTADÍSTICAS FINALES

| Métrica | Valor |
|----|---|
| Gaps resueltos por dev | 21 |
| Gaps resueltos por cliente | 0 |
| Gaps pendiente-cliente | 0 |
| Artefactos nombrados (tablas, campos, componentes) | **27** (algunos gaps contienen múltiples) |
| Dependencias mapeadas | ✅ explícitas por resolución |

---

## ✍️ GATE HITL 3 — CHECKLIST FIRMA

- [x] Cada gap tiene exactamente 1 resolución (no "opción A o B")
- [x] Nombres concretos de artefactos (campos DB, tablas, componentes)
- [x] Dependencias explícitas entre gaps (ej: GAP-001 bloquea GAP-003)
- [x] Validación binaria: "pasa o no pasa" (no "parece bien")
- [x] Gaps críticos + altos + medios = 21 (menos tech-debt) ✅
- [x] Zero gaps "pendiente-cliente" (todo dev decidido)
- [x] Orden: 🔴 → 🟠 → 🟡 → TECH-DEBT
- [x] Documento completo: lista de resoluciones lista para implementación

---

## 🎯 DOCUMENTO FIRMADO

**Estado:** 🟢 LISTO PARA FIRMA (Gate HITL 3)  
**Generado:** 2026-04-09  
**Generador:** GitHub Copilot (SDD-Resolver skill)  
**Próxima fase:** ROADMAP.md (secuencial con bloques y criterios de Done)

---

**Firmado por:** Dani (DEV)  
**Fecha de firma:** 2026-04-09  
**Gate HITL 3:** ✅ COMPLETADO

---

## 📝 NOTAS DE CORRECCIÓN (v1.0 → v1.1)

**Correcciones aplicadas en Gate HITL 3 (2026-04-09):**
- ✅ Removido GAP-012 (no existía en GAPS-SDLC.md) → moved to TECH-DEBT track
- ✅ Removido GAP-013 (no existía) → integrated into GAP-021 (Exercise categorization)
- ✅ Added GAP-024 (Mood tracker extended — matching RF-29 from GAPS-SDLC.md)
- ✅ Updated GAP-021 description to include category filtering

*RESOLVER-GAPS.md — Versión 1.1 (post-HITL3 correction)*  
*Basado en: GAPS-SDLC.md v1.0 (firmado 2026-04-09)*  
*Próxima actualización: POST-IMPLEMENTACIÓN (con learnings de dev)*
