# AGENTS.md — Dani's AI Development System

> **Propósito:** Este archivo es el system prompt persistente para cualquier agente o modelo que trabaje conmigo.
> Léelo completo antes de hacer cualquier cosa. Máximo ~500 líneas. No lo expandas sin consultar.

---

## 🧠 Quién soy y cómo trabajo

Soy un desarrollador que aplica un **SDLC personalizado con IA** como orquestador central.
No hago vibe coding. Hago **Ingeniería de Software con IA**: arquitectura primero, código después.

Mi filosofía:
- Crear software ≠ programar
- La IA no me domina, yo la orquesto
- Especificaciones claras antes de cualquier línea de código
- El humano es el **Validador de Intención**, el código es el artefacto derivado

---

## 🛠️ Mi Stack de Herramientas

### Modelos / Agentes
| Rol | Modelo | Uso |
|-----|--------|-----|
| Orquestador / Razonador / Prompt Engineer | Claude Sonnet 4.6 (claude.ai) | Arquitectura, diseño, decisiones técnicas, este archivo |
| Implementación / Coding | GitHub Copilot (cualquier modelo disponible) | Código, tests, CI/CD, refactors |
| Razonamiento pesado sin gastar premium | GPT-5 mini (reasoning high) | Todo lo que no requiere contexto de proyecto |

### MCPs activos (GitHub Copilot CLI)
- **playwright** — E2E testing, automatización de browser
- **browser-use** — Navegación web agéntica
- **context7** — Documentación de librerías actualizada
- **engram** — Memoria persistente RAG (SQLite + FTS5 + BM25)
- **roblox-studio** — Desarrollo Roblox/Lua
- **github-mcp-server** — GitHub readonly
- **ide** — Integración con VS Code

### Skills activas (GitHub Copilot)
**Project skills:** animation-designer, animation-micro-interaction-pack, frontend-ui-ux-engineer, penpot-uiux-design, react-nextjs-patterns, roblox-game-development, tailwindcss-animations, tdd, test-driven-development, ui-ux-pro-max

**Copilot skills:** ai-sdk-5, django-drf, github-pr, go-testing, jira-epic, jira-task, nextjs-15, playwright, pytest, react-19, sdd-apply, sdd-archive, sdd-design, sdd-explore, sdd-init, sdd-propose, sdd-spec, sdd-tasks, sdd-verify, skill-creator, tailwind-4, typescript, zod-4, zustand-5

### Herramientas adicionales
- **GGA (Gentleman Guardian Angel)** — Pre-commit hook que valida staged files contra este AGENTS.md
- **OpenSpec** — Spec-Driven Development via slash commands (`/opsx:propose`, `/opsx:apply`, `/opsx:archive`)
- **GitHub Actions** — CI/CD pipeline
- **Engram** — Memoria persistente entre sesiones

---

## 📋 Mi SDLC Personalizado

Trabajo con un proceso de **7 fases con roles de IA asignados**. Cada fase produce documentos `.md` que son el input de la siguiente.

```
ANÁLISIS/REQUISITOS → DISEÑO → IMPLEMENTACIÓN → QA → DEPLOY → OPERACIÓN → GESTIÓN
```

### Fase 1: Análisis / Requisitos (`/ANALISIS-REQUISITOS/`)
| Archivo | Propósito |
|---------|-----------|
| `CLIENT-REQUERIMENTS.md` | Texto humano/natural del cliente → convertido a técnico |
| `GAPS-SDLC.md` | Gaps/tareas identificadas (yo llamo "gaps" a las tareas) |
| `RESOLVER-GAPS.md` | Resolución que referencia teoría + client reqs + gaps |
| `ARCHITECH.md` | Decisiones arquitectónicas usando todos los docs anteriores |

### Fase 2: Diseño (`/DISEÑO/`)
| Archivo | Propósito |
|---------|-----------|
| `UI-UX.md` | Diseño de interfaz y experiencia |
| `TECHLEAD.md` | Decisiones técnicas del tech lead |
| `QA.md` | Estrategia de pruebas desde el diseño |

### Fase 3: Implementación (`/IMPLEMENTACION/`)
| Archivo | Propósito |
|---------|-----------|
| `ROADMAP.md` | Roadmap de implementación |
| `PR.md` | Template y criterios de Pull Request |

---

## 🔄 Flujo de Trabajo con IA (SDD)

Uso **Spec-Driven Development** estilo **Spec Anchored**: los docs evolucionan con el código.

```
CLIENT TEXT → CLIENT-REQS → GAPS → RESOLVER-GAPS → ARCHITECT → UI-UX + TECHLEAD → IMPLEMENT
     ↑                                                                                    |
     └──────────────────── Feedback Loop (Engram guarda aprendizajes) ──────────────────┘
```

### Cómo empezar un proyecto nuevo conmigo:
1. Te pasaré el `CLIENT-REQUERIMENTS.md` con el texto del cliente
2. Generas conmigo el `GAPS-SDLC.md` (lista de tareas técnicas)
3. Juntos hacemos el `RESOLVER-GAPS.md`
4. Luego la arquitectura, luego diseño, luego implementación

**Nunca empieces a implementar sin haber pasado por análisis.**

---

## 💻 Lenguajes Principales

| Lenguaje | Nivel | Uso principal |
|----------|-------|---------------|
| **TypeScript** | Principal | Frontend, Backend, APIs |
| **Python** | Principal | Scripts, Data, AI integrations, Backend |
| **Lua** | Principal | Roblox Studio / game development |

---

## 🏗️ Stack Técnico por Dominio

### Frontend (TypeScript)
- **Framework:** React 19, Next.js 15 (App Router)
- **Styling:** Tailwind CSS 4
- **State:** Zustand 5
- **Validation:** Zod 4
- **Testing:** Vitest, Playwright (E2E)
- **Animaciones:** Tailwind animations, micro-interactions
- **UI/UX:** Penpot para diseño, shadcn/ui components

### Backend (TypeScript / Python)
- **TS Backend:** Next.js API routes, AI SDK v5 (Vercel)
- **Python Backend:** Django DRF, FastAPI
- **DB:** PostgreSQL (principal), SQLite (local/agentes)
- **Auth:** JWT, OAuth 2.0
- **APIs:** REST + GraphQL según contexto

### AI / Agents
- **Providers:** Anthropic (Claude), OpenAI (GPT), Gemini
- **SDK:** AI SDK v5 (Vercel) para integraciones
- **Patterns:** Streaming, Structured Outputs, Function Calling
- **Memory:** Engram MCP (RAG persistente)

### DevOps / CI-CD
- **VCS:** Git + GitHub
- **CI/CD:** GitHub Actions
- **Pre-commit:** GGA validando contra este AGENTS.md
- **Releases:** Release Please (Google) para versionado semántico
- **Containers:** Docker cuando aplica

### Roblox / Lua
- **IDE:** Roblox Studio + roblox-studio MCP
- **Patterns:** Skills de roblox-game-development

---

## ✅ Estándares de Código

### TypeScript
- **Linting / Format:** ESLint + Prettier
- **Tipos:** Strict mode. No `any`. Siempre tipar explícitamente
- **Imports:** Absolute paths con `@/`
- **Naming:** camelCase variables/funciones, PascalCase componentes/clases, SCREAMING_SNAKE_CASE constantes
- **Funciones:** Pequeñas, puras cuando sea posible, máx ~50 líneas
- **Archivos:** Un componente/módulo por archivo

### Python
- **Format:** Ruff (linting + format todo-en-uno)
- **Typing:** Type hints siempre. Pydantic para validación de datos
- **Testing:** pytest
- **Naming:** snake_case todo, PascalCase clases
- **Docstrings:** Google style

### General
- **No magic numbers/strings:** Usar constantes con nombre
- **Error handling:** Explícito. No swallows silenciosos
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`)
- **PRs:** Siempre via Pull Request. Nunca push directo a `main`
- **Tests obligatorios para:** Auth/autorización, lógica de negocio crítica, integraciones externas

---

## 🧪 TDD y Testing

Trabajo con **Test-Driven Development**. El flujo es:

```
❌ Test falla (rojo) → ✅ Mínimo código para pasar (verde) → ♻️ Refactor
```

**Prioridad de testing:**
1. **Lo crítico:** Auth, lógica de negocio, integrations (APIs externas, DB)
2. **Lo importante:** Edge cases, código generado por IA que no entiendo del todo
3. **Delegable a IA:** Happy paths simples, helpers/utilidades

**Regla de oro:** La IA puede escribir los tests, pero yo valido que los escenarios sean realistas y cubran los edge cases del negocio real.

---

## 📝 Code Review (GGA)

GGA valida cada commit contra este archivo. Un buen PR debe:
- Seguir las convenciones de naming y estilo definidas arriba
- Incluir tests para funcionalidad crítica
- No romper ningún test existente
- Tener descripción clara de qué cambia y por qué
- Pasar lint, validaciones y tests en CI

**Code Review Pyramid:**
- Base (automatizado con GGA + CI): code style, linting, tests
- Medio: documentación, semántica de implementación
- Top (foco humano): API semantics, arquitectura, decisiones de negocio

---

## 🧠 Memoria del Sistema (Engram)

**Engram** guarda aprendizajes entre sesiones en formato:
- **What:** Qué implementé / decidí
- **Why:** Por qué tomé esa decisión
- **Where:** En qué proyecto/archivo
- **Learned:** Qué aprendí que cambia cómo haré esto en el futuro

Antes de empezar cualquier tarea compleja, consulta Engram si hay contexto previo relevante. Después de terminar, guarda los aprendizajes clave.

---

## 🚫 Prohibiciones

- ❌ Push directo a `main`
- ❌ `any` en TypeScript sin justificación explícita en comentario
- ❌ Secrets/passwords en código fuente
- ❌ `console.log` en producción (usar logging estructurado)
- ❌ Implementar sin análisis previo (saltarse las fases del SDLC)
- ❌ Magic numbers o strings sin constante nombrada
- ❌ Funciones de más de ~80 líneas sin justificación
- ❌ PRs sin descripción de qué cambia y por qué
- ❌ Merge sin que pasen lint + tests en CI

---

## 🤖 Cómo debe comportarse un agente conmigo

1. **Lee este archivo completo** antes de actuar
2. **Consulta Engram** si hay contexto previo del proyecto
3. **Pregunta antes de implementar** si el análisis no está claro
4. **Sigue el SDLC**: no saltes fases
5. **Propón en Plan Mode** para tareas grandes antes de ejecutar
6. **Usa las skills correctas** según la tarea — no cargues contexto innecesario
7. **Guarda aprendizajes en Engram** al finalizar tareas importantes
8. **Sé el Jarvis, no el Tony Stark**: ejecuta con precisión, yo tengo la visión

---

*Versión: 1.0 | 2026-03-30*
*Si hay contradicción entre este archivo y un doc de proyecto específico, el doc del proyecto gana.*