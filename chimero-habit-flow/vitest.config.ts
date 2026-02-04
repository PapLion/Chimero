import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const root = resolve(__dirname, '.')

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@packages/db': resolve(root, 'packages/db/src'),
      '@packages/ui': resolve(root, 'packages/ui'),
      '@packages/ui/button': resolve(root, 'packages/ui/button.tsx'),
      '@packages/ui/dialog': resolve(root, 'packages/ui/dialog.tsx'),
      '@packages/ui/input': resolve(root, 'packages/ui/input.tsx'),
      '@packages/ui/tooltip': resolve(root, 'packages/ui/tooltip.tsx'),
      '@packages/ui/utils': resolve(root, 'packages/ui/utils.ts'),
      '@renderer': resolve(root, 'apps/electron/src/renderer/src'),
      '@components': resolve(root, 'apps/electron/src/renderer/src/components'),
      '@/': resolve(root, 'apps/electron/src/renderer/src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
  },
})
