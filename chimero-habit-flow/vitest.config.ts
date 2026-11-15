import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const root = resolve(__dirname, '.')

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@packages/db': resolve(root, 'packages/db/src'),
      '@contracts': resolve(root, 'packages/shared/src'),
      '@': resolve(root, 'apps/electron/src/renderer/src'),
      'better-sqlite3': resolve(root, 'apps/electron/node_modules/better-sqlite3'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
  },
})
