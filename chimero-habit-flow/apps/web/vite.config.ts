import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createWebApiMiddleware } from './server'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'chimero-web-api',
      configureServer(server) {
        server.middlewares.use(createWebApiMiddleware())
      },
      configurePreviewServer(server) {
        server.middlewares.use(createWebApiMiddleware())
      },
    },
  ],
  resolve: {
    alias: {
      '@renderer': resolve(appRoot, '../electron/src/renderer/src'),
      '@features': resolve(appRoot, '../electron/src/renderer/src/features'),
      '@shared': resolve(appRoot, '../electron/src/renderer/src/shared'),
      '@shared/utils': resolve(appRoot, '../electron/src/renderer/src/shared/utils.ts'),
      '@shared/store': resolve(appRoot, '../electron/src/renderer/src/shared/store.ts'),
      '@shared/queries': resolve(appRoot, '../electron/src/renderer/src/shared/queries.ts'),
      '@shared/api': resolve(appRoot, '../electron/src/renderer/src/shared/api.ts'),
      '@contracts': resolve(appRoot, '../../packages/shared/src'),
      '@components': resolve(appRoot, '../electron/src/renderer/src/shared/components'),
      '@packages/ui': resolve(appRoot, '../../packages/ui'),
      '@packages/db': resolve(appRoot, '../../packages/db/src'),
    },
  },
  optimizeDeps: {
    include: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-slot',
      '@radix-ui/react-tooltip',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'lucide-react',
    ],
  },
})
