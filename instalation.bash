
# 1. Instalar dependencias globales del monorepo
pnpm add -w electron electron-builder turbo typescript vite

# 2. Instalar dependencias de la app Electron
cd apps/electron
pnpm add react react-dom framer-motion clsx tailwind-merge @tanstack/react-query lucide-react @dnd-kit/core @dnd-kit/sortable
pnpm add -D electron vite @vitejs/plugin-react tailwindcss postcss autoprefixer

# 3. Instalar dependencias de la DB
cd ../../packages/db
pnpm add drizzle-orm better-sqlite3
pnpm add -D drizzle-kit @types/better-sqlite3