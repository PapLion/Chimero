import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

function copySplashPlugin() {
  return {
    name: 'copy-splash',
    closeBundle() {
      const src = resolve(__dirname, 'src/main/splash.html')
      const outDir = resolve(__dirname, 'out/main')
      const dest = resolve(outDir, 'splash.html')
      if (existsSync(src)) {
        if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
        copyFileSync(src, dest)
      }
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copySplashPlugin()],
    // 👇 AGREGA ESTO PARA ARREGLAR LA DB
    build: {
      rollupOptions: {
        external: ['better-sqlite3']
      }
    },
    resolve: {
      alias: {
        '@packages/db': resolve(__dirname, '../../packages/db/src')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'src/preload/index.ts'
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@components': resolve('src/renderer/src/components'),
        '@/': resolve(__dirname, 'src/renderer/src'),
        '@packages/ui': resolve(__dirname, '../../packages/ui'),
        '@packages/db': resolve(__dirname, '../../packages/db/src')
      }
    },
    optimizeDeps: {
      include: [
        '@radix-ui/react-dialog',
        '@radix-ui/react-slot',
        '@radix-ui/react-tooltip',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'lucide-react'
      ]
    },
    plugins: [react()]
  }
})