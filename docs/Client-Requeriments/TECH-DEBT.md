# TECH-DEBT.md — Chimero Habit Flow

**Versión:** 1.0  
**Fecha de generación:** 2026-04-09  
**Relación:** Subproducto del análisis GAPS-SDLC.md v1.0

---

## Propósito

Este documento lista problemas identificados en el codebase que **NO tienen fuente explícita en CLIENT-REQUIREMENTS.md** (v1.0). Son deudas técnicas que afectan el proyecto pero que el cliente no mencionó en el requirements.

---

## 📋 TECH-DEBT Listado

### DT-01 | 🟠 Alto | Performance Web

**Descripción:** El codebase actual **resuelve sketches/renders en ~500ms en web** contra un target de <200ms (RNF-04). No se mencionó explícitamente en requirements, pero RNF-04 dice "<200ms per tracker view".

**Evidencia:** 
- RNF-04: "Performance: render < 200ms per tracker view (actual: 500ms en web → mejorar)"
- Origen: Chat del cliente, 15/01/2026

**Por qué es tech-debt (no gap):** El cliente SÍ lo mencionó en una línea del requirements, pero no es un "gap" (ausencia / contradicción). Es una **métrica de calidad no cumplida** hoy. Requiere:
- Profiling del codebase (identifiy bottlenecks)
- Optimizaciones de render (memoization, lazy-loading)
- Testing de performance con suite

**Impacto:** Media — UX lenta en web, pero Electron desktop OK.

**Dependencia:** Independiente de gaps críticos. Puede hacerse en paralelo.

---

### DT-02 | 🟡 Medio | Wayland Support Investigación

**Descripción:** RNF-08 dice "Wayland support (Arch Linux): investigar optimizaciones". Esto es una **tarea abierta**, no un gap.

**Evidencia:** 
- RNF-08: "Wayland support (Arch Linux): investigar optimizaciones"
- Origen: Chat del cliente, 6/02/2026

**Por qué es tech-debt:** No es un ga (no hay contradicción). Es una **investigación pendiente** — no sabemos si hay work needed.

**Impacto:** Bajo — afecta solo a usuarios Arch Linux con Wayland.

**Acción:** Crear spike de investigación antes de features.

---

### DT-03 | 🟡 Medio | Accessibility Completitud

**Descripción:** RNF-07 menciona "Accessibility: responsive design, keyboard shortcuts (Alt+Q), drag-drop support". El codebase ya tiene algunos de estos, pero:
- Responsive: ¿WCAG 2.1 AA completo?
- Keyboard shortcuts: ¿Alt+Q existe? ¿Documentado?
- Drag-drop: ¿es totalmente a11y friendly?

No es un gap (el cliente pidió a11y), pero la **completitud no está clara**.

**Evidencia:** 
- RNF-07: "Accessibility: responsive design, keyboard shortcuts (Alt+Q), drag-drop support"
- Origen: Chat del cliente 6/2/2026

**Impacto:** Medio — Usuarios con disabilities.

**Acción:** Audit de a11y (Lighthouse, WAVE) después de implementar features.

---

### DT-04 | 🟡 Medio | Sidebar Assets Placement

**Descripción:** UX-01 dice "Sidebar: Assets + Custom Trackers al fondo (menos frecuentes)". No está claro si el layout actual cumple esto.

**Evidencia:** 
- UX-01: "Sidebar: Assets + Custom Trackers al fondo (menos frecuentes)"
- Origen: Chat del cliente, 20/2/2026

**Por qué es tech-debt:** No es un gap (cliente pidió esto), pero la **validación no fue posible** desde exploración remota.

**Impacto:** Bajo — UX polish.

**Acción:** Validar en codebase durante Gate HITL.

---

### DT-05 | 🟡 Medio | Test Coverage Gaps

**Descripción:** Existen tests (ej: `stats.test.ts` pass), pero:
- ¿Cobertura de tracker entry edge cases?
- ¿Tags inheritance tests?
- ¿Contact CRUD tests?
- ¿Correlation logic tested?

No mencionado en requirements, pero impacta calidad de implementación.

**Evidencia:** 
- Archivos: test/, tests/
- Status: Parcial coverage ver código

**Impacto:** Medio — Bugs en producción sin tests.

**Acción:** Agregar TDD a ROADMAP cuando se implementen features grandes.

---

### DT-06 | 🟡 Medio | Emotion Intensity Slider Enhancement

**Descripción:** Durante Gate HITL 3, se propuso agregar intensity slider (1-5) a Mood tracker entries: "How intense was this emotion?". Esto es un **feature bonito** pero NO tiene fuente en CLIENT-REQUIREMENTS.md.

**Evidencia:** 
- No hay RF/DATO/REGLA en CLIENT-REQUIREMENTS.md para intensity slider
- Propuesta surgió de análisis interno de Mood tracker
- Cliente pidió Mood 1-10 score + tags, pero no mencionó intensity

**Por qué es tech-debt:** Feature enhancement (no gap de requisito). Valor agregado, opcional.

**Impacto:** Bajo — UX polish si se implementa.

**Acción:** Considerar en ROADMAP como nice-to-have. Depende de cuánto espacio haya después de gaps críticos. Si hay tiempo en v1.1, agregar. Si no, posponer.

**Decidido por:** dev (candidata para BLOQUE TECH-DEBT en ROADMAP si hay bandwidth)

---

## 📊 Resumen Tech-Debt

| Severidad | Count | Items |
|-----------|-------|-------|
| 🔴 Crítico | 0 | — |
| 🟠 Alto | 1 | DT-01 (Performance) |
| 🟡 Medio | 5 | DT-02, 03, 04, 05, 06 |
| Total | **6** | — |

**Estimación de esfuerzo combinado:** ~10-15 días de développement

---

## 🎯 Cómo Priorizar

**Antes de implementar features críticas:**
1. DT-01 (Performance) — Hacer profiling para no amplificar problema
2. DT-03 (Accessibility audit) — Descubrá acciones necesarias

**En paralelo (no bloquea):**
3. DT-02 (Wayland investigación)
4. DT-04 (Sidebar validación)
5. DT-05 (Test coverage) — TDD en nuevas features
6. DT-06 (Emotion intensity slider) — Nice-to-have si hay bandwidth en v1.1

---

*Generado como subproducto de GAPS-SDLC.md Sección 2*
