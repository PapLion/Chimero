import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

function copySplashPlugin() {
  return {
    name: 'copy-splash',
    closeBundle() {
      const src = resolve(__dirname, 'src/backend/splash.html')
      const outDir = resolve(__dirname, 'out/main')
      const dest = resolve(outDir, 'splash.html')
      if (existsSync(src)) {
        if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
        copyFileSync(src, dest)
      }
    }
  }
}

function copyMigrationsPlugin() {
  return {
    name: 'copy-migrations',
    closeBundle() {
      const migrationsSrc = resolve(__dirname, '../../packages/db/drizzle')
      const migrationsDest = resolve(__dirname, 'out/main/migrations')
      
      if (!existsSync(migrationsSrc)) {
        console.warn('[build] Migrations source folder not found:', migrationsSrc)
        return
      }

      // Create destination directory
      if (!existsSync(migrationsDest)) {
        mkdirSync(migrationsDest, { recursive: true })
      }

      // Copy SQL files
      try {
        const files = readdirSync(migrationsSrc)
        for (const file of files) {
          if (file.endsWith('.sql')) {
            const srcFile = resolve(migrationsSrc, file)
            const destFile = resolve(migrationsDest, file)
            copyFileSync(srcFile, destFile)
            console.log('[build] Copied migration:', file)
          }
        }

        // Copy meta directory
        const metaSrc = resolve(migrationsSrc, 'meta')
        const metaDest = resolve(migrationsDest, 'meta')
        if (existsSync(metaSrc)) {
          if (!existsSync(metaDest)) {
            mkdirSync(metaDest, { recursive: true })
          }
          const metaFiles = readdirSync(metaSrc)
          for (const file of metaFiles) {
            const srcFile = resolve(metaSrc, file)
            const destFile = resolve(metaDest, file)
            const stat = statSync(srcFile)
            if (stat.isFile()) {
              copyFileSync(srcFile, destFile)
            }
          }
          console.log('[build] Copied migrations meta folder')
        }
      } catch (err) {
        console.error('[build] Failed to copy migrations:', err)
        throw err
      }
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copySplashPlugin(), copyMigrationsPlugin()],
    build: {
      lib: {
        entry: 'src/backend/index.ts'
      },
      rollupOptions: {
        external: ['better-sqlite3']
      }
    },
    resolve: {
      alias: {
        '@packages/db': resolve(__dirname, '../../packages/db/src'),
        shared: resolve(__dirname, '../../packages/shared/src')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'src/preload/index.ts'
      }
    },
    resolve: {
      alias: {
        shared: resolve(__dirname, '../../packages/shared/src')
      }
    }
  },
  renderer: {
    root: 'src/frontend',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/frontend/index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/frontend'),
        '@components': resolve(__dirname, 'src/frontend/components'),
        '@/': resolve(__dirname, 'src/frontend'),
        '@packages/ui': resolve(__dirname, '../../packages/ui'),
        '@packages/db': resolve(__dirname, '../../packages/db/src'),
        shared: resolve(__dirname, '../../packages/shared/src')
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