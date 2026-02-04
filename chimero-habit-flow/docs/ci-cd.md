# CI/CD – Chimero

Pipeline de calidad y despliegue para el monorepo Electron (pnpm + turbo).

## Capas de verificación

1. **Lint (ESLint – “AI firewall”)**  
   Detecta código perezoso o inseguro: `any`, variables no usadas, comentarios TODO/FIXME/placeholder, funciones vacías, e imports prohibidos (p. ej. renderer importando `electron` o `database`).

2. **Unit tests (Vitest)**  
   Pruebas rápidas de lógica pura (p. ej. cálculo de rachas en `streak-utils`) y de componentes React con mocks.

3. **E2E (Playwright + Electron)**  
   Se lanza la app compilada y se comprueba que la ventana principal muestra el dashboard (Chimero / Activities / Today).

## Comandos locales

Desde la raíz del monorepo (`chimero-habit-flow`):

| Comando           | Descripción                          |
|-------------------|--------------------------------------|
| `pnpm lint`       | ESLint en `apps/**` y `packages/**`  |
| `pnpm check-types`| TypeScript sin emitir (solo electron) |
| `pnpm test`       | Vitest (unit) en modo run            |
| `pnpm test:watch` | Vitest en modo watch                 |
| `pnpm build`      | Build de la app Electron (out/)     |
| `pnpm test:e2e`   | Playwright contra la app construida  |
| `pnpm package`    | Build + empaquetado con electron-builder (.exe) |

**Requisito para E2E:** ejecutar `pnpm build` antes de `pnpm test:e2e` para generar `apps/electron/out/`.

## Dónde viven los tests

- **Unit:** `tests/unit/`
  - `stats.test.ts` – funciones puras de rachas (`streak-utils`).
  - `components.test.tsx` – renderizado de componentes (p. ej. `Header`).
- **E2E:** `tests/e2e/`
  - `electron.spec.ts` – arranque de la app Electron y comprobación del título/contenido.

## Pipeline CI (GitHub Actions)

- **Workflow:** `.github/workflows/ci.yml`
- **Disparadores:** `push` a `main` y cualquier `pull_request` hacia `main`.
- **Runner:** `windows-latest` (objetivo inicial: .exe Windows).
- **Pasos (orden):**
  1. Checkout, Node 20, cache pnpm.
  2. `pnpm install --frozen-lockfile`
  3. `pnpm lint`
  4. `pnpm check-types`
  5. `pnpm test`
  6. `pnpm exec playwright install --with-deps`
  7. `pnpm build`
  8. `pnpm test:e2e`

Si lint, tipos, tests unitarios o E2E fallan, el pipeline marca el job como fallido.

**Nota:** Si `pnpm check-types` falla, revisar tipos en main/renderer y que `react/jsx-runtime` esté declarado (p. ej. `apps/electron/src/react-jsx-runtime.d.ts`) cuando se compilan paquetes como `packages/ui` desde el proyecto Electron.

## Release (tags v*)

- **Workflow:** `.github/workflows/release.yml`
- **Disparador:** `push` de tags `v*` (ej. `v1.0.0`).
- **Pasos:** mismo setup (Node, pnpm, install, build) y actualmente ejecuta `pnpm package` para generar el instalador sin publicar.
- **Publicación a GitHub Releases:** el paso que sube el .exe con `electron-builder --publish always` está comentado/placeholder; para activarlo hace falta configurar token (p. ej. `GH_TOKEN`), opciones de `electron-builder` en `package.json` y, para firma de código en Windows, certificados y variables de entorno. El auto-update queda planeado para más adelante.
