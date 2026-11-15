import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

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
    plugins: [externalizeDepsPlugin(), copyMigrationsPlugin()],
    build: {
      rollupOptions: {
        external: ['better-sqlite3']
      }
    },
    resolve: {
      alias: {
        '@contracts': resolve(__dirname, '../../packages/shared/src'),
        '@packages/db': resolve(__dirname, '../../packages/db/src')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@contracts': resolve(__dirname, '../../packages/shared/src')
      }
    },
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
        '@': resolve(__dirname, 'src/renderer/src'),
        '@contracts': resolve(__dirname, '../../packages/shared/src')
      }
    },
    plugins: [react()]
  }
})
